import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match every other farm-animal generator: x = width, y = height,
// z = depth, front (beak) at z = 0. Redesigned to follow Minecraft's own
// Chicken model directly — a boxy body (not the earlier ellipsoid), no legs,
// with the comb/beak/wattle/wings Minecraft's own chicken uses as its
// identifying features instead of the round-body/biped read tried earlier.
export const CHICKEN_DEFAULTS = {
  bodyWidth: 5, // was 4 — even width has no true center column, so the beak sat 1 column off-center from the eyes (confirmed in-render, see บาส's feedback)
  bodyHeight: 4,
  bodyDepth: 5,
  combHeight: 1,
  wingLength: 3,
  wingHeight: 2,
  tailLength: 2,
  heightMeters: 0.35,
  featherColor: 0xffe066, // matches MemoryFarmGameManager.cs's animalTypes[2] Chicken color exactly
  combColor: 0xd6362a, // red — comb + wattle
  beakColor: 0xf2a71b, // orange — beak
};

function darken(hex, amount) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  const mix = (c) => Math.round(c * (1 - amount));
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

function buildVoxelList(params) {
  const p = { ...CHICKEN_DEFAULTS, ...params };
  const voxels = [];
  const eyeColor = darken(p.featherColor, 0.9);
  const wingColor = darken(p.featherColor, 0.15); // slightly darker than the body, so wings read as a separate part folded against it

  // Body: the one dominant block, flush on the ground
  for (let x = 0; x < p.bodyWidth; x++) {
    for (let y = 0; y < p.bodyHeight; y++) {
      for (let z = 0; z < p.bodyDepth; z++) {
        pushVoxel(voxels, x, y, z, p.featherColor);
      }
    }
  }

  // Eyes, cut into the front face
  const eyeY = p.bodyHeight - 2;
  pushVoxel(voxels, 0, eyeY, 0, eyeColor);
  pushVoxel(voxels, p.bodyWidth - 1, eyeY, 0, eyeColor);

  // Beak: orange nub projecting off the front
  const beakX = Math.floor(p.bodyWidth / 2);
  pushVoxel(voxels, beakX, eyeY, -1, p.beakColor);

  // Comb: red nub(s) on top — the clearest single "chicken" tell at this
  // resolution, same role the cow's black patches play for "cow."
  for (let i = 0; i < p.combHeight; i++) {
    pushVoxel(voxels, beakX, p.bodyHeight + i, 0, p.combColor);
  }
  // Wattle: single red voxel hanging below the beak
  pushVoxel(voxels, beakX, eyeY - 1, -1, p.combColor);

  // Wings: flat blocks on both sides, folded against the body — same
  // "thin flat block" technique giantFish's pectoral fins use.
  const wingZStart = 1;
  for (const wx of [-1, p.bodyWidth]) {
    for (let z = wingZStart; z < wingZStart + p.wingLength; z++) {
      for (let dy = 0; dy < p.wingHeight; dy++) {
        pushVoxel(voxels, wx, p.bodyHeight - 1 - dy, z, wingColor);
      }
    }
  }

  // Tail feathers: short upward-back fan at the rear
  for (let i = 0; i < p.tailLength; i++) {
    pushVoxel(voxels, beakX, p.bodyHeight - 1 + i, p.bodyDepth + i, wingColor);
  }

  return voxels;
}

export function generateChickenGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...CHICKEN_DEFAULTS, ...paramsOverride });
}

export function generateChickenMesh(paramsOverride = {}) {
  const p = { ...CHICKEN_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalRows = p.bodyHeight + p.combHeight;
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "Chicken_Voxel");
}
