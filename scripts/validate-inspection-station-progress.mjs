import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AssemblyController,ASSEMBLY_TIMING,componentProgressAt} from '../src/scripts/inspection-station/assembly-controller.js';
import {ComponentRegistry,COMPONENT_NAMES,EXPLOSION_PLAN} from '../src/scripts/inspection-station/component-registry.js';

const EPSILON=1e-6;
const LEVELS=[0,.1,.25,.5,.75,.9,1];
const near=(a,b,tolerance=EPSILON)=>Math.abs(a-b)<=tolerance;

class ManualScheduler{
  constructor(){this.tasks=new Map();}
  play(key,update){this.tasks.set(key,{update,fresh:true});}
  stop(key){this.tasks.delete(key);}
  has(key){return this.tasks.has(key);}
  step(delta){
    for(const [key,task] of [...this.tasks]){
      const value=task.fresh?0:delta;task.fresh=false;
      if(task.update(value)===false&&this.tasks.get(key)===task)this.tasks.delete(key);
    }
  }
}

function advance(scheduler,duration,fps=60){
  scheduler.step(0);
  const interval=1000/fps;
  let elapsed=0;
  while(elapsed+interval<duration-.001){scheduler.step(interval);elapsed+=interval;}
  scheduler.step(duration-elapsed);
}

function createRegistry(){
  const model=new THREE.Group();model.name='PrecisionInspectionStation';
  COMPONENT_NAMES.forEach((name,index)=>{
    const group=new THREE.Group();group.name=name;group.position.set(index*.09,index*.035,-index*.045);model.add(group);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(.22,.18,.2),new THREE.MeshStandardMaterial());mesh.name=`${name}_ProgressMesh`;group.add(mesh);
  });
  model.updateMatrixWorld(true);
  return new ComponentRegistry(model,2);
}

function createHarness(){
  const scheduler=new ManualScheduler();
  const registry=createRegistry();
  const events=[];
  const controller=new AssemblyController({registry,scheduler,reducedMotion:false,onStateChange:(state,progress,mode)=>events.push({state,progress,mode})});
  return {scheduler,registry,controller,events};
}

function snapshot(registry){
  return registry.majorRecords.map((record)=>({
    key:record.key,
    position:record.node.position.clone(),
    quaternion:record.node.quaternion.clone(),
    scale:record.node.scale.clone()
  }));
}

function assertSnapshot(actual,expected,message){
  actual.forEach((record,index)=>{
    assert.equal(record.key,expected[index].key,`${message} record order changed`);
    assert(record.position.distanceTo(expected[index].position)<=EPSILON,`${message} ${record.key} position differs`);
    assert(record.quaternion.angleTo(expected[index].quaternion)<=EPSILON,`${message} ${record.key} quaternion differs`);
    assert(record.scale.distanceTo(expected[index].scale)<=EPSILON,`${message} ${record.key} scale differs`);
  });
}

function assertFinite(registry,progress){
  registry.majorRecords.forEach((record)=>{
    [...record.node.position.toArray(),...record.node.quaternion.toArray(),...record.node.scale.toArray()].forEach((value)=>assert(Number.isFinite(value),`${record.key} contains a non-finite transform at ${progress}`));
  });
}

function dispose(registry){registry.model.traverse((object)=>{object.geometry?.dispose();object.material?.dispose?.();});}

// Every requested level is deterministic, finite, and derived from the original
// transform rather than the previously visited progress.
{
  const {registry,controller}=createHarness();
  const originals=snapshot(registry);
  const deterministic=new Map();
  for(const progress of LEVELS){
    controller.setProgress(progress,{notify:false});
    assert(near(controller.getProgress(),progress),`progress did not resolve to ${progress}`);
    assertFinite(registry,progress);
    deterministic.set(progress,snapshot(registry));
    controller.setProgress(progress,{notify:false});
    assertSnapshot(snapshot(registry),deterministic.get(progress),`repeat ${progress}`);
  }
  assertSnapshot(deterministic.get(0),originals,'0% must equal the original assembly');
  registry.majorRecords.forEach((record,index)=>{
    const expected=record.original.position.clone().add(registry.getExplodedOffset(record));
    assert(deterministic.get(1)[index].position.distanceTo(expected)<=EPSILON,`100% endpoint mismatch for ${record.key}`);
  });
  for(const progress of [0,.8,.2,1,0])controller.setProgress(progress,{notify:false});
  assertSnapshot(snapshot(registry),originals,'nonlinear progress history must return exactly to 0%');
  dispose(registry);
}

