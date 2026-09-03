import * as THREE from "three";
import { JELLYFISH_SKIN, JELLYFISH_BELLY, JELLYFISH_EYE, JELLYFISH_PUPIL, JELLYFISH_TENTACLE_A, JELLYFISH_TENTACLE_B } from "./palette.js";
import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Fourth Boss Slayer creature, and the second reskin of dragonGhastGenerator.js's
// Ghast silhouette (cubic floating body + a grid of dangling tentacles) — a
// jellyfish's real anatomy already IS "dome + dangling tentacles," so this reuses
// that body plan directly rather than inventing a new one, same way the dragon
// reused it before this. Voxel copy of the reference boss from the Boss Slayer
// web arena-sim prototype (บาส 2026-09-03): squat purple dome, two square red
// glow eyes, dark tentacles — no horns, no snout/mouth (unlike the dragon), since
// the reference has neither.
export const JELLYFISH_BOSS_DEFAULTS = {
  bodyWidth: 9,
  bodyDepth: 9,
  bodyHeight: 6, // squatter than the dragon's 8 — a dome reads flatter than a floating head
  tentacleLengths: [
    [5, 7, 5],
    [6, 8, 6],
    [5, 7, 5],
  ],
  bodyWidthMeters: 3.2,
  skinColorA: JELLYFISH_SKIN[0],
  skinColorB: JELLYFISH_SKIN[1],
  bellyColor: JELLYFISH_BELLY,
  eyeColor: JELLYFISH_EYE,
  pupilColor: JELLYFISH_PUPIL,
  tentacleColorA: JELLYFISH_TENTACLE_A,
  tentacleColorB: JELLYFISH_TENTACLE_B,
};

function skinColorAt(x, z, p) {
  return (x + z) % 2 === 0 ? p.skinColorA : p.skinColorB;
}

function bodyColorAt(x, y, z, p, bodyBaseY, bellyRows) {
  const eyeY = bodyBaseY + p.bodyHeight - 3;
  const eyeXs = [2, p.bodyWidth - 3];
  if (z === 0 && eyeXs.includes(x)) {
    if (y === eyeY + 1) return p.eyeColor;
    if (y === eyeY) return p.pupilColor;
  }
  if (y < bodyBaseY + bellyRows) return p.bellyColor;
  return skinColorAt(x, z, p);
}

// Banded every 2 rows so tentacles read as jointed, same technique
// dragonGhastGenerator.js's tentacleColumn uses, own darker purple tones here.
function tentacleColumn(length, p) {
  const column = [];
  for (let i = 0; i < length; i++) {
    const color = Math.floor(i / 2) % 2 === 0 ? p.tentacleColorA : p.tentacleColorB;
    column.push({ dy: -1 - i, color });
  }
  return column;
}

// Body only — everything except the dangling tentacles. Split out so
// generateJellyfishBossRig can reuse it without also getting tentacles baked
// into the same static mesh, same split dragonGhastGenerator.js's
// buildBodyVoxels uses.
function buildBodyVoxels(p, bodyBaseY) {
  const voxels = [];
  const bellyRows = 2;
  for (let x = 0; x < p.bodyWidth; x++) {
    for (let z = 0; z < p.bodyDepth; z++) {
      for (let y = bodyBaseY; y < bodyBaseY + p.bodyHeight; y++) {
        pushVoxel(voxels, x, y, z, bodyColorAt(x, y, z, p, bodyBaseY, bellyRows));
      }
    }
  }
  return voxels;
}

function buildVoxelList(params) {
  const p = { ...JELLYFISH_BOSS_DEFAULTS, ...params };
  const voxels = [];

  const maxTentacleLength = Math.max(...p.tentacleLengths.flat());
  const bodyBaseY = maxTentacleLength;

  voxels.push(...buildBodyVoxels(p, bodyBaseY));

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

export function generateJellyfishBossGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...JELLYFISH_BOSS_DEFAULTS, ...paramsOverride });
}

