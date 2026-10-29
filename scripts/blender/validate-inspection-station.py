"""Round-trip validation for the exported Precision Inspection Station GLB."""

import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[2]
GLB_PATH = PROJECT_ROOT / "assets" / "models" / "precision-inspection-station.glb"
VALIDATION_REPORT_PATH = PROJECT_ROOT / "assets" / "models" / "precision-inspection-station.validation.json"
REQUIRED_COMPONENTS = {
    "MainChassis",
    "InspectionChamber",
    "OpticalAssembly",
    "ConveyorAssembly",
    "ControlModule",
    "CoolingAssembly",
    "MechanicalConnections",
    "CableAssembly",
}


if not GLB_PATH.is_file() or GLB_PATH.stat().st_size == 0:
    raise SystemExit(f"Missing or empty GLB: {GLB_PATH}")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(GLB_PATH))

root = bpy.data.objects.get("PrecisionInspectionStation")
if root is None:
    raise SystemExit("GLB hierarchy is missing PrecisionInspectionStation")

component_names = {child.name for child in root.children}
missing_components = sorted(REQUIRED_COMPONENTS - component_names)
mesh_objects = [obj for obj in root.children_recursive if obj.type == "MESH"]

triangles = 0
world_points = []
for obj in mesh_objects:
    obj.data.calc_loop_triangles()
    triangles += len(obj.data.loop_triangles)
    world_points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)

minimum = Vector((min(point.x for point in world_points), min(point.y for point in world_points), min(point.z for point in world_points)))
maximum = Vector((max(point.x for point in world_points), max(point.y for point in world_points), max(point.z for point in world_points)))
dimensions = maximum - minimum

result = {
    "glb": str(GLB_PATH),
    "bytes": GLB_PATH.stat().st_size,
    "root": root.name,
    "components": sorted(component_names),
    "mesh_objects": len(mesh_objects),
    "triangles": triangles,
    "materials": sorted(material.name for material in bpy.data.materials),
    "dimensions_m": [round(value, 3) for value in dimensions],
    "cameras": len(bpy.data.cameras),
    "lights": len(bpy.data.lights),
}

errors = []
if missing_components:
    errors.append(f"missing components: {', '.join(missing_components)}")
if not mesh_objects:
    errors.append("no mesh objects imported")
if triangles > 200_000:
    errors.append(f"triangle budget exceeded: {triangles}")
if bpy.data.cameras or bpy.data.lights:
    errors.append("presentation cameras or lights leaked into the asset GLB")

print("ASSET_VALIDATION_RESULT")
print(json.dumps(result, indent=2))
VALIDATION_REPORT_PATH.write_text(json.dumps(result, indent=2), encoding="utf-8")

if errors:
    print("ASSET_VALIDATION_FAILED")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("ASSET_VALIDATION_OK")
