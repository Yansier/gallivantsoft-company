import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {phase4Translations} from '../src/i18n/phase4.js';
import {ComponentRegistry,COMPONENT_NAMES,DETAIL_DEFINITIONS,EXPLOSION_PLAN} from '../src/scripts/inspection-station/component-registry.js';

const projectRoot=new URL('../',import.meta.url);
const glb=await readFile(new URL('assets/models/precision-inspection-station.glb',projectRoot));
assert.equal(glb.toString('ascii',0,4),'glTF','asset must be a binary glTF');
const jsonLength=glb.readUInt32LE(12);
assert.equal(glb.readUInt32LE(16),0x4e4f534a,'first GLB chunk must contain JSON');
const gltf=JSON.parse(glb.toString('utf8',20,20+jsonLength).replace(/\0+$/,''));
const nodeNames=new Set(gltf.nodes.map((node)=>node.name).filter(Boolean));

COMPONENT_NAMES.forEach((name)=>assert(nodeNames.has(name),`GLB missing major component ${name}`));
['Optical_LensElement_1.542','Optical_CameraBody','Conveyor_Roller_09','Control_ScreenGlass','Cooling_Fan0_Blade0'].forEach((name)=>assert(nodeNames.has(name),`GLB missing interactive detail ${name}`));
assert.deepEqual(Object.keys(EXPLOSION_PLAN).sort(),[...COMPONENT_NAMES].sort(),'explosion plan must cover every major component');
Object.entries(EXPLOSION_PLAN).forEach(([name,plan])=>{
  assert.equal(plan.direction.length,3,`${name} requires a 3D direction`);
  assert(plan.direction.some((value)=>value!==0),`${name} explosion direction cannot be zero`);
  assert(plan.start>=0&&plan.start<1,`${name} start progress must be normalized`);
  assert(plan.end>plan.start&&plan.end<=1,`${name} end progress must follow its start`);
});

const model=new THREE.Group();model.name='PrecisionInspectionStation';
const representativeNames={
  OpticalAssembly:['Optical_LensElement_1.542','Optical_CameraBody'],
  ConveyorAssembly:['Conveyor_Roller_09'],
  ControlModule:['Control_ScreenGlass'],
  CoolingAssembly:['Cooling_Fan0_Blade0']
};
COMPONENT_NAMES.forEach((name,index)=>{
  const group=new THREE.Group();group.name=name;group.position.set(index*.1,index*.05,-index*.03);model.add(group);
  const names=representativeNames[name]||[`${name}_Representative`];
  names.forEach((meshName)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.2),new THREE.MeshStandardMaterial());mesh.name=meshName;group.add(mesh);});
});
model.updateMatrixWorld(true);
const registry=new ComponentRegistry(model,2);
assert.deepEqual(registry.missing,[],'mock registry must identify all major components');
assert.equal(registry.detailRecords.length,DETAIL_DEFINITIONS.length,'all curated detail groups must register');

const saved=registry.majorRecords.map((record)=>record.original.position.clone());
for(let cycle=0;cycle<8;cycle++){
  registry.majorRecords.forEach((record)=>record.node.position.add(registry.getExplodedOffset(record)));
  registry.restoreTransforms();
  registry.majorRecords.forEach((record,index)=>assert(record.node.position.equals(saved[index]),`${record.key} drifted after cycle ${cycle+1}`));
}
registry.isolate('OpticalLens');
assert.equal(registry.raycastMeshes.filter((mesh)=>mesh.visible).length,1,'detail isolation should retain only curated meshes');
registry.restoreVisibility();
assert(registry.raycastMeshes.length>=COMPONENT_NAMES.length,'visibility restoration should recover the full mock assembly');

for(const lang of ['en','zh','ms']){
  const copy=phase4Translations[lang].station;
  assert(copy.actions.explode&&copy.actions.reassemble&&copy.actions.resetAll,`${lang} assembly controls are incomplete`);
  assert(copy.states.exploded&&copy.states.isolated&&copy.states.partial&&copy.states.scrubbing,`${lang} interaction states are incomplete`);
  assert(copy.assemblyControl?.title&&copy.assemblyControl?.progress&&copy.assemblyControl?.manual&&copy.assemblyControl?.sliderLabel,`${lang} progress control copy is incomplete`);
  [...COMPONENT_NAMES,...DETAIL_DEFINITIONS.map((item)=>item.key)].forEach((key)=>{
    const detail=copy.componentDetails[key];
    assert(detail?.name&&detail?.system&&detail?.function&&detail?.construction,`${lang} copy missing ${key}`);
  });
}

model.traverse((object)=>{object.geometry?.dispose();object.material?.dispose?.();});
console.log(`Inspection Station explorer validation passed: ${COMPONENT_NAMES.length} assemblies, ${DETAIL_DEFINITIONS.length} curated detail groups, 8 drift-free transform cycles, 3 locales.`);
