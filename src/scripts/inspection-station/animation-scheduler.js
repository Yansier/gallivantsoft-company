export class AnimationScheduler{
  constructor(render){
    this.render=render;
    this.tasks=new Map();
    this.frame=0;
    this.lastTime=0;
    this.disposed=false;
    this.onVisibility=()=>{
      if(document.hidden){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;this.lastTime=0;}
      else{this.ensure();this.render();}
    };
    document.addEventListener('visibilitychange',this.onVisibility);
  }

  play(key,update){this.tasks.set(key,update);this.ensure();}
  stop(key){this.tasks.delete(key);}
  has(key){return this.tasks.has(key);}

  ensure(){
    if(this.disposed||document.hidden||this.frame||!this.tasks.size)return;
    this.frame=requestAnimationFrame((time)=>this.tick(time));
  }

  tick(time){
    this.frame=0;
    if(this.disposed||document.hidden)return;
    const delta=this.lastTime?Math.min(50,time-this.lastTime):0;
    this.lastTime=time;
    for(const [key,update] of [...this.tasks])if(update(delta,time)===false)this.tasks.delete(key);
    this.render();
    if(this.tasks.size)this.frame=requestAnimationFrame((next)=>this.tick(next));
    else this.lastTime=0;
  }

  dispose(){
    this.disposed=true;
    if(this.frame)cancelAnimationFrame(this.frame);
    this.tasks.clear();
    document.removeEventListener('visibilitychange',this.onVisibility);
  }
}
