// sitemap.xml 을 다시 만듭니다.
//
//   npm run build:sitemap
//
// lastmod 는 추정하지 않습니다. 파일에 커밋되지 않은 변경이 있으면 오늘 날짜를,
// 없으면 그 파일의 마지막 커밋 날짜를 씁니다. 커밋한 뒤 다시 실행하면 날짜가
// 커밋 날짜로 정리됩니다. verify-seo.mjs 가 같은 규칙으로 검사합니다.
//
// 색인 대상 목록(INDEXED)은 verify-seo.mjs 도 여기서 가져다 씁니다. 페이지를
// 추가하거나 뺄 때는 이 배열만 고치면 됩니다.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const DOMAIN = 'https://xn--ok0bu9hnyrvkbwwl58i.com';

// 색인 대상 20페이지. 리다이렉트 스텁(hours·c-arm·ultrasound)과 admin 은 넣지 않습니다.
export const INDEXED = [
  'index.html',
  'sub/about.html', 'sub/special.html', 'sub/doctor.html', 'sub/values.html',
  'sub/neck-shoulder.html', 'sub/spine-joint.html', 'sub/hand-wrist.html',
  'sub/knee.html', 'sub/foot-heel.html', 'sub/neuralgia.html',
  'sub/injection.html', 'sub/shockwave.html', 'sub/manual-therapy.html',
  'sub/autonomic.html', 'sub/recovery-iv.html',
  'sub/equipment.html', 'sub/spaces.html',
  'sub/location.html', 'sub/community.html',
];

export const canonicalFor = (rel) => (rel === 'index.html' ? `${DOMAIN}/` : `${DOMAIN}/${rel}`);

const git = (args) => execFileSync('git', args, { cwd: ROOT }).toString();

/** 파일 내용이 마지막으로 바뀐 날짜. 미커밋 변경이 있으면 오늘. */
export function lastmodFor(rel) {
  if (git(['status', '--porcelain', '--', rel]).trim() !== '') {
    return new Date().toLocaleDateString('sv-SE'); // 로컬 시간대 기준 YYYY-MM-DD
  }
  const date = git(['log', '-1', '--format=%ad', '--date=short', '--', rel]).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${rel}: git 커밋 날짜를 읽지 못했습니다`);
  }
  return date;
}

export function buildSitemap() {
  const rows = INDEXED.map((rel) => {
    if (!fs.existsSync(path.join(ROOT, rel))) throw new Error(`${rel}: 파일이 없습니다`);
    return `  <url>\n    <loc>${canonicalFor(rel)}</loc>\n    <lastmod>${lastmodFor(rel)}</lastmod>\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}

// 직접 실행했을 때만 파일을 씁니다. import 할 때는 쓰지 않습니다.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const xml = buildSitemap();
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
  console.log(`sitemap.xml 생성 — ${INDEXED.length}개 URL`);
  for (const rel of INDEXED) console.log(`  ${canonicalFor(rel)}  ${lastmodFor(rel)}`);
}
