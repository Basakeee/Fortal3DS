import { BODY_PAINTS, GREYS, LIGHTS, DRAGON_TEETH, DRAGON_MOUTH } from "./palette.js";
import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match every other generator: x = width, y = height, z = depth,
// front at z = 0. Body plan (feet/legs/hip/torso/arms/neck/head) is the same
// layout humanGenerator.js uses — a standing biped reads correctly at this
// resolution, no reason to invent a different skeleton for a second one —
// re-skinned red with horns, small fangs, glowing eyes, and a curved tail
// instead of hair. No dangling limbs underneath (unlike the Ghast-style
// dragon boss) — this one stands on its own two feet.
export const DEMON_BOSS_DEFAULTS = {
  width: 6,
  legWidth: 2,
  depth: 3,
  footExtra: 1,
  footHeight: 1,
  legHeight: 6,
  hipHeight: 1,
  torsoHeight: 6,
  neckHeight: 1,
  headHeight: 3,
  headWidth: 4,
  hornHeight: 3,
  // Target real-world height (feet to horn tips). Boss-scale, comparable to
  // the dragon Ghast boss so both read as similarly imposing on the same
  // wall display rather than one dwarfing the other.
  heightMeters: 3,
  skinColorA: BODY_PAINTS[0], // candy red
  skinColorB: BODY_PAINTS[9], // dark red — shadow bands, tail
  hornColor: GREYS[0], // black
  eyeColor: LIGHTS[7], // dark orange glow
  pupilColor: GREYS[1],
  teethColor: DRAGON_TEETH, // shared boss/creature palette — see palette.js
  mouthColor: DRAGON_MOUTH,
  clawColor: GREYS[0],
};

// Fixed, hand-picked path for the tail (relative to its base at the torso's
// rear): runs back then curves up into an arrow-shaped tip — not random, so
// the same params always produce the same boss, same rule as the dragon
// Ghast's tentacleLengths.
const TAIL_PATH = [
  { dz: 1, dy: 0 },
  { dz: 2, dy: 0 },
  { dz: 3, dy: 0 },
  { dz: 3, dy: 1 },
  { dz: 3, dy: 2 },
  { dz: 2, dy: 3 }, // tip curls back toward the body, arrowhead silhouette
];

