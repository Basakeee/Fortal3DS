import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match every other generator here: x = width, y = height, z = depth.
// A tree has no "front," so unlike the vehicles there's no z = 0 orientation to
// preserve — it just needs to read as a tree from any angle, which is what the
// blocky-sphere canopy (a distance test, not a box) is for.
export const OAK_TREE_DEFAULTS = {
  trunkHeight: 5,
  trunkThickness: 2, // trunk cross-section is trunkThickness x trunkThickness
  canopyRadius: 5,
  // Canopy center sits inside the top of the trunk, not stacked above it —
  // real tree crowns start below their topmost branches, not balanced on a point.
  canopyDropRows: 2,
  // Target real-world total height (trunk + canopy). Same reasoning as every
  // other generator's *Meters default: pick the real size, derive voxelSize.
  heightMeters: 4.5,
  trunkColorA: 0x6b4423,
  trunkColorB: 0x59371c, // slightly darker band, so the trunk reads as bark, not a flat post
  leafColorA: 0x3d7a34,
  leafColorB: 0x2e6321,
};

function buildVoxelList(params) {
  const p = { ...OAK_TREE_DEFAULTS, ...params };
  const voxels = [];

  // Trunk: a square column, banded every 2 rows the same way the dragon boss's
  // tentacles are — reads as textured bark instead of a flat-colored post.
  const trunkStart = Math.floor((p.canopyRadius * 2 - p.trunkThickness) / 2);
  for (let y = 0; y < p.trunkHeight; y++) {
    const color = Math.floor(y / 2) % 2 === 0 ? p.trunkColorA : p.trunkColorB;
    for (let dx = 0; dx < p.trunkThickness; dx++) {
      for (let dz = 0; dz < p.trunkThickness; dz++) {
        pushVoxel(voxels, trunkStart + dx, y, trunkStart + dz, color);
      }
    }
  }

  // Canopy: a blocky sphere (distance test) centered above the trunk, dropped
  // down canopyDropRows so it overlaps the trunk's top instead of sitting on
  // it like a lollipop. Two-tone by (x+y+z) parity for the same "shimmer"
  // reason the dragon's scales and the AE86's panda paint are checkerboarded.
  const cx = trunkStart + p.trunkThickness / 2 - 0.5;
  const cz = trunkStart + p.trunkThickness / 2 - 0.5;
  const cy = p.trunkHeight - p.canopyDropRows + p.canopyRadius;
  const r = p.canopyRadius;
  for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.ceil(cy + r); y++) {
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
        const dx = x - cx, dy = y - cy, dz = z - cz;
        if (dx * dx + dy * dy + dz * dz > r * r) continue;
        const color = (x + y + z) % 2 === 0 ? p.leafColorA : p.leafColorB;
        pushVoxel(voxels, x, y, z, color);
      }
    }
  }

  return voxels;
}

export function generateOakTreeMesh(paramsOverride = {}) {
  const p = { ...OAK_TREE_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalHeight = p.trunkHeight - p.canopyDropRows + p.canopyRadius * 2;
  const voxelSize = p.heightMeters / totalHeight;
  return voxelsToMesh(voxels, voxelSize, "OakTree_Voxel");
}
