import { DRAGON_SCALES, DRAGON_BELLY, DRAGON_EYE, DRAGON_PUPIL, DRAGON_HORN, DRAGON_TEETH, DRAGON_MOUTH } from "./palette.js";
import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Same silhouette as Minecraft's Ghast — a big cubic floating body with a grid of
// dangling tentacles underneath — but re-skinned as a dragon: scale-pattern body,
// a lighter belly, slit reptilian eyes, two horns, and a protruding toothed snout
// instead of Ghast's flat white face. Requested for the Boss Slayer arena game.
//
// Grid axes match the other generators: x = width, y = height, z = depth.
// Front is z = 0 (the snout/eyes side), matching the cars' z = 0 front.
export const DRAGON_GHAST_DEFAULTS = {
  bodyWidth: 9,
  bodyDepth: 9,
  bodyHeight: 8,
  hornHeight: 3,
  // Per-tentacle length, indexed [xi][zi] over the 3x3 grid at x,z = 1,4,7 — a
  // fixed, hand-picked pattern (not random) so the mesh is reproducible: same
  // params always produce the same boss, same as every other preset here.
  tentacleLengths: [
    [6, 8, 5],
    [7, 8, 6],
    [5, 7, 6],
  ],
  snoutWidth: 3,
  snoutHeight: 3,
  snoutDepth: 2,
  // Target real-world body width (excluding horns/tentacles/snout). voxelSize is
  // derived from this ÷ bodyWidth, same reasoning as humanGenerator's
  // heightMeters ÷ totalRows: pick the real size you want and let voxel count
  // stay fixed, instead of a fixed voxelSize that would need re-tuning by hand.
  bodyWidthMeters: 3.2,
  scaleColorA: DRAGON_SCALES[0],
  scaleColorB: DRAGON_SCALES[1],
  bellyColor: DRAGON_BELLY,
  eyeColor: DRAGON_EYE,
  pupilColor: DRAGON_PUPIL,
  hornColor: DRAGON_HORN,
  teethColor: DRAGON_TEETH,
  mouthColor: DRAGON_MOUTH,
};

function scaleColorAt(x, z, p) {
  return (x + z) % 2 === 0 ? p.scaleColorA : p.scaleColorB;
}

// Eyes are computed as part of the body pass (not pushed as a separate
// overlapping layer afterward) — pushing a second voxel at a coordinate the
// body loop already filled would double up geometry there and risk z-fighting.
function bodyColorAt(x, y, z, p, bodyBaseY, bellyRows) {
  const eyeY = bodyBaseY + p.bodyHeight - 3;
  const eyeXs = [2, p.bodyWidth - 3];
  if (z === 0 && eyeXs.includes(x)) {
    if (y === eyeY + 1) return p.eyeColor;
    if (y === eyeY) return p.pupilColor;
  }
  if (y < bodyBaseY + bellyRows) return p.bellyColor;
  return scaleColorAt(x, z, p);
}

// One tentacle's voxel column, relative to its attachment row (dy = -1 is the
// first voxel hanging directly below the body, dy = -length is the tip).
// Pulled out on its own so the merged export mesh and the animated preview
// rig (generateDragonGhastRig, below) build identical bands from one place.
function tentacleColumn(length, p) {
  const column = [];
  for (let i = 0; i < length; i++) {
    // Banded every 2 rows so each tentacle reads as jointed/ringed rather
    // than a single flat-colored rod.
    const color = Math.floor(i / 2) % 2 === 0 ? p.scaleColorA : p.scaleColorB;
    column.push({ dy: -1 - i, color });
  }
  return column;
}

// Body + horns + snout only — everything except the dangling tentacles.
// Split out so generateDragonGhastRig can reuse it without also getting
// tentacles baked into the same static mesh.
function buildBodyVoxels(p, bodyBaseY, hornBaseY) {
  const voxels = [];
  const bellyRows = 2; // bottom rows of the body read as a lighter underside

  // Body: solid cube, checkerboarded by (x+z) for a scale pattern, lighter
  // belly on the bottom rows (dragons read as darker-backed/lighter-bellied),
  // eyes cut into the front face (see bodyColorAt).
  for (let x = 0; x < p.bodyWidth; x++) {
    for (let z = 0; z < p.bodyDepth; z++) {
      for (let y = bodyBaseY; y < bodyBaseY + p.bodyHeight; y++) {
        pushVoxel(voxels, x, y, z, bodyColorAt(x, y, z, p, bodyBaseY, bellyRows));
      }
    }
  }

  // Horns: two straight columns above the head, set one row back from the
  // front face for a swept-back look, aligned with the eyes below.
  const hornXs = [2, p.bodyWidth - 3];
  for (const x of hornXs) {
    for (let i = 0; i < p.hornHeight; i++) {
      pushVoxel(voxels, x, hornBaseY + i, 1, p.hornColor);
    }
  }

  // Snout: protrudes forward (negative z) from the lower-middle of the face,
  // replacing Ghast's flat frown with a toothed jaw — nostrils on top, a
  // 3-segment tooth/gap line along the bottom-front edge.
  const snoutXStart = Math.floor((p.bodyWidth - p.snoutWidth) / 2);
  for (let x = snoutXStart; x < snoutXStart + p.snoutWidth; x++) {
    for (let y = bodyBaseY; y < bodyBaseY + p.snoutHeight; y++) {
      for (let dz = 1; dz <= p.snoutDepth; dz++) {
        const z = -dz;
        const isFrontRow = dz === p.snoutDepth;
        const isTopRow = y === bodyBaseY + p.snoutHeight - 1;
        const isBottomRow = y === bodyBaseY;
        const isOuterX = x === snoutXStart || x === snoutXStart + p.snoutWidth - 1;
        let color = p.scaleColorA;
        if (isFrontRow && isTopRow && isOuterX) color = p.mouthColor; // nostrils
        else if (isFrontRow && isBottomRow) color = isOuterX ? p.teethColor : p.mouthColor; // teeth / open-mouth gap
        pushVoxel(voxels, x, y, z, color);
      }
    }
  }

  return voxels;
}

