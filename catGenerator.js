import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match pigGenerator.js: x = width, y = height, z = depth, front
// at z = 0. Redesigned to follow Minecraft's own Cat model directly — one
// dominant body block, no legs, smallest of the farm animals with pointed
// ears and the longest tail as its 2 identifying features (same role they
// played in the earlier design, just on a legless single-block body now).
export const CAT_DEFAULTS = {
  bodyWidth: 3,
  bodyHeight: 3,
  bodyDepth: 6,
  earHeight: 2,
  tailLength: 4,
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

  // Body: the one dominant block, flush on the ground
  for (let x = 0; x < p.bodyWidth; x++) {
    for (let y = 0; y < p.bodyHeight; y++) {
      for (let z = 0; z < p.bodyDepth; z++) {
        pushVoxel(voxels, x, y, z, p.furColor);
      }
    }
  }

  // Nose + eyes, cut into the front face
  const faceY = Math.floor(p.bodyHeight / 2);
  pushVoxel(voxels, Math.floor(p.bodyWidth / 2), faceY - 1, 0, noseColor);
  pushVoxel(voxels, 0, faceY, 0, eyeColor);
  pushVoxel(voxels, p.bodyWidth - 1, faceY, 0, eyeColor);

  // Ears: point up via a tapering column, same technique dogGenerator's now
  // use — a cat's ears read slightly smaller/closer-set than a wolf's at
  // this resolution since bodyWidth itself is smaller.
  for (const ex of [0, p.bodyWidth - 2]) {
    for (let i = 0; i < p.earHeight; i++) {
      const width = p.earHeight - i;
      for (let dx = 0; dx < width; dx++) {
        pushVoxel(voxels, ex + dx, p.bodyHeight + i, 0, p.furColor);
      }
    }
  }

  // Tail: long, sweeping up and back — the longest of the 4 mammals, the
  // clearest "this one's the cat" signal even from behind.
  const tailX = Math.floor(p.bodyWidth / 2);
  let ty = p.bodyHeight - 1;
  for (let i = 0; i < p.tailLength; i++) {
    if (i >= p.tailLength - 2) ty += 1; // curves upward only on the last 2 segments
    pushVoxel(voxels, tailX, ty, p.bodyDepth + i, p.furColor);
  }

  return voxels;
}

export function generateCatGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...CAT_DEFAULTS, ...paramsOverride });
}

export function generateCatMesh(paramsOverride = {}) {
  const p = { ...CAT_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalRows = p.bodyHeight + p.earHeight;
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "Cat_Voxel");
}
