import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match every other farm-animal generator: x = width, y = height,
// z = depth, front (beak) at low z. The only BIPED and the only farm animal
// with a rounded (not boxy) body — an ellipsoid distance test, same
// technique treeGenerator's canopy uses, since a boxy chicken reads as "a
// yellow crate" rather than a bird. 2 legs instead of 4 is itself a strong
// enough silhouette cue that this needs no other 4-legged-animal-style
// features (no tail curl, no floppy/pointy ears).
export const CHICKEN_DEFAULTS = {
  bodyRadiusX: 3,
  bodyRadiusY: 3,
  bodyRadiusZ: 4, // slightly longer than wide/tall — egg-shaped, not a perfect sphere
  legHeight: 3,
  legWidth: 1,
  headSize: 2,
  combHeight: 1,
  wingLength: 3,
  wingHeight: 2,
  tailFeatherLength: 2,
  // Shortest of the farm animals, ground to comb-tip — a chicken is
  // proportionally much smaller than even the cat.
  heightMeters: 0.35,
  featherColor: 0xffe066, // matches MemoryFarmGameManager.cs's animalTypes[2] Chicken color exactly
  combColor: 0xd6362a, // red — comb + wattle
  beakColor: 0xf2a71b, // orange — beak + legs
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

  const legZ = Math.floor(p.bodyRadiusZ * 0.4); // legs sit under the body's center of mass, not directly below its midpoint
  const bodyCenterY = p.legHeight + p.bodyRadiusY;
  const bodyCenterX = p.bodyRadiusX;
  const bodyCenterZ = p.bodyRadiusZ;

  // 2 legs — thin columns, the single biggest "this is a biped" cue
  for (const lx of [bodyCenterX - 1, bodyCenterX]) {
    for (let y = 0; y < p.legHeight; y++) {
      pushVoxel(voxels, lx, y, legZ, p.beakColor);
    }
  }

  // Body: ellipsoid via distance test, same (dx/rx)^2 + (dy/ry)^2 + (dz/rz)^2
  // <= 1 shape treeGenerator's canopy uses (there with equal radii; here
  // stretched so it reads as egg-shaped instead of a perfect ball).
  for (let x = 0; x <= bodyCenterX * 2; x++) {
    for (let y = bodyCenterY - p.bodyRadiusY; y <= bodyCenterY + p.bodyRadiusY; y++) {
      for (let z = 0; z <= bodyCenterZ * 2; z++) {
        const dx = (x - bodyCenterX) / p.bodyRadiusX;
        const dy = (y - bodyCenterY) / p.bodyRadiusY;
        const dz = (z - bodyCenterZ) / p.bodyRadiusZ;
        if (dx * dx + dy * dy + dz * dz > 1) continue;
        pushVoxel(voxels, x, y, z, p.featherColor);
      }
    }
  }

  // Head: a small cube at the front-top of the body (low z, high y) — plain
  // box rather than another ellipsoid, since at this resolution the comb/
  // beak carry the "bird head" read, not the head's own shape.
  const headY = bodyCenterY + p.bodyRadiusY - 1;
  const headXStart = bodyCenterX - Math.floor(p.headSize / 2);
  for (let x = headXStart; x < headXStart + p.headSize; x++) {
    for (let y = headY; y < headY + p.headSize; y++) {
      pushVoxel(voxels, x, y, 0, p.featherColor);
    }
  }
  pushVoxel(voxels, headXStart, headY, 0, eyeColor);
  pushVoxel(voxels, headXStart + p.headSize - 1, headY, 0, eyeColor);

  // Beak: small orange nub projecting past the head's front
  pushVoxel(voxels, bodyCenterX, headY, -1, p.beakColor);

  // Comb: red nub(s) on top of the head — the clearest single "chicken" tell
  // at this resolution, same role the cow's black patches play for "cow."
  for (let i = 0; i < p.combHeight; i++) {
    pushVoxel(voxels, bodyCenterX, headY + p.headSize + i, 0, p.combColor);
  }
  // Wattle: single red voxel hanging below the beak
  pushVoxel(voxels, bodyCenterX, headY - 1, -1, p.combColor);

  // Wings: flat blocks on both sides of the body, folded against it (not
  // spread) — same "thin flat block" technique giantFish's pectoral fins use.
  const wingY = bodyCenterY;
  const wingZStart = Math.floor(bodyCenterZ * 0.4);
  for (const wx of [-1, bodyCenterX * 2 + 1]) {
    for (let z = wingZStart; z < wingZStart + p.wingLength; z++) {
      for (let dy = 0; dy < p.wingHeight; dy++) {
        pushVoxel(voxels, wx, wingY - dy, z, wingColor);
      }
    }
  }

  // Tail feathers: short upward fan at the rear — same tapered technique
  // giantFish's dorsal fin/dragon's horns use, angled up-and-back instead of
  // straight up.
  const tailBaseY = bodyCenterY + p.bodyRadiusY - 1;
  const tailZ = bodyCenterZ * 2 - 1;
  for (let i = 0; i < p.tailFeatherLength; i++) {
    pushVoxel(voxels, bodyCenterX, tailBaseY + i, tailZ + i, wingColor);
  }

  return voxels;
}

export function generateChickenGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...CHICKEN_DEFAULTS, ...paramsOverride });
}

export function generateChickenMesh(paramsOverride = {}) {
  const p = { ...CHICKEN_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalRows = p.legHeight + p.bodyRadiusY * 2 + p.combHeight;
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "Chicken_Voxel");
}