function buildVoxelList(params) {
  const p = { ...DEMON_BOSS_DEFAULTS, ...params };
  const voxels = [];

  const legGapX = 1;
  const leftLegX = [0, p.legWidth - 1];
  const rightLegX = [p.legWidth + legGapX, p.width - 1];

  const footBaseY = 0;
  const legBaseY = footBaseY + p.footHeight;
  const hipBaseY = legBaseY + p.legHeight;
  const torsoBaseY = hipBaseY + p.hipHeight;
  const neckBaseY = torsoBaseY + p.torsoHeight;
  const headBaseY = neckBaseY + p.neckHeight;
  const hornBaseY = headBaseY + p.headHeight;

  // Feet: claw-black toe row up front, red the rest of the way — same
  // separate-left/right-block reasoning as humanGenerator's feet.
  for (const [xStart, xEnd] of [leftLegX, rightLegX]) {
    for (let x = xStart; x <= xEnd; x++) {
      for (let z = 0; z < p.depth + p.footExtra; z++) {
        const isToe = z === p.depth + p.footExtra - 1;
        pushVoxel(voxels, x, footBaseY, z, isToe ? p.clawColor : p.skinColorA);
      }
    }
  }

  // Legs: banded every 2 rows like the dragon's tentacles, for the same
  // reason — reads as musculature instead of a flat-colored pillar.
  for (const [xStart, xEnd] of [leftLegX, rightLegX]) {
    for (let x = xStart; x <= xEnd; x++) {
      for (let y = legBaseY; y < legBaseY + p.legHeight; y++) {
        const color = Math.floor((y - legBaseY) / 2) % 2 === 0 ? p.skinColorA : p.skinColorB;
        for (let z = 0; z < p.depth; z++) {
          pushVoxel(voxels, x, y, z, color);
        }
      }
    }
  }

  // Hip: bridges the leg gap.
  for (let x = 0; x < p.width; x++) {
    for (let z = 0; z < p.depth; z++) {
      pushVoxel(voxels, x, hipBaseY, z, p.skinColorB);
    }
  }

  // Torso: dark red belly stripe down the front-center column, red everywhere
  // else — a cheap stand-in for chest/ab definition at this resolution.
  const bellyXStart = Math.floor((p.width - 2) / 2);
  for (let x = 0; x < p.width; x++) {
    for (let y = torsoBaseY; y < torsoBaseY + p.torsoHeight; y++) {
      const isBelly = x >= bellyXStart && x < bellyXStart + 2;
      for (let z = 0; z < p.depth; z++) {
        const isFront = z === 0;
        pushVoxel(voxels, x, y, z, isBelly && isFront ? p.skinColorB : p.skinColorA);
      }
    }
  }

  // Arms: hang at the torso's sides like the human's, clawed black hands at
  // the bottom instead of a bare skin-colored end.
  for (const armX of [-1, p.width]) {
    for (let y = torsoBaseY; y < torsoBaseY + p.torsoHeight; y++) {
      const isHand = y === torsoBaseY;
      for (let z = 0; z < p.depth; z++) {
        pushVoxel(voxels, armX, y, z, isHand ? p.clawColor : p.skinColorA);
      }
    }
  }

  // Neck
  for (let x = Math.floor((p.width - 1) / 2); x <= Math.ceil((p.width - 1) / 2); x++) {
    for (let z = 0; z < p.depth; z++) {
      pushVoxel(voxels, x, neckBaseY, z, p.skinColorA);
    }
  }

  // Head: glowing eyes and small fangs cut into the front face — same
  // "compute as part of the fill pass, don't push a second overlapping
  // layer" reasoning as the dragon Ghast's eyes.
  const headXStart = Math.floor((p.width - p.headWidth) / 2);
  // Top row = eye glow, one row down = pupil, bottom row (headBaseY) = mouth/
  // fangs — needs headHeight >= 3 so these three bands don't collide (unlike
  // the dragon Ghast, whose mouth lives on a separate snout, not the head's
  // own front face, so it never had to share rows with the eyes).
  const eyeY = headBaseY + p.headHeight - 1;
  const eyeXs = [headXStart + 1, headXStart + p.headWidth - 2];
  const fangXs = [headXStart + 1, headXStart + p.headWidth - 2];
  for (let x = headXStart; x < headXStart + p.headWidth; x++) {
    for (let y = headBaseY; y < headBaseY + p.headHeight; y++) {
      for (let z = 0; z < p.depth; z++) {
        let color = p.skinColorA;
        if (z === 0 && y === eyeY && eyeXs.includes(x)) color = p.eyeColor;
        else if (z === 0 && y === eyeY - 1 && eyeXs.includes(x)) color = p.pupilColor;
        else if (z === 0 && y === headBaseY && fangXs.includes(x)) color = p.teethColor;
        else if (z === 0 && y === headBaseY) color = p.mouthColor;
        pushVoxel(voxels, x, y, z, color);
      }
    }
  }

  // Horns: two columns above the head, each kinked outward on its top row so
  // the silhouette curves like a classic devil horn instead of standing
  // perfectly straight.
  const hornXs = [headXStart, headXStart + p.headWidth - 1];
  for (const hx of hornXs) {
    const outward = hx === headXStart ? -1 : 1;
    for (let i = 0; i < p.hornHeight; i++) {
      const isTip = i === p.hornHeight - 1;
      const x = isTip ? hx + outward : hx;
      pushVoxel(voxels, x, hornBaseY + i, 0, p.hornColor);
    }
  }

  // Tail: from the torso's rear-center, following TAIL_PATH.
  const tailX = Math.floor(p.width / 2);
  let tz = p.depth - 1;
  let ty = hipBaseY;
  for (let i = 0; i < TAIL_PATH.length; i++) {
    const color = i === TAIL_PATH.length - 1 ? p.hornColor : p.skinColorB; // black arrow tip
    pushVoxel(voxels, tailX, ty + TAIL_PATH[i].dy, tz + TAIL_PATH[i].dz, color);
  }

  return voxels;
}

export function generateDemonBossGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...DEMON_BOSS_DEFAULTS, ...paramsOverride });
}

export function generateDemonBossMesh(paramsOverride = {}) {
  const p = { ...DEMON_BOSS_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalRows = p.footHeight + p.legHeight + p.hipHeight + p.torsoHeight + p.neckHeight + p.headHeight + p.hornHeight;
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "DemonBoss_Voxel");
}
