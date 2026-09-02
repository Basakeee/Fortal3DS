import * as THREE from "three";
import { GLASS, CHROME } from "./palette.js";
import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match every other generator: x = width, y = height, z = depth.
// A single Mirror Path floor cell (see MirrorPathGameManager.cs) — a flat,
// thin slab like coinGenerator's disc, not a tall object: y is the thin axis.
//
// Two nodes, same reasoning as humanGenerator.js's Farmer_Body/Farmer_Shirt
// split: GlassTile_Frame is the fixed vertex-colored bezel border (never
// recolored — the physical edge a player's cursor/foot lands inside).
// GlassTile_Pane is a SEPARATE, uniformly-colored mesh so Unity can retint it
// live via Material.color to match the game's hidden/safe/break/broken/wrong
// cell-state colors (see PaintPathCells/AddBroken in MirrorPathGameManager.cs)
// instead of baking one export per state.
//
// The pane's "glass" read comes from actual voxel-height faceting (a shallow
// 2-tier dome: a full-footprint base ring plus a smaller raised center block)
// rather than any vertex-color shine trick — unlike the frame, the pane's
// vertex color never survives to Unity anyway: its FBX material comes back
// flat grey like every node here, and it's deliberately LEFT on Unity's
// default URP/Lit rather than reassigned to Fortal/VertexColorLit so a script
// can recolor it (see humanGenerator.js's Farmer_Shirt comment for why).
// Only real mesh shape (vertex positions/normals) survives that path, so
// shape is what has to carry the "beveled glass" look here — baking a
// two-tone shimmer into the pane's vertex colors the way gemGenerator/
// coinGenerator do would be dead work, invisible once it reaches Unity.
export const GLASS_TILE_DEFAULTS = {
  tileWidth: 10,
  tileDepth: 10,
  frameThickness: 1,
  paneHeight: 1, // base tier — spans the pane's full footprint
  paneBevelHeight: 1, // raised center tier, stacked on top of paneHeight
  paneBevelInset: 1, // how many voxel columns the raised tier sits in from the pane's own edge
  widthMeters: 0.5, // real-world tile size — tune against the actual Mirror Path grid cell spacing once wired into the scene
  frameColor: CHROME[2], // gunmetal — reads as a physical metal bezel, not glass
  glassColor: GLASS[1],
};

function buildFrameVoxels(p) {
  const voxels = [];
  const frameHeight = p.paneHeight + p.paneBevelHeight; // flush with the pane's tallest point, so the assembly reads as one slab, not a random step
  for (let x = 0; x < p.tileWidth; x++) {
    for (let z = 0; z < p.tileDepth; z++) {
      const onBorder = x < p.frameThickness || x >= p.tileWidth - p.frameThickness || z < p.frameThickness || z >= p.tileDepth - p.frameThickness;
      if (!onBorder) continue;
      for (let y = 0; y < frameHeight; y++) {
        pushVoxel(voxels, x, y, z, p.frameColor);
      }
    }
  }
  return voxels;
}

// Pulled out on its own so buildPaneVoxels and buildShardDefs (the break
// variant, below) split the exact same footprint from one place.
function paneBounds(p) {
  return {
    minX: p.frameThickness,
    maxX: p.tileWidth - p.frameThickness,
    minZ: p.frameThickness,
    maxZ: p.tileDepth - p.frameThickness,
  };
}

function buildPaneVoxels(p) {
  const voxels = [];
  const b = paneBounds(p);
  const bevelMinX = b.minX + p.paneBevelInset;
  const bevelMaxX = b.maxX - p.paneBevelInset;
  const bevelMinZ = b.minZ + p.paneBevelInset;
  const bevelMaxZ = b.maxZ - p.paneBevelInset;
  for (let x = b.minX; x < b.maxX; x++) {
    for (let z = b.minZ; z < b.maxZ; z++) {
      for (let y = 0; y < p.paneHeight; y++) pushVoxel(voxels, x, y, z, p.glassColor);
      const onBevelCore = x >= bevelMinX && x < bevelMaxX && z >= bevelMinZ && z < bevelMaxZ;
      if (!onBevelCore) continue;
      for (let y = p.paneHeight; y < p.paneHeight + p.paneBevelHeight; y++) pushVoxel(voxels, x, y, z, p.glassColor);
    }
  }
  return voxels;
}

function buildVoxelList(params) {
  const p = { ...GLASS_TILE_DEFAULTS, ...params };
  return [...buildFrameVoxels(p), ...buildPaneVoxels(p)];
}

