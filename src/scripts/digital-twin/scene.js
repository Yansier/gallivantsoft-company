export async function createTwinScene({canvas,store,onFallback,lowPerformance=false}){
  if(new URLSearchParams(location.search).has('fallback')){onFallback();return null;}
  let THREE,OrbitControls;
  try{THREE=await import('three');({OrbitControls}=await import('three/examples/jsm/controls/OrbitControls.js'));}catch{onFallback();return null;}
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:!lowPerformance,alpha:false,powerPreference:lowPerformance?'low-power':'high-performance'});}catch{onFallback();return null;}
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x071126);scene.fog=new THREE.Fog(0x071126,18,40);
  const camera=new THREE.PerspectiveCamera(42,1,.1,80);camera.position.set(14,11,15);
  const controls=new OrbitControls(camera,canvas);controls.target.set(0,1,0);controls.minDistance=8;controls.maxDistance=28;controls.maxPolarAngle=Math.PI*.47;controls.enablePan=false;
  scene.add(new THREE.HemisphereLight(0x9ec8ff,0x0b1530,2.2));const key=new THREE.DirectionalLight(0xffffff,2.8);key.position.set(7,13,8);scene.add(key);const mint=new THREE.PointLight(0x4ee1c1,22,18);mint.position.set(-6,4,-2);scene.add(mint);
  const floor=new THREE.Mesh(new THREE.BoxGeometry(18,.22,11),new THREE.MeshStandardMaterial({color:0x101d35,roughness:.72,metalness:.18}));floor.position.y=-.18;scene.add(floor);
  const grid=new THREE.GridHelper(18,18,0x315882,0x1a2c4b);grid.position.y=-.05;scene.add(grid);
  const shared=[];const boxGeo=new THREE.BoxGeometry(1.25,.72,.72);const rackMat=new THREE.MeshStandardMaterial({color:0x25456c,metalness:.45,roughness:.5});const parcelMat=new THREE.MeshStandardMaterial({color:0xe4a94f,roughness:.6});shared.push(boxGeo,rackMat,parcelMat);
  const zones={};const zoneDefs=[['storage',-5,0x2d70c7],['processing',0,0x1d907d],['dispatch',5,0xd88838]];
  const zoneGeo=new THREE.BoxGeometry(4.5,.12,8.6);shared.push(zoneGeo);
  zoneDefs.forEach(([name,x,color])=>{const mat=new THREE.MeshStandardMaterial({color,transparent:true,opacity:.18,emissive:color,emissiveIntensity:.08});const mesh=new THREE.Mesh(zoneGeo,mat);mesh.position.set(x,0,0);mesh.userData.zone=name;scene.add(mesh);zones[name]=mesh;shared.push(mat);});
  const rackGeo=new THREE.BoxGeometry(.16,2.6,3.6);shared.push(rackGeo);
  for(let x=-7;x<=-3;x+=2){for(let z=-2;z<=2;z+=2){const upright=new THREE.Mesh(rackGeo,rackMat);upright.position.set(x,1.3,z);scene.add(upright);for(let y=.45;y<2.4;y+=.75){const parcel=new THREE.Mesh(boxGeo,parcelMat);parcel.scale.set(.55,.55,.72);parcel.position.set(x+.55,y,z);scene.add(parcel);}}}
  const machineMat=new THREE.MeshStandardMaterial({color:0x537ca8,metalness:.65,roughness:.3});shared.push(machineMat);for(let z=-2.8;z<=2.8;z+=2.8){const machine=new THREE.Mesh(new THREE.BoxGeometry(2.1,1.2,1.4),machineMat);machine.position.set(0,.6,z);scene.add(machine);}
  const beltMat=new THREE.MeshStandardMaterial({color:0x172a45,metalness:.65,roughness:.36});const belt=new THREE.Mesh(new THREE.BoxGeometry(15,.35,1.1),beltMat);belt.position.set(0,.25,3.2);scene.add(belt);shared.push(belt.geometry,beltMat);
  if(!lowPerformance){const frameMat=new THREE.LineBasicMaterial({color:0x4ee1c1,transparent:true,opacity:.3});const frame=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(18,5.8,11)),frameMat);frame.position.y=2.7;scene.add(frame);shared.push(frame.geometry,frameMat);}
  const packageMesh=new THREE.Mesh(new THREE.BoxGeometry(.78,.78,.78),parcelMat);packageMesh.position.set(-8,.85,4.3);packageMesh.visible=false;scene.add(packageMesh);shared.push(packageMesh.geometry);
  const points=[new THREE.Vector3(-5,.85,3.2),new THREE.Vector3(0,.85,3.2),new THREE.Vector3(1.2,.85,0),new THREE.Vector3(5,.85,3.2)];
  let disposed=false,raf=0,last=0,animation=null;
  const resize=()=>{const rect=canvas.getBoundingClientRect();const width=Math.max(1,Math.floor(rect.width)),height=Math.max(1,Math.floor(rect.height));renderer.setPixelRatio(Math.min(devicePixelRatio||1,lowPerformance?1.15:1.75));renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();render();};
  const render=()=>{if(!disposed&&!document.hidden)renderer.render(scene,camera);};
  const tick=(time)=>{raf=0;if(disposed||document.hidden)return;if(animation){if(!store.getState().paused){const delta=Math.min(40,time-(last||time));animation.progress+=delta/animation.duration;const t=Math.min(1,animation.progress);packageMesh.position.lerpVectors(animation.from,animation.to,t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2);packageMesh.rotation.y+=delta*.003;if(t>=1){const stage=animation.stage;animation=null;store.completeTransition(stage);}}render();if(animation)raf=requestAnimationFrame(tick);}last=time;};
  const begin=(stage)=>{const from=packageMesh.visible?packageMesh.position.clone():new THREE.Vector3(-8,.85,4.3);packageMesh.visible=true;animation={stage,from,to:points[stage].clone(),progress:0,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?120:950};if(!raf)raf=requestAnimationFrame(tick);};
  const select=(zone)=>{Object.entries(zones).forEach(([name,mesh])=>{mesh.material.opacity=name===zone?.35:.16;mesh.material.emissiveIntensity=name===zone?.55:.08;});render();};
  const unsubscribe=store.subscribe((state)=>{select(state.selectedZone);if(state.status==='idle'){packageMesh.visible=false;animation=null;packageMesh.position.set(-8,.85,4.3);render();}if(state.targetStage!==null&&(!animation||animation.stage!==state.targetStage))begin(state.targetStage);});
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();const onPointer=(event)=>{const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height*2-1));raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(Object.values(zones))[0];if(hit?.object?.userData?.zone)store.selectZone(hit.object.userData.zone);};
  canvas.addEventListener('pointerup',onPointer);controls.addEventListener('change',render);const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  const onVisibility=()=>{if(!document.hidden&&animation&&!raf)raf=requestAnimationFrame(tick);};document.addEventListener('visibilitychange',onVisibility);
  const dispose=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();unsubscribe();document.removeEventListener('visibilitychange',onVisibility);canvas.removeEventListener('pointerup',onPointer);controls.dispose();const geometries=new Set(),materials=new Set();scene.traverse((object)=>{if(object.geometry)geometries.add(object.geometry);const list=Array.isArray(object.material)?object.material:[object.material];list.filter(Boolean).forEach((material)=>materials.add(material));});geometries.forEach((geometry)=>geometry.dispose());materials.forEach((material)=>material.dispose());renderer.dispose();};
  addEventListener('pagehide',dispose,{once:true});return{dispose};
}