function buildVoxelList(params) {
  const p = { ...DRAGON_GHAST_DEFAULTS, ...params };

  const maxTentacleLength = Math.max(...p.tentacleLengths.flat());
  const bodyBaseY = maxTentacleLength;
  const hornBaseY = bodyBaseY + p.bodyHeight;

  const voxels = buildBodyVoxels(p, bodyBaseY, hornBaseY);

  // Tentacles: 3x3 grid at x,z = 1,4,7 (evenly spaced across the 9-wide/deep
  // body), each a 1x1 column hanging from the body's underside. Lengths come
  // from tentacleLengths so they read as uneven/organic like Ghast's, not a
  // uniform fringe.
  const tentacleXs = [1, 4, 7];
  const tentacleZs = [1, 4, 7];
  for (let xi = 0; xi < 3; xi++) {
    for (let zi = 0; zi < 3; zi++) {
      const length = p.tentacleLengths[xi][zi];
      const x = tentacleXs[xi];
      const z = tentacleZs[zi];
      for (const { dy, color } of tentacleColumn(length, p)) {
        pushVoxel(voxels, x, bodyBaseY + dy, z, color);
      }
    }
  }

  return voxels;
}

export function generateDragonGhastGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...DRAGON_GHAST_DEFAULTS, ...paramsOverride });
}

export function generateDragonGhastMesh(paramsOverride = {}) {
  const p = { ...DRAGON_GHAST_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const voxelSize = p.bodyWidthMeters / p.bodyWidth;
  return voxelsToMesh(voxels, voxelSize, "DragonGhast_Voxel");
}

// Animated-preview variant: body stays one static merged mesh (cheap, and
// matches what generateDragonGhastMesh exports to .glb), but each tentacle
// comes back as its own tiny mesh plus a pivotPosition at its attachment row —
// dragonMain.js parents each mesh under a THREE.Group at that pivot and
// rotates the group, so the tentacle swings from the top like a dangling limb
// instead of moving as a rigid part of one block.
//
// Deliberately NOT what .glb export uses: the Unity pipeline for the single
// merged mesh is already verified working end-to-end (glTF → Blender FBX →
// URP vertex-color shader — see reference-deepspace-project-files memory).
// Splitting the export into multiple nodes for animation is a bigger,
// separate decision than "animate the browser preview," so this rig only
// feeds the preview's animate() loop, not the export button.
export function generateDragonGhastRig(paramsOverride = {}) {
  const p = { ...DRAGON_GHAST_DEFAULTS, ...paramsOverride };
  const voxelSize = p.bodyWidthMeters / p.bodyWidth;
  const maxTentacleLength = Math.max(...p.tentacleLengths.flat());
  const bodyBaseY = maxTentacleLength;
  const hornBaseY = bodyBaseY + p.bodyHeight;

  const bodyMesh = voxelsToMesh(buildBodyVoxels(p, bodyBaseY, hornBaseY), voxelSize, "DragonGhast_Body");

  const tentacleXs = [1, 4, 7];
  const tentacleZs = [1, 4, 7];
  const tentacles = [];
  let index = 0;
  for (let xi = 0; xi < 3; xi++) {
    for (let zi = 0; zi < 3; zi++) {
      const length = p.tentacleLengths[xi][zi];
      const voxels = tentacleColumn(length, p).map(({ dy, color }) => ({ x: 0, y: dy, z: 0, colorHex: color }));
      const mesh = voxelsToMesh(voxels, voxelSize, `DragonGhast_Tentacle_${xi}_${zi}`);
      const lengthT = length / maxTentacleLength; // 0..1, this tentacle's length vs. the longest

      tentacles.push({
        mesh,
        pivotPosition: {
          x: (tentacleXs[xi] + 0.5) * voxelSize,
          y: bodyBaseY * voxelSize,
          z: (tentacleZs[zi] + 0.5) * voxelSize,
        },
        // Longer tentacles read as heavier, so they swing wider but slower —
        // and each gets a fixed phase offset from its grid index (not random)
        // so the sway is reproducible like every other param in this file.
        swayAmplitudeX: 0.04 + 0.12 * lengthT,
        swayAmplitudeZ: 0.03 + 0.08 * lengthT,
        swaySpeed: 1.4 - 0.3 * lengthT,
        swayPhase: index * 0.9,
      });
      index++;
    }
  }

  return { bodyMesh, tentacles };
}
