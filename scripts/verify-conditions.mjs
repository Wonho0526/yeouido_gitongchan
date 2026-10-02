import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startServer } from './serve.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_NODE_MODULES ? path.join(process.env.CODEX_NODE_MODULES,'playwright') : 'playwright');
const names=['neck-shoulder','spine-joint','hand-wrist','knee','foot-heel','neuralgia'];
const counts=[7,5,4,4,4,5];
const {server,origin}=await startServer();
const browser=await chromium.launch();
let failures=0;
const check=(label,ok)=>{console.log(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)failures++;};
try {
 const page=await browser.newPage({reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await fs.mkdir('.screenshots/condition-redesign',{recursive:true});
 for(const width of [390,1440]) {
  await page.setViewportSize({width,height:900});
  for(const [i,name] of names.entries()) {
   await page.goto(`${origin}/sub/${name}.html`,{waitUntil:'networkidle'});
   await page.locator('.site-header').waitFor();
   check(`${width} ${name}: header and footer`,await page.locator('.site-footer').count()===1);
   check(`${width} ${name}: all approved diseases retained`,await page.locator('.condition-panel').count()===counts[i]);
   for(let j=0;j<counts[i];j++) {
    await page.locator('.condition-tab').nth(j).click();
    check(`${width} ${name} disease ${j+1}: one selected panel`,await page.locator('.condition-panel:visible').count()===1 && await page.locator(`#condition-${j+1}`).isVisible());
    check(`${width} ${name} disease ${j+1}: no overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    check(`${width} ${name} disease ${j+1}: correct hash`,new URL(page.url()).hash===`#condition-${j+1}`);
    const panel=page.locator(`#condition-${j+1}`);
    const symptomCount=await panel.locator('.condition-symptoms-copy ol li').count();
    check(`${width} ${name} disease ${j+1}: 3–5 symptoms`,symptomCount>=3 && symptomCount<=5);
    check(`${width} ${name} disease ${j+1}: four cause cards`,await panel.locator('.condition-context-item').count()===4);
    check(`${width} ${name} disease ${j+1}: cause heading`,(await panel.locator('.condition-context h2').innerText()).includes('원인'));
    const causeImages=panel.locator('.condition-context-photo img');
    await causeImages.first().scrollIntoViewIfNeeded();
    await causeImages.evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
    check(`${width} ${name} disease ${j+1}: unique loaded cause photos`,await causeImages.evaluateAll(imgs=>new Set(imgs.map(i=>i.src)).size===4 && imgs.every(i=>i.naturalWidth>0)));
    const anatomy=panel.locator('.condition-anatomy img');
    await anatomy.scrollIntoViewIfNeeded();
    await anatomy.evaluate(img=>img.decode());
    check(`${width} ${name} disease ${j+1}: individual image`,(await anatomy.getAttribute('src')).includes('/individual/') && await anatomy.evaluate(img=>img.naturalWidth>0));
   }
   await page.locator('.condition-tab').first().click();
   await page.locator('.condition-tab').first().focus();
   await page.keyboard.press('End');
   check(`${name}: keyboard End`,await page.locator('.condition-tab').last().getAttribute('aria-selected')==='true');
   await page.keyboard.press('Home');
   check(`${name}: keyboard Home`,await page.locator('.condition-tab').first().getAttribute('aria-selected')==='true');
   await page.locator('.condition-assessment:visible').scrollIntoViewIfNeeded();
   await page.locator('.condition-symptoms').first().scrollIntoViewIfNeeded();
   await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.condition-panel:not([hidden]) img')].map(i=>i.decode().catch(()=>{})));window.scrollTo(0,0);});
   check(`${name}: images loaded`,await page.locator('.condition-panel:not([hidden]) img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));
   if(name==='neck-shoulder') await page.screenshot({path:`.screenshots/condition-redesign/neck-${width}.png`,fullPage:true});
  }
 }
 await page.goto(`${origin}/sub/neck-shoulder.html#condition-5`,{waitUntil:'networkidle'});
 check('direct link opens added biceps condition',await page.locator('#condition-5').isVisible());
 for(const width of [390,1440]) {
  await page.setViewportSize({width,height:900});
  await page.locator('#condition-5 .condition-symptoms').scrollIntoViewIfNeeded();
  await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.condition-panel:not([hidden]) img')].map(i=>i.decode()));window.scrollTo({top:0,behavior:'instant'});});
  await page.locator('#condition-5 .condition-context').screenshot({path:`.screenshots/condition-redesign/biceps-summary-${width}.png`});
  await page.locator('#condition-5 .condition-symptoms').screenshot({path:`.screenshots/condition-redesign/biceps-symptoms-${width}.png`});
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:`.screenshots/condition-redesign/biceps-${width}.png`,fullPage:true});
 }
 await page.locator('.condition-tab').nth(1).click();
 await page.goBack();
 check('Back restores selected disease',await page.locator('#condition-5').isVisible());
 for(const name of names) {
  await page.goto(pathToFileURL(path.resolve(`sub/${name}.html`)).href+'#condition-2');
  await page.locator('.site-header').waitFor();
  check(`file preview ${name}: layout and tab`,await page.locator('.site-footer').count()===1 && await page.locator('#condition-2').isVisible());
 }
 check('no JS errors',errors.length===0);
 if(errors.length)console.log(errors);
} finally {await browser.close();server.close();}
process.exitCode=failures?1:0;
