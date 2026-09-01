import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match pigGenerator.js: x = width, y = height, z = depth, front
// at z = 0. Redesigned to follow Minecraft's own Wolf model directly (the
// closest official "dog" mob) — one dominant body block, no legs, standing
// pointed ears rather than the earlier down-hanging ones (a wolf's ears
// stand up; that was this animal's actual identifying trait, not floppiness).
// bodyWidth is 5 (odd), not the original 4 — a true center column is what
// pigGenerator's eye/snout overlap bug turned out to need too (see its own
// fix), and a wolf's face reads with a distinct protruding snout + dark nose
// tip (per บาส's reference image), which needs that same clearance.
export const DOG_DEFAULTS = {
  bodyWidth: 5,
  bodyHeight: 4,
  bodyDepth: 7,
  snoutSize: 3,
  earHeight: 2,
  tailLength: 3,
  heightMeters: 0.6,
  furColor: 0xd8a05a, // matches MemoryFarmGameManager.cs's animalTypes[1] Dog color exactly
};

// Shades toward black (amount > 0) or white (amount < 0) — same safe
// two-direction formula coinGenerator.js's shade() uses (c*(1+amount) for
// lightening clamps naturally under 255 for any valid 0-255 input, unlike a
// naive c*(1-amount) with a negative amount, which can overflow a channel
// past 255 and corrupt the packed hex).
function darken(hex, amount) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  const mix = (c) => Math.round(amount >= 0 ? c * (1 - amount) : c + (255 - c) * -amount);
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

  // Snout: protruding box like pigGenerator/cowGenerator's — the wolf
  // reference บาส sent has a clearly separate muzzle block, not just a nose
  // dot cut flush into the face like this used to have. Slightly lighter
  // than the coat (a muzzle patch is common on dogs) with a single dark nose
  // voxel at its forward-most tip.
  const muzzleColor = darken(p.furColor, -0.15); // negative amount lightens, see darken()
  const snoutXStart = Math.floor((p.bodyWidth - p.snoutSize) / 2);
  const snoutYStart = Math.floor(p.bodyHeight / 2) - 1;
  for (let x = snoutXStart; x < snoutXStart + p.snoutSize; x++) {
    for (let y = snoutYStart; y < snoutYStart + p.snoutSize; y++) {
      pushVoxel(voxels, x, y, -1, muzzleColor);
    }
  }
  pushVoxel(voxels, snoutXStart + 1, snoutYStart, -2, noseColor);

  // Eyes: outer edge columns — same reason pigGenerator's eyes moved there,
  // clear of the centered snout regardless of snoutSize.
  const eyeY = p.bodyHeight - 2;
  pushVoxel(voxels, 0, eyeY, 0, eyeColor);
  pushVoxel(voxels, p.bodyWidth - 1, eyeY, 0, eyeColor);
  // Brow: single dark mark above each eye — the reference's most visible
  // detail beyond eyes/snout/ears, reads as an alert "wolf" expression.
  pushVoxel(voxels, 0, eyeY + 1, 0, eyeColor);
  pushVoxel(voxels, p.bodyWidth - 1, eyeY + 1, 0, eyeColor);

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
