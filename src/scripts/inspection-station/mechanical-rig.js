import * as THREE from 'three';

export const OPERATION_GEOMETRY=Object.freeze({
  rollerNames:Array.from({length:19},(_,index)=>`Conveyor_Roller_${String(index).padStart(2,'0')}`),
  rollerAxis:Object.freeze([0,1,0]),
  fanCenters:Object.freeze([Object.freeze([-1.35,1.55,-1.035]),Object.freeze([1.35,1.55,-1.035])]),
  fanAxis:Object.freeze([0,0,1]),
  conveyorTop:1.005,
  workpieceSize:Object.freeze([.42,.11,.34]),
  workpieceY:1.061,
  path:Object.freeze({input:-.46,inspection:0,output:.46,z:0}),
  chamberClearance:Object.freeze({xMin:-.7125,xMax:.7125,zMin:-.6125,zMax:.6625,opticalMinY:1.437})
});
export const SCREEN_REFRESH_FPS=12;
export const SCREEN_REFRESH_INTERVAL_MS=1000/SCREEN_REFRESH_FPS;

const STATIC_SCREEN_NAMES=['Control_DisplayTitle','Control_DisplayStatus','Control_UIHeaderLine','Control_UIProgress','Control_UIStatusDot'];
const localFanCenter=(parent,worldCenter)=>parent.worldToLocal(new THREE.Vector3(...worldCenter));

function createWorkpiece(){
  const group=new THREE.Group();group.name='OperationWorkpiece';
  const shape=new THREE.Shape();
  const halfX=.21;const halfZ=.17;const bevel=.045;
  shape.moveTo(-halfX+bevel,-halfZ);shape.lineTo(halfX-bevel,-halfZ);shape.lineTo(halfX,-halfZ+bevel);
  shape.lineTo(halfX,halfZ-bevel);shape.lineTo(halfX-bevel,halfZ);shape.lineTo(-halfX+bevel,halfZ);
  shape.lineTo(-halfX,halfZ-bevel);shape.lineTo(-halfX,-halfZ+bevel);shape.closePath();
  const bodyGeometry=new THREE.ExtrudeGeometry(shape,{depth:.075,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.012,bevelThickness:.012,curveSegments:2});
  bodyGeometry.center();bodyGeometry.rotateX(-Math.PI/2);
  const bodyMaterial=new THREE.MeshStandardMaterial({name:'OperationWorkpieceMetal',color:0x738090,metalness:.84,roughness:.28,envMapIntensity:1.25});
  const body=new THREE.Mesh(bodyGeometry,bodyMaterial);body.castShadow=true;body.receiveShadow=true;group.add(body);

  const insetMaterial=new THREE.MeshStandardMaterial({name:'OperationWorkpieceInset',color:0x101923,metalness:.62,roughness:.38});
  const inset=new THREE.Mesh(new THREE.CylinderGeometry(.078,.078,.018,32),insetMaterial);inset.position.y=.052;inset.castShadow=true;group.add(inset);
  const detailMaterial=new THREE.MeshStandardMaterial({name:'OperationWorkpieceDetail',color:0x9eb4c4,metalness:.9,roughness:.22});
  [[-.135,-.095],[.135,-.095],[-.135,.095],[.135,.095]].forEach(([x,z])=>{
    const fastener=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.012,12),detailMaterial);fastener.position.set(x,.052,z);fastener.castShadow=true;group.add(fastener);
  });
  group.position.set(OPERATION_GEOMETRY.path.input,OPERATION_GEOMETRY.workpieceY,OPERATION_GEOMETRY.path.z);
  return group;
}

