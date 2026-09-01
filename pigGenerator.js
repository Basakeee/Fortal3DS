import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match every other generator: x = width, y = height, z = depth,
// head at z = 0 (front), body behind it, tail furthest back — unlike
// demonBoss/giantFish (one dominant block carrying the face directly), farm
// animals need a head that reads as separate from the torso, since
// MemoryFarmGameManager.cs's parade needs animals distinguishable from each
// other at a glance, not just by color. Standing on 4 short leg columns
// (like a car's wheels, just boxes instead of discs) rather than sitting
// flush on the ground like the boss presets.
export const PIG_DEFAULTS = {
  headWidth: 4,
  headHeight: 4,
  headDepth: 3,
  bodyWidth: 6,
  bodyHeight: 4,
  bodyDepth: 6,
  legWidth: 2,
  legHeight: 2,
  // Target real-world height, ground to back — small on purpose, this is a
  // farm animal standing next to a human-scale Farmer in the same parade, not
  // a boss.
  heightMeters: 0.5,
  skinColor: 0xffb0c8, // matches MemoryFarmGameManager.cs's animalTypes[0] Pig color exactly
};

// Darkens a hex color toward black by `amount` (0-1) — same derivation
// approach as gemGenerator's lighten()/coinGenerator's shade(), so the
// snout/ear accents stay correctly related to whatever skinColor is passed
// in instead of only the default pink working right.
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
  const snoutColor = darken(p.skinColor, 0.25);
  const eyeColor = darken(p.skinColor, 0.85);

  const bodyBaseY = p.legHeight;
  const bodyZStart = p.headDepth;

  // 4 legs: short box columns at the body footprint's corners, inset by 1
  // from front/back so they read as attached under the belly rather than
  // poking out past the silhouette.
  const legXs = [0, p.bodyWidth - p.legWidth];
  const legZs = [bodyZStart + 1, bodyZStart + p.bodyDepth - p.legWidth - 1];
  for (const lx of legXs) {
    for (const lz of legZs) {
      for (let x = lx; x < lx + p.legWidth; x++) {
        for (let z = lz; z < lz + p.legWidth; z++) {
          for (let y = 0; y < p.legHeight; y++) {
            pushVoxel(voxels, x, y, z, p.skinColor);
          }
        }
      }
    }
  }

  // Body
  for (let x = 0; x < p.bodyWidth; x++) {
    for (let y = bodyBaseY; y < bodyBaseY + p.bodyHeight; y++) {
      for (let z = bodyZStart; z < bodyZStart + p.bodyDepth; z++) {
        pushVoxel(voxels, x, y, z, p.skinColor);
      }
    }
  }

  // Head — flush with the body's top rather than raised, a pig's neck is
  // short enough that this still reads correctly at this resolution.
  const headXStart = Math.floor((p.bodyWidth - p.headWidth) / 2);
  const headBaseY = bodyBaseY + p.bodyHeight - p.headHeight;
  for (let x = headXStart; x < headXStart + p.headWidth; x++) {
    for (let y = headBaseY; y < headBaseY + p.headHeight; y++) {
      for (let z = 0; z < p.headDepth; z++) {
        pushVoxel(voxels, x, y, z, p.skinColor);
      }
    }
  }

  // Snout: a flat, wide, darker block on the head's front face — the single
  // most pig-identifying feature at this resolution, so it gets its own
  // protruding layer instead of just being a face detail cut into the head.
  const snoutY = headBaseY + 1;
  for (let x = headXStart + 1; x < headXStart + p.headWidth - 1; x++) {
    pushVoxel(voxels, x, snoutY, -1, snoutColor);
    pushVoxel(voxels, x, snoutY + 1, -1, snoutColor);
  }
  // Nostrils: two single dark voxels on the snout face
  pushVoxel(voxels, headXStart + 1, snoutY, -2, eyeColor);
  pushVoxel(voxels, headXStart + p.headWidth - 2, snoutY, -2, eyeColor);

  // Eyes: on the head, above the snout
  const eyeY = headBaseY + p.headHeight - 1;
  pushVoxel(voxels, headXStart, eyeY, 0, eyeColor);
  pushVoxel(voxels, headXStart + p.headWidth - 1, eyeY, 0, eyeColor);

  // Ears: small, pointing forward-up off the top-front corners of the head —
  // just 1 voxel each, enough to break the head's silhouette into "pig" at
  // this resolution without needing a real triangle shape.
  pushVoxel(voxels, headXStart, headBaseY + p.headHeight, 0, p.skinColor);
  pushVoxel(voxels, headXStart + p.headWidth - 1, headBaseY + p.headHeight, 0, p.skinColor);

  // Tail: tiny curl at the rear-center, same fixed-path technique
  // demonBossGenerator's TAIL_PATH uses.
  const tailX = Math.floor(p.bodyWidth / 2);
  const tz = bodyZStart + p.bodyDepth - 1;
  const ty = bodyBaseY + p.bodyHeight - 1;
  pushVoxel(voxels, tailX, ty, tz + 1, p.skinColor);
  pushVoxel(voxels, tailX, ty + 1, tz + 1, p.skinColor);

  return voxels;
}

export function generatePigGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...PIG_DEFAULTS, ...paramsOverride });
}

export function generatePigMesh(paramsOverride = {}) {
  const p = { ...PIG_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalRows = p.legHeight + p.bodyHeight;
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "Pig_Voxel");
}
