import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match pigGenerator.js: x = width, y = height, z = depth, front
// at z = 0. Redesigned to follow Minecraft's own Wolf model directly (the
// closest official "dog" mob) — one dominant body block, no legs, standing
// pointed ears rather than the earlier down-hanging ones (a wolf's ears
// stand up; that was this animal's actual identifying trait, not floppiness).
export const DOG_DEFAULTS = {
  bodyWidth: 4,
  bodyHeight: 4,
  bodyDepth: 7,
  earHeight: 2,
  tailLength: 3,
  heightMeters: 0.6,
  furColor: 0xd8a05a, // matches MemoryFarmGameManager.cs's animalTypes[1] Dog color exactly
};

function darken(hex, amount) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  const mix = (c) => Math.round(c * (1 - amount));
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

function buildVoxelList(params) {
  const p = { ...DOG_DEFAULTS, ...params };
  const voxels = [];
  const noseColor = darken(p.furColor, 0.9);
  const eyeColor = darken(p.furColor, 0.85);

  // Body: the one dominant block, flush on the ground
  for (let x = 0; x < p.bodyWidth; x++) {
    for (let y = 0; y < p.bodyHeight; y++) {
      for (let z = 0; z < p.bodyDepth; z++) {
        pushVoxel(voxels, x, y, z, p.furColor);
      }
    }
  }

  // Nose + eyes, cut into the front face. bodyWidth is even, so there's no
  // single true-center column — a 2-wide nose (x = width/2 - 1, width/2)
  // stays symmetric under the 2 eyes instead of sitting 1 column off-center
  // (confirmed off-center in-render with the earlier single-voxel version).
  const noseX = p.bodyWidth / 2 - 1;
  const noseY = Math.floor(p.bodyHeight / 2) - 1;
  pushVoxel(voxels, noseX, noseY, 0, noseColor);
  pushVoxel(voxels, noseX + 1, noseY, 0, noseColor);
  const eyeY = p.bodyHeight - 2;
  pushVoxel(voxels, 0, eyeY, 0, eyeColor);
  pushVoxel(voxels, p.bodyWidth - 1, eyeY, 0, eyeColor);

  // Ears: straight 1-wide columns at the outer corners, not tapered — a
  // tapering 2-wide-at-the-base version (tried earlier) touches or overlaps
  // at bodyWidth=4, fusing into one slab with no visible gap between the 2
  // ears (confirmed in-render). 1-wide columns can never overlap regardless
  // of bodyWidth, and match Minecraft's own wolf ears, which are just
  // flat single-block nubs, not multi-voxel spikes.
  for (const ex of [0, p.bodyWidth - 1]) {
    for (let i = 0; i < p.earHeight; i++) {
      pushVoxel(voxels, ex, p.bodyHeight + i, 0, p.furColor);
    }
  }

  // Tail: curves up at the rear
  const tailX = Math.floor(p.bodyWidth / 2);
  let ty = p.bodyHeight - 1;
  for (let i = 0; i < p.tailLength; i++) {
    if (i === p.tailLength - 1) ty += 1; // kinks upward only on the last segment
    pushVoxel(voxels, tailX, ty, p.bodyDepth - 1 + i + 1, p.furColor);
  }

  return voxels;
}

export function generateDogGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...DOG_DEFAULTS, ...paramsOverride });
}

export function generateDogMesh(paramsOverride = {}) {
  const p = { ...DOG_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalRows = p.bodyHeight + p.earHeight;
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "Dog_Voxel");
}
