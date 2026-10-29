import {EXPLOSION_PLAN} from './component-registry.js';

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const easeInOut=(value)=>value<.5?4*value*value*value:1-Math.pow(-2*value+2,3)/2;
export const ASSEMBLY_TIMING=Object.freeze({explode:2200,reassemble:1800,minReverse:260,reset:900});

export class AssemblyController{
  constructor({registry,scheduler,reducedMotion,onStateChange}){
    this.registry=registry;
    this.scheduler=scheduler;
    this.reducedMotion=reducedMotion;
    this.onStateChange=onStateChange;
    this.state='assembled';
    this.lastDuration=0;
  }

  isAnimating(){return this.state==='exploding'||this.state==='assembling';}

  explode(){this.animate(true);}
  reassemble(){this.animate(false);}

  animate(exploded,{duration=exploded?ASSEMBLY_TIMING.explode:ASSEMBLY_TIMING.reassemble}={}){
    const targetState=exploded?'exploded':'assembled';
    const movingState=exploded?'exploding':'assembling';
    const records=this.registry.majorRecords.map((record)=>({
      record,
      startPosition:record.node.position.clone(),
      startQuaternion:record.node.quaternion.clone(),
      startScale:record.node.scale.clone(),
      targetPosition:exploded?record.original.position.clone().add(this.registry.getExplodedOffset(record)):record.original.position.clone(),
      targetQuaternion:record.original.quaternion.clone(),
      targetScale:record.original.scale.clone(),
      delay:exploded?EXPLOSION_PLAN[record.key].delay:EXPLOSION_PLAN[record.key].returnDelay
    }));
    const remainingRatio=records.reduce((maximum,{record,startPosition,targetPosition})=>{
      const fullDistance=this.registry.getExplodedOffset(record).length();
      if(fullDistance<1e-7)return maximum;
      return Math.max(maximum,clamp(startPosition.distanceTo(targetPosition)/fullDistance,0,1));
    },0);
    const effectiveDuration=remainingRatio>1e-5?Math.max(ASSEMBLY_TIMING.minReverse,duration*remainingRatio):0;
    this.lastDuration=this.reducedMotion?0:effectiveDuration;
    this.state=movingState;this.onStateChange?.(this.state);
    const finish=()=>{
      records.forEach(({record,targetPosition,targetQuaternion,targetScale})=>{
        record.node.position.copy(targetPosition);record.node.quaternion.copy(targetQuaternion);record.node.scale.copy(targetScale);record.node.updateMatrix();
      });
      this.registry.model.updateMatrixWorld(true);
      this.state=targetState;this.onStateChange?.(this.state);
    };
    if(this.reducedMotion||effectiveDuration===0){this.scheduler.stop('assembly');finish();return;}
    let elapsed=0;
    this.scheduler.play('assembly',(delta)=>{
      elapsed+=delta;
      records.forEach(({record,startPosition,startQuaternion,startScale,targetPosition,targetQuaternion,targetScale,delay})=>{
        const available=Math.max(1,effectiveDuration*(1-delay));
        const progress=easeInOut(clamp((elapsed-effectiveDuration*delay)/available,0,1));
        record.node.position.lerpVectors(startPosition,targetPosition,progress);
        record.node.quaternion.slerpQuaternions(startQuaternion,targetQuaternion,progress);
        record.node.scale.lerpVectors(startScale,targetScale,progress);
        record.node.updateMatrix();
      });
      this.registry.model.updateMatrixWorld(true);
      if(elapsed<effectiveDuration-.01)return true;
      finish();
      return false;
    });
  }

  reset({animated=true}={}){
    if(animated&&!this.reducedMotion){this.animate(false,{duration:ASSEMBLY_TIMING.reset});return;}
    this.scheduler.stop('assembly');this.registry.restoreTransforms();this.state='assembled';this.onStateChange?.(this.state);
  }

  dispose(){this.scheduler.stop('assembly');}
}
