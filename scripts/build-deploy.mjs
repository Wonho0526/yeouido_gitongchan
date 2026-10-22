// 카페24 FTP 업로드용 폴더를 dist/ 에 만듭니다. 서버의 /www/ 와 1:1로 대응합니다.
//
//   npm run build:deploy
//
// GitHub Pages는 master를 그대로 배포하므로 이 스크립트와 무관합니다. 카페24만 쓰는
// 절차이고, 자세한 업로드 순서는 docs/cafe24-deploy.md 에 있습니다.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "dist");

// 웹 루트에 그대로 올라가는 항목.
const INCLUDE = [
  ".htaccess",
  "favicon.ico",
  "index.html",
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "admin",
  "css",
  "fonts",
  "img",
  "js",
  "sub",
  "vendor",
];

// 올리면 안 되거나 서버에 둘 이유가 없는 경로(웹 루트 기준).
const EXCLUDE = new Set([
  "admin/config.php", // 서버에만 둡니다. 4-3단계에서 직접 올립니다.
  "admin/config.php.example",
  "admin/schema.sql",
  "admin/migrate.php", // 방법 B를 쓸 때만 잠깐 올립니다.
]);

// 런타임에 쓰이지 않는 이미지 생성 기록. 프롬프트와 로컬 경로가 들어 있습니다.
const isImageManifest = (rel) => rel.startsWith("img/") && rel.endsWith(".json");

// 참조를 훑을 텍스트 파일.
const TEXT_EXT = new Set([".html", ".css", ".js", ".mjs", ".php", ".json"]);
const ASSET_RE = /(?:\.\.\/)*((?:img|fonts)\/[A-Za-z0-9_\-./%]+?\.[A-Za-z0-9]{2,5})/g;

// `${rootPrefix}img/icons/${icon}` 처럼 파일명을 변수로 붙이는 자리. 리터럴 경로가
// 없으므로 ASSET_RE 로는 안 잡히고, 해당 폴더를 통째로 올려야 합니다.
const ASSET_DIR_RE = /(?:\.\.\/)*((?:img|fonts)\/(?:[A-Za-z0-9_\-.%]+\/)+)\$\{/g;

// 주석 안에 남은 경로까지 세면 이미 지운 파일이 계속 누락으로 잡힙니다.
// 줄 주석(//)은 https:// 를 잘라먹을 수 있어 건드리지 않습니다.
const stripComments = (text) =>
  text.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

async function walk(dir, base = dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(abs, base)));
    else out.push(path.relative(base, abs).replace(/\\/g, "/"));
  }
  return out;
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// index.html, sub/, css/, js/, admin/ 이 실제로 가리키는 img·fonts 경로를 모읍니다.
async function collectReferences() {
  const scanRoots = ["index.html", "css", "js", "sub", "admin", "vendor"];
  const refs = new Set();
  const dirRefs = new Set();
  for (const root of scanRoots) {
    const abs = path.join(ROOT, root);
    if (!(await exists(abs))) continue;
    const stat = await fs.stat(abs);
    const files = stat.isDirectory()
      ? (await walk(abs)).map((f) => `${root}/${f}`)
      : [root];
    for (const rel of files) {
      if (!TEXT_EXT.has(path.extname(rel).toLowerCase())) continue;
      const text = stripComments(await fs.readFile(path.join(ROOT, rel), "utf8"));
      for (const m of text.matchAll(ASSET_RE)) {
        refs.add(decodeURIComponent(m[1]));
      }
      for (const m of text.matchAll(ASSET_DIR_RE)) {
        dirRefs.add(decodeURIComponent(m[1]));
      }
    }
  }

  // 통째로 참조된 폴더는 그 안의 파일을 전부 참조 목록에 넣습니다.
  for (const dir of dirRefs) {
    const abs = path.join(ROOT, dir);
    if (!(await exists(abs))) continue;
    for (const rel of await walk(abs)) refs.add(`${dir}${rel}`);
  }

  return { refs, dirRefs };
}

