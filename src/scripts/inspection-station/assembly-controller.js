import {EXPLOSION_PLAN} from './component-registry.js';

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const easeInOut=(value)=>value<.5?4*value*value*value:1-Math.pow(-2*value+2,3)/2;
const EPSILON=1e-6;

export const ASSEMBLY_TIMING=Object.freeze({explode:2200,reassemble:1800,minTravel:260,reset:900});

export function componentProgressAt(progress,plan){
  const span=Math.max(EPSILON,plan.end-plan.start);
  return easeInOut(clamp((clamp(progress,0,1)-plan.start)/span,0,1));
}

export class AssemblyController{
  constructor({registry,scheduler,reducedMotion,onStateChange}){
    this.registry=registry;
    this.scheduler=scheduler;
    this.reducedMotion=reducedMotion;
    this.onStateChange=onStateChange;
    this.progress=0;
    this.mode='idle';
    this.targetProgress=0;
    this.lastDuration=0;
    this.applyProgress(0);
  }

  get state(){
    if(this.mode==='auto')return this.targetProgress>this.progress?'exploding':'assembling';
    if(this.mode==='scrubbing')return 'scrubbing';
    if(this.progress<=EPSILON)return 'assembled';
    if(this.progress>=1-EPSILON)return 'exploded';
    return 'partial';
  }

  getProgress(){return this.progress;}
  isAnimating(){return this.mode==='auto';}
  notify(){this.onStateChange?.(this.state,this.progress,this.mode);}

  applyProgress(value){
    const progress=clamp(Number.isFinite(value)?value:0,0,1);
    this.registry.majorRecords.forEach((record)=>{
      const localProgress=componentProgressAt(progress,EXPLOSION_PLAN[record.key]);
      record.node.position.copy(record.original.position).addScaledVector(this.registry.getExplodedOffset(record),localProgress);
      record.node.quaternion.copy(record.original.quaternion);
      record.node.scale.copy(record.original.scale);
      record.node.updateMatrix();
    });
    this.registry.model.updateMatrixWorld(true);
    this.progress=progress;
  }

  setProgress(value,{mode='manual',stopAnimation=true,notify=true}={}){
    if(stopAnimation)this.scheduler.stop('assembly');
    this.mode=mode;
    this.targetProgress=clamp(Number.isFinite(value)?value:0,0,1);
    this.applyProgress(this.targetProgress);
    if(notify)this.notify();
  }

  beginScrub(){
    this.scheduler.stop('assembly');
    this.mode='scrubbing';
    this.targetProgress=this.progress;
    this.notify();
  }

  endScrub(){
    if(this.mode!=='scrubbing')return;
    this.mode='manual';
    this.targetProgress=this.progress;
    this.notify();
  }

  animateTo(value,{duration}={}){
    const target=clamp(Number.isFinite(value)?value:0,0,1);
    const start=this.progress;
    const distance=Math.abs(target-start);
    const baseDuration=duration??(target>start?ASSEMBLY_TIMING.explode:ASSEMBLY_TIMING.reassemble);
    const effectiveDuration=distance>EPSILON?Math.max(ASSEMBLY_TIMING.minTravel,baseDuration*distance):0;
    this.targetProgress=target;
    this.lastDuration=this.reducedMotion?0:effectiveDuration;

    if(this.reducedMotion||effectiveDuration===0){
      this.scheduler.stop('assembly');
      this.applyProgress(target);
      this.mode='idle';
      this.notify();
      return;
    }

    this.mode='auto';
    this.notify();
    let elapsed=0;
    this.scheduler.play('assembly',(delta)=>{
      elapsed+=delta;
      const timeline=clamp(elapsed/effectiveDuration,0,1);
      this.applyProgress(start+(target-start)*timeline);
      this.notify();
      if(elapsed<effectiveDuration-.01)return true;
      this.applyProgress(target);
      this.mode='idle';
      this.notify();
      return false;
    });
  }

  explode(){this.animateTo(1);}
  reassemble(){this.animateTo(0);}

  reset({animated=true}={}){
    if(animated&&!this.reducedMotion){this.animateTo(0,{duration:ASSEMBLY_TIMING.reset});return;}
    this.scheduler.stop('assembly');
    this.applyProgress(0);
    this.mode='idle';this.targetProgress=0;this.lastDuration=0;this.notify();
  }

  dispose(){this.scheduler.stop('assembly');}
}
