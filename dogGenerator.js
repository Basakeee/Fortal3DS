import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match pigGenerator.js: x = width, y = height, z = depth, head at
// z = 0. Where pigGenerator's snout is a flat wide block (pig-identifying),
// a dog's snout is a NARROW block that projects further forward — that
// length difference is most of what separates the two silhouettes at this
// resolution, since both are otherwise a 4-legged box-body-plus-head shape.
export const DOG_DEFAULTS = {
  headWidth: 3,
  headHeight: 3,
  headDepth: 2,
  snoutLength: 2, // extra z the snout projects past the head, beyond pig's flat 1-voxel snout
  snoutWidth: 1,
  bodyWidth: 4,
  bodyHeight: 4,
  bodyDepth: 7,
  legWidth: 1,
  legHeight: 3,
  earHeight: 2, // hangs DOWN from the head, not up — see the ear loop below
  tailLength: 3,
  heightMeters: 0.6,
  furColor: 0xd8a05a, // matches MemoryFarmGameManager.cs's animalTypes[1] Dog color exactly
};

function darken(hex, amount) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  const mix = (c) => Math.round(c * (1 - amount));
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

function buildVoxelList(params) {
  const p = { ...DOG_DEFAULTS, ...params };
  const voxels = [];
  const noseColor = darken(p.furColor, 0.9);
  const eyeColor = darken(p.furColor, 0.85);
  const earColor = darken(p.furColor, 0.2); // slightly darker than the coat, reads as a separate part

  const bodyBaseY = p.legHeight;
  const bodyZStart = p.headDepth + p.snoutLength;

  // 4 legs — same corner-column technique as pigGenerator, just taller/
  // thinner (a dog stands higher off the ground relative to its body than a
  // pig does).
  const legXs = [0, p.bodyWidth - p.legWidth];
  const legZs = [bodyZStart + 1, bodyZStart + p.bodyDepth - p.legWidth - 1];
  for (const lx of legXs) {
    for (const lz of legZs) {
      for (let x = lx; x < lx + p.legWidth; x++) {
        for (let z = lz; z < lz + p.legWidth; z++) {
          for (let y = 0; y < p.legHeight; y++) {
            pushVoxel(voxels, x, y, z, p.furColor);
          }
        }
      }
    }
  }

  // Body
  for (let x = 0; x < p.bodyWidth; x++) {
    for (let y = bodyBaseY; y < bodyBaseY + p.bodyHeight; y++) {
      for (let z = bodyZStart; z < bodyZStart + p.bodyDepth; z++) {
        pushVoxel(voxels, x, y, z, p.furColor);
      }
    }
  }

  // Head, raised slightly above the body's top — an alert "ears up" stance
  // reads more like a dog than pig's flush-with-body head does.
  const headXStart = Math.floor((p.bodyWidth - p.headWidth) / 2);
  const headBaseY = bodyBaseY + p.bodyHeight - p.headHeight + 1;
  for (let x = headXStart; x < headXStart + p.headWidth; x++) {
    for (let y = headBaseY; y < headBaseY + p.headHeight; y++) {
      for (let z = 0; z < p.headDepth; z++) {
        pushVoxel(voxels, x, y, z, p.furColor);
      }
    }
  }

  // Snout: narrow and projecting, unlike the pig's flat wide one — this is
  // the main silhouette difference between the two at this resolution.
  const snoutX = headXStart + Math.floor((p.headWidth - p.snoutWidth) / 2);
  const snoutY = headBaseY + 1;
  for (let dz = 1; dz <= p.snoutLength; dz++) {
    for (let x = snoutX; x < snoutX + p.snoutWidth; x++) {
      pushVoxel(voxels, x, snoutY, -dz, dz === p.snoutLength ? noseColor : p.furColor);
    }
  }

  // Eyes: on the head, above the snout base
  const eyeY = headBaseY + p.headHeight - 1;
  pushVoxel(voxels, headXStart, eyeY, 0, eyeColor);
  pushVoxel(voxels, headXStart + p.headWidth - 1, eyeY, 0, eyeColor);

  // Ears: hang DOWN below the head's bottom at the sides — floppy, not
  // pointed-up like the pig's — the other half of what separates the two
  // silhouettes.
  for (const ex of [headXStart, headXStart + p.headWidth - 1]) {
    for (let i = 1; i <= p.earHeight; i++) {
      pushVoxel(voxels, ex, headBaseY - i, 0, earColor);
    }
  }

  // Tail: curves UP at the rear (unlike the pig's tight low curl) — each
  // step goes back and up, same kinked-path spirit as demonBoss's TAIL_PATH
  // but longer and shallower.
  const tailX = Math.floor(p.bodyWidth / 2);
  let tz = bodyZStart + p.bodyDepth - 1;
  let ty = bodyBaseY + p.bodyHeight - 1;
  for (let i = 0; i < p.tailLength; i++) {
    tz += 1;
    ty += i < p.tailLength - 1 ? 0 : 1; // kinks upward only on the last segment, like the pig's curl tip
    pushVoxel(voxels, tailX, ty, tz, p.furColor);
  }

  return voxels;
}

export function generateDogGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...DOG_DEFAULTS, ...paramsOverride });
}

export function generateDogMesh(paramsOverride = {}) {
  const p = { ...DOG_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalRows = p.legHeight + p.bodyHeight + 1; // +1 for the head's raised offset
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "Dog_Voxel");
}