export function generateJellyfishBossMesh(paramsOverride = {}) {
  const p = { ...JELLYFISH_BOSS_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const voxelSize = p.bodyWidthMeters / p.bodyWidth;
  return voxelsToMesh(voxels, voxelSize, "JellyfishBoss_Voxel");
}

// Animated-rig variant (บาส 2026-09-03, "อยากให้ทำแอนิเมชั่นใส่หนวดของ
// jellyfish"): body stays one static merged mesh (cheap, matches
// generateJellyfishBossMesh's "static" .glb), but each tentacle comes back
// as its own tiny mesh plus a pivotPosition at its attachment row — same
// split dragonGhastGenerator.js's generateDragonGhastRig uses, so this
// jellyfish sways the exact same way that dragon already does (proven
// technique, not a new one). Kept separate from generateJellyfishBossMesh's
// single merged mesh rather than replacing it, for the same reason: the
// static single-mesh Unity pipeline is confirmed working, the multi-node
// animated export's Blender/FBX round-trip has only been verified for the
// dragon's own rig so far, not this one yet.
export function generateJellyfishBossRig(paramsOverride = {}) {
  const p = { ...JELLYFISH_BOSS_DEFAULTS, ...paramsOverride };
  const voxelSize = p.bodyWidthMeters / p.bodyWidth;
  const maxTentacleLength = Math.max(...p.tentacleLengths.flat());
  const bodyBaseY = maxTentacleLength;

  const bodyMesh = voxelsToMesh(buildBodyVoxels(p, bodyBaseY), voxelSize, "JellyfishBoss_Body");

  const tentacleXs = [1, 4, 7];
  const tentacleZs = [1, 4, 7];
  const tentacles = [];
  let index = 0;
  for (let xi = 0; xi < 3; xi++) {
    for (let zi = 0; zi < 3; zi++) {
      const length = p.tentacleLengths[xi][zi];
      const voxels = tentacleColumn(length, p).map(({ dy, color }) => ({ x: 0, y: dy, z: 0, colorHex: color }));
      const mesh = voxelsToMesh(voxels, voxelSize, `JellyfishBoss_Tentacle_${xi}_${zi}`);
      const lengthT = length / maxTentacleLength; // 0..1, this tentacle's length vs. the longest

      tentacles.push({
        mesh,
        pivotPosition: {
          x: (tentacleXs[xi] + 0.5) * voxelSize,
          y: bodyBaseY * voxelSize,
          z: (tentacleZs[zi] + 0.5) * voxelSize,
        },
        // Same "longer = heavier, swings wider but slower" reasoning as the
        // dragon's tentacles, own amplitude range here — a jellyfish's
        // tentacles are thinner/limper than a dragon's scaled ones, so they
        // get a wider swing (0.06-0.22 vs the dragon's 0.04-0.16) to read as
        // trailing/drifting rather than rigid.
        swayAmplitudeX: 0.06 + 0.16 * lengthT,
        swayAmplitudeZ: 0.05 + 0.11 * lengthT,
        swaySpeed: 1.1 - 0.25 * lengthT,
        swayPhase: index * 0.9,
      });
      index++;
    }
  }

  return { bodyMesh, tentacles };
}

// Single source of truth for tentacle sway — same role as
// dragonGhastGenerator.js's tentacleRotationAt, own function here (not
// shared/imported) since the two creatures' amplitude/speed ranges differ
// and this keeps each file's rig fully self-contained.
function tentacleRotationAt(t, { swayAmplitudeX, swayAmplitudeZ, swaySpeed, swayPhase }) {
  return {
    x: Math.sin(t * swaySpeed + swayPhase) * swayAmplitudeX,
    z: Math.cos(t * swaySpeed * 0.7 + swayPhase) * swayAmplitudeZ,
  };
}

// Assembles generateJellyfishBossRig's parts into an actual THREE.Group
// (body + 9 named tentacle pivots) plus a baked AnimationClip driving those
// pivots' rotation — same structure as
// dragonGhastGenerator.js's assembleDragonGhastAnimatedRig. Shared by the
// browser preview (jellyfishMain.js, which drives the pivots per-frame with
// tentacleRotationAt directly for native-framerate smoothness) and the
// headless batch export (exportAll.mjs).
export function assembleJellyfishBossAnimatedRig(paramsOverride = {}, { durationSeconds = 6, fps = 24 } = {}) {
  const { bodyMesh, tentacles } = generateJellyfishBossRig(paramsOverride);

  const group = new THREE.Group();
  group.name = "JellyfishBoss";
  group.add(bodyMesh);

  const swayingTentacles = tentacles.map(({ mesh, pivotPosition, swayAmplitudeX, swayAmplitudeZ, swaySpeed, swayPhase }, index) => {
    const pivot = new THREE.Group();
    pivot.name = `TentaclePivot_${index}`;
    pivot.position.set(pivotPosition.x, pivotPosition.y, pivotPosition.z);
    pivot.add(mesh);
    group.add(pivot);
    return { pivot, swayAmplitudeX, swayAmplitudeZ, swaySpeed, swayPhase };
  });

  // Rest pose = t = 0, so a viewer that ignores the animation clip still
  // shows tentacles hanging naturally instead of frozen at rotation 0.
  for (const s of swayingTentacles) {
    const r = tentacleRotationAt(0, s);
    s.pivot.rotation.x = r.x;
    s.pivot.rotation.z = r.z;
  }

  const sampleCount = Math.round(durationSeconds * fps) + 1;
  const times = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) times[i] = (i / (sampleCount - 1)) * durationSeconds;

  const tracks = swayingTentacles.map((s) => {
    const values = new Float32Array(sampleCount * 4);
    const q = new THREE.Quaternion();
    const e = new THREE.Euler(0, 0, 0, "XYZ");
    for (let i = 0; i < sampleCount; i++) {
      // Snap the closing frame to t = 0's pose — same "matched start/end
      // frame" loop-without-a-pop trick the dragon's clip uses.
      const sampleT = i === sampleCount - 1 ? 0 : times[i];
      const r = tentacleRotationAt(sampleT, s);
      e.set(r.x, 0, r.z);
      q.setFromEuler(e);
      values.set([q.x, q.y, q.z, q.w], i * 4);
    }
    return new THREE.QuaternionKeyframeTrack(`${s.pivot.name}.quaternion`, times, values);
  });

  const clip = new THREE.AnimationClip("TentacleSway", durationSeconds, tracks);
  return { group, clip, swayingTentacles, tentacleRotationAt };
}
