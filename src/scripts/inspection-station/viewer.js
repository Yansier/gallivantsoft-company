import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {AnimationScheduler} from './animation-scheduler.js';
import {AssemblyController} from './assembly-controller.js';
import {CameraController} from './camera-controller.js';
import {ComponentRegistry} from './component-registry.js';
import {SelectionController} from './selection-controller.js';

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

function tuneMaterials(model){
  const clones=new Map();
  const tune=(source)=>{
    if(clones.has(source))return clones.get(source);
    const material=source.clone();
    const name=material.name||'';
    material.envMapIntensity=1.05;
    if(name==='BrushedMetal'){
      material.metalness=.92;material.roughness=.27;material.envMapIntensity=1.45;
    }else if(name.startsWith('PaintedMetal')){
      material.metalness=.68;material.roughness=name.includes('Mid')?.36:.42;material.envMapIntensity=1.18;
    }else if(name==='DarkStructuralMetal'){
      material.metalness=.78;material.roughness=.37;material.envMapIntensity=1.15;
    }else if(name==='SafetyGlass'){
      material.transparent=true;material.opacity=.32;material.depthWrite=false;material.roughness=.08;material.metalness=0;material.side=THREE.DoubleSide;material.envMapIntensity=1.3;
      if('transmission'in material)material.transmission=.72;
    }else if(name==='OpticalLens'){
      material.roughness=.045;material.metalness=.08;material.envMapIntensity=1.65;
      if('transmission'in material)material.transmission=.42;
    }else if(name==='IndustrialRubber'||name==='CableRubber'){
      material.metalness=0;material.roughness=.82;material.envMapIntensity=.55;
    }else if(name==='StatusCyan'||name==='StatusGreen'){
      material.emissiveIntensity=1.55;material.toneMapped=true;
    }else if(name==='ControlScreen'){
      material.roughness=.16;material.emissiveIntensity=.72;material.envMapIntensity=.85;
    }
    material.needsUpdate=true;clones.set(source,material);return material;
  };
  model.traverse((object)=>{
    if(!object.isMesh)return;
    object.castShadow=true;object.receiveShadow=true;
    object.material=Array.isArray(object.material)?object.material.map(tune):tune(object.material);
    if([].concat(object.material).some((material)=>material.name==='SafetyGlass'))object.renderOrder=4;
  });
}

function disposeObject(root){
  const geometries=new Set();const materials=new Set();const textures=new Set();
  root.traverse((object)=>{
    if(object.geometry)geometries.add(object.geometry);
    for(const material of [].concat(object.material||[])){
      if(!material)return;materials.add(material);
      for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
    }
  });
  textures.forEach((texture)=>texture.dispose());materials.forEach((material)=>material.dispose());geometries.forEach((geometry)=>geometry.dispose());
}

