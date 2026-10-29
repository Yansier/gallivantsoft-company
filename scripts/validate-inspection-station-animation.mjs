import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AnimationScheduler,MAX_FRAME_DELTA_MS} from '../src/scripts/inspection-station/animation-scheduler.js';
import {AssemblyController,ASSEMBLY_TIMING} from '../src/scripts/inspection-station/assembly-controller.js';
import {CameraController} from '../src/scripts/inspection-station/camera-controller.js';
import {ComponentRegistry,COMPONENT_NAMES} from '../src/scripts/inspection-station/component-registry.js';

const EPSILON=1e-6;
const near=(actual,expected,tolerance=EPSILON)=>Math.abs(actual-expected)<=tolerance;
const assertVector=(actual,expected,message)=>assert(actual.distanceTo(expected)<=EPSILON,`${message}: expected ${expected.toArray()}, received ${actual.toArray()}`);

class FakeRaf{
  constructor(){this.now=0;this.nextId=1;this.pending=new Map();}
  request=(callback)=>{const id=this.nextId++;this.pending.set(id,callback);return id;};
  cancel=(id)=>{this.pending.delete(id);};
  stepTo(time){
    this.now=time;
    const callbacks=[...this.pending.values()];
    this.pending.clear();
    callbacks.forEach((callback)=>callback(time));
  }
}

class FakeVisibility{
  constructor(){this.hidden=false;this.listeners=new Set();}
  addEventListener=(type,listener)=>{if(type==='visibilitychange')this.listeners.add(listener);};
  removeEventListener=(type,listener)=>{if(type==='visibilitychange')this.listeners.delete(listener);};
  setHidden(hidden){this.hidden=hidden;this.listeners.forEach((listener)=>listener());}
}

class FakeControls{
  constructor(){this.target=new THREE.Vector3();this.minDistance=.5;this.maxDistance=20;this.listeners=new Map();this.updates=0;}
  addEventListener(type,listener){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(listener);}
  removeEventListener(type,listener){this.listeners.get(type)?.delete(listener);}
  dispatch(type){this.listeners.get(type)?.forEach((listener)=>listener());}
  update(){this.updates++;}
}

function advance(raf,duration,fps=60){
  const target=raf.now+duration;
  const interval=1000/fps;
  while(raf.now+interval<target-1e-7)raf.stepTo(raf.now+interval);
  raf.stepTo(target);
}

function createScheduler(render=()=>{}){
  const raf=new FakeRaf();
  const visibility=new FakeVisibility();
  const scheduler=new AnimationScheduler(render,{requestFrame:raf.request,cancelFrame:raf.cancel,visibilitySource:visibility});
  return {raf,visibility,scheduler};
}

function createRegistry(){
  const model=new THREE.Group();model.name='PrecisionInspectionStation';
  COMPONENT_NAMES.forEach((name,index)=>{
    const group=new THREE.Group();group.name=name;group.position.set(index*.07,index*.025,-index*.04);model.add(group);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.2),new THREE.MeshStandardMaterial());mesh.name=`${name}_TestMesh`;group.add(mesh);
  });
  model.updateMatrixWorld(true);
  return new ComponentRegistry(model,2);
}

function disposeRegistry(registry){
  registry.model.traverse((object)=>{object.geometry?.dispose();object.material?.dispose?.();});
}

function createAssemblyHarness({reducedMotion=false}={}){
  const clock=createScheduler();
  const registry=createRegistry();
  const states=[];
  const controller=new AssemblyController({registry,scheduler:clock.scheduler,reducedMotion,onStateChange:(state)=>states.push(state)});
  return {...clock,registry,controller,states};
}

function assertRestored(registry,message){
  registry.majorRecords.forEach((record)=>{
    assertVector(record.node.position,record.original.position,`${message} ${record.key} position`);
    assert(record.node.quaternion.angleTo(record.original.quaternion)<=EPSILON,`${message} ${record.key} quaternion drifted`);
    assertVector(record.node.scale,record.original.scale,`${message} ${record.key} scale`);
  });
}