async function copyTree(relRoot, keep) {
  const absRoot = path.join(ROOT, relRoot);
  const stat = await fs.stat(absRoot);
  const files = stat.isDirectory()
    ? (await walk(absRoot)).map((f) => `${relRoot}/${f}`)
    : [relRoot];

  let copied = 0;
  const skipped = [];
  for (const rel of files) {
    if (EXCLUDE.has(rel) || isImageManifest(rel) || !keep(rel)) {
      skipped.push(rel);
      continue;
    }
    const dest = path.join(OUT, rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(path.join(ROOT, rel), dest);
    copied += 1;
  }
  return { copied, skipped };
}

async function dirSize(dir) {
  let total = 0;
  for (const rel of await walk(dir)) {
    total += (await fs.stat(path.join(dir, rel))).size;
  }
  return total;
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

async function main() {
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(OUT, { recursive: true });

  const { refs, dirRefs } = await collectReferences();
  console.log(`참조된 img·fonts 경로 ${refs.size}개를 찾았습니다.`);
  if (dirRefs.size) {
    console.log(`  파일명이 변수로 조립되는 폴더는 통째로 포함: ${[...dirRefs].join(", ")}`);
  }

  let total = 0;
  const unusedImages = [];
  for (const item of INCLUDE) {
    if (!(await exists(path.join(ROOT, item)))) {
      console.log(`  건너뜀 ${item} (없음)`);
      continue;
    }
    // img/ 는 참조된 파일만, 나머지는 통째로 올립니다.
    const keep = item === "img" ? (rel) => refs.has(rel) : () => true;
    const { copied, skipped } = await copyTree(item, keep);
    if (item === "img") unusedImages.push(...skipped.filter((r) => !isImageManifest(r)));
    total += copied;
    console.log(`  ${item}: ${copied}개 복사${skipped.length ? `, ${skipped.length}개 제외` : ""}`);
  }

  // 빈 폴더는 FTP 클라이언트가 건너뛰므로 미리 만들어 둡니다.
  for (const dir of ["admin/uploads/popups", "admin/uploads/community", "admin/storage"]) {
    await fs.mkdir(path.join(OUT, dir), { recursive: true });
  }

  // 검증 1 — 참조된 자산이 전부 올라갔는지.
  // 저장소에 아예 없는 파일을 가리키는 참조는 사이트 쪽 문제라 빌드를 세우지 않고 알리기만 합니다.
  const missing = [];
  const danglingRefs = [];
  for (const rel of refs) {
    if (await exists(path.join(OUT, rel))) continue;
    if (await exists(path.join(ROOT, rel))) missing.push(rel);
    else danglingRefs.push(rel);
  }

  // 검증 2 — .htaccess 가 전부 포함됐는지. 빠지면 보안 차단이 통째로 풀립니다.
  const htaccess = [".htaccess", "admin/.htaccess", "admin/includes/.htaccess", "admin/storage/.htaccess", "admin/uploads/.htaccess"];
  const missingHtaccess = [];
  for (const rel of htaccess) {
    if (!(await exists(path.join(OUT, rel)))) missingHtaccess.push(rel);
  }

  // 검증 3 — 비밀이 담길 수 있는 파일이 섞여 들어가지 않았는지.
  const leaked = (await walk(OUT)).filter((rel) => EXCLUDE.has(rel));

  // dist/ 안에 두면 웹 루트에 그대로 올라가 내부 파일 경로가 노출됩니다.
  const reportPath = path.join(ROOT, "dist-excluded-images.txt");
  if (unusedImages.length) {
    await fs.writeFile(
      reportPath,
      `${unusedImages.length}개 — 어디에서도 참조되지 않아 업로드 대상에서 제외했습니다. 저장소에는 그대로 남아 있습니다.\n\n${unusedImages.join("\n")}\n`,
      "utf8"
    );
  } else {
    await fs.rm(reportPath, { force: true });
  }

  console.log(`\n${total}개 파일, ${mb(await dirSize(OUT))}`);
  console.log(`위치: ${OUT}`);
  console.log(`이 폴더 '안의 내용 전체'를 서버의 /www/ 에 올리세요.`);
  if (unusedImages.length) console.log(`참조 없는 이미지 ${unusedImages.length}개 제외 (목록: dist-excluded-images.txt)`);

  if (danglingRefs.length) {
    console.log(`\n참고 — 저장소에 없는 파일을 가리키는 참조 ${danglingRefs.length}건 (업로드와 무관):`);
    for (const r of danglingRefs) console.log(`  - ${r}`);
  }

  const problems = [
    ...missing.map((r) => `참조된 자산 누락: ${r}`),
    ...missingHtaccess.map((r) => `.htaccess 누락: ${r}`),
    ...leaked.map((r) => `제외 대상이 포함됨: ${r}`),
  ];
  if (problems.length) {
    console.log(`\n${problems.length}건의 문제:`);
    for (const p of problems) console.log(`  - ${p}`);
    process.exitCode = 1;
  } else {
    console.log(`\n검증 통과 — 참조 ${refs.size}개 전부 포함, .htaccess ${htaccess.length}개 포함, 제외 대상 혼입 없음.`);
  }
}

await main();
