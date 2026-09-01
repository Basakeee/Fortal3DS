import * as THREE from "three";
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

// Every row baseline in one place — buildBodyVoxels/buildShirtVoxels/
// buildHatVoxels (and generateFarmerRig's own row-count math) all derive
// positions from this instead of each recomputing the same running sum,
// which is what let the torso and everything above it drift out of sync if
// only one of them got edited.
function rowBaselines(p) {
  const footBaseY = 0;
  const legBaseY = footBaseY + p.footHeight;
  const hipBaseY = legBaseY + p.legHeight;
  const torsoBaseY = hipBaseY + p.hipHeight;
  const neckBaseY = torsoBaseY + p.torsoHeight;
  const headBaseY = neckBaseY + p.neckHeight;
  const hairBaseY = headBaseY + p.headHeight;
  const hatBaseY = hairBaseY + p.hairHeight;
  return { footBaseY, legBaseY, hipBaseY, torsoBaseY, neckBaseY, headBaseY, hairBaseY, hatBaseY };
}

// Everything except the torso: feet, legs, hip, arms, neck, head, hair. Split
// out from the shirt (buildShirtVoxels below) so a farmer rig can put the
// shirt on its own mesh with its own recolorable-in-Unity material instead of
// baking one fixed shirtColor into the same vertex-colored mesh as
// everything else — see generateFarmerRig's own comment for why.
function buildBodyVoxels(p) {
  const voxels = [];
  const b = rowBaselines(p);
  const legGapX = 1; // single gap column between the two legs
  const leftLegX = [0, p.legWidth - 1];
  const rightLegX = [p.legWidth + legGapX, p.width - 1];

  // Feet: separate left/right blocks (skip the leg gap) so the two legs stay
  // visually distinct all the way to the ground instead of merging into one slab.
  for (const [xStart, xEnd] of [leftLegX, rightLegX]) {
    for (let x = xStart; x <= xEnd; x++) {
      for (let z = 0; z < p.depth + p.footExtra; z++) {
        pushVoxel(voxels, x, b.footBaseY, z, p.shoeColor);
      }
    }
  }

  // Legs
  for (const [xStart, xEnd] of [leftLegX, rightLegX]) {
    for (let x = xStart; x <= xEnd; x++) {
      for (let y = b.legBaseY; y < b.legBaseY + p.legHeight; y++) {
        for (let z = 0; z < p.depth; z++) {
          pushVoxel(voxels, x, y, z, p.pantsColor);
        }
      }
    }
  }

  // Hip: bridges the leg gap so legs don't read as floating apart under the torso.
  for (let x = 0; x < p.width; x++) {
    for (let z = 0; z < p.depth; z++) {
      pushVoxel(voxels, x, b.hipBaseY, z, p.pantsColor);
    }
  }

  // Arms: hang at the torso's sides, one voxel outside its width, spanning the
  // same height range as the torso. Full-length skin color (bare arm), not
  // shirtColor — an arm colored the same as the torso it's flush against reads
  // as one fused, over-wide block instead of a separate limb (confirmed against
  // Adam's reference render, which keeps limbs a neutral tone and colors only
  // the torso by team/shirt).
  for (const armX of [-1, p.width]) {
    for (let y = b.torsoBaseY; y < b.torsoBaseY + p.torsoHeight; y++) {
      for (let z = 0; z < p.depth; z++) {
        pushVoxel(voxels, armX, y, z, p.skinColor);
      }
    }
  }

  // Neck
  for (let x = Math.floor((p.width - 1) / 2); x <= Math.ceil((p.width - 1) / 2); x++) {
    for (let z = 0; z < p.depth; z++) {
      pushVoxel(voxels, x, b.neckBaseY, z, p.skinColor);
    }
  }

  // Head, centered on the shoulder width and narrower than the torso.
  const headXStart = Math.floor((p.width - p.headWidth) / 2);
  for (let x = headXStart; x < headXStart + p.headWidth; x++) {
    for (let y = b.headBaseY; y < b.headBaseY + p.headHeight; y++) {
      for (let z = 0; z < p.depth; z++) {
        pushVoxel(voxels, x, y, z, p.skinColor);
      }
    }
  }

  // Hair cap on top of the head.
  for (let x = headXStart; x < headXStart + p.headWidth; x++) {
    for (let z = 0; z < p.depth; z++) {
      pushVoxel(voxels, x, b.hairBaseY, z, p.hairColor);
    }
  }

  return voxels;
}

// Just the torso block — kept in its own function (rather than a branch
// inside buildBodyVoxels) so generateFarmerRig can put it on a separate mesh.
function buildShirtVoxels(p) {
  const voxels = [];
  const b = rowBaselines(p);
  for (let x = 0; x < p.width; x++) {
    for (let y = b.torsoBaseY; y < b.torsoBaseY + p.torsoHeight; y++) {
      for (let z = 0; z < p.depth; z++) {
        pushVoxel(voxels, x, y, z, p.shirtColor);
      }
    }
  }
  return voxels;
}

