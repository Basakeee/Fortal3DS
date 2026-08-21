import { BODY_PAINTS, GLASS, CHROME, TIRE_RIM, LIGHTS } from "./palette.js";
import { pushVoxel, pushWheel, pushRockerFill, makeOccupancy, voxelsToMesh } from "./voxelKit.js";

// Grid axes: x = width (left/right), y = height (up), z = length (front at z=0).
// Boxy proportions (solid slab body, upright greenhouse, thin chrome trim) are
// what read as "generic 90s sedan" at low voxel resolution — a specific real car
// (see ae86Generator.js) needs its own silhouette, not just different colors.
export const SEDAN_90S_DEFAULTS = {
  length: 16,
  width: 6,
  wheelRadius: 2,
  bodyHeight: 4,
  cabinHeight: 3,
  cabinFrontInset: 4,
  cabinRearInset: 4,
  cabinSideInset: 1,
  wheelWidth: 2,
  // Real-world meters per voxel. A 16-voxel length reads as a compact 90s sedan
  // (~4.5m) at this size — deliberately explicit rather than left to guesswork,
  // since Deepspace already burned time on VFX that had no real-world unit
  // reference baked in from the start.
  voxelSize: 0.28,
  bodyColor: BODY_PAINTS[0],
  glassColor: GLASS[0],
  chromeColor: CHROME[0],
  tireColor: TIRE_RIM[0],
  rimColor: TIRE_RIM[2],
  headlightColor: LIGHTS[1],
  taillightColor: LIGHTS[3],
};

function buildVoxelList(params) {
  const p = { ...SEDAN_90S_DEFAULTS, ...params };
  const voxels = [];

  const wheelRows = 2 * p.wheelRadius + 1;
  const bodyBaseY = wheelRows;
  const cabinBaseY = bodyBaseY + p.bodyHeight;

  // Lower body: solid slab, deliberately un-tapered (boxy 90s look).
  for (let z = 0; z < p.length; z++) {
    for (let x = 0; x < p.width; x++) {
      for (let y = bodyBaseY; y < bodyBaseY + p.bodyHeight; y++) {
        pushVoxel(voxels, x, y, z, p.bodyColor);
      }
    }
  }

  // Cabin (greenhouse), inset from the body so hood/trunk read as separate volumes.
  const cabinZStart = p.cabinFrontInset;
  const cabinZEnd = p.length - p.cabinRearInset;
  const cabinXStart = p.cabinSideInset;
  const cabinXEnd = p.width - p.cabinSideInset;
  const windowY = cabinBaseY + 1; // one row below the roof

  for (let z = cabinZStart; z < cabinZEnd; z++) {
    for (let x = cabinXStart; x < cabinXEnd; x++) {
      for (let y = cabinBaseY; y < cabinBaseY + p.cabinHeight; y++) {
        const onPerimeter = x === cabinXStart || x === cabinXEnd - 1 || z === cabinZStart || z === cabinZEnd - 1;
        const isWindowRow = y === windowY;
        // Pillars stay body-colored even on the window row so the greenhouse
        // doesn't read as one continuous glass band (real cars have A/B/C pillars).
        const isPillar = isWindowRow && ((x === cabinXStart || x === cabinXEnd - 1) && (z === cabinZStart || z === cabinZEnd - 1));
        const color = onPerimeter && isWindowRow && !isPillar ? p.glassColor : p.bodyColor;
        pushVoxel(voxels, x, y, z, color);
      }
    }
  }

  // Bumpers: bottom row front and rear, full width.
  for (let x = 0; x < p.width; x++) {
    pushVoxel(voxels, x, bodyBaseY, 0, p.chromeColor);
    pushVoxel(voxels, x, bodyBaseY, p.length - 1, p.chromeColor);
  }

  // Headlights / taillights: top row of the body, outer corners.
  const lightY = bodyBaseY + p.bodyHeight - 1;
  pushVoxel(voxels, 0, lightY, 0, p.headlightColor);
  pushVoxel(voxels, p.width - 1, lightY, 0, p.headlightColor);
  pushVoxel(voxels, 0, lightY, p.length - 1, p.taillightColor);
  pushVoxel(voxels, p.width - 1, lightY, p.length - 1, p.taillightColor);

  // Wheels
  const occupied = makeOccupancy();
  const frontWheelZ = p.wheelRadius + 1;
  const rearWheelZ = p.length - 1 - p.wheelRadius - 1;
  for (const wheelZ of [frontWheelZ, rearWheelZ]) {
    for (const side of [-1, 1]) {
      pushWheel(voxels, occupied, {
        side,
        width: p.width,
        wheelZ,
        wheelRadius: p.wheelRadius,
        wheelWidth: p.wheelWidth,
        tireColor: p.tireColor,
        rimColor: p.rimColor,
      });
    }
  }

  // Rocker/sill panel spanning the wheelbase — without it the underside between
  // the two wheels is empty and they read as separate discs floating apart.
  pushRockerFill(voxels, occupied, {
    width: p.width,
    minZ: frontWheelZ,
    maxZ: rearWheelZ + 1,
    minY: p.wheelRadius,
    maxY: bodyBaseY,
    color: p.bodyColor,
  });

  return voxels;
}

export function generateSedan90sGeometry(paramsOverride = {}) {
  const p = { ...SEDAN_90S_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  return voxels; // callers that need raw voxels can post-process before meshing
}

export function generateSedan90sMesh(paramsOverride = {}) {
  const p = { ...SEDAN_90S_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  return voxelsToMesh(voxels, p.voxelSize, "Sedan_90s_Voxel");
}
