import { BODY_PAINTS, GLASS, CHROME, TIRE_RIM, LIGHTS } from "./palette.js";
import { pushVoxel, pushWheel, voxelsToMesh } from "./voxelKit.js";

// Toyota Sprinter Trueno AE86 — specific real car, so this is its own layout
// rather than a parameterized SEDAN_90S_DEFAULTS variant: shorter overhangs,
// hatchback-length cabin, and the "panda" two-tone paint are position-dependent
// (which SEDAN_90S's single flat bodyColor can't express) plus pop-up headlights,
// neither of which exist on the generic sedan.
export const AE86_TRUENO_DEFAULTS = {
  length: 15,
  width: 6,
  wheelRadius: 2,
  bodyHeight: 4,
  cabinHeight: 3,
  cabinFrontInset: 5, // long hood — RWD coupe proportions
  cabinRearInset: 2, // short trunk overhang — hatchback glass runs close to the tail
  cabinSideInset: 1,
  wheelWidth: 2,
  voxelSize: 0.28, // 15 voxels -> ~4.2m, close to the real AE86's 4.19m length
  pandaWhite: BODY_PAINTS[4],
  pandaBlack: BODY_PAINTS[3],
  glassColor: GLASS[0],
  chromeColor: CHROME[0],
  tireColor: TIRE_RIM[0],
  rimColor: TIRE_RIM[2],
  headlightColor: LIGHTS[1],
  taillightColor: LIGHTS[3],
  headlightsUp: true, // pop-up headlights raised; false = flush/closed against the hood
};

function bodyPaintAt(x, y, z, p, bodyBaseY, cabinZStart) {
  const isBumperZ = z === 0 || z === p.length - 1;
  const isRockerRow = y === bodyBaseY;
  const isHoodTopRow = y === bodyBaseY + p.bodyHeight - 1;

  if (isBumperZ && isRockerRow) return p.chromeColor;
  if (isRockerRow) return p.pandaBlack; // black rocker sill
  if (z < cabinZStart && isHoodTopRow) return p.pandaBlack; // black hood insert
  return p.pandaWhite;
}

function buildVoxelList(paramsOverride) {
  const p = { ...AE86_TRUENO_DEFAULTS, ...paramsOverride };
  const voxels = [];

  const wheelRows = 2 * p.wheelRadius + 1;
  const bodyBaseY = wheelRows;
  const cabinBaseY = bodyBaseY + p.bodyHeight;
  const cabinZStart = p.cabinFrontInset;
  const cabinZEnd = p.length - p.cabinRearInset;
  const cabinXStart = p.cabinSideInset;
  const cabinXEnd = p.width - p.cabinSideInset;
  const windowY = cabinBaseY + 1;
  const roofY = cabinBaseY + p.cabinHeight - 1;

  for (let z = 0; z < p.length; z++) {
    for (let x = 0; x < p.width; x++) {
      for (let y = bodyBaseY; y < bodyBaseY + p.bodyHeight; y++) {
        pushVoxel(voxels, x, y, z, bodyPaintAt(x, y, z, p, bodyBaseY, cabinZStart));
      }
    }
  }

  for (let z = cabinZStart; z < cabinZEnd; z++) {
    for (let x = cabinXStart; x < cabinXEnd; x++) {
      for (let y = cabinBaseY; y < cabinBaseY + p.cabinHeight; y++) {
        const onPerimeter = x === cabinXStart || x === cabinXEnd - 1 || z === cabinZStart || z === cabinZEnd - 1;
        let color;
        if (y === roofY) {
          color = p.pandaBlack; // roof panel, full solid row
        } else if (y === windowY && onPerimeter) {
          color = p.glassColor; // side/front/rear glass
        } else if (onPerimeter) {
          color = p.pandaBlack; // pillars — black frame, not body-colored
        } else {
          color = p.pandaWhite; // hidden interior fill
        }
        pushVoxel(voxels, x, y, z, color);
      }
    }
  }

  // Rear garnish panel: black bar spanning the tail, red/amber lenses at the ends
  // (the AE86's signature single-piece taillight treatment).
  const lightY = bodyBaseY + p.bodyHeight - 1;
  for (let x = 0; x < p.width; x++) {
    const isLensSegment = x === 0 || x === p.width - 1;
    pushVoxel(voxels, x, lightY, p.length - 1, isLensSegment ? p.taillightColor : p.pandaBlack);
  }

  // Pop-up headlights at the front corners.
  for (const x of [0, p.width - 1]) {
    if (p.headlightsUp) {
      pushVoxel(voxels, x, lightY + 1, 1, p.headlightColor); // raised lamp housing
    } else {
      pushVoxel(voxels, x, lightY, 0, p.pandaBlack); // flush, closed against the hood
    }
  }

  const frontWheelZ = p.wheelRadius + 1;
  const rearWheelZ = p.length - 1 - p.wheelRadius - 1;
  for (const wheelZ of [frontWheelZ, rearWheelZ]) {
    for (const side of [-1, 1]) {
      pushWheel(voxels, {
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

  return voxels;
}

export function generateAE86TruenoMesh(paramsOverride = {}) {
  const p = { ...AE86_TRUENO_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  return voxelsToMesh(voxels, p.voxelSize, "AE86_Trueno_Voxel");
}