// Straw hat: a wide thin brim (the actual "straw hat" silhouette cue — a
// hat-shaped blob with no brim just reads as a helmet) plus a shorter,
// narrower crown sitting on top of it, straight on top of the hair with no
// gap. hatColor is fixed, not recolorable — unlike the shirt, a straw hat
// doesn't change per farmer, so this stays on the same vertex-colored body
// mesh instead of getting its own separate recolorable mesh.
function buildHatVoxels(p) {
  const voxels = [];
  const b = rowBaselines(p);
  const headXStart = Math.floor((p.width - p.headWidth) / 2);

  const brimXStart = headXStart - p.hatBrimExtra;
  const brimWidth = p.headWidth + p.hatBrimExtra * 2;
  for (let x = brimXStart; x < brimXStart + brimWidth; x++) {
    for (let z = -p.hatBrimExtra; z < p.depth + p.hatBrimExtra; z++) {
      pushVoxel(voxels, x, b.hatBaseY, z, p.hatColor);
    }
  }
  for (let x = headXStart; x < headXStart + p.headWidth; x++) {
    for (let y = b.hatBaseY + 1; y < b.hatBaseY + 1 + p.hatCrownHeight; y++) {
      for (let z = 0; z < p.depth; z++) {
        pushVoxel(voxels, x, y, z, p.hatColor);
      }
    }
  }
  return voxels;
}

function buildVoxelList(params) {
  const p = { ...HUMAN_DEFAULTS, ...params };
  return [...buildBodyVoxels(p), ...buildShirtVoxels(p)];
}

export function generateHumanGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...HUMAN_DEFAULTS, ...paramsOverride });
}

function totalHumanRows(p) {
  return p.footHeight + p.legHeight + p.hipHeight + p.torsoHeight + p.neckHeight + p.headHeight + p.hairHeight;
}

export function generateHumanMesh(paramsOverride = {}) {
  const p = { ...HUMAN_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const voxelSize = p.heightMeters / totalHumanRows(p);
  return voxelsToMesh(voxels, voxelSize, "Human_Voxel");
}

// MemoryFarmGameManager.cs needs ONE farmer model whose shirt color can
// change at runtime IN UNITY (5 farmerTypes colors), not 5 separately-baked
// exports the way the animal presets work — a shirt baked into the same
// vertex-colored mesh as the rest of the body can't be retinted after export
// (see coinGenerator.js's README entry on why vertex color has no exposed
// tint parameter: Fortal/VertexColorLit's Properties block is empty by
// design). The fix is splitting the shirt onto its OWN mesh/node with a
// plain (non-vertex-colored) material — Unity's default URP/Lit material,
// which every other FBX import already gets before บาส manually reassigns it
// to Fortal/VertexColorLit, natively supports runtime color changes (a
// script can just set its color) — so the shirt mesh needs NO shader
// reassignment at all, only the body mesh does, same as every other preset.
// Two separate glTF/FBX nodes surviving the Blender round-trip is already
// proven by dragonGhastGenerator.js's TentaclePivot_0..8 nodes (see its own
// comment) — reused here instead of risking an unverified vertex-alpha-mask
// approach on the untested channel.
export const FARMER_DEFAULTS = {
  ...HUMAN_DEFAULTS,
  hatColor: 0xd9b464, // straw tan — not from any existing palette list, this is the one generator that needs a straw color at all
  hatBrimExtra: 1, // how much wider than headWidth the brim extends on each side
  hatCrownHeight: 2,
};

export function generateFarmerRig(paramsOverride = {}) {
  const p = { ...FARMER_DEFAULTS, ...paramsOverride };
  const totalRows = totalHumanRows(p) + 1 + p.hatCrownHeight; // +1 for the brim row
  const voxelSize = p.heightMeters / totalRows;
  const bodyVoxels = [...buildBodyVoxels(p), ...buildHatVoxels(p)];
  const shirtVoxels = buildShirtVoxels(p);
  const bodyMesh = voxelsToMesh(bodyVoxels, voxelSize, "Farmer_Body");
  const shirtMesh = voxelsToMesh(shirtVoxels, voxelSize, "Farmer_Shirt");
  return { bodyMesh, shirtMesh };
}

// Single assembled Group for the gallery preview/static export path — Unity
// only cares that Farmer_Body and Farmer_Shirt come through as 2 separate
// child nodes (which this preserves), not that they're wrapped in a Group,
// but a Group is what dragonGhastGenerator's own rig assembly already uses
// for the same "more than one mesh, one exportable root" need.
export function generateFarmerMesh(paramsOverride = {}) {
  const { bodyMesh, shirtMesh } = generateFarmerRig(paramsOverride);
  const group = new THREE.Group();
  group.name = "Farmer";
  group.add(bodyMesh);
  group.add(shirtMesh);
  return group;
}
