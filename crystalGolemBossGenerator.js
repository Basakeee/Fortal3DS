import { CRYSTAL_ROCK, CRYSTAL_SHARD, CRYSTAL_EYE } from "./palette.js";
import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Fifth Boss Slayer creature. Same "one dominant cube body, no separate
// head/neck/torso" philosophy as demonBossGenerator.js, but taller/blockier
// (a golem should read heavy, not cute-round) and with no tail — a crystal
// crown on top instead of horns is what carries its identity, plus a
// checkerboarded rock-facet skin (same technique dragonGhastGenerator.js's
// scale pattern uses) instead of a flat body color.
export const CRYSTAL_GOLEM_BOSS_DEFAULTS = {
  bodyWidth: 8,
  bodyHeight: 8,
  bodyDepth: 7,
  crownSpikeCount: 3,
  crownSpikeHeights: [3, 5, 3], // center spike tallest
  heightMeters: 2.6,
  rockColorA: CRYSTAL_ROCK[0],
  rockColorB: CRYSTAL_ROCK[1],
  shardColor: CRYSTAL_SHARD,
  eyeColor: CRYSTAL_EYE,
};

function rockColorAt(x, y, p) {
  return (x + y) % 2 === 0 ? p.rockColorA : p.rockColorB;
}

function buildVoxelList(params) {
  const p = { ...CRYSTAL_GOLEM_BOSS_DEFAULTS, ...params };
  const voxels = [];

  const bodyBaseY = 0;
  const crownBaseY = bodyBaseY + p.bodyHeight;

  // Body: checkerboarded rock-facet cube, glowing crystal eye slits cut into
  // the front face near the top (same "computed as part of the body pass"
  // technique dragonGhastGenerator.js's bodyColorAt uses, so the eye voxels
  // never double up with a separately-pushed overlay).
  const eyeY = bodyBaseY + p.bodyHeight - 2;
  const eyeXs = [1, p.bodyWidth - 2];
  for (let x = 0; x < p.bodyWidth; x++) {
    for (let y = bodyBaseY; y < bodyBaseY + p.bodyHeight; y++) {
      for (let z = 0; z < p.bodyDepth; z++) {
        const isEye = z === 0 && y === eyeY && eyeXs.includes(x);
        pushVoxel(voxels, x, y, z, isEye ? p.eyeColor : rockColorAt(x, y, p));
      }
    }
  }

  // Crystal crown: a row of shards across the top-center, each its own
  // height (crownSpikeHeights) so the crown reads as a jagged cluster
  // instead of a uniform comb — same "hand-picked, reproducible pattern"
  // spirit as dragonGhastGenerator.js's tentacleLengths.
  const crownStartX = Math.floor((p.bodyWidth - p.crownSpikeCount) / 2);
  const crownZ = Math.floor(p.bodyDepth / 2);
  for (let i = 0; i < p.crownSpikeCount; i++) {
    const height = p.crownSpikeHeights[i] ?? 3;
    for (let dy = 0; dy < height; dy++) {
      pushVoxel(voxels, crownStartX + i, crownBaseY + dy, crownZ, p.shardColor);
    }
  }

  return voxels;
}

export function generateCrystalGolemBossGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...CRYSTAL_GOLEM_BOSS_DEFAULTS, ...paramsOverride });
}

export function generateCrystalGolemBossMesh(paramsOverride = {}) {
  const p = { ...CRYSTAL_GOLEM_BOSS_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalRows = p.bodyHeight + Math.max(...p.crownSpikeHeights);
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "CrystalGolemBoss_Voxel");
}
