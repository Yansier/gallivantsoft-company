import * as THREE from 'three';

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const easeOut=(value)=>1-Math.pow(1-value,3);
export const CAMERA_TIMING=Object.freeze({focus:820,exploded:1100,reset:760,view:680});

export class CameraController{
  constructor({camera,controls,scheduler,defaultBounds,reducedMotion}){
    this.camera=camera;this.controls=controls;this.scheduler=scheduler;this.defaultBounds=defaultBounds.clone();this.reducedMotion=reducedMotion;
    this.defaultDirection=new THREE.Vector3(.78,.43,.92).normalize();
    this.defaultRange={min:controls.minDistance,max:controls.maxDistance};
    this.onControlStart=()=>scheduler.stop('camera');
    controls.addEventListener('start',this.onControlStart);
  }

  distanceFor(bounds,margin=1.16){
    const sphere=bounds.getBoundingSphere(new THREE.Sphere());
    const vertical=THREE.MathUtils.degToRad(this.camera.fov);
    const horizontal=2*Math.atan(Math.tan(vertical/2)*Math.max(.25,this.camera.aspect));
    const limiting=Math.min(vertical,horizontal);
    return Math.max(.35,sphere.radius/Math.sin(limiting/2)*margin);
  }

  moveTo({bounds=this.defaultBounds,direction,duration=760,margin=1.16,restoreRange=false}){
    const sphere=bounds.getBoundingSphere(new THREE.Sphere());
    const viewDirection=(direction||this.camera.position.clone().sub(this.controls.target)).normalize();
    if(!Number.isFinite(viewDirection.x)||viewDirection.lengthSq()<.1)viewDirection.copy(this.defaultDirection);
    const distance=this.distanceFor(bounds,margin);
    const destination=sphere.center.clone().addScaledVector(viewDirection,distance);
    const startPosition=this.camera.position.clone();const startTarget=this.controls.target.clone();
    if(restoreRange){this.controls.minDistance=this.defaultRange.min;this.controls.maxDistance=this.defaultRange.max;}
    else{this.controls.minDistance=Math.max(.08,sphere.radius*.8);this.controls.maxDistance=Math.max(distance*3,sphere.radius*6);}
    const finish=()=>{
      this.camera.position.copy(destination);this.controls.target.copy(sphere.center);this.camera.lookAt(this.controls.target);this.controls.update();
    };
    if(this.reducedMotion||duration<=0){this.scheduler.stop('camera');finish();return;}
    let elapsed=0;
    this.scheduler.play('camera',(delta)=>{
      elapsed+=delta;
      const progress=easeOut(clamp(elapsed/duration,0,1));
      this.camera.position.lerpVectors(startPosition,destination,progress);
      this.controls.target.lerpVectors(startTarget,sphere.center,progress);
      this.camera.lookAt(this.controls.target);
      if(elapsed<duration-.01)return true;
      finish();return false;
    });
  }

  focus(bounds){this.moveTo({bounds,duration:CAMERA_TIMING.focus,margin:1.42});}
  frameExploded(bounds){this.moveTo({bounds,direction:this.defaultDirection,duration:CAMERA_TIMING.exploded,margin:1.22,restoreRange:true});}
  reset(){this.moveTo({bounds:this.defaultBounds,direction:this.defaultDirection,duration:CAMERA_TIMING.reset,margin:1.12,restoreRange:true});}
  view(direction){this.moveTo({bounds:this.defaultBounds,direction,duration:CAMERA_TIMING.view,margin:1.12,restoreRange:true});}
  dispose(){this.scheduler.stop('camera');this.controls.removeEventListener('start',this.onControlStart);}
}