export function generateGlassTileGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...GLASS_TILE_DEFAULTS, ...paramsOverride });
}

// Frame + pane as 2 separate meshes (not merged) — the recolorable-node split
// described above. Returned separately (rather than only as an assembled
// Group) so the break-rig builder below can reuse buildFrameVoxels without
// pulling in a pane it's about to shatter into shards instead.
export function generateGlassTileRig(paramsOverride = {}) {
  const p = { ...GLASS_TILE_DEFAULTS, ...paramsOverride };
  const voxelSize = p.widthMeters / p.tileWidth;
  const frameMesh = voxelsToMesh(buildFrameVoxels(p), voxelSize, "GlassTile_Frame");
  const paneMesh = voxelsToMesh(buildPaneVoxels(p), voxelSize, "GlassTile_Pane");
  return { frameMesh, paneMesh, voxelSize };
}

// Single assembled Group for the gallery preview/static export path — same
// "Unity only cares that the 2 child nodes come through separately" reasoning
// generateFarmerMesh's own comment gives.
export function generateGlassTileMesh(paramsOverride = {}) {
  const { frameMesh, paneMesh } = generateGlassTileRig(paramsOverride);
  const group = new THREE.Group();
  group.name = "GlassTile";
  group.add(frameMesh);
  group.add(paneMesh);
  return group;
}

const SHARD_GRID = 3; // 3x3 split of the pane footprint — fixed, not random, so the break is reproducible like every other param in this repo

// Splits buildPaneVoxels' output into a SHARD_GRID x SHARD_GRID set of local
// voxel lists (coordinates relative to each shard's own pivot at its cell's
// center), the same "local column relative to a pivot" shape
// dragonGhastGenerator.js's tentacleColumn uses for its tentacles.
function buildShardDefs(p) {
  const b = paneBounds(p);
  const paneVoxels = buildPaneVoxels(p);
  const width = b.maxX - b.minX;
  const depth = b.maxZ - b.minZ;
  const cellW = width / SHARD_GRID;
  const cellD = depth / SHARD_GRID;

  const shards = [];
  for (let gx = 0; gx < SHARD_GRID; gx++) {
    for (let gz = 0; gz < SHARD_GRID; gz++) {
      const cellMinX = b.minX + gx * cellW;
      const cellMaxX = gx === SHARD_GRID - 1 ? b.maxX : b.minX + (gx + 1) * cellW;
      const cellMinZ = b.minZ + gz * cellD;
      const cellMaxZ = gz === SHARD_GRID - 1 ? b.maxZ : b.minZ + (gz + 1) * cellD;
      const pivotX = (cellMinX + cellMaxX) / 2;
      const pivotZ = (cellMinZ + cellMaxZ) / 2;

      const localVoxels = [];
      for (const v of paneVoxels) {
        const centerX = v.x + 0.5;
        const centerZ = v.z + 0.5;
        if (centerX < cellMinX || centerX >= cellMaxX || centerZ < cellMinZ || centerZ >= cellMaxZ) continue;
        localVoxels.push({ x: v.x - pivotX, y: v.y, z: v.z - pivotZ, colorHex: v.colorHex });
      }
      if (localVoxels.length === 0) continue; // the bevel's inset corners can leave a grid cell with only base-tier voxels or none at very small tileWidth/tileDepth
      shards.push({ gx, gz, pivotX, pivotZ, voxels: localVoxels });
    }
  }
  return shards;
}

// Frame stays static (the bezel doesn't break) + N shard meshes, each keeping
// the pane's own uniform glassColor (a shard needs no separate material swap
// to show wrongCellColor the instant it breaks, before it finishes falling —
// it's already on the same recolorable material the intact pane was).
export function generateGlassTileBreakRig(paramsOverride = {}) {
  const p = { ...GLASS_TILE_DEFAULTS, ...paramsOverride };
  const voxelSize = p.widthMeters / p.tileWidth;
  const frameMesh = voxelsToMesh(buildFrameVoxels(p), voxelSize, "GlassTile_Frame");

  const shardDefs = buildShardDefs(p);
  const shards = shardDefs.map(({ gx, gz, pivotX, pivotZ, voxels }, index) => {
    const mesh = voxelsToMesh(voxels, voxelSize, `GlassTile_Shard_${index}`);

    // Fixed (not random) per-shard fall direction/spin, derived from this
    // shard's own grid position relative to the tile center — same
    // "reproducible, not random" rule dragonGhastGenerator's tentacle sway
    // phase follows. Corner shards kick out wider than edge/center shards,
    // like real glass fracture lines radiating from an impact point.
    const centerOffsetX = gx - (SHARD_GRID - 1) / 2;
    const centerOffsetZ = gz - (SHARD_GRID - 1) / 2;
    const outward = Math.hypot(centerOffsetX, centerOffsetZ) || 0.001;

    return {
      mesh,
      pivotPosition: { x: pivotX * voxelSize, y: 0, z: pivotZ * voxelSize },
      dirX: centerOffsetX / outward,
      dirZ: centerOffsetZ / outward,
      travelMeters: 0.12 + 0.05 * outward,
      spinAxis: { x: centerOffsetZ, y: 1, z: -centerOffsetX }, // tumbles around an axis perpendicular to its own outward direction
      spinTurns: 0.6 + 0.15 * outward,
      fallMeters: 0.35,
    };
  });

  return { frameMesh, shards, voxelSize };
}

