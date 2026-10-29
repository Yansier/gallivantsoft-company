# Digital Operations Twin — 3D Quality Audit

## Audit scope

This audit covers the Phase 4B primitive Three.js scene and the Phase 4.1A collision correction. It intentionally keeps the current procedural model as a baseline/fallback reference; it does not introduce a mechanical arm or a large external model.

## Current visual limitations

- The facility is still an engineering visualization assembled from `BoxGeometry`, simple materials, helper lines, and point/directional lighting.
- The scene has no authored UVs, texture sets, baked detail, decals, fasteners, cable routing, safety markings, or physically designed machinery.
- Rack parcels repeat a small set of dimensions and materials, so silhouette and material variation remain limited.
- The processing cells communicate placement and scale, but not a credible real machine's mechanical function.
- There are no character, vehicle, sensor, door, or machine animation clips. The only animated object is the workflow parcel.
- Mobile mode removes the outer facility frame and caps pixel ratio; it is not a separately authored low-poly model.

These are presentation-quality limitations, not collision correctness defects. The primitive version should remain available as a comparison and lightweight fallback after a future GLB scene is introduced.

## Current model complexity

The full-detail scene contains approximately:

- 47 meshes: floor, 3 selectable zone slabs, 34 rack parts/parcels, 3 processing machines, conveyor, 4 load-zone pads, and the moving parcel;
- 1 `GridHelper` and 1 optional facility `LineSegments` frame;
- 3 lights;
- shared primitive geometries/materials for repeated rack components and parcels;
- separate small geometries where dimensions differ, such as load-zone pads.

There are no image textures or skeletal meshes. GPU cleanup traverses the scene, deduplicates geometry/material references, disposes them, disposes `OrbitControls`, and finally disposes the renderer.

## Scene structure

The scene is generated in `src/scripts/digital-twin/scene.js` from spatial definitions in `src/scripts/digital-twin/spatial.js`.

Logical layers are:

1. environment: floor, grid, lights, fog, and optional facility frame;
2. operational zones: Storage, Processing, and Dispatch selection slabs;
3. fixed obstacles: two rack envelopes and three processing-machine envelopes;
4. legal load zones: storage intake, processing scan, quality loading bay, and dispatch handoff;
5. transport layer: conveyor and the moving parcel;
6. camera layer: perspective camera plus bounded `OrbitControls`.

The current Three.js objects are mostly flat children of the scene. A future imported model should use named groups instead of reproducing that flat structure.

## Animation and state architecture

`state.js` is the workflow authority. It owns `idle`, `created`, `moving`, `paused`, `running`, and `complete`, plus the committed stage and requested target stage.

`index.js` owns browser orchestration:

- controls remain disabled until either the WebGL scene or the panel-only fallback is ready;
- WebGL mode lets the scene complete a transition only when the parcel reaches the path target;
- fallback mode advances the same state machine through an explicit panel-only driver, so it cannot remain indefinitely in `moving`;
- the HTML management panel renders from the same store as the scene.

`scene.js` owns spatial movement:

- every stage uses an explicit centripetal `CatmullRomCurve3` through reviewed waypoints;
- animation duration is based on curve length;
- the parcel yaw follows the path tangent;
- reaching `t = 1` calls `store.completeTransition(stage)`;
- pause and document hiding cancel the pending frame instead of running an empty loop;
- resume or visibility restoration schedules exactly one new frame chain;
- reset cancels movement, hides the parcel, and restores the audited start position.

## Coordinate convention

- Three.js right-handed coordinates are used with **Y up**.
- One scene unit should be treated as approximately one metre until real model dimensions are selected.
- Floor surface: approximately `y = 0`.
- Parcel centre: `y = 0.85`; parcel dimensions: `0.78 × 0.78 × 0.78`.
- X axis: facility length, from intake/storage at negative X to dispatch at positive X.
- Z axis: facility depth. The main conveyor corridor is centred at `z = 3.7`.
- Reset/intake start: `(-8, 0.85, 4.3)`.
- Legal stage targets:
  - Storage intake: `(-3.55, 0.85, 3.7)`;
  - Processing scan: `(0.2, 0.85, 3.7)`;
  - Quality loading bay: `(1.8, 0.85, 0)`;
  - Dispatch handoff: `(5.5, 0.85, 3.7)`.

