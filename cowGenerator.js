import { GREYS } from "./palette.js";
import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match pigGenerator.js: x = width, y = height, z = depth, front
// at z = 0. Redesigned to follow Minecraft's own Cow model directly — one
// dominant body block, no legs, with the black coat patches, small horns,
// and protruding snout Minecraft's own cow uses as its identifying features.
export const COW_DEFAULTS = {
  bodyWidth: 7,
  bodyHeight: 5,
  bodyDepth: 10,
  snoutSize: 2,
  hornHeight: 1,
  tailLength: 3,
  heightMeters: 1.1,
  coatColor: 0xe6e6e6, // matches MemoryFarmGameManager.cs's animalTypes[3] Cow color exactly
  patchColor: GREYS[0], // black — the classic cow-patch color, not derived from coatColor (a darkened near-white would just read as grey, not a patch)
  hornColor: GREYS[5],
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

  // Hand-placed patch regions (in body-local x/z) — irregular blotches read
  // as "cow spots," a regular/algorithmic pattern would read as a grid
  // instead, so these stay explicit rather than a checkerboard formula.
  const patches = [
    { x0: 1, x1: 3, z0: 1, z1: 5 },
    { x0: 4, x1: 6, z0: 5, z1: 9 },
  ];
  const isPatch = (x, z) => patches.some((r) => x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1);

  // Body — patches restricted to the top half, same "coat sits on top of the
  // base color" reasoning giantFish's belly-band uses in reverse.
  const midY = Math.floor(p.bodyHeight / 2);
  for (let x = 0; x < p.bodyWidth; x++) {
    for (let y = 0; y < p.bodyHeight; y++) {
      for (let z = 0; z < p.bodyDepth; z++) {
        const color = y >= midY && isPatch(x, z) ? p.patchColor : p.coatColor;
        pushVoxel(voxels, x, y, z, color);
      }
    }
  }

  // Snout: protruding square nub on the front face, same technique
  // pigGenerator uses, just wider — a cow's muzzle is Minecraft's other
  // strong identifying feature alongside the patches.
  const snoutXStart = Math.floor((p.bodyWidth - p.snoutSize) / 2);
  const snoutY = 0;
  for (let x = snoutXStart; x < snoutXStart + p.snoutSize; x++) {
    pushVoxel(voxels, x, snoutY, -1, snoutColor);
  }
  pushVoxel(voxels, snoutXStart, snoutY, -2, eyeColor);
  pushVoxel(voxels, snoutXStart + p.snoutSize - 1, snoutY, -2, eyeColor);

  // Eyes
  const eyeY = p.bodyHeight - 2;
  pushVoxel(voxels, 0, eyeY, 0, eyeColor);
  pushVoxel(voxels, p.bodyWidth - 1, eyeY, 0, eyeColor);

  // Horns: short nubs on top, kinked outward on the tip — same technique
  // demonBossGenerator's horns use, just shorter (subtle at this resolution,
  // not the dominant feature).
  for (const hx of [1, p.bodyWidth - 2]) {
    const outward = hx < p.bodyWidth / 2 ? -1 : 1;
    for (let i = 0; i < p.hornHeight; i++) {
      const isTip = i === p.hornHeight - 1;
      const x = isTip ? hx + outward : hx;
      pushVoxel(voxels, x, p.bodyHeight + i, 1, p.hornColor);
    }
  }

  // Tail: hangs down at the rear, dark tuft on the last segment
  const tailX = Math.floor(p.bodyWidth / 2);
  for (let i = 0; i < p.tailLength; i++) {
    const y = p.bodyHeight - 1 - i;
    const isTuft = i === p.tailLength - 1;
    pushVoxel(voxels, tailX, y, p.bodyDepth, isTuft ? p.patchColor : p.coatColor);
  }

  return voxels;
}

export function generateCowGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...COW_DEFAULTS, ...paramsOverride });
}

export function generateCowMesh(paramsOverride = {}) {
  const p = { ...COW_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalRows = p.bodyHeight + p.hornHeight;
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "Cow_Voxel");
}
