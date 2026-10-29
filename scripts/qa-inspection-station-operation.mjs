import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'file:///C:/Users/YOGA14s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const base=(process.argv[2]||'http://127.0.0.1:4321').replace(/\/$/,'');
const chrome=process.env.GALLIVANT_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const output=path.resolve('docs/screenshots/inspection-station/operation-qa');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:chrome});
const report={generatedAt:new Date().toISOString(),base,browser:{},performance:{},desktop:{stages:[],cycles:[],visibility:null,pause:null,powerOff:null,assemblyReturn:null},responsive:[],consoleErrors:[]};

const press=(page,selector)=>page.locator(selector).evaluate((button)=>button.click());
const diagnostics=(page)=>page.locator('[data-inspection-viewer]').evaluate((root)=>root.inspectionQa?.getDiagnostics());
const stateOf=(page)=>page.locator('[data-operation-light]').getAttribute('data-state');
const waitState=(page,state,timeout=12000)=>page.waitForFunction((expected)=>document.querySelector('[data-operation-light]')?.dataset.state===expected,state,{timeout});
const near=(actual,expected,tolerance=.002)=>Math.abs(actual-expected)<=tolerance;

async function capture(page,name,selector='[data-inspection-viewer]'){
  const locator=page.locator(selector);await locator.evaluate((element)=>element.scrollIntoView({block:'start'}));await page.waitForTimeout(50);
  const clip=await locator.evaluate((element)=>{const box=element.getBoundingClientRect();return {x:Math.max(0,box.left+scrollX),y:Math.max(0,box.top+scrollY),width:box.width,height:box.height,scale:1};});
  const session=await page.context().newCDPSession(page);
  const result=await session.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:true,clip});
  await session.detach();await writeFile(path.join(output,name),Buffer.from(result.data,'base64'));
}

async function openPage(width,height=1000,{hasTouch=false}={}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch,isMobile:false});
  const page=await context.newPage();
  page.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push(`${width}px console: ${message.text()}`);});
  page.on('pageerror',(error)=>report.consoleErrors.push(`${width}px page: ${error.message}`));
  const modelRequests=[];page.on('request',(request)=>{if(request.url().includes('precision-inspection-station')&&request.url().endsWith('.glb'))modelRequests.push(request.url());});
  await page.goto(`${base}/en/showcase/inspection-station/?inspectionQa=1`,{waitUntil:'networkidle'});
  assert.equal(modelRequests.length,0,'GLB loaded before viewer launch');
  await press(page,'[data-viewer-launch]');await page.locator('.viewer-ready').waitFor({timeout:30000});
  assert.equal(modelRequests.length,1,'GLB must load exactly once');
  return {context,page,modelRequests};
}

function verifyStage(stage,diag){
  assert.equal(diag.operation.state,stage,`${stage} controller state mismatch`);
  assert.equal(diag.mechanics.screen.lastData.state,stage,`${stage} 3D screen is not synchronized`);
  const x=diag.mechanics.workpiece.position[0];
  if(stage==='OFF'||stage==='READY'||stage==='COMPLETE')assert.equal(diag.mechanics.workpiece.visible,false,`${stage} workpiece should be hidden`);
  if(stage==='FEEDING')assert(diag.mechanics.workpiece.visible&&x>=-.461&&x<=-.119,`FEEDING workpiece x=${x}`);
  if(['POSITIONING','SCANNING','EVALUATING'].includes(stage))assert(diag.mechanics.workpiece.visible&&x>=-.121&&x<=.001,`${stage} workpiece x=${x}`);
  if(stage==='OUTPUTTING')assert(diag.mechanics.workpiece.visible&&x>=-.001&&x<=.461,`OUTPUTTING workpiece x=${x}`);
  assert.equal(diag.mechanics.scan.visible,stage==='SCANNING',`${stage} scan visibility mismatch`);
}

async function recordStage(page,stage,{screenshot,delay=120}={}){
  await waitState(page,stage);if(delay)await page.waitForTimeout(delay);
  const diag=await diagnostics(page);verifyStage(stage,diag);
  const dom=await page.evaluate(()=>({status:document.querySelector('[data-operation-status]')?.textContent.trim(),stage:document.querySelector('[data-operation-stage]')?.textContent.trim(),progress:document.querySelector('[data-operation-progress]')?.textContent.trim(),result:document.querySelector('[data-operation-result]')?.textContent.trim()}));
  const screenProgress=diag.mechanics.screen.lastData.progress;assert(Math.abs(screenProgress-diag.operation.progress)<=.035,`${stage} 3D screen progress lagged HTML/controller by more than 3.5%`);
  const item={stage,dom,operation:diag.operation,mechanics:diag.mechanics};report.desktop.stages.push(item);
  if(screenshot)await capture(page,screenshot);
  return item;
}

