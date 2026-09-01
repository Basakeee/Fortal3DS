import { GREYS } from "./palette.js";
import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match pigGenerator.js: x = width, y = height, z = depth, head at
// z = 0. The biggest of the 4 farm animals, and the only one with explicit
// coat patches — at this resolution a plain-colored blob doesn't read as
// "cow" the way a solid-color blob still reads as "pig"/"cat" (their real
// silhouettes carry more of the identity); the black patches are load-
// bearing here, not decoration.
export const COW_DEFAULTS = {
  headWidth: 5,
  headHeight: 4,
  headDepth: 3,
  bodyWidth: 7,
  bodyHeight: 5,
  bodyDepth: 9,
  legWidth: 2,
  legHeight: 4,
  hornHeight: 1,
  tailLength: 3,
  // Tallest of the 4 farm animals, ground to back — still well under a
  // human-scale Farmer or a Boss Slayer creature.
  heightMeters: 1.1,
  coatColor: 0xe6e6e6, // matches MemoryFarmGameManager.cs's animalTypes[3] Cow color exactly
  patchColor: GREYS[0], // black — the classic cow-patch color, not derived from coatColor like the other animals' accents (a *darkened* near-white would just be grey, not read as a patch)
  hornColor: GREYS[5], // light grey, distinct from both coat and patches
};

function darken(hex, amount) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  const mix = (c) => Math.round(c * (1 - amount));
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

function buildVoxelList(params) {
  const p = { ...COW_DEFAULTS, ...params };
  const voxels = [];
  const snoutColor = darken(p.coatColor, 0.4);
  const eyeColor = darken(p.coatColor, 0.9);

  const bodyBaseY = p.legHeight;
  const bodyZStart = p.headDepth;

  // Explicit patch regions (x range, z range) on the body's top/side, in the
  // body's own local coordinates — hand-placed rather than algorithmic
  // (unlike gemGenerator's checkerboard shimmer), since 2-3 irregular blotches
  // read as "cow spots" while a regular pattern reads as a grid instead.
  const patches = [
    { x0: 1, x1: 3, z0: 1, z1: 4 },
    { x0: 4, x1: 6, z0: 4, z1: 7 },
  ];
  const isPatch = (x, z) => patches.some((r) => x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1);

  // 4 legs
  const legXs = [0, p.bodyWidth - p.legWidth];
  const legZs = [bodyZStart + 1, bodyZStart + p.bodyDepth - p.legWidth - 1];
  for (const lx of legXs) {
    for (const lz of legZs) {
      for (let x = lx; x < lx + p.legWidth; x++) {
        for (let z = lz; z < lz + p.legWidth; z++) {
          for (let y = 0; y < p.legHeight; y++) {
            pushVoxel(voxels, x, y, z, p.coatColor);
          }
        }
      }
    }
  }

  // Body — patches only apply to the TOP half (y beyond the midline), same
  // reasoning giantFish's belly-band uses for restricting a color variant to
  // one region rather than the whole volume: a cow's underside stays plain,
  // patches read as sitting "on top of" the coat.
  const midY = bodyBaseY + Math.floor(p.bodyHeight / 2);
  for (let x = 0; x < p.bodyWidth; x++) {
    for (let y = bodyBaseY; y < bodyBaseY + p.bodyHeight; y++) {
      for (let z = bodyZStart; z < bodyZStart + p.bodyDepth; z++) {
        const color = y >= midY && isPatch(x, z - bodyZStart) ? p.patchColor : p.coatColor;
        pushVoxel(voxels, x, y, z, color);
      }
    }
  }

  // Head
  const headXStart = Math.floor((p.bodyWidth - p.headWidth) / 2);
  const headBaseY = bodyBaseY + p.bodyHeight - p.headHeight;
  for (let x = headXStart; x < headXStart + p.headWidth; x++) {
    for (let y = headBaseY; y < headBaseY + p.headHeight; y++) {
      for (let z = 0; z < p.headDepth; z++) {
        pushVoxel(voxels, x, y, z, p.coatColor);
      }
    }
  }

  // Snout: wide and flat across almost the whole head width — a cow's snout
  // is proportionally the widest of the 4 farm animals, so this reuses
  // pigGenerator's "flat wide block" technique but spans further.
  const snoutY = headBaseY;
  for (let x = headXStart + 1; x < headXStart + p.headWidth - 1; x++) {
    pushVoxel(voxels, x, snoutY, -1, snoutColor);
  }
  pushVoxel(voxels, headXStart + 1, snoutY, -2, eyeColor);
  pushVoxel(voxels, headXStart + p.headWidth - 2, snoutY, -2, eyeColor);

  // Eyes
  const eyeY = headBaseY + p.headHeight - 1;
  pushVoxel(voxels, headXStart, eyeY, 0, eyeColor);
  pushVoxel(voxels, headXStart + p.headWidth - 1, eyeY, 0, eyeColor);

  // Horns: short nubs on top, kinked outward on the tip — same technique
  // demonBossGenerator's horns use, just shorter (a cow's horns are a subtle
  // read at this resolution, not the demon's dominant feature).
  for (const hx of [headXStart + 1, headXStart + p.headWidth - 2]) {
    const outward = hx < headXStart + p.headWidth / 2 ? -1 : 1;
    for (let i = 0; i < p.hornHeight; i++) {
      const isTip = i === p.hornHeight - 1;
      const x = isTip ? hx + outward : hx;
      pushVoxel(voxels, x, headBaseY + p.headHeight + i, 1, p.hornColor);
    }
  }

  // Tail: hangs straight down at the rear then kicks out with a dark tuft on
  // the last segment — the tuft is what reads as "cow tail" rather than a
  // plain rod.
  const tailX = Math.floor(p.bodyWidth / 2);
  const tz = bodyZStart + p.bodyDepth - 1;
  for (let i = 0; i < p.tailLength; i++) {
    const y = bodyBaseY + p.bodyHeight - 1 - i;
    const isTuft = i === p.tailLength - 1;
    pushVoxel(voxels, tailX, y, tz + 1, isTuft ? p.patchColor : p.coatColor);
  }

  return voxels;
}

export function generateCowGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...COW_DEFAULTS, ...paramsOverride });
}

export function generateCowMesh(paramsOverride = {}) {
  const p = { ...COW_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalRows = p.legHeight + p.bodyHeight + p.hornHeight;
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "Cow_Voxel");
}
