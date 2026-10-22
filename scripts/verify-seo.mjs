// SEO / AEO / GEO 세팅을 검증합니다. 작업 지시서 SEO-AEO-GEO-20261022 의 완료 조건
// C1~C11 을 저장소 파일만으로 판정합니다. 네트워크에 나가지 않습니다.
//
//   npm run verify:seo
//
// 실패하면 종료코드 1로 끝납니다.
import fs from 'node:fs';
import path from 'node:path';
// 색인 대상 목록과 lastmod 규칙은 생성기와 공유합니다. 목록이 갈라지지 않게 합니다.
import { DOMAIN, INDEXED, ROOT, canonicalFor, lastmodFor } from './build-sitemap.mjs';

// 리다이렉트 스텁 -> canonical 목적지.
const STUBS = {
  'sub/hours.html': 'sub/location.html',
  'sub/c-arm.html': 'sub/equipment.html',
  'sub/ultrasound.html': 'sub/equipment.html',
};

// 사용자가 네이버 서치어드바이저용으로 지정한 문안. 글자 단위로 일치해야 합니다.
const HOME_TITLE = '여의도정형외과 | 여의도기통찬의원 - 영등포구정형외과, 여의도도수치료, 여의도물리치료, 여의도허리통증, 여의도거북목';
const HOME_DESC = '작은 통증까지 세심하게 살피는 서울 여의도 주민의 평생 주치의, 여의도기통찬의원, 성정원 통사 아카데미 정강사 출신의 이동현 대표원장이 직접 진료합니다. 여의도정형외과, 영등포구정형외과, 여의도도수치료, 여의도목디스크, 여의도거북목, 여의도허리디스크, 여의도허리통증, 여의도물리치료 척추관절 중점 통증의학과로 KB국민은행 동여의도점 건물 4층 위치.';

