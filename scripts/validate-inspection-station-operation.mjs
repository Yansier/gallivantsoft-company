import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MechanicalRig,OPERATION_GEOMETRY} from '../src/scripts/inspection-station/mechanical-rig.js';
import {OperationController,OPERATION_SEQUENCE,OPERATION_STATES,OPERATION_TIMING} from '../src/scripts/inspection-station/operation-controller.js';
import {phase4Translations} from '../src/i18n/phase4.js';

globalThis.self=globalThis;
const context={fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},createLinearGradient(){return {addColorStop(){}};}};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};

class ManualScheduler{
  constructor(){this.tasks=new Map();}
  play(key,update){this.tasks.set(key,{update,fresh:true});}
  stop(key){this.tasks.delete(key);}
  has(key){return this.tasks.has(key);}
  step(delta){for(const [key,task] of [...this.tasks]){const value=task.fresh?0:delta;task.fresh=false;if(task.update(value)===false&&this.tasks.get(key)===task)this.tasks.delete(key);}}
}

class FakeRig{
  constructor(){this.x=OPERATION_GEOMETRY.path.input;this.visible=false;this.scan=false;this.motion=0;this.screen=[];this.entries=0;this.exits=0;}
  enter(data){this.entries++;this.updateScreen(data);}
  exit(){this.exits++;this.resetMotion();}
  resetMotion(){this.x=OPERATION_GEOMETRY.path.input;this.visible=false;this.scan=false;this.motion=0;}
  setWorkpiece(x,visible){this.x=x;this.visible=visible;}
  setScan(_progress,active){this.scan=active;}
  advance(delta){this.motion+=delta;}
  updateScreen(data){this.screen.push({...data});}
}

function completeCycle(controller,scheduler,fps=60){
  const interval=1000/fps;scheduler.step(0);
  while(controller.state!==OPERATION_STATES.COMPLETE)scheduler.step(interval);
}

// State transitions, first-frame timing, pause/resume, invalid commands, reset,
// low-frame-rate execution, and repeated runs all share one deterministic clock.
{
  const scheduler=new ManualScheduler();const rig=new FakeRig();const events=[];
  const controller=new OperationController({rig,scheduler,onStateChange:(event)=>events.push(event)});
  controller.enter();assert.equal(controller.state,'OFF');assert.equal(controller.start(),false,'cannot start while powered off');assert.equal(controller.pause(),false,'cannot pause while idle');
  assert(controller.powerOn());assert.equal(controller.state,'READY');assert.equal(controller.powerOn(),false,'duplicate power-on must be rejected');
  assert(controller.start());assert.equal(controller.state,'FEEDING');const initialX=rig.x;scheduler.step(0);assert.equal(rig.x,initialX,'zero-delta first frame moved the workpiece');
  scheduler.step(OPERATION_TIMING.FEEDING*.4);assert(controller.stageProgress>.39&&controller.stageProgress<.41,'feeding midpoint timing is incorrect');assert(rig.x>initialX&&rig.x<-.12,'feeding midpoint must occupy a real intermediate position');
  assert(controller.pause());const paused={x:rig.x,progress:controller.overallProgress,motion:rig.motion};scheduler.step(5000);assert.deepEqual({x:rig.x,progress:controller.overallProgress,motion:rig.motion},paused,'paused cycle continued to advance');
  assert(controller.resume());scheduler.step(0);assert.equal(rig.x,paused.x,'resume first frame changed the preserved position');
  completeCycle(controller,scheduler,30);assert.equal(controller.lastResult,'PASS');assert.equal(controller.overallProgress,1);assert.equal(rig.visible,false,'completed workpiece must leave the local chamber range');
  assert(controller.reset());assert.equal(controller.state,'READY');assert.equal(controller.overallProgress,0);
  for(let cycle=0;cycle<3;cycle++){assert(controller.start());completeCycle(controller,scheduler,30);assert.equal(controller.state,'COMPLETE',`cycle ${cycle+1} failed`);assert(controller.reset());}
  assert(controller.powerOff());assert.equal(controller.state,'OFF');assert.equal(controller.resume(),false,'resume must be rejected after power-off');
  controller.exit();assert.equal(rig.exits,1);assert(events.some((event)=>event.state==='SCANNING')&&events.some((event)=>event.state==='OUTPUTTING'),'full sequence events are incomplete');
}

const bytes=await readFile(new URL('../assets/models/precision-inspection-station.glb',import.meta.url));
const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const model=(await new Promise((resolve,reject)=>new GLTFLoader().parse(buffer,'',resolve,reject))).scene;
model.updateMatrixWorld(true);

