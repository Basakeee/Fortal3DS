import { DRAGON2_SCALES, DRAGON2_BELLY, DRAGON2_WING, DRAGON_EYE, DRAGON_PUPIL, DRAGON_HORN, DRAGON_TEETH, DRAGON_MOUTH } from "./palette.js";
import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Ninth Boss Slayer creature — a SECOND, brand-new dragon, not an edit of
// dragonGhastGenerator.js's existing dragon (that one keeps its own Ghast
// cube+tentacle body plan and is already placed in the BossFight scene as
// "Dragon Boss 1"; this pipeline can't touch a model already imported into
// Unity anyway). บาส's ask was "take the existing dragon, remove the
// whiskers, give it legs and wings instead" — since that specific model
// can't be edited, this is a fresh dragon built to that spec: warm red/ember
// scales (DRAGON2_SCALES, not the Ghast dragon's green), a compact quadruped
// body plan (four short leg stubs, not the Ghast's floating tentacles),
// wing panels (reusing giantFishGenerator.js's flat pectoral-fin technique,
// sized and angled to read as wings instead), and NO whisker/barbel
// appendages anywhere on the head — omitted on purpose, not just unfinished.
export const DRAGON_WINGS_BOSS_DEFAULTS = {
  bodyWidth: 9,
  bodyHeight: 6,
  bodyDepth: 10,
  legWidth: 2,
  legHeight: 3,
  hornHeight: 3,
  wingSpan: 4, // how far each wing extends past the body on its side
  wingLength: 5, // wing's extent along z
  wingHeight: 3,
  heightMeters: 2.8,
  scaleColorA: DRAGON2_SCALES[0],
  scaleColorB: DRAGON2_SCALES[1],
  bellyColor: DRAGON2_BELLY,
  eyeColor: DRAGON_EYE,
  pupilColor: DRAGON_PUPIL,
  hornColor: DRAGON_HORN,
  teethColor: DRAGON_TEETH,
  mouthColor: DRAGON_MOUTH,
  wingColor: DRAGON2_WING,
};

function scaleColorAt(x, z, p) {
  return (x + z) % 2 === 0 ? p.scaleColorA : p.scaleColorB;
}

function buildVoxelList(params) {
  const p = { ...DRAGON_WINGS_BOSS_DEFAULTS, ...params };
  const voxels = [];

  const legBaseY = 0;
  const bodyBaseY = legBaseY + p.legHeight;
  const hornBaseY = bodyBaseY + p.bodyHeight;
  const bellyRows = 2;

  // Legs: four short stub columns at the body's corners — a stance, not
  // articulated limbs, same economy of detail demonBossGenerator.js's tail
  // uses rather than a full biped skeleton.
  const legXs = [1, p.bodyWidth - 1 - p.legWidth];
  const legZs = [1, p.bodyDepth - 1 - p.legWidth];
  for (const lx of legXs) {
    for (const lz of legZs) {
      for (let dx = 0; dx < p.legWidth; dx++) {
        for (let dz = 0; dz < p.legWidth; dz++) {
          for (let y = legBaseY; y < bodyBaseY; y++) {
            pushVoxel(voxels, lx + dx, y, lz + dz, p.scaleColorB);
          }
        }
      }
    }
  }

  // Body: checkerboarded scales, lighter belly underside, eyes + a
  // fang/mouth row cut into the front face (mouth row reuses
  // demonBossGenerator.js's single-fang idiom instead of Ghast's protruding
  // snout — keeps this dragon's silhouette to one block, no extra
  // appendage competing with the wings/legs for visual attention).
  const eyeY = bodyBaseY + p.bodyHeight - 3;
  const eyeXs = [2, p.bodyWidth - 3];
  const fangX = Math.floor(p.bodyWidth / 2);
  for (let x = 0; x < p.bodyWidth; x++) {
    for (let y = bodyBaseY; y < bodyBaseY + p.bodyHeight; y++) {
      for (let z = 0; z < p.bodyDepth; z++) {
        const isEye = z === 0 && eyeXs.includes(x) && (y === eyeY || y === eyeY + 1);
        const isMouthRow = z === 0 && y === bodyBaseY;
        let color;
        if (isEye) color = y === eyeY + 1 ? p.eyeColor : p.pupilColor;
        else if (isMouthRow) color = x === fangX ? p.teethColor : p.mouthColor;
        else color = y < bodyBaseY + bellyRows ? p.bellyColor : scaleColorAt(x, z, p);
        pushVoxel(voxels, x, y, z, color);
      }
    }
  }

  // Horns: two straight columns above the head — no whiskers anywhere near
  // them (see file header).
  const hornXs = [2, p.bodyWidth - 3];
  for (const hx of hornXs) {
    for (let i = 0; i < p.hornHeight; i++) {
      pushVoxel(voxels, hx, hornBaseY + i, 1, p.hornColor);
    }
  }

  // Wings: flat panels jutting from the upper sides — same thin-flat-block
  // technique giantFishGenerator.js's pectoral fins use, just bigger and
  // set higher (shoulder height, not mid-body) so they read as wings.
  const wingY0 = bodyBaseY + p.bodyHeight - p.wingHeight - 1;
  const wingZStart = Math.floor(p.bodyDepth * 0.25);
  for (const side of [-1, 1]) {
    for (let s = 1; s <= p.wingSpan; s++) {
      const x = side < 0 ? -s : p.bodyWidth - 1 + s;
      for (let z = wingZStart; z < wingZStart + p.wingLength; z++) {
        for (let dy = 0; dy < p.wingHeight; dy++) {
          pushVoxel(voxels, x, wingY0 + dy, z, p.wingColor);
        }
      }
    }
  }

  // Tail: short curl at the rear-center, same TAIL_PATH-style hand-picked
  // curl demonBossGenerator.js uses.
  const tailX = Math.floor(p.bodyWidth / 2);
  const tailZ = p.bodyDepth - 1;
  const tailY = bodyBaseY + 1;
  pushVoxel(voxels, tailX, tailY, tailZ + 1, p.scaleColorA);
  pushVoxel(voxels, tailX, tailY + 1, tailZ + 2, p.scaleColorB);

  return voxels;
}

export function generateDragonWingsBossGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...DRAGON_WINGS_BOSS_DEFAULTS, ...paramsOverride });
}

export function generateDragonWingsBossMesh(paramsOverride = {}) {
  const p = { ...DRAGON_WINGS_BOSS_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalRows = p.legHeight + p.bodyHeight + p.hornHeight;
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "DragonWingsBoss_Voxel");
}
