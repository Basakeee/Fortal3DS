import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match every other generator: x = width, y = height, z = depth.
// Not a boss — a small collectible pickup: the item players grab to attack
// the boss (see BossSlayerGameManager.cs's spotDefs, which spawns one of
// these per pickup type today as a flat UI circle). Deliberately simple: a
// stepped bipyramid (wide middle "girdle," flat top "table" facet, tapered
// point at the bottom) rather than a fully faceted cut gem — this reads as
// "gem" at pickup size from across a wall display, which is all it needs to do.
export const GEM_DEFAULTS = {
  girth: 5, // width/depth at the widest middle row (odd, so it centers on a single column)
  pavilionHeight: 2, // rows from the middle down to the bottom point
  crownHeight: 1, // rows from the middle up to the flat top facet
  heightMeters: 0.3, // small pickup scale, nowhere near boss scale
  gemColor: 0xff4d4d, // default red — see GEM_PRESETS for the actual per-pickup-type colors
  sparkleColor: 0xffffff,
};

// One entry per BossSlayerGameManager.cs pickup type (spotDefs), colors
// converted from that file's own Color(r,g,b,a) values so the gem reads as
// the same pickup it already is, not a new unrelated color scheme.
export const GEM_PRESETS = {
  attack: { gemColor: 0xff4d4d }, // "โจมตี" — Color(1, 0.30, 0.30)
  heal: { gemColor: 0x4fe08a }, // "ดูดเลือด" — Color(0.31, 0.88, 0.54)
  stun: { gemColor: 0xffd13d }, // "ทุบสตัน" — Color(1, 0.82, 0.24)
  ultimate: { gemColor: 0x59a6ff }, // "ชาร์จอัลติ" — Color(0.35, 0.65, 1)
};

// Lightens a hex color toward white by `amount` (0-1) — derives the gem's
// lighter facet tone from whatever gemColor was actually passed in, rather
// than hand-picking a second color per preset, which wouldn't work for a
// custom color a caller passes that isn't one of GEM_PRESETS.
function lighten(hex, amount) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

function buildVoxelList(params) {
  const p = { ...GEM_DEFAULTS, ...params };
  const voxels = [];
  const facetColorB = lighten(p.gemColor, 0.35);

  const maxHalf = Math.floor(p.girth / 2);
  const yTop = p.crownHeight;
  const yBottom = -p.pavilionHeight;

  // Each row's half-width shrinks by one voxel per row away from the middle
  // (y = 0, the girdle) — the same "kinked/tapered" technique the boss
  // presets use for horns and fins, just applied on two axes at once to get
  // a stepped-pyramid silhouette instead of a single ridge.
  for (let y = yBottom; y <= yTop; y++) {
    const inset = Math.abs(y);
    const half = Math.max(0, maxHalf - inset);
    for (let x = -half; x <= half; x++) {
      for (let z = -half; z <= half; z++) {
        // Single bright voxel at the center of the top facet — a fixed
        // "glint" mark, same reasoning as the boss presets' single-voxel eye
        // highlights: a color cue standing in for a shape too fine for this
        // resolution to sculpt.
        const isSparkle = y === yTop && x === 0 && z === 0 && half > 0;
        const color = isSparkle ? p.sparkleColor : (x + y + z) % 2 === 0 ? p.gemColor : facetColorB;
        pushVoxel(voxels, x, y, z, color);
      }
    }
  }

  return voxels;
}

export function generateGemGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...GEM_DEFAULTS, ...paramsOverride });
}

export function generateGemMesh(paramsOverride = {}) {
  const p = { ...GEM_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const totalRows = p.pavilionHeight + p.crownHeight + 1;
  const voxelSize = p.heightMeters / totalRows;
  return voxelsToMesh(voxels, voxelSize, "Gem_Voxel");
}
