import { SERPENT_SCALES, SERPENT_BELLY, SERPENT_FIN, SERPENT_EYE, SERPENT_PUPIL } from "./palette.js";
import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Eighth Boss Slayer creature — reuses giantFishGenerator.js's elongated
// "one dominant block, fins load-bearing" body plan (a serpent and a giant
// fish are both long single-block creatures that need a tail fin to read as
// what they are), reskinned: a checkerboard scale pattern instead of the
// fish's flat two-tone body (same (x+z)%2 technique dragonGhastGenerator.js
// uses), a spiky head crest instead of paired pectoral fins, and no teeth —
// a serpent's identity is the coil + crest + tail fin, not a gaping mouth.
export const STORM_SERPENT_BOSS_DEFAULTS = {
  bodyWidth: 5,
  bodyHeight: 5,
  bodyLength: 13,
  tailFinExtra: 3,
  tailFinLength: 3,
  crestHeight: 3,
  crestCount: 4,
  heightMeters: 2.4,
  scaleColorA: SERPENT_SCALES[0],
  scaleColorB: SERPENT_SCALES[1],
  bellyColor: SERPENT_BELLY,
  finColor: SERPENT_FIN,
  eyeColor: SERPENT_EYE,
  pupilColor: SERPENT_PUPIL,
};

function scaleColorAt(x, z, p) {
  return (x + z) % 2 === 0 ? p.scaleColorA : p.scaleColorB;
}

function buildVoxelList(params) {
  const p = { ...STORM_SERPENT_BOSS_DEFAULTS, ...params };
  const voxels = [];

  const bodyBaseY = 0;
  const bellyRows = 2;

  // Body: checkerboarded scale pattern, lighter belly on the bottom rows,
  // eyes cut into the front face — same inline-eye technique every other
  // boss here uses.
  const eyeY = bodyBaseY + p.bodyHeight - 2;
  const eyeXs = [0, p.bodyWidth - 1];
  for (let x = 0; x < p.bodyWidth; x++) {
    for (let y = bodyBaseY; y < bodyBaseY + p.bodyHeight; y++) {
      for (let z = 0; z < p.bodyLength; z++) {
        const isEye = z === 0 && y === eyeY && eyeXs.includes(x);
        let color = isEye ? p.eyeColor : y < bodyBaseY + bellyRows ? p.bellyColor : scaleColorAt(x, z, p);
        pushVoxel(voxels, x, y, z, color);
      }
    }
  }
  // Pupils, one row below the eye whites — pushed as a second, later pass
  // (unlike bodyColorAt's single-pass inline eyes elsewhere) since this loop
  // already committed the scale/belly base layer above the eye row.
  for (const x of eyeXs) pushVoxel(voxels, x, eyeY - 1, 0, p.pupilColor);

  // Head crest: a row of spikes just behind the eyes, each its own height —
  // same "hand-picked jagged cluster" spirit as crystalGolemBossGenerator.js's
  // crown, standing in for the paired horns/pectoral fins other bosses use.
  const crestStartX = Math.floor((p.bodyWidth - p.crestCount) / 2);
  const crestZ = 2;
  for (let i = 0; i < p.crestCount; i++) {
    const height = i % 2 === 0 ? p.crestHeight : p.crestHeight - 1;
    for (let dy = 0; dy < height; dy++) {
      pushVoxel(voxels, crestStartX + i, bodyBaseY + p.bodyHeight + dy, crestZ, p.finColor);
    }
  }

  // Tail fin: wide, thin fan at the rear, taller than the body on both ends
  // — identical technique to giantFishGenerator.js's tail fin.
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

export function generateStormSerpentBossGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...STORM_SERPENT_BOSS_DEFAULTS, ...paramsOverride });
}

export function generateStormSerpentBossMesh(paramsOverride = {}) {
  const p = { ...STORM_SERPENT_BOSS_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalRows = p.bodyHeight + p.tailFinExtra * 2;
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "StormSerpentBoss_Voxel");
}