// 사이트에 근거가 없거나 자체 생성이 금지된 구조화 데이터 키.
const BANNED_LD_KEYS = ['aggregateRating', 'review', 'medicalSpecialty', 'priceRange'];

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${label}`);
  if (!ok) {
    failures++;
    if (detail) console.log(`       ${detail}`);
  }
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const relOf = (url) => (url === `${DOMAIN}/` ? 'index.html' : url.slice(DOMAIN.length + 1));
const unescapeHtml = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&amp;/g, '&');

const attr = (html, re) => {
  const all = [...html.matchAll(re)];
  return { count: all.length, value: all.length ? unescapeHtml(all[0][1]) : null };
};
const metaName = (html, name) =>
  attr(html, new RegExp(`<meta\\s+name="${name}"\\s+content="(.*?)"\\s*/?>`, 'gs'));
const metaProp = (html, prop) =>
  attr(html, new RegExp(`<meta\\s+property="${prop}"\\s+content="(.*?)"\\s*/?>`, 'gs'));

const ldBlocks = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => m[1]);

console.log('\n=== C1 canonical ===');
for (const rel of INDEXED) {
  const html = read(rel);
  const got = attr(html, /<link\s+rel="canonical"\s+href="(.*?)"\s*\/?>/gs);
  check(`${rel}: canonical 1개이고 자기 절대 URL`,
    got.count === 1 && got.value === canonicalFor(rel),
    `개수 ${got.count}, 값 ${got.value}, 기대 ${canonicalFor(rel)}`);
  // 색인 대상 페이지에 noindex 가 섞여 들어가면 색인에서 통째로 빠집니다.
  check(`${rel}: noindex 아님`, !(metaName(html, 'robots').value || '').includes('noindex'),
    `robots=${metaName(html, 'robots').value}`);
}

console.log('\n=== C2 OG / twitter 태그 존재 ===');
const OG_PROPS = ['og:type', 'og:site_name', 'og:locale', 'og:url', 'og:title', 'og:description', 'og:image'];
const TW_NAMES = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];
for (const rel of INDEXED) {
  const html = read(rel);
  const missing = [];
  for (const p of OG_PROPS) if (metaProp(html, p).count !== 1) missing.push(`${p}(${metaProp(html, p).count})`);
  for (const n of TW_NAMES) if (metaName(html, n).count !== 1) missing.push(`${n}(${metaName(html, n).count})`);
  check(`${rel}: OG 7개 + twitter 4개 각 1회`, missing.length === 0, missing.join(', '));
}

console.log('\n=== C3 OG 값이 title / description / canonical 과 일치 ===');
for (const rel of INDEXED) {
  const html = read(rel);
  const title = unescapeHtml((html.match(/<title>(.*?)<\/title>/s) || [, ''])[1].replace(/<[^>]+>/g, '').trim());
  const desc = metaName(html, 'description').value;
  const ogTitle = metaProp(html, 'og:title').value;
  const ogDesc = metaProp(html, 'og:description').value;
  const ogUrl = metaProp(html, 'og:url').value;
  const twTitle = metaName(html, 'twitter:title').value;
  const twDesc = metaName(html, 'twitter:description').value;
  const problems = [];
  if (ogTitle !== title) problems.push('og:title != <title>');
  if (ogDesc !== desc) problems.push('og:description != description');
  if (ogUrl !== canonicalFor(rel)) problems.push('og:url != canonical');
  if (twTitle !== title) problems.push('twitter:title != <title>');
  if (twDesc !== desc) problems.push('twitter:description != description');
  if (/<[a-z]/i.test((html.match(/<title>(.*?)<\/title>/s) || [, ''])[1])) problems.push('<title> 안에 태그');
  check(`${rel}: OG·twitter 값 일치`, problems.length === 0, problems.join(', '));
}

console.log('\n=== C4 루트 문안이 사용자 확정 문안과 일치 ===');
{
  const html = read('index.html');
  const title = (html.match(/<title>(.*?)<\/title>/s) || [, ''])[1];
  check('index.html: title 글자 단위 일치', title === HOME_TITLE, `실제 ${title}`);
  check('index.html: description 글자 단위 일치',
    metaName(html, 'description').value === HOME_DESC);
  check('index.html: naver-site-verification 보존',
    metaName(html, 'naver-site-verification').value === '01ded8e4ae430917089862138d803375c537c84f');
  console.log(`       적용 안: A(사용자 요청 원문). title ${title.length}자 / description ${HOME_DESC.length}자`);
}

console.log('\n=== C5 robots.txt ===');
{
  check('robots.txt 존재', exists('robots.txt'));
  if (exists('robots.txt')) {
    const txt = read('robots.txt');
    const mustAllow = ['Yeti', 'Daum', 'Googlebot', 'Bingbot', 'GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended'];
    // 에이전트별 블록을 끊어서 Disallow: / 가 걸려 있지 않은지 본다.
    const blocks = txt.split(/\n(?=User-agent:)/);
    for (const agent of mustAllow) {
      const block = blocks.find((b) => new RegExp(`^User-agent:\\s*${agent}\\s*$`, 'm').test(b));
      const blocked = block ? /^Disallow:\s*\/\s*$/m.test(block) : false;
      check(`robots.txt: ${agent} 전체 차단 아님`, block !== undefined && !blocked,
        block === undefined ? '해당 User-agent 블록 없음' : 'Disallow: / 가 있음');
    }
    check('robots.txt: /admin/ 차단', /^Disallow:\s*\/admin\/\s*$/m.test(txt));
    check('robots.txt: sub/admin.html 차단', /^Disallow:\s*\/sub\/admin\.html\s*$/m.test(txt));
    const sitemapLines = txt.match(/^Sitemap:\s*\S+$/gm) || [];
    check('robots.txt: Sitemap 절대 URL 1줄',
      sitemapLines.length === 1 && sitemapLines[0].includes(`${DOMAIN}/sitemap.xml`),
      sitemapLines.join(' | '));
  }
}

console.log('\n=== C6 sitemap.xml ===');
{
  check('sitemap.xml 존재', exists('sitemap.xml'));
  if (exists('sitemap.xml')) {
    const xml = read('sitemap.xml');
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    check(`sitemap: <loc> 20개 (실제 ${locs.length})`, locs.length === 20);
    check('sitemap: 중복 없음', new Set(locs).size === locs.length);
    check('sitemap: 전부 절대 URL', locs.every((l) => l.startsWith(`${DOMAIN}/`)));
    check('sitemap: 프래그먼트 없음', locs.every((l) => !l.includes('#')));
    const banned = ['hours.html', 'c-arm.html', 'ultrasound.html', 'admin.html'];
    check('sitemap: 스텁·관리자 페이지 없음',
      locs.every((l) => !banned.some((b) => l.endsWith(b))),
      locs.filter((l) => banned.some((b) => l.endsWith(b))).join(', '));
    const expected = new Set(INDEXED.map(canonicalFor));
    check('sitemap: 색인 대상 목록과 동일',
      locs.length === expected.size && locs.every((l) => expected.has(l)));
    const missingFiles = locs.map(relOf).filter((rel) => !exists(rel));
    check('sitemap: 모든 URL에 대응 파일 존재', missingFiles.length === 0, missingFiles.join(', '));
    const entries = [...xml.matchAll(/<loc>(.*?)<\/loc>\s*<lastmod>(.*?)<\/lastmod>/g)];
    check('sitemap: 모든 항목에 lastmod', entries.length === locs.length);
    // 추정 날짜를 막습니다. 미커밋 변경이 있으면 오늘, 없으면 마지막 커밋 날짜여야 합니다.
    const wrongDates = entries.filter(([, loc, mod]) => lastmodFor(relOf(loc)) !== mod);
    check('sitemap: lastmod 이 파일의 실제 변경 날짜와 일치', wrongDates.length === 0,
      `${wrongDates.map(([, l, m]) => `${l} ${m}`).join(', ')}  → npm run build:sitemap 으로 재생성하세요`);
  }
}

console.log('\n=== C7 JSON-LD 구조 ===');
{
  const allNodes = [];
  for (const rel of [...INDEXED, ...Object.keys(STUBS)]) {
    const html = read(rel);
    for (const [i, raw] of ldBlocks(html).entries()) {
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        check(`${rel}: ld+json #${i + 1} 파싱`, false, e.message);
        continue;
      }
      check(`${rel}: ld+json 블록 ${i + 1} 파싱 및 @context`,
        parsed['@context'] === 'https://schema.org');
      const nodes = parsed['@graph'] || [parsed];
      allNodes.push(...nodes.map((n) => ({ rel, node: n })));
    }
  }
  const typesOn = (rel) => allNodes
    .filter((x) => x.rel === rel)
    .flatMap((x) => [].concat(x.node['@type'] || []));
  check('index.html: MedicalClinic 있음', typesOn('index.html').includes('MedicalClinic'));
  check('index.html: WebSite 있음', typesOn('index.html').includes('WebSite'));
  check('index.html: Physician 있음', typesOn('index.html').includes('Physician'));
  check('sub/doctor.html: Physician 있음', typesOn('sub/doctor.html').includes('Physician'));
  const noCrumb = INDEXED.filter((rel) => rel !== 'index.html' && !typesOn(rel).includes('BreadcrumbList'));
  check('서브 19페이지 전부 BreadcrumbList', noCrumb.length === 0, noCrumb.join(', '));

  console.log('\n=== C9 금지 키와 기관 정보 일치 ===');
  const serialized = JSON.stringify(allNodes);
  for (const key of BANNED_LD_KEYS) {
    check(`JSON-LD: ${key} 0건`, !serialized.includes(`"${key}"`));
  }
  const clinic = allNodes.map((x) => x.node).find((n) => [].concat(n['@type'] || []).includes('MedicalClinic'));
  check('MedicalClinic: telephone 02-782-7070', clinic?.telephone === '+82-2-782-7070');
  check('MedicalClinic: faxNumber 02-782-7071', clinic?.faxNumber === '+82-2-782-7071');
  check('MedicalClinic: 사업자등록번호 458-95-01994', clinic?.identifier?.value === '458-95-01994');
  check('MedicalClinic: 주소 국제금융로 72',
    clinic?.address?.streetAddress?.includes('국제금융로 72') === true);
  check('MedicalClinic: name 은 법적 기관명', clinic?.name === '여의도기통찬의원',
    `실제 ${clinic?.name}`);
  check('MedicalClinic: sameAs 5개 채널', (clinic?.sameAs || []).length === 5);

  // sameAs 의 각 URL이 실제로 사이트 안에 링크로 존재하는지 대조합니다.
  const linkSource = read('js/components/Footer.js') + read('js/components/Header.js');
  const strayLinks = (clinic?.sameAs || []).filter((u) => !linkSource.includes(u));
  check('MedicalClinic: sameAs 가 사이트 링크와 일치', strayLinks.length === 0,
    strayLinks.join(', '));

  // 경력 표기 대조. "연수"를 alumniOf(출신)로 적는 것 같은 과장을 막습니다.
  // 대조 대상은 **본문**입니다. script(JSON-LD 포함)를 먼저 걷어내지 않으면 우리가 넣은
  // 구조화 데이터 자신을 근거로 읽어 검사가 무의미해집니다.
  const doctorText = read('sub/doctor.html')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  const physicians = allNodes.map((x) => x.node)
    .filter((n) => [].concat(n['@type'] || []).includes('Physician'));
  check('Physician 노드 2개 (index, doctor)', physicians.length === 2, `실제 ${physicians.length}`);
  for (const p of physicians) {
    const orgs = [].concat(p.alumniOf || [], p.memberOf || []).map((o) => o.name);
    const unsupported = orgs.filter((name) => !doctorText.includes(name));
    check(`Physician: alumniOf·memberOf 가 sub/doctor.html 기재와 일치 (${orgs.join(', ')})`,
      unsupported.length === 0, `근거 없음: ${unsupported.join(', ')}`);
    // 속성마다 근거 문장의 **동사**까지 맞는지 봅니다. 값이 사이트에 있다는 것만으로는
    // 부족합니다. "연수"를 alumniOf(출신)로, "정강사"를 memberOf(회원)로 쓴 적이 있습니다.
    // 같은 기관이 여러 줄에 다른 자격으로 나옵니다(예: "대한정형통증의학회 TPI 과정 수료"와
    // "대한정형통증의학회 정회원"). 한 줄이라도 해당 자격을 뒷받침하면 통과입니다.
    const windows = (name) => {
      const out = [];
      for (let i = doctorText.indexOf(name); i >= 0; i = doctorText.indexOf(name, i + 1)) {
        out.push(doctorText.slice(i, i + name.length + 24).replace(/\s+/g, ' ').trim());
      }
      return out;
    };
    const supports = (name, re) => windows(name).some((w) => re.test(w));

    const badAlumni = [].concat(p.alumniOf || []).map((o) => o.name)
      .filter((name) => !supports(name, /수료|취득|졸업/));
    check('Physician: alumniOf 는 수료·취득·졸업 근거만', badAlumni.length === 0,
      badAlumni.map((n) => `${n} → ${JSON.stringify(windows(n))}`).join(' / '));

    const badMember = [].concat(p.memberOf || []).map((o) => o.name)
      .filter((name) => !supports(name, /회원/));
    check('Physician: memberOf 는 회원 근거만', badMember.length === 0,
      badMember.map((n) => `${n} → ${JSON.stringify(windows(n))}`).join(' / '));

    // 연수 기관은 어느 쪽에도 들어가면 안 됩니다.
    const training = [].concat(p.alumniOf || [], p.memberOf || []).map((o) => o.name)
      .filter((name) => new RegExp(`${name}\\s*연수`).test(doctorText));
    check('Physician: 연수 기관을 출신·회원으로 쓰지 않음', training.length === 0,
      `연수 기관: ${training.join(', ')}`);
    check('Physician: 전문과목 표기 없음', p.medicalSpecialty === undefined);
  }

  // 빵부스러기의 각 단계가 실재 페이지를 가리키는지 확인합니다.
  const crumbLists = allNodes.map((x) => x.node)
    .filter((n) => [].concat(n['@type'] || []).includes('BreadcrumbList'));
  const brokenCrumbs = crumbLists.flatMap((l) => (l.itemListElement || [])
    .map((i) => i.item)
    .filter((u) => !u.startsWith(DOMAIN) || (relOf(u) !== 'index.html' && !exists(relOf(u)))));
  check('BreadcrumbList: 모든 단계가 실재 페이지', brokenCrumbs.length === 0,
    [...new Set(brokenCrumbs)].join(', '));
}

