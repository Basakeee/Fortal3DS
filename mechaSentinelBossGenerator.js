import { MECHA_PLATING, MECHA_VISOR } from "./palette.js";
import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Seventh Boss Slayer creature. Same "one dominant body, no separate limbs"
// philosophy as demonBossGenerator.js, but hard-edged/mechanical instead of
// organic — the checkerboard skin here reads as armor panel seams (same
// (x+y)%2 technique dragonGhastGenerator.js's scale pattern uses, just on the
// Y axis instead of X+Z since panel seams run horizontally across plating,
// not in a reptile-scale diagonal). One horizontal glowing visor band
// instead of two separate eyes, and a single antenna spike instead of two
// horns — a robot doesn't need bilateral symmetry to read as a face the way
// an animal does.
export const MECHA_SENTINEL_BOSS_DEFAULTS = {
  bodyWidth: 8,
  bodyHeight: 8,
  bodyDepth: 7,
  antennaHeight: 3,
  heightMeters: 2.6,
  platingColorA: MECHA_PLATING[0],
  platingColorB: MECHA_PLATING[1],
  visorColor: MECHA_VISOR,
};

function platingColorAt(y, p) {
  return y % 2 === 0 ? p.platingColorA : p.platingColorB;
}

function buildVoxelList(params) {
  const p = { ...MECHA_SENTINEL_BOSS_DEFAULTS, ...params };
  const voxels = [];

  const bodyBaseY = 0;
  const antennaBaseY = bodyBaseY + p.bodyHeight;

  // Body: horizontally-banded plating, one visor row cut into the front face
  // (full width minus a 1-voxel frame on each side, so it reads as a visor
  // slot rather than the whole face glowing) — same inline-eye technique the
  // other bosses use.
  const visorY = bodyBaseY + p.bodyHeight - 3;
  for (let x = 0; x < p.bodyWidth; x++) {
    for (let y = bodyBaseY; y < bodyBaseY + p.bodyHeight; y++) {
      for (let z = 0; z < p.bodyDepth; z++) {
        const isVisor = z === 0 && y === visorY && x > 0 && x < p.bodyWidth - 1;
        pushVoxel(voxels, x, y, z, isVisor ? p.visorColor : platingColorAt(y, p));
      }
    }
  }

  // Antenna: single centered spike, tip glowing the same color as the
  // visor — a sensor light, not a decoration.
  const antennaX = Math.floor(p.bodyWidth / 2);
  const antennaZ = Math.floor(p.bodyDepth / 2);
  for (let i = 0; i < p.antennaHeight; i++) {
    const isTip = i === p.antennaHeight - 1;
    pushVoxel(voxels, antennaX, antennaBaseY + i, antennaZ, isTip ? p.visorColor : p.platingColorA);
  }

  return voxels;
}

export function generateMechaSentinelBossGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...MECHA_SENTINEL_BOSS_DEFAULTS, ...paramsOverride });
}

export function generateMechaSentinelBossMesh(paramsOverride = {}) {
  const p = { ...MECHA_SENTINEL_BOSS_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalRows = p.bodyHeight + p.antennaHeight;
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "MechaSentinelBoss_Voxel");
}
