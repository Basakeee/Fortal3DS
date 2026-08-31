import { BODY_PAINTS, ENVIRONMENT, GREYS, DRAGON_TEETH, DRAGON_MOUTH } from "./palette.js";
import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match every other generator: x = width, y = height, z = depth,
// front (head) at z = 0. Same "cute cube monster" philosophy as the demon
// boss redesign: one dominant blocky body carries almost the whole
// silhouette, no separate head/neck section. Fins, not limbs — a fish needs
// at least a tail fin to read as a fish at all, unlike the demon's arms/legs,
// which were purely optional and got cut.
export const GIANT_FISH_DEFAULTS = {
  bodyWidth: 6,
  bodyHeight: 6,
  bodyLength: 11,
  tailFinExtra: 3, // how far the tail fin extends above/below body height
  tailFinLength: 3, // tail fin's depth along z
  dorsalFinHeight: 3,
  pectoralFinLength: 3,
  pectoralFinHeight: 2,
  // Target real-world height, measured at the tail fin — the tallest
  // cross-section — same reasoning as every other generator's *Meters default.
  heightMeters: 2.4,
  skinColorA: BODY_PAINTS[10], // deep blue
  bellyColor: ENVIRONMENT[3], // sky — light underbelly, same "lighter belly" read as the dragon Ghast boss
  finColor: BODY_PAINTS[8], // gunmetal — darker than the body, so fins read as a separate part
  eyeWhiteColor: GREYS[7],
  pupilColor: GREYS[0],
  teethColor: DRAGON_TEETH, // shared boss/creature palette — see palette.js
  mouthColor: DRAGON_MOUTH,
};

function buildVoxelList(params) {
  const p = { ...GIANT_FISH_DEFAULTS, ...params };
  const voxels = [];

  const bodyBaseY = 0;
  const bellyRows = 2;

  // Body: one dominant rectangular block, lighter belly on the bottom rows —
  // same "darker back / lighter belly" read as the dragon Ghast boss.
  for (let x = 0; x < p.bodyWidth; x++) {
    for (let y = bodyBaseY; y < bodyBaseY + p.bodyHeight; y++) {
      for (let z = 0; z < p.bodyLength; z++) {
        const isBelly = y < bodyBaseY + bellyRows;
        pushVoxel(voxels, x, y, z, isBelly ? p.bellyColor : p.skinColorA);
      }
    }
  }

  // Face, cut into the front layer: big eyes (same white-over-black technique
  // as the demon boss) and a wide toothy mouth spanning the whole front width
  // — a giant fish's whole draw is a huge gaping mouth, so this gets the
  // full-width comb-tooth treatment the demon's single center fang didn't need.
  const eyeY = bodyBaseY + p.bodyHeight - 2;
  const eyeXs = [1, p.bodyWidth - 2];
  for (const x of eyeXs) {
    pushVoxel(voxels, x, eyeY, 0, p.eyeWhiteColor);
    pushVoxel(voxels, x, eyeY - 1, 0, p.pupilColor);
  }
  for (let x = 0; x < p.bodyWidth; x++) {
    const isTooth = x % 2 === 0;
    pushVoxel(voxels, x, bodyBaseY, 0, isTooth ? p.teethColor : p.mouthColor);
  }

  // Dorsal fin: a triangular ridge on top, toward the rear — each row narrows
  // by one voxel on both sides going up, tapering to a single point, same
  // "kinked/tapered" spirit as the demon boss's curled horn tips.
  const dorsalXStart = Math.floor(p.bodyWidth / 2) - 2;
  const dorsalZ = Math.floor(p.bodyLength * 0.55);
  for (let i = 0; i < p.dorsalFinHeight; i++) {
    for (let x = dorsalXStart + i; x <= dorsalXStart + 4 - i; x++) {
      pushVoxel(voxels, x, bodyBaseY + p.bodyHeight + i, dorsalZ, p.finColor);
    }
  }

  // Pectoral fins: thin flat blocks on either side, near the front — flat and
  // one voxel thick so they read as fins, not the arm-like nubs the demon
  // boss deliberately doesn't have.
  const pectoralZStart = Math.floor(p.bodyLength * 0.2);
  const pectoralY = bodyBaseY + Math.floor(p.bodyHeight / 2);
  for (const x of [-1, p.bodyWidth]) {
    for (let z = pectoralZStart; z < pectoralZStart + p.pectoralFinLength; z++) {
      for (let dy = 0; dy < p.pectoralFinHeight; dy++) {
        pushVoxel(voxels, x, pectoralY - dy, z, p.finColor);
      }
    }
  }

  // Tail fin: a wide, thin fan at the very rear, taller than the body on both
  // ends — the one part of the silhouette that actually needs to read as
  // "fish," not just "long block."
  const tailZStart = p.bodyLength;
  for (let z = tailZStart; z < tailZStart + p.tailFinLength; z++) {
    for (let y = bodyBaseY - p.tailFinExtra; y < bodyBaseY + p.bodyHeight + p.tailFinExtra; y++) {
      for (let x = 1; x < p.bodyWidth - 1; x++) {
        pushVoxel(voxels, x, y, z, p.finColor);
      }
    }
  }

  return voxels;
}

export function generateGiantFishGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...GIANT_FISH_DEFAULTS, ...paramsOverride });
}

export function generateGiantFishMesh(paramsOverride = {}) {
  const p = { ...GIANT_FISH_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalRows = p.bodyHeight + p.tailFinExtra * 2;
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "GiantFish_Voxel");
}
