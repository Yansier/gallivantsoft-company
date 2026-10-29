import {EXPLOSION_PLAN} from './component-registry.js';

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const easeInOut=(value)=>value<.5?4*value*value*value:1-Math.pow(-2*value+2,3)/2;

export class AssemblyController{
  constructor({registry,scheduler,reducedMotion,onStateChange}){
    this.registry=registry;
    this.scheduler=scheduler;
    this.reducedMotion=reducedMotion;
    this.onStateChange=onStateChange;
    this.state='assembled';
  }

  isAnimating(){return this.state==='exploding'||this.state==='assembling';}

  explode(){this.animate(true);}
  reassemble(){this.animate(false);}

  animate(exploded,{duration=2100}={}){
    const targetState=exploded?'exploded':'assembled';
    const movingState=exploded?'exploding':'assembling';
    const records=this.registry.majorRecords.map((record)=>({
      record,
      startPosition:record.node.position.clone(),
      startQuaternion:record.node.quaternion.clone(),
      startScale:record.node.scale.clone(),
      targetPosition:record.original.position.clone().add(exploded?this.registry.getExplodedOffset(record):record.original.position.clone().set(0,0,0)),
      targetQuaternion:record.original.quaternion.clone(),
      targetScale:record.original.scale.clone(),
      delay:exploded?EXPLOSION_PLAN[record.key].delay:EXPLOSION_PLAN[record.key].returnDelay
    }));
    this.state=movingState;this.onStateChange?.(this.state);
    if(this.reducedMotion)duration=1;
    let elapsed=0;
    this.scheduler.play('assembly',(delta)=>{
      elapsed+=delta||duration;
      records.forEach(({record,startPosition,startQuaternion,startScale,targetPosition,targetQuaternion,targetScale,delay})=>{
        const available=Math.max(1,duration*(1-delay));
        const progress=easeInOut(clamp((elapsed-duration*delay)/available,0,1));
        record.node.position.lerpVectors(startPosition,targetPosition,progress);
        record.node.quaternion.slerpQuaternions(startQuaternion,targetQuaternion,progress);
        record.node.scale.lerpVectors(startScale,targetScale,progress);
        record.node.updateMatrix();
      });
      this.registry.model.updateMatrixWorld(true);
      if(elapsed<duration)return true;
      records.forEach(({record,targetPosition,targetQuaternion,targetScale})=>{
        record.node.position.copy(targetPosition);record.node.quaternion.copy(targetQuaternion);record.node.scale.copy(targetScale);record.node.updateMatrix();
      });
      this.registry.model.updateMatrixWorld(true);
      this.state=targetState;this.onStateChange?.(this.state);
      return false;
    });
  }

  reset({animated=true}={}){
    if(animated&&!this.reducedMotion){this.animate(false,{duration:900});return;}
    this.scheduler.stop('assembly');this.registry.restoreTransforms();this.state='assembled';this.onStateChange?.(this.state);
  }

  dispose(){this.scheduler.stop('assembly');}
}