// Real GLB geometry audit: every roller has the same verified local longitudinal
// axis; fan leaves orbit their measured hub while fixed grille geometry does not.
assert.equal(OPERATION_GEOMETRY.rollerNames.filter((name)=>model.getObjectByName(name)).length,19,'GLB must expose all 19 rollers');
for(const name of OPERATION_GEOMETRY.rollerNames){
  const roller=model.getObjectByName(name);roller.geometry.computeBoundingBox();const size=roller.geometry.boundingBox.getSize(new THREE.Vector3());
  assert(size.y>size.x*7&&size.y>size.z*7,`${name} local Y is not the verified longitudinal axis`);
}
const scene=new THREE.Scene();scene.add(model);
const roller=model.getObjectByName('Conveyor_Roller_09');const rollerPosition=roller.getWorldPosition(new THREE.Vector3());const rollerQuaternion=roller.quaternion.clone();
const blade=model.getObjectByName('Cooling_Fan0_Blade0');const bladeStart=blade.getWorldPosition(new THREE.Vector3());
let grille=null;model.traverse((object)=>{if(!grille&&object.name.startsWith('Cooling_GrilleBar_0_'))grille=object;});
assert(grille,'fixed fan grille audit target is missing');
const grilleQuaternion=grille?.getWorldQuaternion(new THREE.Quaternion());
const fanCenter=new THREE.Vector3(...OPERATION_GEOMETRY.fanCenters[0]);const fanRadius=bladeStart.distanceTo(fanCenter);
const rig=new MechanicalRig({model,scene,render:()=>{},screenCopy:phase4Translations.en.station.operation});
assert.deepEqual(rig.audit.fanBlades,[7,7]);rig.enter({state:'READY',stage:'READY',progress:0});rig.advance(500,{rollerSpeed:4,fanSpeed:3});model.updateMatrixWorld(true);
assert(roller.getWorldPosition(new THREE.Vector3()).distanceTo(rollerPosition)<1e-7,'roller center drifted during self-rotation');
assert(roller.quaternion.angleTo(rollerQuaternion)>.1,'roller failed to rotate');
const bladeMoved=blade.getWorldPosition(new THREE.Vector3());assert(bladeMoved.distanceTo(bladeStart)>.05,'fan blade failed to orbit its shared hub');assert(Math.abs(bladeMoved.distanceTo(fanCenter)-fanRadius)<1e-5,'fan blade radius changed');
if(grille)assert(grille.getWorldQuaternion(new THREE.Quaternion()).angleTo(grilleQuaternion)<1e-7,'fixed fan grille rotated');
rig.resetMotion();model.updateMatrixWorld(true);assert(blade.getWorldPosition(new THREE.Vector3()).distanceTo(bladeStart)<1e-5,'fan reset did not restore its initial position');assert(roller.quaternion.angleTo(rollerQuaternion)<1e-7,'roller reset drifted');

// Full workpiece Box3 sampling against fixed chamber and optical obstacles. Rollers
// are intentionally excluded as legal supports; the part clears their top by 1 mm.
const size=new THREE.Vector3(...OPERATION_GEOMETRY.workpieceSize);const obstacles=['Chamber_LeftSafetyGlass','Chamber_RightSafetyGlass','Chamber_FrontSafetyGlass','Chamber_InternalBackplane','Optical_RingLightEmitter','Optical_CameraBody'].map((name)=>({name,box:new THREE.Box3().setFromObject(model.getObjectByName(name))}));
for(let sample=0;sample<=100;sample++){
  const x=THREE.MathUtils.lerp(OPERATION_GEOMETRY.path.input,OPERATION_GEOMETRY.path.output,sample/100);
  const workpiece=new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x,OPERATION_GEOMETRY.workpieceY,OPERATION_GEOMETRY.path.z),size);
  obstacles.forEach(({name,box})=>assert(!workpiece.intersectsBox(box),`workpiece path sample ${sample} intersects ${name}`));
}
assert(OPERATION_GEOMETRY.workpieceY-size.y/2>=OPERATION_GEOMETRY.conveyorTop,'workpiece penetrates the roller support surface');
assert(OPERATION_GEOMETRY.workpieceY+size.y/2<OPERATION_GEOMETRY.chamberClearance.opticalMinY,'workpiece violates optical-head clearance');
rig.dispose();

for(const lang of ['en','zh','ms']){
  const copy=phase4Translations[lang].station.operation;
  assert(copy.modeLabel&&copy.panelTitle&&copy.simulationNote,`${lang} operation panel copy is incomplete`);
  Object.values(OPERATION_STATES).forEach((state)=>assert(copy.states[state]&&copy.stages[state],`${lang} operation state ${state} is missing`));
  ['powerOn','start','pause','resume','reset','powerOff'].forEach((key)=>assert(copy.actions[key],`${lang} operation action ${key} is missing`));
}
assert.deepEqual(OPERATION_SEQUENCE,['FEEDING','POSITIONING','SCANNING','EVALUATING','OUTPUTTING','COMPLETE']);
console.log('Inspection Station operation passed: 19 roller axes, twin 7-blade pivots, fixed grille, sampled collision-free local path, deterministic full cycle, pause/resume, reset, power-off, 30 FPS repeats, and 3 locales.');
