import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startServer } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CODEX_NODE_MODULES ? path.join(process.env.CODEX_NODE_MODULES, 'playwright') : 'playwright');
const { server, origin } = await startServer();
let browser;
let failures = 0;
const check = (name, condition) => { console.log(`${condition ? 'PASS' : 'FAIL'} ${name}`); if (!condition) failures++; };
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  let navigations = 0;
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigations++; });
  await fs.mkdir('.screenshots/equipment', { recursive: true });
  const selected = async (key) => {
    await page.waitForFunction(key => document.body.dataset.equipmentActive === key, key);
    const result = await page.evaluate(key => {
      const visible = selector => [...document.querySelectorAll(selector)].filter(el => !el.hidden);
      return {
        panels: visible('[data-equipment-panel]').length,
        heroes: document.querySelectorAll('.sub-hero').length,
        images: document.querySelectorAll('.equipment-card.is-active').length,
        hero: document.querySelector('.sub-hero').innerHTML,
        cardKey: document.querySelector('.equipment-card.is-active').dataset.equipmentCard,
        imageAbove: document.querySelector('[data-equipment-slider]').getBoundingClientRect().bottom <= document.querySelector('[data-equipment-panel]:not([hidden])').getBoundingClientRect().top + 1,
        key: document.querySelector('[data-equipment-panel]:not([hidden])').dataset.equipmentPanel,
        current: document.querySelector('.sub-local-nav [aria-current="page"]')?.getAttribute('href'),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        title: document.title,
        content: document.querySelector('[data-equipment-panel]:not([hidden])').textContent,
      };
    }, key);
    check(`${key}: hero, image, content and category stay in sync`, result.panels === 1 && result.heroes === 1 && result.images === 1 && result.key === key && result.cardKey === key && result.imageAbove && result.current === `equipment.html#${key}`);
    check(`${key}: no horizontal overflow`, !result.overflow);
    check(`${key}: title and detailed content match`, key === 'c-arm'
      ? result.title.includes('최신 의료장비') && result.content.includes('정밀 척추 신경주사') && !result.content.includes('삼성메디슨 V5 / HS50')
      : key === 'eswt' ? result.content.includes('체외충격파 ESWT')
      : key === 'cryo-jet' ? result.content.includes('Cryo-Jet 냉각치료 장비')
      : result.title.includes('최신 의료장비') && result.content.includes('삼성메디슨 V5 / HS50'));
  };

  for (const width of [390, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/sub/equipment.html`, { waitUntil: 'networkidle' });
    await page.locator('.sub-local-nav').waitFor();
    check(`${width}: equipment tabs exclude spaces`, JSON.stringify(await page.locator('.sub-local-nav a').allTextContents()) === JSON.stringify(['C-arm', '초음파', 'Cryo-Jet', '체외충격파']));
    await selected('c-arm');
    const heroBefore = await page.locator('.sub-hero').innerHTML();
    const transformBefore = await page.locator('.equipment-card-track').evaluate(el => getComputedStyle(el).transform);
    const before = navigations;
    await page.locator('.equipment-slider [data-equipment-next]').click();
    await selected('ultrasound');
    check(`${width}: hero stays unchanged and cards move horizontally`, heroBefore === await page.locator('.sub-hero').innerHTML() && transformBefore !== await page.locator('.equipment-card-track').evaluate(el => getComputedStyle(el).transform));
    await page.locator('.equipment-card img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    await page.locator('[data-equipment-slider]').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.screenshot({ path: `.screenshots/equipment/ultrasound-${width}.png` });
    await page.locator('.equipment-slider [data-equipment-next]').click();
    await selected('cryo-jet');
    await page.locator('[data-equipment-card="cryo-jet"] img').evaluate(image => image.decode());
    await page.locator('[data-equipment-slider]').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.screenshot({ path: `.screenshots/equipment/cryo-jet-${width}.png` });
    check(`${width}: Cryo-Jet keeps hero fixed`, heroBefore === await page.locator('.sub-hero').innerHTML());
    await page.locator('.equipment-slider [data-equipment-next]').click();
    await selected('eswt');
    await page.locator('[data-equipment-card="eswt"] img').evaluate(image => image.decode());
    await page.locator('[data-equipment-slider]').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.screenshot({ path: `.screenshots/equipment/eswt-${width}.png` });
    check(`${width}: ESWT keeps hero fixed`, heroBefore === await page.locator('.sub-hero').innerHTML());
    check(`${width}: bottom slider buttons removed`, await page.locator('.equipment-bottom-controls').count() === 0 && await page.locator('[data-equipment-next]').count() === 1);
    await page.locator('.equipment-slider [data-equipment-next]').click();
    await selected('c-arm');
    check(`${width}: arrows change content without a page load and wrap`, before === navigations && page.url().endsWith('#c-arm'));
    await page.locator('.sub-local-nav a[href="equipment.html#ultrasound"]').click();
    await selected('ultrasound');
    check(`${width}: category changes content without page load`, before === navigations);
    await page.goBack();
    await selected('c-arm');
    await page.goForward();
    await selected('ultrasound');
    await page.reload({ waitUntil: 'networkidle' });
    await selected('ultrasound');
    await page.locator('[data-equipment-slider]').focus();
    await page.keyboard.press('Home');
    await selected('c-arm');
    await page.keyboard.press('End');
    await selected('eswt');
    await page.locator('[data-equipment-slider]').evaluate(slider => {
      const touch = x => new Touch({ identifier: 1, target: slider, clientX: x, clientY: 250 });
      slider.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(300)], bubbles: true }));
      slider.dispatchEvent(new TouchEvent('touchend', { changedTouches: [touch(100)], bubbles: true }));
    });
    await selected('c-arm');
    await page.screenshot({ path: `.screenshots/equipment/c-arm-${width}.png` });
    await page.locator('.equipment-slider [data-equipment-next]').click();
    await selected('ultrasound');
    for (const image of await page.locator('[data-equipment-panel="ultrasound"] img').all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(image => image.decode());
    }
    check(`${width}: ultrasound equipment and detail photos load`, await page.locator('[data-equipment-panel="ultrasound"] img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)));
    await page.locator('[data-equipment-panel="ultrasound"]').screenshot({ path: `.screenshots/equipment/details-${width}.png` });
  }

  const motionPage = await browser.newPage({ reducedMotion: 'no-preference' });
  for (const width of [390, 1920]) {
    await motionPage.setViewportSize({ width, height: 900 });
    await motionPage.goto(`${origin}/sub/equipment.html#eswt`, { waitUntil: 'networkidle' });
    await motionPage.locator('.sub-local-nav').waitFor();
    await motionPage.locator('.equipment-card img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    const transition = async direction => motionPage.evaluate(direction => {
      const track = document.querySelector('.equipment-card-track');
      const x = () => new DOMMatrix(track.style.transform).m41;
      const before = x();
      const step = track.children[1].offsetLeft - track.children[0].offsetLeft;
      document.querySelector(`[data-equipment-${direction}]`).click();
      return { delta: x() - before, step, clone: !!track.querySelector('.is-active[data-equipment-clone]'), duration: getComputedStyle(track).transitionDuration };
    }, direction);
    const forward = await transition('next');
    check(`${width}: last-to-first moves forward by one card`, Math.abs(forward.delta + forward.step) < 2 && forward.clone && forward.duration !== '0s');
    await motionPage.waitForFunction(() => !document.querySelector('.is-active[data-equipment-clone]'));
    const centered = await motionPage.evaluate(() => {
      const card = document.querySelector('[data-equipment-card].is-active');
      const rect = card.getBoundingClientRect();
      const previous = card.previousElementSibling.getBoundingClientRect();
      const next = card.nextElementSibling.getBoundingClientRect();
      return Math.abs(rect.left + rect.width / 2 - innerWidth / 2) < 2 && previous.right > 0 && next.left < innerWidth;
    });
    check(`${width}: loop settles centered with cards on both sides`, centered);
    const backward = await transition('prev');
    check(`${width}: first-to-last moves backward by one card`, Math.abs(backward.delta - backward.step) < 2 && backward.clone);
    await motionPage.waitForFunction(() => !document.querySelector('.is-active[data-equipment-clone]'));
    await motionPage.locator('[data-equipment-slider]').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await motionPage.screenshot({ path: `.screenshots/equipment/loop-eswt-${width}.png` });
    for (const key of ['c-arm', 'ultrasound', 'cryo-jet', 'eswt']) {
      await motionPage.goto(`${origin}/sub/equipment.html#${key}`, { waitUntil: 'networkidle' });
      const panel = motionPage.locator(`[data-equipment-panel="${key}"]`);
      check(`${width}: ${key} has intro, three features and related links`, await panel.locator('.ultrasound-intro-copy h2').count() === 1 && await panel.locator('.equipment-device-feature').count() === 3 && await panel.locator('.related-links a').count() === 3);
      const introImage = panel.locator('.equipment-intro-photo img');
      await introImage.scrollIntoViewIfNeeded();
      await introImage.evaluate(image => image.decode());
      const introLayout = await panel.locator('.equipment-intro-layout').evaluate(layout => {
        const copy = layout.querySelector('.ultrasound-intro-copy').getBoundingClientRect();
        const photo = layout.querySelector('figure').getBoundingClientRect();
        return innerWidth <= 900 ? photo.top >= copy.bottom : photo.left >= copy.right;
      });
      check(`${width}: ${key} introduction has a responsive right-hand image`, introLayout);
      await panel.locator('.equipment-intro-layout').screenshot({ path: `.screenshots/equipment/${key}-intro-${width}.png` });
      const treatmentImage = panel.locator('.equipment-treatment-photo img');
      await treatmentImage.scrollIntoViewIfNeeded();
      await treatmentImage.evaluate(image => image.decode());
      const layout = await panel.locator('.equipment-features-layout').evaluate(layout => {
        const photo = layout.querySelector('figure').getBoundingClientRect();
        const cards = [...layout.querySelectorAll('article')].map(el => el.getBoundingClientRect());
        return {
          vertical: cards.every((card, i) => i === 0 || card.top >= cards[i - 1].bottom),
          beside: photo.right <= cards[0].left && Math.abs(photo.top - cards[0].top) < 2,
          above: photo.bottom <= cards[0].top,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
        };
      });
      check(`${width}: ${key} treatment image and vertical features fit`, layout.vertical && !layout.overflow && (width <= 900 ? layout.above : layout.beside));
      await panel.locator('.equipment-features-layout').screenshot({ path: `.screenshots/equipment/${key}-features-${width}.png` });
      await panel.screenshot({ path: `.screenshots/equipment/${key}-content-${width}.png` });
    }
  }
  await motionPage.goto(`${origin}/sub/equipment.html#eswt`, { waitUntil: 'networkidle' });
  await motionPage.evaluate(() => { for (let i = 0; i < 9; i++) document.querySelector('[data-equipment-next]').click(); });
  await motionPage.waitForFunction(() => !document.querySelector('.is-active[data-equipment-clone]'));
  check('rapid next clicks keep category and content consistent', await motionPage.locator('[data-equipment-card="c-arm"]').getAttribute('aria-pressed') === 'true' && await motionPage.locator('[data-equipment-panel="c-arm"]').isVisible());
  await motionPage.close();

  for (const key of ['c-arm', 'ultrasound']) {
    await page.goto(`${origin}/sub/${key}.html`, { waitUntil: 'networkidle' });
    await page.waitForURL(`**/equipment.html#${key}`);
    await selected(key);
    check(`${key}: legacy address opens the correct equipment`, page.url().endsWith(`equipment.html#${key}`));
  }
  await page.goto(`${origin}/sub/spaces.html`, { waitUntil: 'networkidle' });
  check('spaces remain a separate page and category', await page.locator('main h1').textContent() === '공간 둘러보기' && await page.locator('.sub-local-nav [aria-current="page"]').getAttribute('href') === 'spaces.html');
  await page.goto(`${origin}/index.html`, { waitUntil: 'networkidle' });
  check('header categories point to equipment fragments', await page.locator('.sub-nav-link[href="sub/equipment.html#c-arm"]').count() === 1 && await page.locator('.sub-nav-link[href="sub/equipment.html#ultrasound"]').count() === 1);
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const fallback = await noJs.newPage();
  await fallback.goto(`${origin}/sub/equipment.html`, { waitUntil: 'load' });
  check('all detailed content sections remain readable without JavaScript', await fallback.locator('[data-equipment-panel]:visible').count() === 4);
  await noJs.close();
  check('no JavaScript errors', errors.length === 0);
  if (errors.length) console.log(errors);
} finally {
  await browser?.close();
  server.close();
}
process.exitCode = failures ? 1 : 0;