try{
  const desktopSession=await openPage(1440,1000);const page=desktopSession.page;
  report.browser=await page.evaluate(()=>{const canvas=document.querySelector('[data-viewer-canvas]');const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const ext=gl.getExtension('WEBGL_debug_renderer_info');return {userAgent:navigator.userAgent,hidden:document.hidden,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable'};});
  await page.evaluate(()=>new Promise((resolve)=>{let count=0;const start=performance.now();const tick=()=>{count++;if(performance.now()-start>=500)resolve(count);else requestAnimationFrame(tick);};requestAnimationFrame(tick);})).then((count)=>{report.browser.rafFramesPer500ms=count;assert(count>=20,`browser delivered only ${count} RAF frames in 500 ms`);});

  await press(page,'[data-experience-mode="operating"]');
  await recordStage(page,'OFF',{screenshot:'01-off-1440.png',delay:0});
  await press(page,'[data-operation-action="power-on"]');await recordStage(page,'READY',{screenshot:'02-ready-1440.png',delay:0});
  await press(page,'[data-operation-action="start"]');
  const feeding=await recordStage(page,'FEEDING',{screenshot:'03-feeding-1440.png',delay:450});assert(feeding.mechanics.rollers.angle>0&&feeding.mechanics.fans.angle>0,'feeding mechanical rotation did not begin');
  await recordStage(page,'POSITIONING',{delay:80});
  const scanning=await recordStage(page,'SCANNING',{delay:180});
  const screenStart=scanning.mechanics.screen.drawCount;const fanStart=scanning.mechanics.fans.angle;await page.waitForTimeout(650);const screenLater=await diagnostics(page);
  const screenUploads=screenLater.mechanics.screen.drawCount-screenStart;assert(screenUploads>=6&&screenUploads<=10,`3D screen uploaded ${screenUploads} times in 650 ms`);assert(screenLater.mechanics.fans.angle>fanStart,'fans did not rotate during scanning');
  report.performance={screenUploadsIn650ms:screenUploads,targetScreenFps:12};
  await capture(page,'04-scanning-1440.png');
  await press(page,'[data-operation-action="pause"]');const paused=await diagnostics(page);assert.equal(paused.operation.state,'PAUSED');await page.waitForTimeout(650);const pausedLater=await diagnostics(page);
  assert(near(paused.operation.progress,pausedLater.operation.progress),'pause changed operation progress');assert(near(paused.mechanics.rollers.angle,pausedLater.mechanics.rollers.angle),'pause changed roller angle');assert(near(paused.mechanics.fans.angle,pausedLater.mechanics.fans.angle),'pause changed fan angle');assert.deepEqual(paused.mechanics.workpiece.position,pausedLater.mechanics.workpiece.position,'pause moved workpiece');
  report.desktop.pause={before:paused,after:pausedLater};await press(page,'[data-operation-action="resume"]');
  await recordStage(page,'EVALUATING',{delay:80});await recordStage(page,'OUTPUTTING',{delay:180});await recordStage(page,'COMPLETE',{screenshot:'05-complete-1440.png',delay:0});report.desktop.cycles.push({cycle:1,complete:true});

  // Second complete cycle includes a real hidden-tab freeze/resume check.
  await press(page,'[data-operation-action="start"]');await waitState(page,'FEEDING');await page.waitForTimeout(220);const beforeHidden=await diagnostics(page);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});const hiddenStart=await diagnostics(page);await page.waitForTimeout(900);const whileHidden=await diagnostics(page);
  assert(near(hiddenStart.operation.progress,whileHidden.operation.progress),'visibilitychange hidden state advanced operation progress');assert(near(hiddenStart.mechanics.fans.angle,whileHidden.mechanics.fans.angle),'visibilitychange hidden state advanced fan rotation');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(80);const afterVisible=await diagnostics(page);const resumedDelta=afterVisible.operation.progress-whileHidden.operation.progress;
  assert(resumedDelta>=0&&resumedDelta<.025,`visibility resume caught up hidden time (${resumedDelta})`);await page.waitForTimeout(350);const resumed=await diagnostics(page);assert(resumed.operation.progress>afterVisible.operation.progress,'operation did not resume after visibilitychange');
  report.desktop.visibility={method:'Chrome document.hidden visibilitychange branch; scheduler visibility source is independently tested with a controllable source',beforeHidden,hiddenStart,whileHidden,afterVisible,resumed};await waitState(page,'COMPLETE',12000);report.desktop.cycles.push({cycle:2,complete:true});

  await press(page,'[data-operation-action="start"]');await waitState(page,'FEEDING');await waitState(page,'COMPLETE',12000);report.desktop.cycles.push({cycle:3,complete:true});
  await press(page,'[data-operation-action="reset"]');await waitState(page,'READY');
  await press(page,'[data-operation-action="start"]');await waitState(page,'FEEDING');await page.waitForTimeout(250);await press(page,'[data-operation-action="power-off"]');const off=await diagnostics(page);await page.waitForTimeout(500);const offLater=await diagnostics(page);
  assert.equal(off.operation.state,'OFF');assert.equal(off.mechanics.workpiece.visible,false);assert.equal(off.mechanics.rollers.angle,0);assert.equal(off.mechanics.fans.angle,0);assert.deepEqual(off.mechanics.workpiece.position,offLater.mechanics.workpiece.position);report.desktop.powerOff={immediate:off,after500ms:offLater};

  await press(page,'[data-experience-mode="assembly"]');const assemblyReady=await diagnostics(page);assert.equal(assemblyReady.mechanics.active,false);assert.equal(assemblyReady.mechanics.screen.visible,false);assert(assemblyReady.mechanics.staticScreenVisible.every(Boolean),'static GLB screen was not restored');
  await press(page,'[data-action="explode"]');await page.waitForFunction(()=>document.querySelector('[data-assembly-percent]')?.textContent==='100%');
  await press(page,'[data-action="reassemble"]');await page.waitForFunction(()=>{const state=document.querySelector('[data-inspection-viewer]')?.inspectionQa?.getState();return state&&state.assemblyMode!=='auto'&&state.assemblyProgress<=1e-6;});const reassembled=await diagnostics(page);assert.equal(reassembled.state.assemblyProgress,0);report.desktop.assemblyReturn={assemblyReady,reassembled};
  await desktopSession.context.close();

  for(const width of [768,390]){
    const session=await openPage(width,width===390?844:900);const mobile=session.page;await press(mobile,'[data-experience-mode="operating"]');await press(mobile,'[data-operation-action="power-on"]');await press(mobile,'[data-operation-action="start"]');await waitState(mobile,'SCANNING');await mobile.waitForTimeout(180);
    const layout=await mobile.evaluate(()=>{
      const buttons=[...document.querySelectorAll('[data-operation-action]:not([hidden])')].map((button)=>{const box=button.getBoundingClientRect();return {name:button.dataset.operationAction,left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width,height:box.height};});
      const canvas=document.querySelector('[data-viewer-canvas]').getBoundingClientRect();const panel=document.querySelector('[data-operating-panel]').getBoundingClientRect();
      return {scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,buttons,canvas:{width:canvas.width,height:canvas.height},panel:{left:panel.left,right:panel.right,width:panel.width}};
    });
    assert(layout.scrollWidth<=layout.clientWidth+1,`${width}px page has horizontal overflow`);assert(layout.canvas.width>=width*.85&&layout.canvas.height>=360,`${width}px canvas is too small`);assert(layout.panel.left>=0&&layout.panel.right<=width+1,`${width}px operation panel is clipped`);
    layout.buttons.forEach((button)=>assert(button.height>=37&&button.width>=90,`${width}px ${button.name} touch target is too small`));
    const mobileDiag=await diagnostics(mobile);verifyStage('SCANNING',mobileDiag);await capture(mobile,width===390?'07-operating-390.png':'06-operating-768.png','[data-inspection-viewer]');report.responsive.push({width,layout,state:mobileDiag.operation.state,touchVerified:false});await session.context.close();
  }

  for(const width of [768,390]){
    const session=await openPage(width,width===390?844:900,{hasTouch:true});const touchPage=session.page;await press(touchPage,'[data-experience-mode="operating"]');await press(touchPage,'[data-operation-action="power-on"]');await press(touchPage,'[data-operation-action="start"]');await waitState(touchPage,'FEEDING');
    const cameraBeforeTouch=(await diagnostics(touchPage)).camera.position;const cdp=await touchPage.context().newCDPSession(touchPage);const canvasBox=await touchPage.locator('[data-viewer-canvas]').boundingBox();
    if(canvasBox){const x=canvasBox.x+canvasBox.width*.5;const y=canvasBox.y+canvasBox.height*.55;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,radiusX:5,radiusY:5}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+45,y:y-20,radiusX:5,radiusY:5}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touchPage.waitForTimeout(120);}
    await cdp.detach();const cameraAfterTouch=(await diagnostics(touchPage)).camera.position;assert(canvasBox&&cameraAfterTouch.some((value,index)=>Math.abs(value-cameraBeforeTouch[index])>.001),`${width}px touch drag did not move the OrbitControls camera`);const record=report.responsive.find((item)=>item.width===width);Object.assign(record,{touchVerified:true,cameraBeforeTouch,cameraAfterTouch});await session.context.close();
  }

  assert.deepEqual(report.consoleErrors,[],'browser console/page errors were reported');
  await writeFile(path.join(output,'operation-qa.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({renderer:report.browser.renderer,rafFramesPer500ms:report.browser.rafFramesPer500ms,stages:report.desktop.stages.map((item)=>item.stage),cycles:report.desktop.cycles,screenUploadsIn650ms:screenUploads,responsive:report.responsive.map((item)=>({width:item.width,state:item.state,overflow:item.layout.scrollWidth-item.layout.clientWidth,touchVerified:item.touchVerified})),consoleErrors:report.consoleErrors},null,2));
}finally{
  await browser.close();
}