Do not silently change this convention when importing Blender content. Configure export/import transforms so authored assets arrive Y-up at the intended metre scale.

## Collision and path validation

`spatial.js` is shared by runtime rendering and the automated validator. It defines rack and machine bounds, legal load zones, the start/reset position, path waypoints, and parcel dimensions.

The validator checks:

- the start and reset position;
- continuity between stages;
- every stage target;
- target containment inside its declared load zone;
- fixed rack and processing-machine `Box3` bounds;
- 240 samples per path stage in the command-line audit;
- a conservative parcel sweep box that includes the largest X/Z extent of the cube at any yaw, plus clearance.

This is deliberately stricter than checking the unrotated parcel. It prevents a corner of the rotating cargo from clipping a fixed device. The legal loading zones are outside the solid machine bounds, so this version does not need to whitelist cargo/machine overlap.

Limitations remain: this is deterministic route validation, not a real-time physics engine. It does not resolve dynamic obstacles, use oriented bounding boxes, or plan arbitrary routes. Any layout, cargo-size, or waypoint change must run `pnpm run check:3d` and pass browser observation again.

## Recommended Blender + GLB workflow

### File and collection structure

Use one source `.blend` with collections such as:

- `ENV_Facility`
- `RACK_Storage_A`
- `MACHINE_Processing_A`
- `MACHINE_Quality_A`
- `CONVEYOR_Main`
- `COLLIDERS`
- `SOCKETS`
- `ANIMATIONS`

Keep repeated racks, bins, rollers, and fasteners instance-friendly. Apply scale and rotation before export, keep origins meaningful, and author at real metre dimensions.

### Naming contract

Recommended prefixes:

- `VIS_` — visible meshes;
- `COL_` — simplified collision meshes, excluded from normal rendering;
- `SOCKET_StorageIntake`, `SOCKET_ProcessingScan`, `SOCKET_QualityLoad`, `SOCKET_Dispatch` — empty nodes defining legal parcel targets;
- `ZONE_Storage`, `ZONE_Processing`, `ZONE_Dispatch` — selectable interaction volumes;
- `PIVOT_` — explicit moving-part pivots;
- `LGT_` — authored reference lights, normally replaced or reviewed in Three.js.

Do not derive collision from dense visible meshes at runtime. Export simple `COL_` boxes/convex shapes or maintain a small companion collision manifest generated from those nodes.

### Materials and textures

- Use a restrained PBR material set with shared materials for painted metal, dark structural steel, rubber, emissive indicators, and parcel cardboard.
- Pack ORM channels where practical and use KTX2/Basis textures for browser delivery.
- Keep texture resolution proportional to screen coverage; repeated small parts should share atlases.
- Avoid baking text that must be localized; keep UI labels in HTML or use locale-aware overlays.

### Animation structure

- Export separate named clips such as `Idle`, `Scan`, `GateOpen`, and `GateClose` instead of one long timeline.
- Keep mechanical pivots and parent chains deterministic.
- Drive clip playback from the existing state store; an animation-mixer completion event should replace, not bypass, `completeTransition`.
- Keep parcel transport curves in the spatial layer unless a tested GLB path/socket system explicitly replaces them.

### Delivery and runtime integration

1. Export GLB with Y-up conversion verified and no unapplied transforms.
2. Run glTF validation and inspect triangle count, materials, textures, animation clips, and node names.
3. Compress geometry only after visual comparison; use Draco or Meshopt consistently with the chosen loader setup.
4. Lazy-load the GLB after the existing launch action.
5. Preserve the primitive scene as a low-performance/failure fallback.
6. Rebuild fixed obstacle boxes from named `COL_` nodes and legal load zones from `SOCKET_` nodes.
7. Run the spatial validator and the complete browser workflow before accepting a new asset.

The next phase should first prototype one well-authored processing cell and its collision/socket contract. It should not start with a full mechanical arm until pivots, clips, collision proxies, and performance budgets are agreed.
