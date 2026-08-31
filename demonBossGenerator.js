import { BODY_PAINTS, GREYS, ENVIRONMENT, DRAGON_TEETH, DRAGON_MOUTH } from "./palette.js";
import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match every other generator: x = width, y = height, z = depth,
// front at z = 0. Deliberately NOT a biped like humanGenerator.js this time —
// requested as "a cute square block," so there's no separate head/neck/torso
// split at all: one dominant near-cube body carries the face directly, with
// small nub arms/legs/horns/tail stuck on rather than full-length limbs. The
// cube being most of the silhouette, and everything else reading as a small
// accent on it, is what makes it read "cute" instead of just "small."
export const DEMON_BOSS_DEFAULTS = {
  bodyWidth: 7,
  bodyHeight: 6,
  bodyDepth: 6,
  footHeight: 2,
  footSize: 2, // each foot's x/z footprint
  armSize: 2, // each arm's cube size
  hornHeight: 2,
  // Target real-world height (feet to horn tips). Shorter and stubbier than
  // a real boss-scale figure on purpose — a cube blob that's too tall stops
  // reading as "cute" and starts reading as "a red cube on stilts."
  heightMeters: 2.2,
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

  const footBaseY = 0;
  const bodyBaseY = footBaseY + p.footHeight;
  const hornBaseY = bodyBaseY + p.bodyHeight;

  // Feet: two short stub cubes, inset from the body's edges with a gap
  // between them — enough to read as "stands on two feet" without becoming
  // full legs.
  const footZStart = Math.floor((p.bodyDepth - p.footSize) / 2);
  const feetXs = [1, p.bodyWidth - p.footSize - 1];
  for (const fx of feetXs) {
    for (let x = fx; x < fx + p.footSize; x++) {
      for (let y = footBaseY; y < footBaseY + p.footHeight; y++) {
        for (let z = footZStart; z < footZStart + p.footSize; z++) {
          pushVoxel(voxels, x, y, z, p.skinColor);
        }
      }
    }
  }

  // Body: the one dominant cube. A pink patch on the lower-front face reads
  // as a cute belly marking; everything else is flat skin color — no
  // muscle-band shading here, that would fight the "soft" read.
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

  // Arms: stub cubes at the body's sides, centered in depth, at roughly
  // chest height — short on purpose, same "nub, not limb" reasoning as the feet.
  const armZStart = Math.floor((p.bodyDepth - p.armSize) / 2);
  const armBaseY = bodyBaseY + Math.floor(p.bodyHeight / 3);
  for (const armXStart of [-p.armSize, p.bodyWidth]) {
    for (let x = armXStart; x < armXStart + p.armSize; x++) {
      for (let y = armBaseY; y < armBaseY + p.armSize; y++) {
        for (let z = armZStart; z < armZStart + p.armSize; z++) {
          pushVoxel(voxels, x, y, z, p.skinColor);
        }
      }
    }
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
  const totalRows = p.footHeight + p.bodyHeight + p.hornHeight;
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "DemonBoss_Voxel");
}
