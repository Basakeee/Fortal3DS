import { SKIN_TONES, HAIR_COLORS, SHIRT_COLORS, PANTS_COLORS, SHOE_COLORS } from "./palette.js";
import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match the car generators: x = width (left/right), y = height (up),
// z = depth (front/back, thin for a human vs. a car's length).
//
// Row layout bottom-to-top (voxel counts), tuned so a human reads correctly at
// low resolution — this replaces the arena's current placeholder mannequin
// (a footless torso box + two leg boxes, no arms) with head/neck/torso/arms/
// hip/legs/feet as distinct volumes:
//   foot(1) -> leg(5) -> hip(1) -> torso(4) -> neck(1) -> head(2) -> hair(1)
// totalRows = 15.
export const HUMAN_DEFAULTS = {
  width: 5, // shoulder/hip width; legs are 2 + 1 gap + 2 to fill it
  legWidth: 2,
  depth: 2, // torso/limb thickness (front-to-back)
  footExtra: 1, // extra +z reach on the foot row so toes read past the shin
  footHeight: 1,
  legHeight: 5,
  hipHeight: 1,
  torsoHeight: 4,
  neckHeight: 1,
  headHeight: 2,
  headWidth: 3,
  hairHeight: 1,
  armWidth: 1,
  // Target real-world height. voxelSize is derived from this ÷ totalRows
  // (rather than set directly like the car's fixed voxelSize) so swapping
  // heightMeters across the male/female/child presets rescales the whole
  // figure uniformly instead of stretching one preset's mesh non-uniformly.
  heightMeters: 1.7,
  skinColor: SKIN_TONES[0],
  hairColor: HAIR_COLORS[0],
  shirtColor: SHIRT_COLORS[0],
  pantsColor: PANTS_COLORS[0],
  shoeColor: SHOE_COLORS[0],
};

// Mirrors the three player-size presets in the Fortal Main Arena UI
// (ผู้ชาย 170 / ผู้หญิง 158 / เด็ก 120) so the generated model can drop straight
// into that config instead of needing a fourth "translate cm to params" step.
export const HUMAN_PRESETS = {
  male: { heightMeters: 1.7 },
  female: { heightMeters: 1.58 },
  child: { heightMeters: 1.2 },
};

function buildVoxelList(params) {
  const p = { ...HUMAN_DEFAULTS, ...params };
  const voxels = [];

  const legGapX = 1; // single gap column between the two legs
  const leftLegX = [0, p.legWidth - 1];
  const rightLegX = [p.legWidth + legGapX, p.width - 1];

  const footBaseY = 0;
  const legBaseY = footBaseY + p.footHeight;
  const hipBaseY = legBaseY + p.legHeight;
  const torsoBaseY = hipBaseY + p.hipHeight;
  const neckBaseY = torsoBaseY + p.torsoHeight;
  const headBaseY = neckBaseY + p.neckHeight;
  const hairBaseY = headBaseY + p.headHeight;

  // Feet: separate left/right blocks (skip the leg gap) so the two legs stay
  // visually distinct all the way to the ground instead of merging into one slab.
  for (const [xStart, xEnd] of [leftLegX, rightLegX]) {
    for (let x = xStart; x <= xEnd; x++) {
      for (let z = 0; z < p.depth + p.footExtra; z++) {
        pushVoxel(voxels, x, footBaseY, z, p.shoeColor);
      }
    }
  }

  // Legs
  for (const [xStart, xEnd] of [leftLegX, rightLegX]) {
    for (let x = xStart; x <= xEnd; x++) {
      for (let y = legBaseY; y < legBaseY + p.legHeight; y++) {
        for (let z = 0; z < p.depth; z++) {
          pushVoxel(voxels, x, y, z, p.pantsColor);
        }
      }
    }
  }

  // Hip: bridges the leg gap so legs don't read as floating apart under the torso.
  for (let x = 0; x < p.width; x++) {
    for (let z = 0; z < p.depth; z++) {
      pushVoxel(voxels, x, hipBaseY, z, p.pantsColor);
    }
  }

  // Torso
  for (let x = 0; x < p.width; x++) {
    for (let y = torsoBaseY; y < torsoBaseY + p.torsoHeight; y++) {
      for (let z = 0; z < p.depth; z++) {
        pushVoxel(voxels, x, y, z, p.shirtColor);
      }
    }
  }

  // Arms: hang at the torso's sides, one voxel outside its width, spanning the
  // same height range as the torso. Full-length skin color (bare arm), not
  // shirtColor — an arm colored the same as the torso it's flush against reads
  // as one fused, over-wide block instead of a separate limb (confirmed against
  // Adam's reference render, which keeps limbs a neutral tone and colors only
  // the torso by team/shirt).
  for (const armX of [-1, p.width]) {
    for (let y = torsoBaseY; y < torsoBaseY + p.torsoHeight; y++) {
      for (let z = 0; z < p.depth; z++) {
        pushVoxel(voxels, armX, y, z, p.skinColor);
      }
    }
  }

  // Neck
  for (let x = Math.floor((p.width - 1) / 2); x <= Math.ceil((p.width - 1) / 2); x++) {
    for (let z = 0; z < p.depth; z++) {
      pushVoxel(voxels, x, neckBaseY, z, p.skinColor);
    }
  }

  // Head, centered on the shoulder width and narrower than the torso.
  const headXStart = Math.floor((p.width - p.headWidth) / 2);
  for (let x = headXStart; x < headXStart + p.headWidth; x++) {
    for (let y = headBaseY; y < headBaseY + p.headHeight; y++) {
      for (let z = 0; z < p.depth; z++) {
        pushVoxel(voxels, x, y, z, p.skinColor);
      }
    }
  }

  // Hair cap on top of the head.
  for (let x = headXStart; x < headXStart + p.headWidth; x++) {
    for (let z = 0; z < p.depth; z++) {
      pushVoxel(voxels, x, hairBaseY, z, p.hairColor);
    }
  }

  return voxels;
}

export function generateHumanGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...HUMAN_DEFAULTS, ...paramsOverride });
}

export function generateHumanMesh(paramsOverride = {}) {
  const p = { ...HUMAN_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalRows = p.footHeight + p.legHeight + p.hipHeight + p.torsoHeight + p.neckHeight + p.headHeight + p.hairHeight;
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "Human_Voxel");
}