console.log('\n=== C8 비색인 페이지 ===');
for (const [rel, target] of Object.entries(STUBS)) {
  const html = read(rel);
  const robots = metaName(html, 'robots').value;
  const canon = attr(html, /<link\s+rel="canonical"\s+href="(.*?)"\s*\/?>/gs);
  check(`${rel}: noindex`, (robots || '').includes('noindex'), `robots=${robots}`);
  check(`${rel}: canonical → ${target}`, canon.value === canonicalFor(target), `값 ${canon.value}`);
}
{
  const html = read('sub/admin.html');
  check('sub/admin.html: 기존 noindex, nofollow 유지',
    metaName(html, 'robots').value === 'noindex, nofollow');
  check('sub/admin.html: canonical 추가하지 않음',
    !/<link\s+rel="canonical"/.test(html));
}

console.log('\n=== C12 질환명 커버리지 ===');
// 질환 페이지의 질환명이 AI 요약 자산에서 누락되지 않았는지 봅니다.
// `<h2>` 안에 괄호 부제가 중첩 태그로 들어간 항목(목디스크(경추 추간판 탈출증) 등)을
// 놓치지 않도록 태그를 허용해서 읽습니다. 태그를 제외하는 정규식으로 추출했다가
// 9개를 누락한 적이 있습니다.
{
  const CONDITION_PAGES = [
    'sub/neck-shoulder.html', 'sub/spine-joint.html', 'sub/hand-wrist.html',
    'sub/knee.html', 'sub/foot-heel.html', 'sub/neuralgia.html',
  ];
  const conditionsOf = (rel) => {
    const html = read(rel);
    const names = [];
    for (const m of html.matchAll(/id="condition-\d+"/g)) {
      const h2 = /<h2[^>]*>(.*?)<\/h2>/s.exec(html.slice(m.index));
      if (!h2) continue;
      const title = unescapeHtml(h2[1].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
      // 한 패널 제목에 질환이 둘 든 경우("테니스 엘보 / 골프 엘보")는 나눠서 센다.
      for (const name of title.split(' / ').map((t) => t.trim())) {
        if (name && !names.includes(name)) names.push(name);
      }
    }
    return names;
  };

  const indexHtml = read('index.html');
  const llms = exists('llms.txt') ? read('llms.txt') : '';
  const all = [];
  for (const rel of CONDITION_PAGES) {
    const names = conditionsOf(rel);
    check(`${rel}: 질환명 추출됨 (${names.length}개)`, names.length > 0);
    all.push(...names);

    // 그 페이지 description 에 대표(첫) 질환이 들어 있는지. 괄호 부제는 빼고 봅니다.
    const lead = names[0].replace(/\(.*$/, '').trim();
    const desc = metaName(read(rel), 'description').value || '';
    check(`${rel}: description 에 대표 질환 "${lead}" 포함`, desc.includes(lead), `실제: ${desc}`);
  }

  const missingLd = all.filter((n) => !indexHtml.includes(`"${n}"`));
  check(`index.html knowsAbout: 질환 ${all.length}개 전부 수록`, missingLd.length === 0,
    `누락 ${missingLd.length}개: ${missingLd.join(', ')}`);
  const missingLlms = all.filter((n) => !llms.includes(n));
  check(`llms.txt: 질환 ${all.length}개 전부 수록`, missingLlms.length === 0,
    `누락 ${missingLlms.length}개: ${missingLlms.join(', ')}`);
}

console.log('\n=== C10 llms.txt ===');
{
  check('llms.txt 존재', exists('llms.txt'));
  if (exists('llms.txt')) {
    const txt = read('llms.txt');
    const urls = [...txt.matchAll(new RegExp(`${DOMAIN}/(\\S*)`, 'g'))].map((m) => m[1]);
    const broken = urls
      .map((u) => u.replace(/[).,]+$/, '').split('#')[0])
      .filter((u) => u !== '' && !exists(u));
    check('llms.txt: 내부 링크 전부 실재 파일', broken.length === 0, [...new Set(broken)].join(', '));
    check('llms.txt: 자체 생성 평점·후기 없음', !/평점|별점|후기|리뷰 \d/.test(txt));
    // "효과를 보장하는 것이 아닙니다" 같은 부정문은 걸리지 않게, 단정형만 잡습니다.
    check('llms.txt: 단정 표현 없음',
      !/최고|유일|1위|완치|부작용 없/.test(txt) && !/보장(합니다|해 드|해드|됩니다|드립니다)/.test(txt));
    // docs/medical-copy-sources.md 는 특정 치료의 효과를 보장하지 않을 것을 요구합니다.
    check('llms.txt: 치료 효과 단정 없음', !/재생과 회복을 돕습니다|원인을 찾아 치료합니다/.test(txt));
    check('llms.txt: 효과 면책 문구 있음',
      txt.includes('효과를 보장하는 것이 아닙니다') && txt.includes('환자의 상태에 따라'));
    check('llms.txt: 진료시간 기재', txt.includes('09:00 ~ 20:00'));
    check('llms.txt: 주소 기재', txt.includes('국제금융로 72'));
    check('llms.txt: 경력은 연수/현직 표기 유지', txt.includes('서울대학교병원 연수'));
  }
}

console.log('\n=== C11 배포 파이프라인 ===');
{
  const build = read('scripts/build-deploy.mjs');
  for (const f of ['robots.txt', 'sitemap.xml', 'llms.txt']) {
    check(`build-deploy INCLUDE 에 ${f}`, new RegExp(`"${f.replace('.', '\\.')}"`).test(build));
  }
  const pkg = JSON.parse(read('package.json'));
  check('package.json: verify:seo 등록', pkg.scripts['verify:seo'] === 'node scripts/verify-seo.mjs');
  check('package.json: build:sitemap 등록',
    pkg.scripts['build:sitemap'] === 'node scripts/build-sitemap.mjs');
  // 존재만 보면 오래된 dist 가 통과합니다. 내용까지 같은지 봅니다.
  check('dist/ 존재', exists('dist'), 'npm run build:deploy 를 실행하세요');
  if (exists('dist')) {
    for (const f of ['robots.txt', 'sitemap.xml', 'llms.txt', 'index.html']) {
      const distFile = path.join('dist', f);
      const same = exists(distFile) && read(distFile) === read(f);
      check(`dist/${f} 가 최신`, same,
        exists(distFile) ? '내용이 루트와 다릅니다 → npm run build:deploy'
          : '파일이 없습니다 → npm run build:deploy');
    }
  }
}

console.log(`\n${failures ? `${failures} CHECK(S) FAILED` : '검증 통과 — 모든 항목 정상'}`);
process.exitCode = failures ? 1 : 0;
