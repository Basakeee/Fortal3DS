import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match every other generator: x = width, y = height, z = depth.
// Four legs and a slab, deliberately no joinery detail — this is the "basic
// furniture" tier, not a hero asset, same spirit as the generic sedan next to
// the AE86.
export const SIMPLE_TABLE_DEFAULTS = {
  tableWidth: 8,
  tableDepth: 5,
  legHeight: 6,
  legThickness: 1,
  topThickness: 1,
  // Legs sit inset from the edge so the tabletop overhangs them like a real
  // table, instead of the legs poking out flush with the corners.
  legInset: 1,
  widthMeters: 1.2, // reads as a small desk at this voxel count
  legColor: 0x704214,
  topColor: 0xc9b896,
};

function buildVoxelList(params) {
  const p = { ...SIMPLE_TABLE_DEFAULTS, ...params };
  const voxels = [];

  const legXs = [p.legInset, p.tableWidth - p.legInset - p.legThickness];
  const legZs = [p.legInset, p.tableDepth - p.legInset - p.legThickness];
  for (const lx of legXs) {
    for (const lz of legZs) {
      for (let y = 0; y < p.legHeight; y++) {
        for (let dx = 0; dx < p.legThickness; dx++) {
          for (let dz = 0; dz < p.legThickness; dz++) {
            pushVoxel(voxels, lx + dx, y, lz + dz, p.legColor);
          }
        }
      }
    }
  }

  for (let x = 0; x < p.tableWidth; x++) {
    for (let z = 0; z < p.tableDepth; z++) {
      for (let y = p.legHeight; y < p.legHeight + p.topThickness; y++) {
        pushVoxel(voxels, x, y, z, p.topColor);
      }
    }
  }

  return voxels;
}

export function generateSimpleTableMesh(paramsOverride = {}) {
  const p = { ...SIMPLE_TABLE_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const voxelSize = p.widthMeters / p.tableWidth;
  return voxelsToMesh(voxels, voxelSize, "SimpleTable_Voxel");
}