// Explicit start/end windows preserve the authored mechanical separation order.
{
  assert(componentProgressAt(.08,EXPLOSION_PLAN.MechanicalConnections)>0,'mechanical connections must move first');
  assert(componentProgressAt(.08,EXPLOSION_PLAN.MainChassis)>0,'main chassis must begin in the early stage');
  for(const key of ['CableAssembly','InspectionChamber','ConveyorAssembly','OpticalAssembly','ControlModule','CoolingAssembly']){
    assert.equal(componentProgressAt(.08,EXPLOSION_PLAN[key]),0,`${key} started before its authored interval`);
  }
  assert(componentProgressAt(.35,EXPLOSION_PLAN.OpticalAssembly)>0,'optical assembly must rise during the middle stage');
  assert.equal(componentProgressAt(.35,EXPLOSION_PLAN.ControlModule),0,'control module must wait for its stage');
  assert.equal(componentProgressAt(.35,EXPLOSION_PLAN.CoolingAssembly),0,'cooling assembly must remain late-stage');
  assert(componentProgressAt(.5,EXPLOSION_PLAN.MechanicalConnections)>componentProgressAt(.5,EXPLOSION_PLAN.CoolingAssembly),'early components must lead late components');
}

// Automatic motion passes through the same transforms as direct slider input in
// both directions, and duration scales from the current global progress.
{
  const {scheduler,registry,controller}=createHarness();
  controller.setProgress(.5,{notify:false});const manualHalf=snapshot(registry);
  controller.setProgress(0,{notify:false});controller.animateTo(1);scheduler.step(0);scheduler.step(ASSEMBLY_TIMING.explode/2);
  assert(near(controller.getProgress(),.5),'automatic explosion midpoint must expose 50% progress');
  assertSnapshot(snapshot(registry),manualHalf,'automatic and manual 50% transforms');
  scheduler.step(ASSEMBLY_TIMING.explode/2);assert.equal(controller.state,'exploded','automatic explosion did not reach 100%');
  controller.reassemble();scheduler.step(0);scheduler.step(ASSEMBLY_TIMING.reassemble/2);
  assert(near(controller.getProgress(),.5),'automatic reassembly midpoint must expose 50% progress');
  assertSnapshot(snapshot(registry),manualHalf,'reverse automatic and manual 50% transforms');
  controller.setProgress(.4,{notify:false});controller.explode();assert(near(controller.lastDuration,ASSEMBLY_TIMING.explode*.6),'40% to explode duration must cover only 60% travel');
  controller.setProgress(.4,{notify:false});controller.reassemble();assert(near(controller.lastDuration,ASSEMBLY_TIMING.reassemble*.4),'40% to reassemble duration must cover only 40% travel');
  dispose(registry);
}

// Beginning manual control interrupts automatic motion at its exact current
// progress; hidden components continue to receive deterministic transforms.
{
  const {scheduler,registry,controller}=createHarness();
  controller.explode();scheduler.step(0);advance(scheduler,ASSEMBLY_TIMING.explode*.4,60);
  const beforeProgress=controller.getProgress();const before=snapshot(registry);
  controller.beginScrub();assert(!scheduler.has('assembly'),'scrubbing must stop automatic assembly RAF');
  assert(near(controller.getProgress(),beforeProgress),'scrub interruption changed global progress');
  assertSnapshot(snapshot(registry),before,'scrub interruption must not jump');
  scheduler.step(500);assertSnapshot(snapshot(registry),before,'stopped automatic motion continued after scrub start');
  controller.setProgress(.65,{mode:'scrubbing'});controller.endScrub();
  assert.equal(controller.state,'partial','manual 65% must report a partial assembly');
  assert.equal(controller.mode,'manual','pointer release must leave stable manual mode');

  registry.isolate('OpticalAssembly');
  controller.setProgress(.75,{notify:false});const isolatedProgress=snapshot(registry);
  registry.restoreVisibility();
  controller.setProgress(.75,{notify:false});
  assertSnapshot(snapshot(registry),isolatedProgress,'restoring visibility at 75% must not move hidden components');
  dispose(registry);
}

// Eight arbitrary full round trips prove there is no accumulation from slider use.
{
  const {registry,controller}=createHarness();const originals=snapshot(registry);
  for(let cycle=0;cycle<8;cycle++){
    for(const progress of [0,.1,.25,.5,.75,.9,1,.9,.75,.5,.25,.1,0])controller.setProgress(progress,{notify:false});
    assertSnapshot(snapshot(registry),originals,`manual round trip ${cycle+1}`);
  }
  dispose(registry);
}

console.log('Inspection Station assembly progress passed: 0/10/25/50/75/90/100%, staged windows, deterministic repeats, shared auto/manual paths, scrub interruption, isolation, and 8 drift-free round trips.');