// Scheduler timing: a task's own first frame is always zero, normal frames preserve
// elapsed time, long/stalled frames are clamped, and replacing a task restarts at zero.
{
  const {raf,scheduler}=createScheduler();
  const deltas=[];
  scheduler.play('probe',(delta)=>{deltas.push(delta);return deltas.length<4;});
  raf.stepTo(100);
  raf.stepTo(116.667);
  raf.stepTo(500);
  assert(near(deltas[0],0),'first frame delta must be zero');
  assert(near(deltas[1],16.667,.001),'continuous frame delta must use the RAF clock');
  assert.equal(deltas[2],MAX_FRAME_DELTA_MS,'long frame delta must be capped');
  scheduler.play('probe',(delta)=>{deltas.push(delta);return false;});
  raf.stepTo(516.667);
  assert.equal(deltas.at(-1),0,'an overwritten task must receive its own zero-delta first frame');
  scheduler.play('dispose-check',()=>true);
  scheduler.dispose();
  assert.equal(raf.pending.size,0,'dispose must cancel the pending RAF');
}

// A normal 60 FPS explosion must visibly progress through an intermediate state
// and may only complete after its configured 2.2 second timeline.
{
  const harness=createAssemblyHarness();
  const record=harness.registry.get('MechanicalConnections');
  const origin=record.original.position.clone();
  const target=origin.clone().add(harness.registry.getExplodedOffset(record));
  harness.controller.explode();
  harness.raf.stepTo(0);
  assertVector(record.node.position,origin,'zero-delta explosion first frame');
  advance(harness.raf,550,60);
  const travelled=record.node.position.distanceTo(origin);
  const full=target.distanceTo(origin);
  assert(travelled>EPSILON&&travelled<full-EPSILON,'explosion must occupy a real intermediate position');
  assert.equal(harness.controller.state,'exploding','explosion must still be active at 25% time');
  advance(harness.raf,ASSEMBLY_TIMING.explode-551,60);
  assert.equal(harness.controller.state,'exploding','explosion must not finish before its duration');
  advance(harness.raf,1,60);
  assert.equal(harness.controller.state,'exploded','explosion must complete at its configured duration');
  assertVector(record.node.position,target,'explosion endpoint');
  harness.scheduler.dispose();disposeRegistry(harness.registry);
}

// At approximately 40%, reversing must preserve the exact current pose on the
// replacement task's first frame and scale return duration to the remaining travel.
{
  const harness=createAssemblyHarness();
  harness.controller.explode();harness.raf.stepTo(0);advance(harness.raf,ASSEMBLY_TIMING.explode*.4,60);
  const before=harness.registry.majorRecords.map((record)=>record.node.position.clone());
  harness.controller.reassemble();
  const reverseDuration=harness.controller.lastDuration;
  assert(reverseDuration>=ASSEMBLY_TIMING.minReverse&&reverseDuration<ASSEMBLY_TIMING.reassemble,'reverse duration must scale to current travel');
  harness.registry.majorRecords.forEach((record,index)=>assertVector(record.node.position,before[index],`reverse command jump ${record.key}`));
  harness.raf.stepTo(harness.raf.now+1000/60);
  harness.registry.majorRecords.forEach((record,index)=>assertVector(record.node.position,before[index],`reverse first-frame jump ${record.key}`));
  advance(harness.raf,reverseDuration,60);
  assert.equal(harness.controller.state,'assembled','mid-animation reverse must finish assembled');
  assertRestored(harness.registry,'mid-animation reverse');
  harness.scheduler.dispose();disposeRegistry(harness.registry);
}

// Hiding the page freezes elapsed animation time. The first resumed frame is zero
// even when the RAF timestamp jumped by several seconds.
{
  const harness=createAssemblyHarness();
  const record=harness.registry.get('MechanicalConnections');
  harness.controller.explode();harness.raf.stepTo(0);advance(harness.raf,400,60);
  const paused=record.node.position.clone();
  harness.visibility.setHidden(true);harness.raf.stepTo(8000);
  assertVector(record.node.position,paused,'hidden animation changed');
  harness.visibility.setHidden(false);harness.raf.stepTo(8000);
  assertVector(record.node.position,paused,'resume frame consumed hidden time');
  advance(harness.raf,1000/60,60);
  assert(record.node.position.distanceTo(paused)>EPSILON,'animation must continue after visibility resumes');
  harness.scheduler.dispose();disposeRegistry(harness.registry);
}

