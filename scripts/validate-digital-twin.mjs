import { validateSpatialPlan } from '../src/scripts/digital-twin/spatial.js';

try {
  const report = validateSpatialPlan({ samplesPerStage: 240 });
  console.log(`Digital Twin spatial validation passed: ${report.sampleCount} cargo-box samples, ${report.obstacleCount} fixed obstacles, ${report.loadZoneCount} legal load zones.`);
  for (const stage of report.stages) {
    console.log(`  stage ${stage.stage}: ${stage.length.toFixed(2)} units, ${stage.samples} samples, target ${stage.target.join(', ')}`);
  }
} catch (error) {
  console.error(`Digital Twin spatial validation failed: ${error.message}`);
  process.exitCode = 1;
}
