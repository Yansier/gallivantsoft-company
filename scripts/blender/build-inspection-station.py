"""Build and render the original GallivantSoft Precision Inspection Station.

Run with:
  D:\blender\blender.exe --background --factory-startup --python scripts/blender/build-inspection-station.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "assets" / "models"
SOURCE_DIR = MODEL_DIR / "source"
RENDER_DIR = ROOT / "assets" / "renders" / "precision-inspection-station"
BLEND_PATH = SOURCE_DIR / "precision-inspection-station.blend"
GLB_PATH = MODEL_DIR / "precision-inspection-station.glb"
REPORT_PATH = MODEL_DIR / "precision-inspection-station.report.json"

for folder in (MODEL_DIR, SOURCE_DIR, RENDER_DIR):
    folder.mkdir(parents=True, exist_ok=True)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def set_input(node, name, value):
    socket = node.inputs.get(name)
    if socket is not None:
        socket.default_value = value


def make_material(name, color, metallic=0.0, roughness=0.45, transmission=0.0,
                  emission=None, emission_strength=0.0, alpha=1.0, coat=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (*color, alpha)
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    set_input(bsdf, "Base Color", (*color, 1.0))
    set_input(bsdf, "Metallic", metallic)
    set_input(bsdf, "Roughness", roughness)
    set_input(bsdf, "IOR", 1.46)
    set_input(bsdf, "Transmission Weight", transmission)
    set_input(bsdf, "Alpha", alpha)
    set_input(bsdf, "Coat Weight", coat)
    set_input(bsdf, "Coat Roughness", 0.14)
    if emission:
        set_input(bsdf, "Emission Color", (*emission, 1.0))
        set_input(bsdf, "Emission Strength", emission_strength)
    if alpha < 1.0:
        try:
            material.surface_render_method = "BLENDED"
        except Exception:
            try:
                material.blend_method = "BLEND"
            except Exception:
                pass
        material.use_transparency_overlap = False if hasattr(material, "use_transparency_overlap") else True
    return material


def make_brushed_metal():
    material = make_material("BrushedMetal", (0.34, 0.39, 0.43), metallic=0.95, roughness=0.25)
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    noise = nodes.new("ShaderNodeTexNoise")
    noise.name = "FineBrushing"
    noise.inputs["Scale"].default_value = 180.0
    noise.inputs["Detail"].default_value = 2.0
    noise.inputs["Roughness"].default_value = 0.42
    mapping = nodes.new("ShaderNodeMapping")
    texcoord = nodes.new("ShaderNodeTexCoord")
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.08
    bump.inputs["Distance"].default_value = 0.025
    links.new(texcoord.outputs["Generated"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return material


def assign_material(obj, material):
    if obj.data and hasattr(obj.data, "materials"):
        obj.data.materials.append(material)


def parent_keep_transform(obj, parent):
    world = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = world


def add_bevel(obj, width=0.04, segments=3):
    modifier = obj.modifiers.new("PrecisionBevel", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    modifier.angle_limit = math.radians(28)
    try:
        modifier.harden_normals = True
    except Exception:
        pass
    try:
        normal = obj.modifiers.new("WeightedNormals", "WEIGHTED_NORMAL")
        normal.keep_sharp = True
    except Exception:
        pass


def smooth(obj):
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True


def cube(name, location, scale, material, parent=None, bevel=0.035, segments=3, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (scale[0] / 2, scale[1] / 2, scale[2] / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    if bevel:
        add_bevel(obj, bevel, segments)
    if parent:
        parent_keep_transform(obj, parent)
    return obj


def cylinder(name, location, radius, depth, material, parent=None, vertices=48,
             rotation=(0, 0, 0), bevel=0.015, smooth_shading=True):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                       location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, material)
    if smooth_shading:
        smooth(obj)
    if bevel:
        add_bevel(obj, bevel, 2)
    if parent:
        parent_keep_transform(obj, parent)
    return obj


def torus(name, location, major_radius, minor_radius, material, parent=None,
          rotation=(0, 0, 0), major_segments=64, minor_segments=12):
    bpy.ops.mesh.primitive_torus_add(major_radius=major_radius, minor_radius=minor_radius,
                                    major_segments=major_segments, minor_segments=minor_segments,
                                    location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, material)
    smooth(obj)
    if parent:
        parent_keep_transform(obj, parent)
    return obj


def uv_sphere(name, location, radius, material, parent=None, segments=48, rings=24, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    smooth(obj)
    if parent:
        parent_keep_transform(obj, parent)
    return obj


def extruded_profile(name, points_xz, depth, material, parent=None, bevel=0.035, y=0.0):
    count = len(points_xz)
    vertices = [(x, y - depth / 2, z) for x, z in points_xz] + [(x, y + depth / 2, z) for x, z in points_xz]
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, nxt + count, index + count))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    if bevel:
        add_bevel(obj, bevel, 3)
    if parent:
        parent_keep_transform(obj, parent)
    return obj


def curve_cable(name, points, radius, material, parent=None):
    curve_data = bpy.data.curves.new(name, "CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 12
    curve_data.bevel_depth = radius
    curve_data.bevel_resolution = 4
    spline = curve_data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    if parent:
        parent_keep_transform(obj, parent)
    return obj


def text_object(name, body, location, size, material, parent=None, rotation=(math.pi / 2, 0, 0), extrude=0.006):
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = body
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = extrude
    curve.bevel_depth = 0.0015
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    assign_material(obj, material)
    if parent:
        parent_keep_transform(obj, parent)
    return obj


def empty(name, location, parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = 0.18
    obj.location = location
    if parent:
        parent_keep_transform(obj, parent)
    return obj


def add_area_light(name, location, energy, size, color, target):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return obj


def look_at(camera, target):
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


clear_scene()

# Materials
painted = make_material("PaintedMetal_Graphite", (0.035, 0.045, 0.055), metallic=0.78, roughness=0.27, coat=0.22)
painted_mid = make_material("PaintedMetal_MidGraphite", (0.095, 0.115, 0.135), metallic=0.72, roughness=0.31)
silver = make_brushed_metal()
dark_metal = make_material("DarkStructuralMetal", (0.012, 0.017, 0.023), metallic=0.88, roughness=0.22)
rubber = make_material("IndustrialRubber", (0.008, 0.01, 0.012), metallic=0.0, roughness=0.8)
glass = make_material("SafetyGlass", (0.06, 0.14, 0.17), metallic=0.0, roughness=0.06, transmission=0.78, alpha=0.32, coat=0.35)
lens = make_material("OpticalLens", (0.005, 0.025, 0.055), metallic=0.05, roughness=0.045, transmission=0.38, coat=0.7)
blue = make_material("TechnologyBlue", (0.015, 0.16, 0.34), metallic=0.48, roughness=0.24)
screen = make_material("ControlScreen", (0.006, 0.018, 0.026), metallic=0.05, roughness=0.12, emission=(0.01, 0.11, 0.19), emission_strength=0.8, coat=0.6)
cyan_emit = make_material("StatusCyan", (0.015, 0.35, 0.42), metallic=0.05, roughness=0.22, emission=(0.02, 0.75, 0.78), emission_strength=5.0)
green_emit = make_material("StatusGreen", (0.015, 0.2, 0.12), metallic=0.0, roughness=0.25, emission=(0.03, 0.8, 0.38), emission_strength=5.5)
red_emit = make_material("EmergencyRed", (0.42, 0.015, 0.018), metallic=0.05, roughness=0.23, emission=(0.85, 0.015, 0.01), emission_strength=2.2)
inner_white = make_material("InspectionWhite", (0.48, 0.53, 0.56), metallic=0.6, roughness=0.22)
cable_mat = make_material("CableRubber", (0.012, 0.016, 0.021), metallic=0.0, roughness=0.74)

# Component hierarchy
root = empty("PrecisionInspectionStation", (0, 0, 0))
main = empty("MainChassis", (0, 0, 0.35), root)
chamber = empty("InspectionChamber", (0, 0, 1.55), root)
optical = empty("OpticalAssembly", (0, 0, 2.05), root)
conveyor = empty("ConveyorAssembly", (0, 0, 0.92), root)
control = empty("ControlModule", (1.65, -1.0, 1.42), root)
cooling = empty("CoolingAssembly", (0, 1.05, 1.45), root)
connections = empty("MechanicalConnections", (0, 0, 1.0), root)
cables = empty("CableAssembly", (0, 0, 1.5), root)

# 01 — Main chassis: custom chamfered silhouettes, layered skins, plinth, seams.
base_profile = [(-2.05, 0.15), (-2.18, 0.26), (-2.10, 0.48), (-1.92, 0.58), (1.92, 0.58), (2.10, 0.48), (2.18, 0.26), (2.05, 0.15)]
extruded_profile("Chassis_BasePlinth", base_profile, 1.95, painted, main, bevel=0.055)
left_profile = [(-1.92, 0.52), (-1.92, 2.38), (-1.78, 2.62), (-1.54, 2.76), (-0.92, 2.76), (-0.79, 2.55), (-0.79, 0.52)]
right_profile = [(-x, z) for x, z in reversed(left_profile)]
extruded_profile("Chassis_LeftTower", left_profile, 1.82, painted, main, bevel=0.055)
extruded_profile("Chassis_RightTower", right_profile, 1.82, painted, main, bevel=0.055)
top_profile = [(-0.94, 2.48), (-0.80, 2.74), (0.80, 2.74), (0.94, 2.48), (0.80, 2.33), (-0.80, 2.33)]
extruded_profile("Chassis_TopBridge", top_profile, 1.82, painted_mid, main, bevel=0.045)
cube("Chassis_RearServiceCabinet", (0, 0.82, 1.52), (1.55, 0.18, 1.75), painted_mid, main, bevel=0.055)
cube("Chassis_LeftInsetPanel", (-1.36, -0.925, 1.52), (0.84, 0.045, 1.58), dark_metal, main, bevel=0.025)
cube("Chassis_RightInsetPanel", (1.36, -0.925, 1.52), (0.84, 0.045, 1.58), dark_metal, main, bevel=0.025)
for side in (-1, 1):
    cube(f"Chassis_SideShoulder_{side:+d}", (side * 1.62, -0.97, 2.39), (0.44, 0.07, 0.22), silver, main, bevel=0.025)
    cube(f"Chassis_LowerSeam_{side:+d}", (side * 1.36, -0.965, 0.73), (0.78, 0.035, 0.025), silver, main, bevel=0.006)

# Right-side service zone: a layered removable panel, real raised louvres,
# hinges and a recessed pull keep the orthographic side silhouette intentional.
cube("Chassis_RightServicePanel", (1.935, 0.10, 1.58), (0.050, 1.42, 1.34), painted_mid, main, bevel=0.045)
cube("Chassis_RightServicePanelInset", (1.966, 0.22, 1.70), (0.024, 0.78, 0.62), dark_metal, main, bevel=0.028)
for index, y in enumerate((-0.08, 0.04, 0.16, 0.28, 0.40, 0.52)):
    cube(f"Chassis_RightVentLouvre_{index}", (1.987, y, 1.72), (0.026, 0.075, 0.43), silver, main,
         bevel=0.010, rotation=(math.radians(12), 0, 0))
for y in (-0.53, 0.73):
    cylinder(f"Chassis_RightPanelHinge_{y:+.2f}", (1.982, y, 1.55), 0.035, 0.24, dark_metal, main,
             vertices=32, bevel=0.007)
cube("Chassis_RightPullRecess", (1.983, -0.42, 1.56), (0.026, 0.18, 0.38), dark_metal, main, bevel=0.035)
cube("Chassis_RightPullHandle", (2.014, -0.42, 1.56), (0.045, 0.10, 0.26), silver, main, bevel=0.025)
for y, z in ((-0.55, 1.03), (0.75, 1.03), (-0.55, 2.13), (0.75, 2.13)):
    cylinder(f"Chassis_RightPanelFastener_{y:+.2f}_{z:.2f}", (1.988, y, z), 0.026, 0.025, silver, main,
             vertices=24, rotation=(0, math.pi / 2, 0), bevel=0.004)

# 02 — Inspection chamber: independent frame, glazing, internal liner and door hardware.
for x in (-0.76, 0.76):
    for y in (-0.71, 0.71):
        cube(f"Chamber_Post_{x:+.2f}_{y:+.2f}", (x, y, 1.57), (0.095, 0.095, 1.72), silver, chamber, bevel=0.018)
for y in (-0.71, 0.71):
    cube(f"Chamber_Header_{y:+.2f}", (0, y, 2.38), (1.62, 0.105, 0.12), silver, chamber, bevel=0.018)
    cube(f"Chamber_Sill_{y:+.2f}", (0, y, 0.77), (1.62, 0.105, 0.12), silver, chamber, bevel=0.018)
cube("Chamber_FrontSafetyGlass", (0, -0.68, 1.58), (1.40, 0.035, 1.48), glass, chamber, bevel=0.018)
cube("Chamber_LeftSafetyGlass", (-0.73, 0, 1.58), (0.035, 1.32, 1.48), glass, chamber, bevel=0.018)
cube("Chamber_RightSafetyGlass", (0.73, 0, 1.58), (0.035, 1.32, 1.48), glass, chamber, bevel=0.018)
cube("Chamber_InternalBackplane", (0, 0.64, 1.56), (1.35, 0.055, 1.35), inner_white, chamber, bevel=0.025)
for x in (-0.58, 0.58):
    cube(f"Chamber_InspectionLight_{x:+.2f}", (x, 0.57, 1.58), (0.035, 0.035, 1.08), cyan_emit, chamber, bevel=0.01)
for z in (1.10, 2.02):
    cylinder(f"Chamber_DoorHinge_{z:.2f}", (0.79, -0.73, z), 0.045, 0.18, dark_metal, chamber, rotation=(math.pi / 2, 0, 0), vertices=32)
cube("Chamber_DoorHandle", (-0.61, -0.755, 1.56), (0.08, 0.055, 0.42), dark_metal, chamber, bevel=0.028)

# 03 — Optical sensor assembly: gantry, adjustable carriage, lens stack and ring light.
cube("Optical_GantryBeam", (0, 0.05, 2.15), (1.25, 0.18, 0.16), dark_metal, optical, bevel=0.028)
for x in (-0.52, 0.52):
    cube(f"Optical_GantryBracket_{x:+.2f}", (x, 0.05, 1.94), (0.12, 0.22, 0.52), silver, optical, bevel=0.025)
cube("Optical_AdjustmentCarriage", (0, 0.03, 2.02), (0.42, 0.36, 0.28), painted_mid, optical, bevel=0.045)
cylinder("Optical_CameraBody", (0, 0.03, 1.83), 0.18, 0.34, dark_metal, optical, vertices=64, bevel=0.02)
cylinder("Optical_FocusRing", (0, 0.03, 1.65), 0.205, 0.10, silver, optical, vertices=72, bevel=0.012)
for z, radius in ((1.59, 0.17), (1.565, 0.135), (1.542, 0.095)):
    cylinder(f"Optical_LensElement_{z:.3f}", (0, 0.03, z), radius, 0.035, lens, optical, vertices=72, bevel=0.008)
torus("Optical_RingLightHousing", (0, 0.03, 1.47), 0.27, 0.035, silver, optical, major_segments=72)
torus("Optical_RingLightEmitter", (0, 0.03, 1.455), 0.235, 0.018, cyan_emit, optical, major_segments=72)
for x in (-0.25, 0.25):
    cylinder(f"Optical_AdjustKnob_{x:+.2f}", (x, -0.19, 2.04), 0.065, 0.09, dark_metal, optical, vertices=36, rotation=(math.pi / 2, 0, 0), bevel=0.012)

# 04 — Conveyor: individual rollers, guide rails, drive wheels, bearings and support cross-members.
for index, x in enumerate([(-1.78 + i * 0.20) for i in range(19)]):
    cylinder(f"Conveyor_Roller_{index:02d}", (x, 0, 0.94), 0.065, 1.12, silver, conveyor, vertices=40, rotation=(math.pi / 2, 0, 0), bevel=0.009)
    for y in (-0.54, 0.54):
        cylinder(f"Conveyor_Bearing_{index:02d}_{y:+.2f}", (x, y, 0.94), 0.083, 0.045, dark_metal, conveyor, vertices=32, rotation=(math.pi / 2, 0, 0), bevel=0.008)
for y in (-0.62, 0.62):
    cube(f"Conveyor_GuideRail_{y:+.2f}", (0, y, 1.02), (4.05, 0.085, 0.20), dark_metal, conveyor, bevel=0.025)
    cube(f"Conveyor_RailInsert_{y:+.2f}", (0, y + (-0.045 if y > 0 else 0.045), 1.05), (3.78, 0.025, 0.055), blue, conveyor, bevel=0.008)
for x in (-1.72, -0.55, 0.55, 1.72):
    cube(f"Conveyor_CrossMember_{x:+.2f}", (x, 0, 0.78), (0.10, 1.34, 0.12), silver, conveyor, bevel=0.016)
for x in (-1.85, 1.85):
    cylinder(f"Conveyor_DriveWheel_{x:+.2f}", (x, 0.71, 0.94), 0.19, 0.10, dark_metal, conveyor, vertices=56, rotation=(math.pi / 2, 0, 0), bevel=0.012)
    torus(f"Conveyor_DriveTyre_{x:+.2f}", (x, 0.77, 0.94), 0.145, 0.035, rubber, conveyor, rotation=(math.pi / 2, 0, 0), major_segments=48)

# 05 — Control module: angled enclosure, recessed screen, membrane controls and physical dial.
control_profile = [(1.18, 1.02), (1.24, 1.92), (1.38, 2.08), (1.88, 2.02), (2.02, 1.83), (2.00, 1.02)]
extruded_profile("Control_Housing", control_profile, 0.30, painted_mid, control, bevel=0.045, y=-1.00)
cube("Control_ScreenBezel", (1.61, -1.17, 1.68), (0.58, 0.055, 0.40), dark_metal, control, bevel=0.035, rotation=(math.radians(-4), 0, 0))
cube("Control_ScreenGlass", (1.61, -1.204, 1.68), (0.49, 0.018, 0.31), screen, control, bevel=0.022, rotation=(math.radians(-4), 0, 0))
text_object("Control_DisplayTitle", "INSPECT", (1.61, -1.221, 1.75), 0.075, cyan_emit, control)
text_object("Control_DisplayStatus", "READY  99.8%", (1.61, -1.222, 1.62), 0.042, green_emit, control)
cube("Control_UIHeaderLine", (1.61, -1.226, 1.79), (0.34, 0.008, 0.014), cyan_emit, control, bevel=0.004)
cube("Control_UIProgress", (1.53, -1.226, 1.58), (0.20, 0.008, 0.012), green_emit, control, bevel=0.004)
cylinder("Control_UIStatusDot", (1.77, -1.229, 1.58), 0.018, 0.010, green_emit, control, vertices=28, rotation=(math.pi / 2, 0, 0), bevel=0.004)
for index, x in enumerate((1.39, 1.58, 1.77)):
    cylinder(f"Control_Button_{index+1}", (x, -1.19, 1.34), 0.048, 0.045, cyan_emit if index == 1 else dark_metal, control, vertices=40, rotation=(math.pi / 2, 0, 0), bevel=0.01)
cylinder("Control_RotaryEncoder", (1.82, -1.20, 1.14), 0.105, 0.075, silver, control, vertices=48, rotation=(math.pi / 2, 0, 0), bevel=0.014)
cylinder("Control_EmergencyStop", (1.38, -1.20, 1.14), 0.105, 0.08, red_emit, control, vertices=48, rotation=(math.pi / 2, 0, 0), bevel=0.018)
torus("Control_EStopCollar", (1.38, -1.19, 1.14), 0.12, 0.018, dark_metal, control, rotation=(math.pi / 2, 0, 0), major_segments=48)

# 06 — Cooling assembly: actual fan hubs, blades, rings and vent ducting on the rear.
for fan_index, x in enumerate((-1.35, 1.35)):
    cube(f"Cooling_FanRecess_{fan_index}", (x, 0.955, 1.55), (0.74, 0.075, 0.74), dark_metal, cooling, bevel=0.045)
    torus(f"Cooling_OuterRing_{fan_index}", (x, 1.012, 1.55), 0.29, 0.025, silver, cooling, rotation=(math.pi / 2, 0, 0), major_segments=64)
    cylinder(f"Cooling_Hub_{fan_index}", (x, 1.035, 1.55), 0.10, 0.10, painted_mid, cooling, vertices=48, rotation=(math.pi / 2, 0, 0), bevel=0.018)
    for blade_index in range(7):
        angle = blade_index * math.tau / 7
        radius = 0.18
        blade = cube(f"Cooling_Fan{fan_index}_Blade{blade_index}",
                     (x + math.cos(angle) * radius, 1.045, 1.55 + math.sin(angle) * radius),
                     (0.24, 0.055, 0.075), dark_metal, cooling, bevel=0.025,
                     rotation=(0, angle + math.radians(28), 0))
    for ring_radius in (0.17, 0.235):
        torus(f"Cooling_Grille_{fan_index}_{ring_radius:.3f}", (x, 1.078, 1.55), ring_radius, 0.009, dark_metal, cooling, rotation=(math.pi / 2, 0, 0), major_segments=48, minor_segments=8)
    for bar in (-0.18, 0, 0.18):
        cube(f"Cooling_GrilleBar_{fan_index}_{bar:+.2f}", (x + bar, 1.086, 1.55), (0.018, 0.018, 0.58), dark_metal, cooling, bevel=0.006)
cube("Cooling_CentralDuct", (0, 0.96, 1.55), (1.15, 0.08, 0.54), painted_mid, cooling, bevel=0.04)
for index, z in enumerate((1.36, 1.46, 1.56, 1.66, 1.76)):
    cube(f"Cooling_DuctLouver_{index}", (0, 1.02, z), (0.84, 0.04, 0.035), silver, cooling, bevel=0.008, rotation=(math.radians(12), 0, 0))

# 07 — Mechanical connections: feet, controlled fastener count, brackets, glands and seams.
for x in (-1.72, 1.72):
    for y in (-0.72, 0.72):
        cylinder(f"Connection_LevelingFoot_{x:+.2f}_{y:+.2f}", (x, y, 0.08), 0.13, 0.16, rubber, connections, vertices=48, bevel=0.018)
        cylinder(f"Connection_FootStem_{x:+.2f}_{y:+.2f}", (x, y, 0.19), 0.055, 0.16, silver, connections, vertices=32, bevel=0.01)
for side in (-1, 1):
    for z in (0.82, 1.15, 1.88, 2.22):
        cylinder(f"Connection_PanelFastener_{side:+d}_{z:.2f}", (side * 1.68, -0.972, z), 0.028, 0.018, silver, connections, vertices=24, rotation=(math.pi / 2, 0, 0), bevel=0.004)
for x in (-0.70, 0.70):
    cube(f"Connection_ChamberCorner_{x:+.2f}", (x, -0.74, 0.79), (0.18, 0.12, 0.16), dark_metal, connections, bevel=0.025)
for x in (-1.45, 1.45):
    cylinder(f"Connection_CableGland_{x:+.2f}", (x, 0.99, 0.78), 0.07, 0.10, dark_metal, connections, vertices=36, rotation=(math.pi / 2, 0, 0), bevel=0.01)

# 08 — Cable routing: smooth curves with explicit machine-to-cabinet endpoints and clips.
curve_cable("Cable_OpticalData", [(0.0, 0.18, 2.10), (0.35, 0.48, 2.30), (0.88, 0.78, 2.25), (1.40, 0.92, 1.88)], 0.022, cable_mat, cables)
curve_cable("Cable_ControlBus", [(1.72, -0.92, 1.20), (1.93, -0.55, 1.05), (1.93, 0.42, 0.82), (1.45, 0.94, 0.78)], 0.026, cable_mat, cables)
curve_cable("Cable_CoolingPower", [(-1.35, 0.95, 1.24), (-1.20, 0.82, 0.92), (-0.55, 0.78, 0.69), (0.0, 0.80, 0.65)], 0.020, cable_mat, cables)
for index, coordinate in enumerate(((0.70, 0.72, 2.27), (1.90, 0.05, 0.90), (-0.85, 0.79, 0.77))):
    cube(f"Cable_Clip_{index+1}", coordinate, (0.10, 0.045, 0.06), silver, cables, bevel=0.012)

# Identification plate and subtle status beacon.
cube("Identification_Plate", (-1.36, -0.963, 1.03), (0.46, 0.022, 0.20), silver, main, bevel=0.012)
text_object("Identification_Text", "PIS-400", (-1.36, -0.982, 1.03), 0.062, dark_metal, main)
cylinder("Status_BeaconBase", (1.55, 0.38, 2.83), 0.085, 0.10, dark_metal, connections, vertices=40, bevel=0.012)
cylinder("Status_Beacon", (1.55, 0.38, 2.91), 0.065, 0.09, green_emit, connections, vertices=40, bevel=0.025)

# Studio presentation setup.
studio = make_material("StudioFloor", (0.018, 0.022, 0.029), metallic=0.12, roughness=0.34)
cube("StudioFloor", (0, 0, -0.075), (12, 12, 0.10), studio, bevel=0.02)
cube("StudioBackdrop", (0, 3.4, 3.0), (12, 0.10, 6.0), studio, bevel=0.04)

world = bpy.context.scene.world
world.use_nodes = True
world.color = (0.008, 0.010, 0.016)
background = world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (0.006, 0.009, 0.015, 1.0)
background.inputs["Strength"].default_value = 0.24

add_area_light("KeySoftbox", (4.5, -4.8, 6.0), 1050, 4.0, (0.76, 0.86, 1.0), (0, 0, 1.3))
add_area_light("FillSoftbox", (-4.0, -2.2, 3.6), 720, 3.0, (0.48, 0.64, 1.0), (0, 0, 1.4))
add_area_light("RearRim", (-2.2, 3.3, 5.0), 1200, 2.6, (0.30, 0.58, 1.0), (0, 0, 1.7))
add_area_light("FrontDetail", (1.8, -3.0, 1.5), 430, 1.8, (0.74, 1.0, 0.95), (0.5, 0, 1.2))
add_area_light("SideWash", (5.0, 2.2, 4.2), 900, 3.2, (0.62, 0.78, 1.0), (0.5, 0.0, 1.4))
add_area_light("RearProductFill", (0.0, 2.65, 3.4), 820, 2.4, (0.58, 0.78, 1.0), (0.0, 0.75, 1.45))

camera_data = bpy.data.cameras.new("ProductCamera")
camera_data.lens = 57
camera_data.sensor_width = 36
camera = bpy.data.objects.new("ProductCamera", camera_data)
bpy.context.collection.objects.link(camera)
bpy.context.scene.camera = camera

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 960
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = False
scene.render.image_settings.color_depth = "8"
scene.render.resolution_percentage = 100
scene.render.use_file_extension = True
scene.render.image_settings.compression = 20
try:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
except Exception:
    scene.render.engine = "BLENDER_EEVEE"
try:
    scene.render.image_settings.color_management = "FOLLOW_SCENE"
except Exception:
    pass

views = {
    "front-view": ((0.0, -7.4, 2.35), (0.0, 0.0, 1.42), 60),
    "side-view": ((7.0, -0.25, 2.25), (0.0, 0.0, 1.40), 62),
    "three-quarter-view": ((5.6, -6.2, 4.0), (0.0, 0.0, 1.35), 58),
    "rear-view": ((0.3, 7.2, 2.45), (0.0, 0.25, 1.45), 60),
    "close-up-detail-view": ((3.6, -4.0, 2.85), (0.55, -0.25, 1.62), 72),
}

# Save editable source before export/render. All major components remain separate.
# The generated source is reproducible, so do not leave rolling .blend1 backups in Git.
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

# Export assembled model only; studio camera/lights/floor are excluded.
for obj in bpy.context.scene.objects:
    obj.select_set(False)
for obj in root.children_recursive:
    obj.select_set(True)
root.select_set(True)
bpy.context.view_layer.objects.active = root
bpy.ops.export_scene.gltf(
    filepath=str(GLB_PATH),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_animations=False,
    export_cameras=False,
    export_lights=False,
    export_yup=True,
)

backdrop = bpy.data.objects.get("StudioBackdrop")
for name, (position, target, lens_mm) in views.items():
    backdrop.hide_render = name == "rear-view"
    camera.location = position
    camera.data.lens = lens_mm
    look_at(camera, target)
    scene.render.filepath = str(RENDER_DIR / f"{name}.png")
    bpy.ops.render.render(write_still=True)

mesh_objects = [obj for obj in root.children_recursive if obj.type == "MESH"]
evaluated_depsgraph = bpy.context.evaluated_depsgraph_get()
triangles = 0
vertices = 0
for obj in mesh_objects:
    evaluated = obj.evaluated_get(evaluated_depsgraph)
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    triangles += len(mesh.loop_triangles)
    vertices += len(mesh.vertices)
    evaluated.to_mesh_clear()

report = {
    "asset": "Precision Inspection Station",
    "blender_version": bpy.app.version_string,
    "render_engine": scene.render.engine,
    "units": "metres",
    "dimensions_m": [4.36, 2.45, 3.00],
    "mesh_objects": len(mesh_objects),
    "triangles_evaluated": triangles,
    "vertices_evaluated": vertices,
    "materials": [material.name for material in bpy.data.materials if material.users > 0],
    "components": [child.name for child in root.children if child.type == "EMPTY"],
    "glb_bytes": GLB_PATH.stat().st_size,
    "blend_bytes": BLEND_PATH.stat().st_size,
    "renders": [str(RENDER_DIR / f"{name}.png") for name in views],
}
REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
print("ASSET_BUILD_COMPLETE")
print(json.dumps(report, indent=2))