// Eight 30 FPS explode/reassemble cycles exercise low-frame-rate timing and prove
// that every endpoint is restored from the original transform snapshot.
{
  const harness=createAssemblyHarness();
  for(let cycle=0;cycle<8;cycle++){
    harness.controller.explode();harness.raf.stepTo(harness.raf.now);advance(harness.raf,harness.controller.lastDuration,30);
    assert.equal(harness.controller.state,'exploded',`30 FPS cycle ${cycle+1} explosion incomplete`);
    harness.controller.reassemble();harness.raf.stepTo(harness.raf.now);advance(harness.raf,harness.controller.lastDuration,30);
    assert.equal(harness.controller.state,'assembled',`30 FPS cycle ${cycle+1} reassembly incomplete`);
    assertRestored(harness.registry,`30 FPS cycle ${cycle+1}`);
  }
  harness.scheduler.dispose();disposeRegistry(harness.registry);
}

// Camera movement has a stable first frame, a real intermediate pose, a precise
// endpoint, and remains interruptible by direct OrbitControls input.
{
  const {raf,scheduler}=createScheduler();
  const camera=new THREE.PerspectiveCamera(35,1.6,.1,100);camera.position.set(5,3,6);
  const controls=new FakeControls();
  const defaultBounds=new THREE.Box3(new THREE.Vector3(-1,-1,-1),new THREE.Vector3(1,1,1));
  const focusBounds=new THREE.Box3(new THREE.Vector3(1.5,-.4,-.5),new THREE.Vector3(2.5,.6,.5));
  const controller=new CameraController({camera,controls,scheduler,defaultBounds,reducedMotion:false});
  const start=camera.position.clone();
  controller.moveTo({bounds:focusBounds,duration:800,margin:1.3});raf.stepTo(0);
  assertVector(camera.position,start,'camera zero-delta first frame');
  advance(raf,400,60);
  const middle=camera.position.clone();
  assert(middle.distanceTo(start)>EPSILON,'camera must move by its midpoint');
  assert(scheduler.has('camera'),'camera transition must remain active at its midpoint');
  advance(raf,399,60);assert(scheduler.has('camera'),'camera transition must not finish early');
  advance(raf,1,60);assert(!scheduler.has('camera'),'camera transition must finish at its duration');
  assertVector(controls.target,focusBounds.getCenter(new THREE.Vector3()),'camera target endpoint');

  controller.reset();raf.stepTo(raf.now);advance(raf,180,60);
  const interrupted=camera.position.clone();controls.dispatch('start');advance(raf,500,60);
  assertVector(camera.position,interrupted,'manual camera input did not interrupt tween');
  controller.dispose();scheduler.dispose();
}

// Reduced-motion mode is the only mode that intentionally resolves immediately.
{
  const assembly=createAssemblyHarness({reducedMotion:true});
  assembly.controller.explode();assert.equal(assembly.controller.state,'exploded','reduced-motion explosion should resolve immediately');
  assembly.controller.reassemble();assert.equal(assembly.controller.state,'assembled','reduced-motion reassembly should resolve immediately');
  assertRestored(assembly.registry,'reduced-motion reassembly');
  assembly.scheduler.dispose();disposeRegistry(assembly.registry);

  const {scheduler}=createScheduler();
  const camera=new THREE.PerspectiveCamera(35,1.6,.1,100);camera.position.set(4,2,5);
  const controls=new FakeControls();
  const bounds=new THREE.Box3(new THREE.Vector3(-1,-1,-1),new THREE.Vector3(1,1,1));
  const controller=new CameraController({camera,controls,scheduler,defaultBounds:bounds,reducedMotion:true});
  controller.reset();assertVector(controls.target,new THREE.Vector3(),'reduced-motion camera target');
  assert(!scheduler.has('camera'),'reduced-motion camera must not schedule RAF work');
  controller.dispose();scheduler.dispose();
}

console.log('Inspection Station animation timing passed: zero-delta first frames, 60/30 FPS progress, visibility pause, 40% reversal, 8 drift-free cycles, camera midpoint/interruption, and reduced motion.');
