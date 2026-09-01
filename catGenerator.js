import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match pigGenerator.js: x = width, y = height, z = depth, front
// at z = 0. Redesigned again after บาส's reference image — the previous
// version (plain-colored block + tall thin ears) read as "rabbit," not
// "cat," since nothing but ear height/tail length distinguished it from a
// generic small mammal. This version copies the reference's actual face
// PATTERN instead of relying on silhouette alone: a dark mask band across
// the upper face, dark ear tips, green eyes, and a pink nose — all fixed
// accent colors rather than derived from furColor, since a stylized
// lavender cat (matching MemoryFarmGameManager.cs's own color) still needs
// a real cat's face markings, not a lavender-toned version of them.
export const CAT_DEFAULTS = {
  bodyWidth: 5, // was 3 — too narrow to fit a mask band + eyes + nose + cheeks as distinct rows/columns
  bodyHeight: 4,
  bodyDepth: 6,
  earHeight: 1, // was 2 — บาส asked for just 1 block, no separate base+tip rows
  tailLength: 4,
  heightMeters: 0.4,
  furColor: 0xc9a0ff, // matches MemoryFarmGameManager.cs's animalTypes[4] Cat color exactly (stylized lavender, not a realistic cat color)
  maskColor: 0x4a2e70, // dark band across the upper face + ear tips — derived from furColor's own hue (not black), so it reads as "this cat's shadow tone," not an unrelated color
  eyeColor: 0x4caf6a, // green, per the reference — fixed rather than derived, real cat eyes aren't fur-colored either
  noseColor: 0xe07a94, // pink, per the reference — fixed for the same reason
};

function buildVoxelList(params) {
  const p = { ...CAT_DEFAULTS, ...params };
  const voxels = [];

  // Body: the one dominant block, flush on the ground
  for (let x = 0; x < p.bodyWidth; x++) {
    for (let y = 0; y < p.bodyHeight; y++) {
      for (let z = 0; z < p.bodyDepth; z++) {
        pushVoxel(voxels, x, y, z, p.furColor);
      }
    }
  }

  // Face pattern, cut into the front face — bodyHeight=4 maps 1 row per
  // reference band: mask (top) -> eyes -> nose+cheeks -> chin (bottom).
  const maskY = p.bodyHeight - 1;
  const eyeY = p.bodyHeight - 2;
  const noseY = p.bodyHeight - 3;
  for (let x = 0; x < p.bodyWidth; x++) pushVoxel(voxels, x, maskY, 0, p.maskColor);
  pushVoxel(voxels, 0, eyeY, 0, p.eyeColor);
  pushVoxel(voxels, p.bodyWidth - 1, eyeY, 0, p.eyeColor);
  pushVoxel(voxels, Math.floor(p.bodyWidth / 2), noseY, 0, p.noseColor);
  // Bottom row (chin) stays plain furColor — already filled by the body loop.

  // Ears: straight 1-wide columns at the outer corners (no taper — a
  // tapering version overlapped/fused on a narrow body, see the earlier
  // fix), dark-tipped like the reference instead of solid furColor — the
  // tip color is what visually separates this from a generic ear silhouette.
  for (const ex of [0, p.bodyWidth - 1]) {
    for (let i = 0; i < p.earHeight; i++) {
      const isTip = i === p.earHeight - 1;
      pushVoxel(voxels, ex, p.bodyHeight + i, 0, isTip ? p.maskColor : p.furColor);
    }
  }

  // Tail: long, sweeping up and back — the longest of the 4 mammals, still a
  // clear "this one's the cat" signal even from behind, on top of the face
  // pattern now doing the same job from the front.
  const tailX = Math.floor(p.bodyWidth / 2);
  let ty = p.bodyHeight - 1;
  for (let i = 0; i < p.tailLength; i++) {
    if (i >= p.tailLength - 2) ty += 1; // curves upward only on the last 2 segments
    pushVoxel(voxels, tailX, ty, p.bodyDepth + i, p.furColor);
  }

  return voxels;
}

export function generateCatGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...CAT_DEFAULTS, ...paramsOverride });
}

export function generateCatMesh(paramsOverride = {}) {
  const p = { ...CAT_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalRows = p.bodyHeight + p.earHeight;
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "Cat_Voxel");
}
