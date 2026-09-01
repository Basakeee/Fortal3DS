import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match pigGenerator.js: x = width, y = height, z = depth, head at
// z = 0. Smallest and slimmest of the 4 farm animals (single-voxel legs and
// depth-2 head), with pointed ears and a long tail as the 2 features that
// separate it from dogGenerator's floppy-eared, short-tailed silhouette.
export const CAT_DEFAULTS = {
  headWidth: 3,
  headHeight: 3,
  headDepth: 2,
  bodyWidth: 3,
  bodyHeight: 3,
  bodyDepth: 6,
  legWidth: 1,
  legHeight: 2,
  earHeight: 2, // POINTS UP, unlike dogGenerator's earHeight which hangs down
  tailLength: 4, // longer than every other animal's tail — the other main cat "tell"
  heightMeters: 0.4,
  furColor: 0xc9a0ff, // matches MemoryFarmGameManager.cs's animalTypes[4] Cat color exactly (stylized lavender, not a realistic cat color)
};

function darken(hex, amount) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  const mix = (c) => Math.round(c * (1 - amount));
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

function buildVoxelList(params) {
  const p = { ...CAT_DEFAULTS, ...params };
  const voxels = [];
  const eyeColor = darken(p.furColor, 0.85);
  const noseColor = darken(p.furColor, 0.5);

  const bodyBaseY = p.legHeight;
  const bodyZStart = p.headDepth;

  // 4 legs — 1-voxel-thin columns, thinner than every other farm animal's,
  // for the slim/sleek read.
  const legXs = [0, p.bodyWidth - p.legWidth];
  const legZs = [bodyZStart, bodyZStart + p.bodyDepth - p.legWidth];
  for (const lx of legXs) {
    for (const lz of legZs) {
      for (let y = 0; y < p.legHeight; y++) {
        pushVoxel(voxels, lx, y, lz, p.furColor);
      }
    }
  }

  // Body
  for (let x = 0; x < p.bodyWidth; x++) {
    for (let y = bodyBaseY; y < bodyBaseY + p.bodyHeight; y++) {
      for (let z = bodyZStart; z < bodyZStart + p.bodyDepth; z++) {
        pushVoxel(voxels, x, y, z, p.furColor);
      }
    }
  }

  // Head — flush with the body's top, small and square
  const headXStart = Math.floor((p.bodyWidth - p.headWidth) / 2);
  const headBaseY = bodyBaseY + p.bodyHeight - p.headHeight;
  for (let x = headXStart; x < headXStart + p.headWidth; x++) {
    for (let y = headBaseY; y < headBaseY + p.headHeight; y++) {
      for (let z = 0; z < p.headDepth; z++) {
        pushVoxel(voxels, x, y, z, p.furColor);
      }
    }
  }

  // Nose + eyes — no separate protruding snout (unlike pig/dog/cow) since a
  // cat's face reads as flatter at this resolution; just a single dark nose
  // voxel and 2 eyes cut into the head's front face.
  const faceY = headBaseY + Math.floor(p.headHeight / 2);
  pushVoxel(voxels, headXStart + 1, faceY - 1, 0, noseColor);
  pushVoxel(voxels, headXStart, faceY, 0, eyeColor);
  pushVoxel(voxels, headXStart + p.headWidth - 1, faceY, 0, eyeColor);

  // Ears: POINT UP via a tapering column (2 wide at the base, 1 at the tip)
  // — same kinked/tapered technique giantFish's dorsal fin uses, the
  // opposite silhouette read from dogGenerator's ears, which hang down.
  for (const ex of [headXStart, headXStart + p.headWidth - 2]) {
    for (let i = 0; i < p.earHeight; i++) {
      const width = p.earHeight - i; // 2, then 1 — tapers to a point
      for (let dx = 0; dx < width; dx++) {
        pushVoxel(voxels, ex + dx, headBaseY + p.headHeight + i, 0, p.furColor);
      }
    }
  }

  // Tail: long, sweeping up and back — the longest tail of the 4 farm
  // animals by design, so even at a glance/from behind it's the clearest
  // "this one's the cat" signal.
  const tailX = Math.floor(p.bodyWidth / 2);
  let tz = bodyZStart + p.bodyDepth - 1;
  let ty = bodyBaseY + p.bodyHeight - 1;
  for (let i = 0; i < p.tailLength; i++) {
    tz += 1;
    if (i >= p.tailLength - 2) ty += 1; // curves upward only on the last 2 segments
    pushVoxel(voxels, tailX, ty, tz, p.furColor);
  }

  return voxels;
}

export function generateCatGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...CAT_DEFAULTS, ...paramsOverride });
}

export function generateCatMesh(paramsOverride = {}) {
  const p = { ...CAT_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalRows = p.legHeight + p.bodyHeight + p.earHeight;
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "Cat_Voxel");
}
