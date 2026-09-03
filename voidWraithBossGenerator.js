import { WRAITH_BODY, WRAITH_BODY_DARK, WRAITH_GLOW } from "./palette.js";
import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Sixth Boss Slayer creature. Same "one dominant body, no separate head/neck/
// torso" philosophy as demonBossGenerator.js/giantFishGenerator.js, but the
// identity feature is at the BASE instead of a tail/fin/horn: the bottom rows
// flare wider than the main body — same "extend past the body's own bounds"
// technique giantFishGenerator.js's tail fin uses, just at y=0 instead of the
// rear — so the silhouette reads as a robe/cloak hem instead of feet, and the
// creature never touches the ground with anything narrower than that hem.
// No horns, no mouth — a wraith doesn't chew, and its face is just the glow
// eyes cut into the body.
export const VOID_WRAITH_BOSS_DEFAULTS = {
  bodyWidth: 6,
  bodyHeight: 9,
  bodyDepth: 6,
  hemFlare: 2, // voxels wider (each side) than bodyWidth/bodyDepth
  hemRows: 3, // how many rows at the bottom get the flare
  heightMeters: 2.4,
  bodyColor: WRAITH_BODY,
  bodyColorDark: WRAITH_BODY_DARK,
  glowColor: WRAITH_GLOW,
};

function buildVoxelList(params) {
  const p = { ...VOID_WRAITH_BOSS_DEFAULTS, ...params };
  const voxels = [];

  const bodyBaseY = 0;

  // Hem: flared rows at the base, darker than the main body so it reads as
  // "in shadow, trailing on the ground" rather than the same cloth as above.
  const hemWidth = p.bodyWidth + p.hemFlare * 2;
  const hemDepth = p.bodyDepth + p.hemFlare * 2;
  for (let y = bodyBaseY; y < bodyBaseY + p.hemRows; y++) {
    for (let x = -p.hemFlare; x < p.bodyWidth + p.hemFlare; x++) {
      for (let z = -p.hemFlare; z < p.bodyDepth + p.hemFlare; z++) {
        pushVoxel(voxels, x, y, z, p.bodyColorDark);
      }
    }
  }

  // Body: straight column above the hem, glow eyes cut into the front face
  // near the top — same "computed inline" technique the other bosses' eyes
  // use, so there's never a doubled-up voxel at the eye cells.
  const bodyTopY = bodyBaseY + p.hemRows + p.bodyHeight;
  const eyeY = bodyTopY - 3;
  const eyeXs = [1, p.bodyWidth - 2];
  for (let x = 0; x < p.bodyWidth; x++) {
    for (let y = bodyBaseY + p.hemRows; y < bodyTopY; y++) {
      for (let z = 0; z < p.bodyDepth; z++) {
        const isEye = z === 0 && y === eyeY && eyeXs.includes(x);
        pushVoxel(voxels, x, y, z, isEye ? p.glowColor : p.bodyColor);
      }
    }
  }

  return { voxels, hemWidth, hemDepth, totalHeight: bodyTopY };
}

export function generateVoidWraithBossGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...VOID_WRAITH_BOSS_DEFAULTS, ...paramsOverride }).voxels;
}

export function generateVoidWraithBossMesh(paramsOverride = {}) {
  const p = { ...VOID_WRAITH_BOSS_DEFAULTS, ...paramsOverride };
  const { voxels, totalHeight } = buildVoxelList(p);
  const voxelSize = p.heightMeters / totalHeight;
  return voxelsToMesh(voxels, voxelSize, "VoidWraithBoss_Voxel");
}
