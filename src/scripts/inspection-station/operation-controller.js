import {OPERATION_GEOMETRY} from './mechanical-rig.js';

const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,value));
const smooth=(value)=>value*value*(3-2*value);

export const OPERATION_STATES=Object.freeze({OFF:'OFF',READY:'READY',FEEDING:'FEEDING',POSITIONING:'POSITIONING',SCANNING:'SCANNING',EVALUATING:'EVALUATING',OUTPUTTING:'OUTPUTTING',COMPLETE:'COMPLETE',PAUSED:'PAUSED'});
export const OPERATION_TIMING=Object.freeze({FEEDING:1800,POSITIONING:720,SCANNING:2200,EVALUATING:900,OUTPUTTING:1650});
export const OPERATION_SEQUENCE=Object.freeze(['FEEDING','POSITIONING','SCANNING','EVALUATING','OUTPUTTING','COMPLETE']);
const RUNNING_STATES=new Set(OPERATION_SEQUENCE.slice(0,-1));
const OVERALL_RANGES=Object.freeze({FEEDING:[0,.25],POSITIONING:[.25,.35],SCANNING:[.35,.72],EVALUATING:[.72,.84],OUTPUTTING:[.84,1],COMPLETE:[1,1]});

export class OperationController{
  constructor({rig,scheduler,reducedMotion=false,onStateChange}={}){
    this.rig=rig;this.scheduler=scheduler;this.reducedMotion=reducedMotion;this.onStateChange=onStateChange;
    this.state=OPERATION_STATES.OFF;this.stageElapsed=0;this.stageProgress=0;this.overallProgress=0;this.pausedState=null;this.lastResult=null;this.cycle=0;this.enabled=false;
  }

  get isRunning(){return RUNNING_STATES.has(this.state);}
  get canStart(){return this.enabled&&(this.state===OPERATION_STATES.READY||this.state===OPERATION_STATES.COMPLETE);}
  snapshot(message=this.state.toLowerCase()){
    return {state:this.state,stage:this.state===OPERATION_STATES.PAUSED?this.pausedState:this.state,stageProgress:this.stageProgress,progress:this.overallProgress,result:this.lastResult,workpiece:this.cycle?`PIS-W${String(this.cycle).padStart(3,'0')}`:null,message,pausedState:this.pausedState};
  }
  emit(message,forceScreen=false){const data=this.snapshot(message);this.rig?.updateScreen(data,forceScreen);this.onStateChange?.(data);}

  enter(){
    this.scheduler.stop('operation');this.enabled=true;this.state=OPERATION_STATES.OFF;this.stageElapsed=0;this.stageProgress=0;this.overallProgress=0;this.pausedState=null;this.lastResult=null;
    this.rig.enter(this.snapshot('off'));this.emit('off');
  }

  powerOn(){
    if(!this.enabled||this.state!==OPERATION_STATES.OFF)return false;
    this.rig.resetMotion();this.state=OPERATION_STATES.READY;this.stageElapsed=0;this.stageProgress=0;this.overallProgress=0;this.lastResult=null;this.emit('ready',true);return true;
  }

  start(){
    if(!this.canStart)return false;
    this.cycle+=1;this.lastResult=null;this.rig.resetMotion();this.rig.setWorkpiece(OPERATION_GEOMETRY.path.input,true);this.transition(OPERATION_STATES.FEEDING);return true;
  }

  transition(next){
    this.state=next;this.stageElapsed=0;this.stageProgress=next===OPERATION_STATES.COMPLETE?1:0;
    if(next===OPERATION_STATES.COMPLETE){this.overallProgress=1;this.lastResult='PASS';this.rig.setWorkpiece(OPERATION_GEOMETRY.path.output,false);this.rig.setScan(0,false);this.scheduler.stop('operation');this.emit('complete',true);return;}
    this.emit(next.toLowerCase(),true);this.run();
  }

  run(){
    if(!this.enabled||!this.isRunning)return;
    if(this.reducedMotion){
      while(this.isRunning)this.advance(OPERATION_TIMING[this.state]);
      return;
    }
    this.scheduler.play('operation',(delta)=>{if(!this.enabled||!this.isRunning)return false;this.advance(delta);return this.isRunning;});
  }

  advance(delta){
    if(!this.isRunning||delta<0)return;
    const state=this.state;const duration=OPERATION_TIMING[state];this.stageElapsed=Math.min(duration,this.stageElapsed+delta);this.stageProgress=clamp(this.stageElapsed/duration);
    const [start,end]=OVERALL_RANGES[state];this.overallProgress=start+(end-start)*this.stageProgress;
    const eased=smooth(this.stageProgress);
    if(state===OPERATION_STATES.FEEDING){
      this.rig.setWorkpiece(OPERATION_GEOMETRY.path.input+(.34*eased),true);this.rig.advance(delta,{rollerSpeed:5.8,fanSpeed:3.2});
    }else if(state===OPERATION_STATES.POSITIONING){
      this.rig.setWorkpiece(-.12+(.12*eased),true);this.rig.advance(delta,{rollerSpeed:2.4*(1-eased),fanSpeed:3.2});
    }else if(state===OPERATION_STATES.SCANNING){
      this.rig.setWorkpiece(0,true);this.rig.setScan(this.stageProgress,true);this.rig.advance(delta,{fanSpeed:4.1});
    }else if(state===OPERATION_STATES.EVALUATING){
      this.rig.setScan(0,false);this.rig.advance(delta,{fanSpeed:3.2});
    }else if(state===OPERATION_STATES.OUTPUTTING){
      this.rig.setWorkpiece(OPERATION_GEOMETRY.path.output*eased,true);this.rig.advance(delta,{rollerSpeed:5.8,fanSpeed:3.2*(1-eased)});
    }
    this.emit(state.toLowerCase());
    if(this.stageElapsed>=duration){const index=OPERATION_SEQUENCE.indexOf(state);this.transition(OPERATION_SEQUENCE[index+1]);}
  }

  pause(){
    if(!this.isRunning)return false;
    this.scheduler.stop('operation');this.pausedState=this.state;this.state=OPERATION_STATES.PAUSED;this.emit('paused',true);return true;
  }

  resume(){
    if(this.state!==OPERATION_STATES.PAUSED||!this.pausedState)return false;
    this.state=this.pausedState;this.pausedState=null;this.emit('resumed',true);this.run();return true;
  }

  reset(){
    if(!this.enabled)return false;
    this.scheduler.stop('operation');this.rig.resetMotion();this.pausedState=null;this.stageElapsed=0;this.stageProgress=0;this.overallProgress=0;this.lastResult=null;
    this.state=this.state===OPERATION_STATES.OFF?OPERATION_STATES.OFF:OPERATION_STATES.READY;this.emit(this.state.toLowerCase(),true);return true;
  }

  powerOff(){
    if(!this.enabled)return false;
    this.scheduler.stop('operation');this.rig.resetMotion();this.state=OPERATION_STATES.OFF;this.pausedState=null;this.stageElapsed=0;this.stageProgress=0;this.overallProgress=0;this.lastResult=null;this.emit('off',true);return true;
  }

  exit(){
    this.scheduler.stop('operation');this.enabled=false;this.state=OPERATION_STATES.OFF;this.pausedState=null;this.stageElapsed=0;this.stageProgress=0;this.overallProgress=0;this.lastResult=null;this.rig.exit();
  }

  dispose(){this.exit();}
}
