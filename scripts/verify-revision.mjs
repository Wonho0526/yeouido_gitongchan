import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startServer } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CODEX_NODE_MODULES ? path.join(process.env.CODEX_NODE_MODULES, 'playwright') : 'playwright');
const { server, origin } = await startServer();
let browser;
let failures = 0;
function check(name, ok) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failures++; }
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const pages = ['index', 'about', 'special', 'doctor', 'values', 'neck-shoulder', 'spine-joint', 'hand-wrist', 'knee', 'foot-heel', 'neuralgia', 'injection', 'shockwave', 'manual-therapy', 'autonomic', 'recovery-iv', 'c-arm', 'ultrasound', 'spaces', 'location'];
  await fs.mkdir('.screenshots/revision', { recursive: true });
  for (const width of [390, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of pages) {
      await page.goto(`${origin}/${name === 'index' ? 'index.html' : `sub/${name}.html`}`, { waitUntil: 'networkidle' });
      await page.locator('.site-header').waitFor();
      check(`${width}px ${name}: no page overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      check(`${width}px ${name}: images load`, await page.locator('img').evaluateAll(images => images.filter(i => i.loading !== 'lazy').every(i => i.complete && i.naturalWidth > 0)));
      check(`${width}px ${name}: reservation anchors ready`, await page.locator('[data-naver-reservation]').evaluateAll(links => links.length >= 2 && links.every(a => a.tagName === 'A' && a.hasAttribute('href') && !a.hasAttribute('disabled'))));
      if (['injection','shockwave','manual-therapy','autonomic','recovery-iv'].includes(name)) {
        check(`${name}: no repeated KEY POINT footer`, await page.locator('.footer-key-points').count() === 0);
      }
      if (width === 390 && ['index','special','neck-shoulder','injection','autonomic','location','spaces'].includes(name)) {
        await page.screenshot({ path: `.screenshots/revision/${name}-mobile.png`, fullPage: true });
      }
      if (width === 1440 && ['index','injection','special','location'].includes(name)) {
        await page.screenshot({ path: `.screenshots/revision/${name}-desktop.png`, fullPage: true });
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/index.html`, { waitUntil: 'networkidle' });
  check('hero has four slides', await page.locator('[data-hero-slide]').count() === 4);
  await page.locator('[data-hero-next]').click();
  check('hero arrow advances', await page.locator('[data-hero-slide]').nth(1).evaluate(el => el.classList.contains('is-active')));
  await page.locator('[data-hero-dots] button').nth(3).click();
  check('hero dot advances', await page.locator('[data-hero-slide]').nth(3).evaluate(el => el.classList.contains('is-active')));
  await page.locator('[data-hero-slider]').evaluate(el => {
    const touch = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 350 });
    el.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(300)], bubbles: true }));
    el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [touch(100)], bubbles: true }));
  });
  check('hero swipe wraps', await page.locator('[data-hero-slide]').nth(0).evaluate(el => el.classList.contains('is-active')));
  await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
  await page.getByRole('button', { name: '찬 찬란한 일상을 위한 진료환경', exact: true }).click();
  check('environment submenu opens', await page.locator('.sub-nav-link[href="sub/spaces.html"]').isVisible());
  check('community removed from nav', !await page.locator('.main-nav').innerText().then(s => s.includes('커뮤니티')));
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  check('menu Escape closes', await page.getByRole('button', { name: '메뉴 열기', exact: true }).getAttribute('aria-expanded') === 'false');
  await page.goto(`${origin}/sub/neck-shoulder.html`, { waitUntil: 'networkidle' });
  await page.locator('.condition-tab').nth(4).click();
  check('condition anchor scroll clears sticky bars', await page.locator('#condition-5').evaluate(el => el.getBoundingClientRect().top >= 130));
  check('region bar stays below header', await page.locator('#site-local-nav-root').evaluate(el => Math.abs(el.getBoundingClientRect().top - 80) < 2));
  await page.locator('.sub-local-nav a[href="neuralgia.html"]').click();
  check('region navigation shows selected diseases', await page.locator('h1').innerText() === '두통·신경통');
  const reserve=page.locator('[data-naver-reservation]').first();
  await reserve.evaluate(a => a.setAttribute('href', '#reservation-test'));
  await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
  await reserve.click();
  check('changing only reservation href enables navigation', page.url().endsWith('#reservation-test'));
  check('no JavaScript errors', errors.length === 0);
  if (errors.length) console.log(errors);
  // Local HTML preview must mount the shared layout as well as HTTP preview.
  // crossorigin on local classic scripts prevents this under file://.
  for (const name of pages) {
    const relative = name === 'index' ? 'index.html' : `sub/${name}.html`;
    await page.goto(pathToFileURL(path.resolve(relative)).href, { waitUntil: 'load' });
    await page.locator('.site-header').waitFor();
    check(`file preview ${name}: header and footer mount`,
      await page.locator('.site-header').count() === 1 && await page.locator('.site-footer').count() === 1);
  }
} finally {
  await browser?.close();
  server.close();
}
process.exitCode = failures ? 1 : 0;