// Single source of truth for one shard's break motion at t (0..1 normalized
// progress, NOT seconds) — shared by the live preview and the baked export
// clip below, same reasoning dragonGhastGenerator.js's tentacleRotationAt
// gives for why sway/motion formulas must live in exactly one place.
function shardBreakTransformAt(t, shard) {
  const ease = t * t; // accelerates like something actually falling, not a linear slide
  return {
    position: {
      x: shard.dirX * shard.travelMeters * t,
      y: -shard.fallMeters * ease,
      z: shard.dirZ * shard.travelMeters * t,
    },
    rotation: {
      x: shard.spinAxis.x * shard.spinTurns * t * Math.PI * 2,
      y: shard.spinAxis.y * shard.spinTurns * t * Math.PI * 2,
      z: shard.spinAxis.z * shard.spinTurns * t * Math.PI * 2,
    },
  };
}

// Assembles generateGlassTileBreakRig's parts into an actual THREE.Group
// (static frame + N named shard pivots) plus a baked AnimationClip driving
// those pivots — the multi-node, animatable counterpart to
// generateGlassTileMesh's intact 2-node group. Shared by the browser preview
// (glassTileMain.js, which drives the pivots per-frame with
// shardBreakTransformAt directly instead of the baked samples) and the
// headless batch export (exportAll.mjs).
//
// Unlike assembleDragonGhastAnimatedRig's TentacleSway clip, this is a
// ONE-SHOT fall, not a loop: shardBreakTransformAt is sampled straight from
// t=0 (intact) to t=1 (settled, fallen away) with no closing-frame snap back
// to the rest pose. That means the Unity-side playback setup can't just copy
// the dragon's looping Legacy Animation component — this clip needs its wrap
// mode set to Once/ClampForever (or an Animator state with Loop Time off),
// triggered on break rather than always running. See glassTileMain.js's
// export-break log message for the same note at export time.
export function assembleGlassTileBreakRig(paramsOverride = {}, { durationSeconds = 0.7, fps = 30 } = {}) {
  const { frameMesh, shards } = generateGlassTileBreakRig(paramsOverride);

  const group = new THREE.Group();
  group.name = "GlassTileBreak";
  group.add(frameMesh);

  const fallingShards = shards.map(({ mesh, pivotPosition, ...motion }, index) => {
    const pivot = new THREE.Group();
    pivot.name = `GlassTile_ShardPivot_${index}`;
    pivot.position.set(pivotPosition.x, pivotPosition.y, pivotPosition.z);
    pivot.add(mesh);
    group.add(pivot);
    return { pivot, ...motion };
  });

  const sampleCount = Math.round(durationSeconds * fps) + 1;
  const times = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) times[i] = (i / (sampleCount - 1)) * durationSeconds;

  const tracks = [];
  for (const s of fallingShards) {
    const posValues = new Float32Array(sampleCount * 3);
    const rotValues = new Float32Array(sampleCount * 4);
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; i < sampleCount; i++) {
      const progress = i / (sampleCount - 1); // 0..1 straight through - no loop-closing snap back to t=0
      const transform = shardBreakTransformAt(progress, s);
      posValues.set([transform.position.x, transform.position.y, transform.position.z], i * 3);
      e.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
      q.setFromEuler(e);
      rotValues.set([q.x, q.y, q.z, q.w], i * 4);
    }
    tracks.push(new THREE.VectorKeyframeTrack(`${s.pivot.name}.position`, times, posValues));
    tracks.push(new THREE.QuaternionKeyframeTrack(`${s.pivot.name}.quaternion`, times, rotValues));
  }

  const clip = new THREE.AnimationClip("GlassBreak", durationSeconds, tracks);
  return { group, clip, fallingShards, shardBreakTransformAt };
}
