import * as THREE from 'three';

function isTransparent(material){return [].concat(material||[]).some((item)=>item?.transparent&&item.opacity<.55);}

export class SelectionController{
  constructor({registry,scene,camera,canvas,stage,render,onSelectionChange,label}){
    this.registry=registry;this.scene=scene;this.camera=camera;this.canvas=canvas;this.stage=stage;this.render=render;this.onSelectionChange=onSelectionChange;this.label=label;
    this.selected=null;this.isolated=false;this.pointerStart=null;this.originalMaterials=new Map();this.highlightCache=new Map();
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();
    this.helper=new THREE.Box3Helper(new THREE.Box3(),0x66cdbc);this.helper.material.transparent=true;this.helper.material.opacity=.48;this.helper.material.depthTest=false;this.helper.renderOrder=8;this.helper.visible=false;scene.add(this.helper);
    this.onPointerDown=(event)=>{if(event.button===0||event.pointerType==='touch')this.pointerStart={x:event.clientX,y:event.clientY,id:event.pointerId};};
    this.onPointerUp=(event)=>{
      if(!this.pointerStart||event.pointerId!==this.pointerStart.id)return;
      const distance=Math.hypot(event.clientX-this.pointerStart.x,event.clientY-this.pointerStart.y);this.pointerStart=null;
      if(distance>7)return;
      this.pick(event.clientX,event.clientY);
    };
    this.onPointerCancel=()=>{this.pointerStart=null;};
    canvas.addEventListener('pointerdown',this.onPointerDown);canvas.addEventListener('pointerup',this.onPointerUp);canvas.addEventListener('pointercancel',this.onPointerCancel);
  }

  highlighted(material){
    if(this.highlightCache.has(material))return this.highlightCache.get(material);
    const clone=material.clone();
    if(clone.emissive){clone.emissive=clone.emissive.clone().lerp(new THREE.Color(0x2c8b8c),.42);clone.emissiveIntensity=Math.min(2.1,(clone.emissiveIntensity||0)+.36);}
    else if(clone.color)clone.color=clone.color.clone().lerp(new THREE.Color(0x77d5c8),.12);
    if(typeof clone.roughness==='number')clone.roughness=Math.max(.05,clone.roughness*.9);
    clone.needsUpdate=true;this.highlightCache.set(material,clone);return clone;
  }

  applyHighlight(record){
    record.meshes.forEach((mesh)=>{
      this.originalMaterials.set(mesh,mesh.material);
      mesh.material=Array.isArray(mesh.material)?mesh.material.map((material)=>this.highlighted(material)):this.highlighted(mesh.material);
    });
    this.helper.box.copy(this.registry.getBounds(record));this.helper.visible=true;
  }

  clearHighlight(){
    this.originalMaterials.forEach((material,mesh)=>{mesh.material=material;});this.originalMaterials.clear();this.helper.visible=false;
  }

  select(recordOrKey,{notify=true}={}){
    const record=typeof recordOrKey==='string'?this.registry.get(recordOrKey):recordOrKey;
    if(record===this.selected)return;
    this.clearHighlight();this.selected=record||null;
    if(this.selected)this.applyHighlight(this.selected);
    this.updateLabel();this.render();if(notify)this.onSelectionChange?.(this.selected);
  }

  clear(){this.select(null);}

  pick(clientX,clientY){
    if(this.isolated)return;
    const rect=this.canvas.getBoundingClientRect();
    this.pointer.set(((clientX-rect.left)/rect.width)*2-1,-((clientY-rect.top)/rect.height)*2+1);
    this.raycaster.setFromCamera(this.pointer,this.camera);
    const hits=this.raycaster.intersectObjects(this.registry.raycastMeshes,false);
    const preferred=hits.find((hit)=>!isTransparent(hit.object.material)&&this.registry.resolveMesh(hit.object));
    const hit=preferred||hits.find((item)=>this.registry.resolveMesh(item.object));
    this.select(hit?this.registry.resolveMesh(hit.object):null);
  }

  isolate(){
    if(!this.selected)return false;
    this.registry.isolate(this.selected);this.isolated=true;this.helper.box.copy(this.registry.getBounds(this.selected));this.updateLabel();this.render();return true;
  }

  showFull(){this.registry.restoreVisibility();this.isolated=false;if(this.selected)this.helper.box.copy(this.registry.getBounds(this.selected));this.updateLabel();this.render();}

  updateLabel(){
    if(!this.label)return;
    if(!this.selected){this.label.hidden=true;return;}
    this.helper.box.copy(this.registry.getBounds(this.selected));
    const point=this.registry.getAnchor(this.selected).project(this.camera);
    if(point.z<-1||point.z>1||point.x<-1.06||point.x>1.06||point.y<-1.06||point.y>1.06){this.label.hidden=true;return;}
    const rect=this.stage.getBoundingClientRect();
    const x=Math.min(rect.width-86,Math.max(86,(point.x*.5+.5)*rect.width));
    const y=Math.min(rect.height-62,Math.max(58,(-point.y*.5+.5)*rect.height));
    const viewportX=rect.left+x;const viewportY=rect.top+y;
    if(viewportX<24||viewportX>globalThis.innerWidth-24||viewportY<24||viewportY>globalThis.innerHeight-24){this.label.hidden=true;return;}
    this.label.style.setProperty('--label-x',`${x}px`);this.label.style.setProperty('--label-y',`${y}px`);this.label.hidden=false;
  }

  dispose(){
    this.clearHighlight();this.highlightCache.forEach((material)=>material.dispose());this.highlightCache.clear();
    this.helper.geometry.dispose();this.helper.material.dispose();this.scene.remove(this.helper);
    this.canvas.removeEventListener('pointerdown',this.onPointerDown);this.canvas.removeEventListener('pointerup',this.onPointerUp);this.canvas.removeEventListener('pointercancel',this.onPointerCancel);
  }
}