export async function createInspectionViewer({root,canvas,stage,modelUrl,expectedComponents,copy={},onProgress,onInteraction}){
  if(!canvas||!stage||!modelUrl)throw new Error('Viewer configuration is incomplete');

  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.04;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.setClearColor(0x07101f,1);

  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x07101f);
  const camera=new THREE.PerspectiveCamera(35,1,.05,100);
  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=false;controls.enablePan=false;controls.screenSpacePanning=false;
  controls.minPolarAngle=.16;controls.maxPolarAngle=Math.PI*.58;controls.zoomToCursor=true;

  let selection=null;let disposed=false;
  const render=()=>{if(disposed||document.hidden)return;selection?.updateLabel();renderer.render(scene,camera);};
  const scheduler=new AnimationScheduler(render);

  const pmrem=new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const room=new RoomEnvironment();
  const environment=pmrem.fromScene(room,.045).texture;
  scene.environment=environment;
  room.traverse((object)=>{object.geometry?.dispose();object.material?.dispose?.();});
  pmrem.dispose();

  const loader=new GLTFLoader();
  const gltf=await new Promise((resolve,reject)=>loader.load(modelUrl,resolve,(event)=>{
    const ratio=event.total?event.loaded/event.total:Math.min(.9,event.loaded/4_039_520);
    onProgress?.(clamp(ratio,0,.96));
  },reject));
  const model=gltf.scene;
  tuneMaterials(model);scene.add(model);model.updateMatrixWorld(true);

  const box=new THREE.Box3().setFromObject(model);
  const sphere=box.getBoundingSphere(new THREE.Sphere());
  const center=sphere.center.clone();
  const radius=Math.max(sphere.radius,.5);
  camera.near=Math.max(.02,radius/120);camera.far=radius*45;camera.updateProjectionMatrix();
  controls.target.copy(center);controls.minDistance=radius*1.08;controls.maxDistance=radius*6.5;

  const hemi=new THREE.HemisphereLight(0xbcd9ff,0x0b1020,1.45);
  const key=new THREE.DirectionalLight(0xe1edff,4.2);
  key.position.copy(center).add(new THREE.Vector3(radius*2.5,radius*3.2,radius*2.8));
  key.target.position.copy(center);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.00012;key.shadow.normalBias=.025;
  const shadowExtent=radius*2.2;
  Object.assign(key.shadow.camera,{left:-shadowExtent,right:shadowExtent,top:shadowExtent,bottom:-shadowExtent,near:.1,far:radius*10});
  const fill=new THREE.DirectionalLight(0x78a9e8,2.25);
  fill.position.copy(center).add(new THREE.Vector3(-radius*2.4,radius*1.3,radius*1.2));fill.target.position.copy(center);
  const rim=new THREE.DirectionalLight(0x64e4d0,2.6);
  rim.position.copy(center).add(new THREE.Vector3(-radius*.7,radius*2.2,-radius*3));rim.target.position.copy(center);
  scene.add(hemi,key,key.target,fill,fill.target,rim,rim.target);

  const groundMaterial=new THREE.MeshStandardMaterial({color:0x101a2a,roughness:.72,metalness:.18,envMapIntensity:.55});
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(radius*10,radius*10),groundMaterial);
  ground.rotation.x=-Math.PI/2;ground.position.set(center.x,box.min.y-.025,center.z);ground.receiveShadow=true;scene.add(ground);
  const grid=new THREE.GridHelper(radius*8,22,0x274468,0x17283f);
  grid.position.copy(ground.position);grid.position.y+=.006;grid.material.transparent=true;grid.material.opacity=.2;scene.add(grid);

  const registry=new ComponentRegistry(model,radius);
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cameraController=new CameraController({camera,controls,scheduler,defaultBounds:box,reducedMotion});
  const defaultDirection=new THREE.Vector3(.78,.43,.92).normalize();
  const defaultDistance=cameraController.distanceFor(box,1.12);
  camera.position.copy(center).addScaledVector(defaultDirection,defaultDistance);camera.lookAt(center);

  const label=root.querySelector('[data-component-label]');
  const labelCode=label?.querySelector('[data-label-code]');
  const labelName=label?.querySelector('[data-label-name]');
  let assembly=null;
  let lastMessage='ready';

  const state=()=>({
    assembly:assembly?.state||'assembled',
    selectedKey:selection?.selected?.key||null,
    selectedType:selection?.selected?.type||null,
    isolated:Boolean(selection?.isolated),
    displayState:selection?.isolated?'isolated':assembly?.state||'assembled',
    message:lastMessage
  });
  const emit=(message=lastMessage)=>{lastMessage=message;onInteraction?.(state());};

  selection=new SelectionController({
    registry,scene,camera,canvas,stage,render,label,
    onSelectionChange:(record)=>{
      if(labelCode)labelCode.textContent=record?.code||'';
      if(labelName)labelName.textContent=record?copy.componentDetails?.[record.key]?.name||record.key:'';
      emit(record?'selected':'selectionCleared');
    }
  });

  assembly=new AssemblyController({
    registry,scheduler,reducedMotion,
    onStateChange:(next)=>emit(next)
  });

  const directions={
    front:new THREE.Vector3(0,.12,1).normalize(),
    side:new THREE.Vector3(1,.12,0).normalize(),
    rear:new THREE.Vector3(0,.12,-1).normalize(),
    'three-quarter':defaultDirection,
    reset:defaultDirection
  };

  const currentBounds=()=>assembly.state==='exploded'||assembly.state==='exploding'?registry.getExplodedBounds():box;
  const moveToView=(name)=>{
    const bounds=currentBounds();
    if(name==='reset')cameraController.reset();
    else cameraController.moveTo({bounds,direction:directions[name]||defaultDirection,duration:680,margin:name==='three-quarter'?1.18:1.14,restoreRange:true});
  };

  const viewButtons=[...root.querySelectorAll('[data-view]')];
  const viewHandlers=new Map();
  viewButtons.forEach((button)=>{
    const handler=()=>{viewButtons.forEach((item)=>item.setAttribute('aria-pressed',String(item===button)));moveToView(button.dataset.view);};
    button.addEventListener('click',handler);viewHandlers.set(button,handler);
  });

  controls.addEventListener('change',render);
  const resize=()=>{
    const rect=stage.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const pixelCap=matchMedia('(max-width: 768px)').matches?1.45:1.75;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,pixelCap));renderer.setSize(rect.width,rect.height,false);
    camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();render();
  };
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
  const visibilityHandler=()=>{if(!document.hidden){resize();render();}};
  document.addEventListener('visibilitychange',visibilityHandler);
  resize();onProgress?.(1);render();

  const api={
    structure:{missing:registry.missing,found:expectedComponents.filter((name)=>!registry.missing.includes(name)),details:registry.detailRecords.map((record)=>record.key)},
    getState:state,
    selectComponent(key){
      if(assembly.isAnimating())return false;
      if(selection.isolated)selection.showFull();
      const record=registry.get(key);if(!record)return false;
      selection.select(record);emit('selected');return true;
    },
    clearSelection(){selection.clear();emit('selectionCleared');},
    focusSelected(){
      if(!selection.selected||assembly.isAnimating())return false;
      cameraController.focus(registry.getBounds(selection.selected));emit('focused');return true;
    },
    isolateSelected(){
      if(!selection.selected||assembly.isAnimating())return false;
      if(!selection.isolate())return false;
      cameraController.focus(registry.getBounds(selection.selected));emit('isolated');return true;
    },
    showFull(){selection.showFull();emit('fullAssembly');return true;},
    explode(){
      if(assembly.state==='exploded'||assembly.state==='exploding')return false;
      selection.showFull();assembly.explode();cameraController.frameExploded(registry.getExplodedBounds());emit('exploding');return true;
    },
    reassemble(){
      if(assembly.state==='assembled'||assembly.state==='assembling')return false;
      selection.showFull();assembly.reassemble();cameraController.reset();emit('assembling');return true;
    },
    resetAll(){
      selection.showFull();selection.clear();assembly.reset({animated:true});cameraController.reset();emit('reset');return true;
    },
    moveToView,
    dispose(){
      if(disposed)return;disposed=true;
      resizeObserver.disconnect();document.removeEventListener('visibilitychange',visibilityHandler);
      viewHandlers.forEach((handler,button)=>button.removeEventListener('click',handler));
      selection.dispose();assembly.dispose();cameraController.dispose();scheduler.dispose();controls.dispose();
      registry.restoreVisibility();registry.restoreTransforms();
      disposeObject(model);ground.geometry.dispose();groundMaterial.dispose();grid.geometry.dispose();grid.material.dispose();environment.dispose();renderer.dispose();renderer.forceContextLoss();
    }
  };
  emit('ready');
  return api;
}
