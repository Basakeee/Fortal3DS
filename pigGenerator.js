import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match every other generator: x = width, y = height, z = depth,
// front at z = 0. Redesigned to follow Minecraft's own mob silhouette
// directly (per บาส) rather than the earlier from-scratch design — one
// dominant body block sitting flush on the ground, NO separate legs (same
// "single cube, no limbs" philosophy demonBossGenerator/giantFishGenerator
// already use), with the protruding snout box as Minecraft pig's own most
// recognizable feature instead of anything invented here.
export const PIG_DEFAULTS = {
  bodyWidth: 6,
  bodyHeight: 4,
  bodyDepth: 8,
  snoutSize: 3, // was 2 — too small to read clearly at this resolution; confirmed by บาส in-render
  heightMeters: 0.5,
  skinColor: 0xffb0c8, // matches MemoryFarmGameManager.cs's animalTypes[0] Pig color exactly
};

function darken(hex, amount) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  const mix = (c) => Math.round(c * (1 - amount));
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

function buildVoxelList(params) {
  const p = { ...PIG_DEFAULTS, ...params };
  const voxels = [];
  const eyeColor = darken(p.skinColor, 0.85);

  // Body: the one dominant block, flush on the ground
  for (let x = 0; x < p.bodyWidth; x++) {
    for (let y = 0; y < p.bodyHeight; y++) {
      for (let z = 0; z < p.bodyDepth; z++) {
        pushVoxel(voxels, x, y, z, p.skinColor);
      }
    }
  }

  // Snout: square box protruding off the front face, centered — the single
  // feature that reads as "pig" in Minecraft's own model. Plain skinColor
  // throughout (no darkened shade, no nostril dots) — บาส confirmed in-render
  // that even a 20%-darkened accent read as near-black under this viewer's
  // lighting on a protruding face, which fought the "all pink" pig read; the
  // protruding SHAPE alone is what needs to carry "snout" here, not a color
  // difference.
  const snoutXStart = Math.floor((p.bodyWidth - p.snoutSize) / 2);
  const snoutYStart = Math.floor(p.bodyHeight / 2) - 1;
  for (let x = snoutXStart; x < snoutXStart + p.snoutSize; x++) {
    for (let y = snoutYStart; y < snoutYStart + p.snoutSize; y++) {
      pushVoxel(voxels, x, y, -1, p.skinColor);
    }
  }

  // Eyes: 2 single dark voxels on the front face, above the snout
  const eyeY = p.bodyHeight - 2;
  pushVoxel(voxels, 1, eyeY, 0, eyeColor);
  pushVoxel(voxels, p.bodyWidth - 2, eyeY, 0, eyeColor);

  // Ears: small nubs on the top-front corners
  pushVoxel(voxels, 1, p.bodyHeight, 0, p.skinColor);
  pushVoxel(voxels, p.bodyWidth - 2, p.bodyHeight, 0, p.skinColor);

  return voxels;
}

export function generatePigGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...PIG_DEFAULTS, ...paramsOverride });
}

export function generatePigMesh(paramsOverride = {}) {
  const p = { ...PIG_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const voxelSize = p.heightMeters / p.bodyHeight;
  return voxelsToMesh(voxels, voxelSize, "Pig_Voxel");
}
