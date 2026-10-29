import * as THREE from 'three';

export const COMPONENT_NAMES=['MainChassis','InspectionChamber','OpticalAssembly','ConveyorAssembly','ControlModule','CoolingAssembly','MechanicalConnections','CableAssembly'];

export const DETAIL_DEFINITIONS=[
  {key:'OpticalLens',parent:'OpticalAssembly',code:'A1',matches:(name)=>name==='Optical_FocusRing'||name.startsWith('Optical_LensElement_')},
  {key:'InspectionHead',parent:'OpticalAssembly',code:'A2',matches:(name)=>['Optical_AdjustmentCarriage','Optical_CameraBody','Optical_RingLightHousing','Optical_RingLightEmitter'].includes(name)},
  {key:'ConveyorRollers',parent:'ConveyorAssembly',code:'B1',matches:(name)=>name.startsWith('Conveyor_Roller_')},
  {key:'ControlPanel',parent:'ControlModule',code:'C1',matches:(name)=>name.startsWith('Control_')&&name!=='Control_Housing'},
  {key:'CoolingFans',parent:'CoolingAssembly',code:'D1',matches:(name)=>/^Cooling_(Fan|Hub|OuterRing|Grille)/.test(name)}
];

export const EXPLOSION_PLAN={
  MainChassis:{direction:[-.48,0,-.04],start:.04,end:.72},
  InspectionChamber:{direction:[0,.08,.52],start:.16,end:.82},
  OpticalAssembly:{direction:[0,.62,.08],start:.30,end:.94},
  ConveyorAssembly:{direction:[0,-.34,.57],start:.24,end:.90},
  ControlModule:{direction:[.62,.04,.22],start:.38,end:.98},
  CoolingAssembly:{direction:[0,.03,-.62],start:.44,end:1},
  MechanicalConnections:{direction:[-.28,-.25,.20],start:0,end:.56},
  CableAssembly:{direction:[.28,.20,-.14],start:.10,end:.76}
};

function meshesUnder(node){
  const meshes=[];
  node?.traverse((object)=>{if(object.isMesh)meshes.push(object);});
  return meshes;
}

function boundsFromMeshes(meshes){
  const result=new THREE.Box3();
  const local=new THREE.Box3();
  for(const mesh of meshes){
    if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
    local.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    result.union(local);
  }
  return result;
}

export class ComponentRegistry{
  constructor(model,scale){
    this.model=model;
    this.scale=scale;
    this.records=new Map();
    this.majorRecords=[];
    this.detailRecords=[];
    this.meshToRecord=new WeakMap();
    this.originalMeshVisibility=new WeakMap();
    this.originalNodeVisibility=new WeakMap();

    model.updateMatrixWorld(true);
    COMPONENT_NAMES.forEach((key,index)=>{
      const node=model.getObjectByName(key);
      if(!node)return;
      const meshes=meshesUnder(node);
      const original={
        parent:node.parent,
        position:node.position.clone(),
        quaternion:node.quaternion.clone(),
        scale:node.scale.clone(),
        matrix:node.matrix.clone()
      };
      const record={key,type:'major',code:String(index+1).padStart(2,'0'),node,meshes,original,assembledBounds:boundsFromMeshes(meshes)};
      this.records.set(key,record);this.majorRecords.push(record);
      this.originalNodeVisibility.set(node,node.visible);
      meshes.forEach((mesh)=>{this.meshToRecord.set(mesh,record);this.originalMeshVisibility.set(mesh,mesh.visible);});
    });

    DETAIL_DEFINITIONS.forEach((definition)=>{
      const parent=this.records.get(definition.parent);
      if(!parent)return;
      const meshes=parent.meshes.filter((mesh)=>definition.matches(mesh.name));
      if(!meshes.length)return;
      const record={...definition,type:'detail',node:null,meshes,assembledBounds:boundsFromMeshes(meshes)};
      this.records.set(record.key,record);this.detailRecords.push(record);
      meshes.forEach((mesh)=>this.meshToRecord.set(mesh,record));
    });
  }

  get missing(){return COMPONENT_NAMES.filter((name)=>!this.records.has(name));}
  get raycastMeshes(){return this.majorRecords.flatMap((record)=>record.meshes).filter((mesh)=>mesh.visible&&mesh.parent?.visible!==false);}
  get(key){return this.records.get(key)||null;}
  resolveMesh(mesh){return this.meshToRecord.get(mesh)||null;}

  getBounds(recordOrKey){
    const record=typeof recordOrKey==='string'?this.get(recordOrKey):recordOrKey;
    return record?boundsFromMeshes(record.meshes):new THREE.Box3();
  }

  getAnchor(recordOrKey){return this.getBounds(recordOrKey).getCenter(new THREE.Vector3());}

  getExplodedOffset(record){
    const plan=EXPLOSION_PLAN[record.key];
    return plan?new THREE.Vector3(...plan.direction).multiplyScalar(this.scale):new THREE.Vector3();
  }

  getExplodedBounds(){
    const bounds=new THREE.Box3();
    this.majorRecords.forEach((record)=>{
      const localOffset=this.getExplodedOffset(record);
      const parent=record.original.parent;
      const from=parent.localToWorld(record.original.position.clone());
      const to=parent.localToWorld(record.original.position.clone().add(localOffset));
      bounds.union(record.assembledBounds.clone().translate(to.sub(from)));
    });
    return bounds;
  }

  getCurrentBounds(){
    const bounds=new THREE.Box3();
    this.majorRecords.forEach((record)=>bounds.union(boundsFromMeshes(record.meshes)));
    return bounds;
  }

  restoreVisibility(){
    this.majorRecords.forEach((record)=>{record.node.visible=this.originalNodeVisibility.get(record.node);});
    this.majorRecords.flatMap((record)=>record.meshes).forEach((mesh)=>{mesh.visible=this.originalMeshVisibility.get(mesh);});
  }

  isolate(recordOrKey){
    const record=typeof recordOrKey==='string'?this.get(recordOrKey):recordOrKey;
    if(!record)return;
    const selected=new Set(record.meshes);
    this.majorRecords.forEach((major)=>{major.node.visible=true;major.meshes.forEach((mesh)=>{mesh.visible=selected.has(mesh);});});
  }

  restoreTransforms(){
    this.majorRecords.forEach((record)=>{
      const {node,original}=record;
      if(node.parent!==original.parent)original.parent.add(node);
      node.position.copy(original.position);node.quaternion.copy(original.quaternion);node.scale.copy(original.scale);node.updateMatrix();
    });
    this.model.updateMatrixWorld(true);
  }
}
