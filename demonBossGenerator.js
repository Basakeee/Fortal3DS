import { BODY_PAINTS, GREYS, ENVIRONMENT, DRAGON_TEETH, DRAGON_MOUTH } from "./palette.js";
import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match every other generator: x = width, y = height, z = depth,
// front at z = 0. Deliberately NOT a biped like humanGenerator.js this time —
// requested as "just a cute square block," with even the earlier nub arms/
// legs cut — so there's no separate head/neck/torso/limb split at all, just
// one cube body carrying the face directly, sitting straight on the ground
// with horns and a tail as its only appendages.
export const DEMON_BOSS_DEFAULTS = {
  bodyWidth: 7,
  bodyHeight: 6,
  bodyDepth: 6,
  hornHeight: 2,
  // Target real-world height (ground to horn tips). Shorter and stubbier
  // than a real boss-scale figure on purpose — a cube blob that's too tall
  // stops reading as "cute" and starts reading as "a red cube on stilts."
  heightMeters: 2,
  skinColor: BODY_PAINTS[0], // candy red
  bellyColor: ENVIRONMENT[10], // miami pink — a soft belly patch instead of a shadow band, for cute over menacing
  hornColor: GREYS[0], // black
  eyeWhiteColor: GREYS[7],
  pupilColor: GREYS[0],
  teethColor: DRAGON_TEETH, // shared boss/creature palette — see palette.js
  mouthColor: DRAGON_MOUTH,
};

// Fixed, hand-picked tail curl (relative to its base at the body's rear) —
// short and simple on purpose, just enough to read as a tail, not a snake.
const TAIL_PATH = [
  { dz: 1, dy: 0, color: "skin" },
  { dz: 1, dy: 1, color: "horn" }, // curled tip, black like the horns
];

function buildVoxelList(params) {
  const p = { ...DEMON_BOSS_DEFAULTS, ...params };
  const voxels = [];

  const bodyBaseY = 0;
  const hornBaseY = bodyBaseY + p.bodyHeight;

  // Body: the one dominant cube, sitting flush on the ground — no feet. A
  // pink patch on the lower-front face reads as a cute belly marking;
  // everything else is flat skin color — no muscle-band shading here, that
  // would fight the "soft" read.
  const bellyXStart = Math.floor((p.bodyWidth - 2) / 2);
  const bellyYStart = bodyBaseY + 1;
  for (let x = 0; x < p.bodyWidth; x++) {
    for (let y = bodyBaseY; y < bodyBaseY + p.bodyHeight; y++) {
      for (let z = 0; z < p.bodyDepth; z++) {
        const isBelly = z === 0 && x >= bellyXStart && x < bellyXStart + 2 && y >= bellyYStart && y < bellyYStart + 3;
        pushVoxel(voxels, x, y, z, isBelly ? p.bellyColor : p.skinColor);
      }
    }
  }

  // Face, cut into the front layer of the body cube: big two-tall eyes
  // (white over black, read as a simple round eye at this resolution) and a
  // single center fang in an otherwise dark mouth row — one fang plus big
  // eyes is what tips this toward "cute" rather than "menacing."
  const eyeY = bodyBaseY + p.bodyHeight - 2;
  const eyeXs = [2, 4];
  const fangX = Math.floor(p.bodyWidth / 2);
  for (const x of eyeXs) {
    pushVoxel(voxels, x, eyeY, 0, p.eyeWhiteColor);
    pushVoxel(voxels, x, eyeY - 1, 0, p.pupilColor);
  }
  for (let x = 0; x < p.bodyWidth; x++) {
    pushVoxel(voxels, x, bodyBaseY, 0, x === fangX ? p.teethColor : p.mouthColor);
  }

  // Horns: short nub columns on top, kinked outward on the last row for a
  // little curl instead of standing perfectly straight.
  const hornXs = [1, p.bodyWidth - 2];
  for (const hx of hornXs) {
    const outward = hx === 1 ? -1 : 1;
    for (let i = 0; i < p.hornHeight; i++) {
      const isTip = i === p.hornHeight - 1;
      const x = isTip ? hx + outward : hx;
      pushVoxel(voxels, x, hornBaseY + i, 1, p.hornColor);
    }
  }

  // Tail: short curl at the body's rear-center, following TAIL_PATH.
  const tailX = Math.floor(p.bodyWidth / 2);
  const tz = p.bodyDepth - 1;
  const ty = bodyBaseY + 1;
  for (const seg of TAIL_PATH) {
    pushVoxel(voxels, tailX, ty + seg.dy, tz + seg.dz, seg.color === "horn" ? p.hornColor : p.skinColor);
  }

  return voxels;
}

export function generateDemonBossGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...DEMON_BOSS_DEFAULTS, ...paramsOverride });
}

export function generateDemonBossMesh(paramsOverride = {}) {
  const p = { ...DEMON_BOSS_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalRows = p.bodyHeight + p.hornHeight;
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "DemonBoss_Voxel");
}
