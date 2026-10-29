import { Box3, CatmullRomCurve3, Vector3 } from 'three';

export const CARGO_SIZE = Object.freeze([0.78, 0.78, 0.78]);
const ROTATED_HALF_EXTENT = Math.sqrt(2) * CARGO_SIZE[0] / 2;
export const CARGO_SWEEP_SIZE = Object.freeze([
  ROTATED_HALF_EXTENT * 2 + 0.1,
  CARGO_SIZE[1] + 0.06,
  ROTATED_HALF_EXTENT * 2 + 0.1
]);

export const START_POSITION = Object.freeze([-8, 0.85, 4.3]);
export const BELT_Z = 3.7;

export const RACK_LAYOUT = Object.freeze([
  { id: 'rack-a', center: [-6.7, 1.35, -0.1], size: [1.35, 2.7, 5.35] },
  { id: 'rack-b', center: [-4.65, 1.35, -0.1], size: [1.35, 2.7, 5.35] }
]);

export const MACHINE_LAYOUT = Object.freeze([
  { id: 'processor-south', center: [0, 0.6, -2.4], size: [2.1, 1.2, 1.2] },
  { id: 'quality-cell', center: [0, 0.6, 0], size: [2.1, 1.2, 1.2] },
  { id: 'processor-north', center: [0, 0.6, 1.8], size: [2.1, 1.2, 1.2] }
]);

export const LOAD_ZONES = Object.freeze([
  { id: 'storage-intake', stage: 0, center: [-3.55, 0.85, BELT_Z], size: [1.25, 0.9, 1.0] },
  { id: 'processing-scan', stage: 1, center: [0.2, 0.85, BELT_Z], size: [1.4, 0.9, 1.0] },
  { id: 'quality-loading-bay', stage: 2, center: [1.8, 0.85, 0], size: [1.0, 0.9, 1.0] },
  { id: 'dispatch-handoff', stage: 3, center: [5.5, 0.85, BELT_Z], size: [1.35, 0.9, 1.0] }
]);

export const STAGE_PATHS = Object.freeze([
  [START_POSITION, [-8, 0.85, BELT_Z], [-5.8, 0.85, BELT_Z], LOAD_ZONES[0].center],
  [LOAD_ZONES[0].center, [-2.2, 0.85, BELT_Z], LOAD_ZONES[1].center],
  [LOAD_ZONES[1].center, [1.8, 0.85, BELT_Z], [1.8, 0.85, 1.55], LOAD_ZONES[2].center],
  [LOAD_ZONES[2].center, [1.8, 0.85, 1.55], [2.25, 0.85, BELT_Z], LOAD_ZONES[3].center]
]);

const vector = (value) => new Vector3(...value);
const boxFromDefinition = ({ center, size }) => new Box3().setFromCenterAndSize(vector(center), vector(size));

export function getFixedObstacleBoxes() {
  return [...RACK_LAYOUT, ...MACHINE_LAYOUT].map((definition) => ({
    id: definition.id,
    box: boxFromDefinition(definition)
  }));
}

export function getCargoBox(position) {
  return new Box3().setFromCenterAndSize(position.clone(), vector(CARGO_SWEEP_SIZE));
}

export function getStageCurve(stage) {
  const points = STAGE_PATHS[stage];
  if (!points) throw new RangeError(`Unknown digital-twin stage: ${stage}`);
  return new CatmullRomCurve3(points.map(vector), false, 'centripetal', 0.5);
}

function assertClear(position, label, obstacles) {
  const cargo = getCargoBox(position);
  const collision = obstacles.find(({ box }) => cargo.intersectsBox(box));
  if (collision) throw new Error(`${label} collides with ${collision.id}`);
}

export function validateSpatialPlan({ samplesPerStage = 160 } = {}) {
  const obstacles = getFixedObstacleBoxes();
  const resetPosition = vector(START_POSITION);
  assertClear(resetPosition, 'start/reset position', obstacles);

  let previousTarget = resetPosition;
  let sampleCount = 1;
  const stageReports = STAGE_PATHS.map((points, stage) => {
    const curve = getStageCurve(stage);
    const start = curve.getPoint(0);
    if (start.distanceTo(previousTarget) > 0.001) throw new Error(`Stage ${stage} is not continuous with the previous target`);
    const target = curve.getPoint(1);
    assertClear(target, `stage ${stage} target`, obstacles);
    const loadingZone = boxFromDefinition(LOAD_ZONES[stage]);
    if (!loadingZone.containsPoint(target)) throw new Error(`Stage ${stage} target is outside ${LOAD_ZONES[stage].id}`);
    for (let index = 0; index <= samplesPerStage; index += 1) {
      assertClear(curve.getPoint(index / samplesPerStage), `stage ${stage} sample ${index}`, obstacles);
      sampleCount += 1;
    }
    previousTarget = target;
    return { stage, length: curve.getLength(), target: target.toArray(), samples: samplesPerStage + 1 };
  });

  return {
    valid: true,
    cargoSweepSize: [...CARGO_SWEEP_SIZE],
    obstacleCount: obstacles.length,
    loadZoneCount: LOAD_ZONES.length,
    sampleCount,
    resetPosition: resetPosition.toArray(),
    stages: stageReports
  };
}
