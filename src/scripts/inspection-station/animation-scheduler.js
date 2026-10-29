export const MAX_FRAME_DELTA_MS=64;

export class AnimationScheduler{
  constructor(render,{requestFrame=globalThis.requestAnimationFrame?.bind(globalThis),cancelFrame=globalThis.cancelAnimationFrame?.bind(globalThis),visibilitySource=globalThis.document,maxDelta=MAX_FRAME_DELTA_MS}={}){
    if(!requestFrame||!cancelFrame)throw new Error('AnimationScheduler requires requestAnimationFrame support');
    this.render=render;
    this.requestFrame=requestFrame;
    this.cancelFrame=cancelFrame;
    this.visibilitySource=visibilitySource;
    this.maxDelta=maxDelta;
    this.tasks=new Map();
    this.frame=0;
    this.lastTime=null;
    this.disposed=false;
    this.onVisibility=()=>{
      this.lastTime=null;
      if(this.visibilitySource?.hidden){if(this.frame)this.cancelFrame(this.frame);this.frame=0;}
      else{this.ensure();this.render();}
    };
    this.visibilitySource?.addEventListener?.('visibilitychange',this.onVisibility);
  }

  play(key,update){
    if(this.disposed)return;
    this.tasks.set(key,{update,fresh:true});
    this.ensure();
  }
  stop(key){
    this.tasks.delete(key);
    if(!this.tasks.size&&this.frame){this.cancelFrame(this.frame);this.frame=0;this.lastTime=null;}
  }
  has(key){return this.tasks.has(key);}

  ensure(){
    if(this.disposed||this.visibilitySource?.hidden||this.frame||!this.tasks.size)return;
    this.frame=this.requestFrame((time)=>this.tick(time));
  }

  tick(time){
    this.frame=0;
    if(this.disposed||this.visibilitySource?.hidden)return;
    const now=Number.isFinite(time)?time:0;
    const delta=this.lastTime===null?0:Math.min(this.maxDelta,Math.max(0,now-this.lastTime));
    this.lastTime=now;
    for(const [key,task] of [...this.tasks]){
      if(this.tasks.get(key)!==task)continue;
      const taskDelta=task.fresh?0:delta;
      task.fresh=false;
      if(task.update(taskDelta,now)===false&&this.tasks.get(key)===task)this.tasks.delete(key);
    }
    this.render();
    if(this.tasks.size)this.frame=this.requestFrame((next)=>this.tick(next));
    else this.lastTime=null;
  }

  dispose(){
    this.disposed=true;
    if(this.frame)this.cancelFrame(this.frame);
    this.frame=0;this.lastTime=null;
    this.tasks.clear();
    this.visibilitySource?.removeEventListener?.('visibilitychange',this.onVisibility);
  }
}
