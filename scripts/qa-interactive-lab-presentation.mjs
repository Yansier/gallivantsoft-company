import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'file:///C:/Users/YOGA14s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const base=(process.argv[2]||'http://127.0.0.1:4321').replace(/\/$/,'');
const chrome=process.env.GALLIVANT_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const output=path.resolve('docs/screenshots/interactive-lab/phase-4.1e');
const viewports=[{width:375,height:812},{width:390,height:844},{width:768,height:960},{width:1024,height:900},{width:1440,height:1000}];
const report={generatedAt:new Date().toISOString(),base,viewports:[],languages:[],requests:{glb:[],three:[]},consoleErrors:[]};
await mkdir(output,{recursive:true});

const browser=await chromium.launch({headless:true,executablePath:chrome});

async function openPage(context,pathname,width){
  const page=await context.newPage();
  page.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push(`${width}px ${pathname}: ${message.text()}`);});
  page.on('pageerror',(error)=>report.consoleErrors.push(`${width}px ${pathname}: ${error.message}`));
  page.on('request',(request)=>{
    const url=request.url();
    if(url.endsWith('.glb'))report.requests.glb.push(url);
    if(new URL(url).pathname.endsWith('.js')&&/three(?:\.module)?|inspection-station\.[\w-]+\.js/.test(url))report.requests.three.push(url);
  });
  const response=await page.goto(`${base}${pathname}`,{waitUntil:'networkidle'});
  assert(response?.ok(),`${pathname} returned ${response?.status()}`);
  await page.waitForTimeout(180);
  return page;
}

async function scrollAudit(page){
  const height=await page.evaluate(()=>document.documentElement.scrollHeight);
  for(let y=0;y<height;y+=Math.max(500,Math.floor((await page.viewportSize()).height*.72))){await page.evaluate((top)=>scrollTo(0,top),y);await page.waitForTimeout(25);}
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(80);
}

try{
  for(const viewport of viewports){
    const context=await browser.newContext({viewport,deviceScaleFactor:1});
    const lab=await openPage(context,'/en/showcase/',viewport.width);
    const labLayout=await lab.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,h1:document.querySelector('h1')?.textContent.trim(),stationHref:document.querySelector('.lab-hero-product')?.getAttribute('href'),twinHref:document.querySelector('.lab-secondary-copy .btn')?.getAttribute('href'),archiveHrefs:[...document.querySelectorAll('.lab-archive-card')].map((link)=>link.getAttribute('href')),imageCurrentSrc:document.querySelector('.lab-hero-product img')?.currentSrc}));
    assert(labLayout.scrollWidth<=labLayout.clientWidth+1,`${viewport.width}px lab page has horizontal overflow`);
    assert.equal(labLayout.stationHref,'/en/showcase/inspection-station/');
    assert.equal(labLayout.twinHref,'/en/showcase/digital-twin/');
    assert.deepEqual(labLayout.archiveHrefs,['/en/showcase/operations-dashboard/','/en/showcase/customer-management/','/en/showcase/booking-workflow/']);
    assert(labLayout.imageCurrentSrc?.endsWith('.webp'),'lab hero did not select an optimized WebP');
    await scrollAudit(lab);
    await lab.screenshot({path:path.join(output,`lab-${viewport.width}.png`),fullPage:false});

    const home=await openPage(context,'/en/',viewport.width);
    const homeLayout=await home.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,ctaHref:document.querySelector('.home-lab-actions .btn')?.getAttribute('href'),labHref:document.querySelector('.home-lab-actions .lab-text-link')?.getAttribute('href'),previewHref:document.querySelector('.home-lab-preview')?.getAttribute('href'),imageCurrentSrc:''}));
    assert(homeLayout.scrollWidth<=homeLayout.clientWidth+1,`${viewport.width}px home page has horizontal overflow`);
    assert.equal(homeLayout.ctaHref,'/en/showcase/inspection-station/');assert.equal(homeLayout.previewHref,homeLayout.ctaHref);assert.equal(homeLayout.labHref,'/en/showcase/');
    await scrollAudit(home);
    const homeShowcase=home.locator('.home-lab');await homeShowcase.scrollIntoViewIfNeeded();await pageReady(home);homeLayout.imageCurrentSrc=await home.locator('.home-lab-preview img').evaluate((image)=>image.currentSrc);assert(homeLayout.imageCurrentSrc?.endsWith('.webp'),'home preview did not select an optimized WebP');await homeShowcase.screenshot({path:path.join(output,`home-showcase-${viewport.width}.png`)});
    report.viewports.push({width:viewport.width,lab:labLayout,home:homeLayout});
    await context.close();
  }

  const languageContext=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const languagePage=await openPage(languageContext,'/en/showcase/',1440);
  for(const language of ['en','zh','ms']){
    if(language!=='en'){
      await languagePage.locator('.language-switcher-header [data-language-trigger]').click();
      await languagePage.locator(`.language-switcher-header [data-language-option="${language}"]`).click();
      await languagePage.waitForURL(`**/${language}/showcase/`);await languagePage.waitForLoadState('networkidle');
    }
    const state=await languagePage.evaluate(()=>({lang:document.documentElement.lang,h1:document.querySelector('h1')?.textContent.trim(),stationHref:document.querySelector('.lab-hero-product')?.getAttribute('href'),twinHref:document.querySelector('.lab-secondary-copy .btn')?.getAttribute('href')}));
    assert.equal(state.lang,language);assert.equal(state.stationHref,`/${language}/showcase/inspection-station/`);assert.equal(state.twinHref,`/${language}/showcase/digital-twin/`);report.languages.push(state);
  }
  await languageContext.close();

  assert.equal(report.requests.glb.length,0,'home or Interactive Lab requested a GLB before entering a viewer');
  assert.equal(report.requests.three.length,0,'home or Interactive Lab requested a Three.js viewer bundle');
  assert.deepEqual(report.consoleErrors,[],'browser console/page errors were reported');
  await writeFile(path.join(output,'presentation-qa.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({viewports:report.viewports.map(({width,lab,home})=>({width,labOverflow:lab.scrollWidth-lab.clientWidth,homeOverflow:home.scrollWidth-home.clientWidth,labImage:path.basename(new URL(lab.imageCurrentSrc).pathname),homeImage:path.basename(new URL(home.imageCurrentSrc).pathname)})),languages:report.languages,glbRequests:report.requests.glb.length,threeViewerRequests:report.requests.three.length,consoleErrors:report.consoleErrors},null,2));
}finally{await browser.close();}

async function pageReady(page){await page.waitForTimeout(120);}