function createScanEffect(){
  const material=new THREE.MeshBasicMaterial({color:0x6fffe8,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(new THREE.RingGeometry(.12,.235,48),material);
  mesh.name='OperationScanEffect';mesh.rotation.x=-Math.PI/2;mesh.position.set(0,1.19,-.03);mesh.renderOrder=6;mesh.visible=false;
  return mesh;
}

function createDynamicScreen(copy){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=480;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const material=new THREE.MeshBasicMaterial({map:texture,toneMapped:false,transparent:false,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.45,.275),material);mesh.name='OperationDynamicScreen';mesh.renderOrder=7;
  return {canvas,texture,material,mesh,copy,lastKey:''};
}

function drawScreen(screen,data,force=false){
  const key=JSON.stringify(data);if(!force&&key===screen.lastKey)return false;screen.lastKey=key;
  const {canvas,texture,copy}=screen;const context=canvas.getContext('2d');
  const stateCopy=copy.states?.[data.state]||data.state;
  context.fillStyle='#061521';context.fillRect(0,0,canvas.width,canvas.height);
  const gradient=context.createLinearGradient(0,0,canvas.width,canvas.height);gradient.addColorStop(0,'rgba(38,104,125,.3)');gradient.addColorStop(1,'rgba(9,28,44,.1)');context.fillStyle=gradient;context.fillRect(0,0,canvas.width,canvas.height);
  context.fillStyle='#84ffe8';context.font='600 28px system-ui, sans-serif';context.fillText('PIS–400  /  OPERATING',44,58);
  context.strokeStyle='rgba(126,255,231,.36)';context.lineWidth=2;context.beginPath();context.moveTo(44,82);context.lineTo(724,82);context.stroke();
  context.fillStyle='#ecfaff';context.font='700 54px system-ui, sans-serif';context.fillText(stateCopy.toUpperCase(),44,160);
  context.fillStyle='#8db2c2';context.font='500 26px system-ui, sans-serif';context.fillText(copy.stageLabel||'STAGE',44,214);
  context.fillStyle='#d9f4fa';context.font='600 30px system-ui, sans-serif';context.fillText(copy.stages?.[data.stage]||data.stage,44,254);
  const progress=Math.round((data.progress||0)*100);context.fillStyle='#102d3b';context.fillRect(44,306,680,28);context.fillStyle=data.state==='COMPLETE'?'#64e6a3':'#58d9e8';context.fillRect(44,306,680*progress/100,28);
  context.fillStyle='#9fc4d0';context.font='600 24px system-ui, sans-serif';context.fillText(`${progress}%`,44,376);
  if(data.result){context.fillStyle='#64e6a3';context.font='700 32px system-ui, sans-serif';context.fillText(`${copy.resultLabel||'SIMULATED RESULT'}: ${copy.results?.[data.result]||data.result}`,390,376);}
  context.fillStyle='#537888';context.font='500 18px system-ui, sans-serif';context.fillText(copy.simulationLabel||'CONCEPT SIMULATION',44,438);
  texture.needsUpdate=true;return true;
}

export class MechanicalRig{
  constructor({model,scene,render,screenCopy={}}){
    this.model=model;this.scene=scene;this.render=render;
    this.rollers=OPERATION_GEOMETRY.rollerNames.map((name)=>model.getObjectByName(name)).filter(Boolean).map((node)=>({node,quaternion:node.quaternion.clone()}));
    this.rollerAngle=0;this.fanAngle=0;this.fans=[];this.active=false;this.screenElapsed=0;this.screenDrawCount=0;
    const cooling=model.getObjectByName('CoolingAssembly');
    if(cooling){
      model.updateMatrixWorld(true);
      OPERATION_GEOMETRY.fanCenters.forEach((center,index)=>{
        const pivot=new THREE.Group();pivot.name=`OperationFanPivot_${index}`;pivot.position.copy(localFanCenter(cooling,center));cooling.add(pivot);pivot.updateMatrixWorld(true);
        const blades=Array.from({length:7},(_,bladeIndex)=>model.getObjectByName(`Cooling_Fan${index}_Blade${bladeIndex}`)).filter(Boolean);
        const originals=blades.map((node)=>({node,parent:node.parent,position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone()}));
        blades.forEach((blade)=>pivot.attach(blade));this.fans.push({pivot,blades,originals});
      });
    }
    this.workpiece=createWorkpiece();this.workpiece.visible=false;scene.add(this.workpiece);
    this.scanEffect=createScanEffect();scene.add(this.scanEffect);
    this.screen=createDynamicScreen(screenCopy);
    const glass=model.getObjectByName('Control_ScreenGlass');const control=model.getObjectByName('ControlModule');
    if(glass&&control){model.updateMatrixWorld(true);this.screen.mesh.position.copy(glass.getWorldPosition(new THREE.Vector3()));this.screen.mesh.quaternion.copy(glass.getWorldQuaternion(new THREE.Quaternion()));this.screen.mesh.position.add(new THREE.Vector3(0,0,.024).applyQuaternion(this.screen.mesh.quaternion));scene.add(this.screen.mesh);control.attach(this.screen.mesh);}
    else this.screen.mesh.visible=false;
    this.screen.mesh.visible=false;
    this.staticScreen=STATIC_SCREEN_NAMES.map((name)=>model.getObjectByName(name)).filter(Boolean).map((node)=>({node,visible:node.visible}));
    this.audit={rollers:this.rollers.length,fanBlades:this.fans.map((fan)=>fan.blades.length),rollerAxis:[...OPERATION_GEOMETRY.rollerAxis],fanAxis:[...OPERATION_GEOMETRY.fanAxis],path:{...OPERATION_GEOMETRY.path}};
  }

  enter(data){
    this.active=true;this.screenElapsed=0;this.workpiece.visible=false;this.scanEffect.visible=false;this.screen.mesh.visible=true;
    this.staticScreen.forEach(({node})=>{node.visible=false;});this.updateScreen(data,true);this.render();
  }

  setWorkpiece(position,visible=true){
    this.workpiece.position.set(position,OPERATION_GEOMETRY.workpieceY,OPERATION_GEOMETRY.path.z);this.workpiece.visible=visible;
  }

  setScan(progress,active){
    this.scanEffect.visible=active;
    this.scanEffect.position.x=THREE.MathUtils.lerp(-.18,.18,progress);
    this.scanEffect.material.opacity=active ? .22+.5*Math.sin(progress*Math.PI) : 0;
    this.scanEffect.scale.setScalar(.88+.12*Math.sin(progress*Math.PI));
  }

  advance(delta,{rollerSpeed=0,fanSpeed=0}={}){
    if(!this.active||delta<=0)return;
    this.screenElapsed+=delta;
    const seconds=delta/1000;this.rollerAngle+=rollerSpeed*seconds;this.fanAngle+=fanSpeed*seconds;
    const rollerRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...OPERATION_GEOMETRY.rollerAxis),this.rollerAngle);
    this.rollers.forEach(({node,quaternion})=>node.quaternion.copy(quaternion).multiply(rollerRotation));
    this.fans.forEach(({pivot})=>{pivot.rotation.z=this.fanAngle;});
    this.model.updateMatrixWorld(true);
  }

  updateScreen(data,force=false){
    if(!force&&this.screenElapsed<SCREEN_REFRESH_INTERVAL_MS)return false;
    if(force)this.screenElapsed=0;
    else this.screenElapsed%=SCREEN_REFRESH_INTERVAL_MS;
    if(!drawScreen(this.screen,data,force))return false;
    this.screenDrawCount+=1;this.screenLastData={...data};this.render();return true;
  }

  getDiagnostics(){
    return {
      active:this.active,
      rollers:{count:this.rollers.length,angle:this.rollerAngle},
      fans:{groups:this.fans.length,blades:this.fans.map((fan)=>fan.blades.length),angle:this.fanAngle},
      workpiece:{visible:this.workpiece.visible,position:this.workpiece.position.toArray()},
      scan:{visible:this.scanEffect.visible,position:this.scanEffect.position.toArray(),opacity:this.scanEffect.material.opacity},
      screen:{drawCount:this.screenDrawCount,lastData:this.screenLastData||null,visible:this.screen.mesh.visible},
      staticScreenVisible:this.staticScreen.map(({node})=>node.visible)
    };
  }

  resetMotion(){
    this.rollerAngle=0;this.fanAngle=0;this.rollers.forEach(({node,quaternion})=>node.quaternion.copy(quaternion));this.fans.forEach(({pivot})=>{pivot.rotation.set(0,0,0);});
    this.workpiece.visible=false;this.workpiece.position.set(OPERATION_GEOMETRY.path.input,OPERATION_GEOMETRY.workpieceY,OPERATION_GEOMETRY.path.z);this.setScan(0,false);this.model.updateMatrixWorld(true);this.render();
  }

  exit(){
    this.active=false;this.resetMotion();this.screen.mesh.visible=false;this.staticScreen.forEach(({node,visible})=>{node.visible=visible;});this.render();
  }

  dispose(){
    this.exit();
    this.fans.forEach(({pivot,originals})=>{originals.forEach(({node,parent,position,quaternion,scale})=>{parent.add(node);node.position.copy(position);node.quaternion.copy(quaternion);node.scale.copy(scale);});pivot.removeFromParent();});
    this.workpiece.traverse((object)=>{object.geometry?.dispose();object.material?.dispose();});this.workpiece.removeFromParent();
    this.scanEffect.geometry.dispose();this.scanEffect.material.dispose();this.scanEffect.removeFromParent();
    this.screen.mesh.geometry.dispose();this.screen.material.dispose();this.screen.texture.dispose();this.screen.mesh.removeFromParent();
  }
}
