import { JELLYFISH_SKIN, JELLYFISH_BELLY, JELLYFISH_EYE, JELLYFISH_PUPIL, JELLYFISH_TENTACLE_A, JELLYFISH_TENTACLE_B } from "./palette.js";
import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Fourth Boss Slayer creature, and the second reskin of dragonGhastGenerator.js's
// Ghast silhouette (cubic floating body + a grid of dangling tentacles) — a
// jellyfish's real anatomy already IS "dome + dangling tentacles," so this reuses
// that body plan directly rather than inventing a new one, same way the dragon
// reused it before this. Voxel copy of the reference boss from the Boss Slayer
// web arena-sim prototype (บาส 2026-09-03): squat purple dome, two square red
// glow eyes, dark tentacles — no horns, no snout/mouth (unlike the dragon), since
// the reference has neither.
export const JELLYFISH_BOSS_DEFAULTS = {
  bodyWidth: 9,
  bodyDepth: 9,
  bodyHeight: 6, // squatter than the dragon's 8 — a dome reads flatter than a floating head
  tentacleLengths: [
    [5, 7, 5],
    [6, 8, 6],
    [5, 7, 5],
  ],
  bodyWidthMeters: 3.2,
  skinColorA: JELLYFISH_SKIN[0],
  skinColorB: JELLYFISH_SKIN[1],
  bellyColor: JELLYFISH_BELLY,
  eyeColor: JELLYFISH_EYE,
  pupilColor: JELLYFISH_PUPIL,
  tentacleColorA: JELLYFISH_TENTACLE_A,
  tentacleColorB: JELLYFISH_TENTACLE_B,
};

function skinColorAt(x, z, p) {
  return (x + z) % 2 === 0 ? p.skinColorA : p.skinColorB;
}

function bodyColorAt(x, y, z, p, bodyBaseY, bellyRows) {
  const eyeY = bodyBaseY + p.bodyHeight - 3;
  const eyeXs = [2, p.bodyWidth - 3];
  if (z === 0 && eyeXs.includes(x)) {
    if (y === eyeY + 1) return p.eyeColor;
    if (y === eyeY) return p.pupilColor;
  }
  if (y < bodyBaseY + bellyRows) return p.bellyColor;
  return skinColorAt(x, z, p);
}

// Banded every 2 rows so tentacles read as jointed, same technique
// dragonGhastGenerator.js's tentacleColumn uses, own darker purple tones here.
function tentacleColumn(length, p) {
  const column = [];
  for (let i = 0; i < length; i++) {
    const color = Math.floor(i / 2) % 2 === 0 ? p.tentacleColorA : p.tentacleColorB;
    column.push({ dy: -1 - i, color });
  }
  return column;
}

function buildVoxelList(params) {
  const p = { ...JELLYFISH_BOSS_DEFAULTS, ...params };
  const voxels = [];

  const maxTentacleLength = Math.max(...p.tentacleLengths.flat());
  const bodyBaseY = maxTentacleLength;
  const bellyRows = 2;

  for (let x = 0; x < p.bodyWidth; x++) {
    for (let z = 0; z < p.bodyDepth; z++) {
      for (let y = bodyBaseY; y < bodyBaseY + p.bodyHeight; y++) {
        pushVoxel(voxels, x, y, z, bodyColorAt(x, y, z, p, bodyBaseY, bellyRows));
      }
    }
  }

  const tentacleXs = [1, 4, 7];
  const tentacleZs = [1, 4, 7];
  for (let xi = 0; xi < 3; xi++) {
    for (let zi = 0; zi < 3; zi++) {
      const length = p.tentacleLengths[xi][zi];
      const x = tentacleXs[xi];
      const z = tentacleZs[zi];
      for (const { dy, color } of tentacleColumn(length, p)) {
        pushVoxel(voxels, x, bodyBaseY + dy, z, color);
      }
    }
  }

  return voxels;
}

export function generateJellyfishBossGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...JELLYFISH_BOSS_DEFAULTS, ...paramsOverride });
}

export function generateJellyfishBossMesh(paramsOverride = {}) {
  const p = { ...JELLYFISH_BOSS_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const voxelSize = p.bodyWidthMeters / p.bodyWidth;
  return voxelsToMesh(voxels, voxelSize, "JellyfishBoss_Voxel");
}
