import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match every other generator: x = width, y = height, z = depth.
// A bounty-reward pickup for the (not yet built) Bounty Hunter game — a flat
// voxel DISC, not a cube-faced block: silhouette is decided by a distance
// test from the center column (d <= radius), same technique treeGenerator's
// canopy uses to read as round from any angle instead of looking octagonal.
// Thin on Y and wide on X/Z on purpose — see coinMain.js / the Unity-side
// spin script for why: rotating around Y is what makes it read as "a coin
// spinning face-on-edge-on-face," the same way a flipped coin looks.
export const COIN_DEFAULTS = {
  radius: 6, // voxels, center to edge — footprint is (radius*2+1) voxels wide
  thickness: 2, // voxels tall — stays thin/flat, this is a disc, not a cylinder
  diameterMeters: 0.3, // pickup scale, matches gemGenerator's heightMeters
  coinColor: 0xd9a441, // default gold — see COIN_PRESETS for gold/silver/bronze tiers
  rimColor: null, // null = derive from coinColor (see shade()) instead of a fixed tone
  emblemColor: null, // null = derive from coinColor
};

// Typical bounty/reward tiers — the natural fit for a game literally called
// Bounty Hunter, same role GEM_PRESETS plays for Boss Slayer's pickup types.
export const COIN_PRESETS = {
  gold: { coinColor: 0xd9a441 },
  silver: { coinColor: 0xc0c0c8 },
  bronze: { coinColor: 0xb5651d },
};

// Shades a hex color toward black (amount < 0) or white (amount > 0) by
// |amount| (0-1) — derives the rim/emblem tones from whatever coinColor was
// actually passed in, same reasoning as gemGenerator's lighten(), so a custom
// coinColor still gets correct rim/emblem shading instead of only the three
// presets working right.
function shade(hex, amount) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  const mix = (c) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

function buildVoxelList(params) {
  const p = { ...COIN_DEFAULTS, ...params };
  const voxels = [];
  const rimColor = p.rimColor ?? shade(p.coinColor, -0.35);
  const emblemColor = p.emblemColor ?? shade(p.coinColor, 0.45);
  const faceShineColor = shade(p.coinColor, 0.15);

  const r = p.radius;
  const rimBand = Math.max(1, Math.round(r * 0.18)); // outermost ring reads as the coin's milled edge
  const emblemRadius = Math.max(1, Math.round(r * 0.4)); // raised-looking center stamp/boss

  for (let y = 0; y < p.thickness; y++) {
    for (let x = -r; x <= r; x++) {
      for (let z = -r; z <= r; z++) {
        const d = Math.sqrt(x * x + z * z);
        if (d > r) continue; // circular silhouette, not a square block

        let color;
        if (d > r - rimBand) {
          color = rimColor;
        } else if (d <= emblemRadius) {
          color = emblemColor;
        } else {
          // Two-tone shimmer across the face — same checkerboard trick
          // gemGenerator uses for its facets, reads as an engraved surface
          // instead of one flat color under the wall display's light.
          color = (x + y + z) % 2 === 0 ? p.coinColor : faceShineColor;
        }
        pushVoxel(voxels, x, y, z, color);
      }
    }
  }

  return voxels;
}

export function generateCoinGeometry(paramsOverride = {}) {
  return buildVoxelList({ ...COIN_DEFAULTS, ...paramsOverride });
}

export function generateCoinMesh(paramsOverride = {}) {
  const p = { ...COIN_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const diameterVoxels = p.radius * 2 + 1;
  const voxelSize = p.diameterMeters / diameterVoxels;
  return voxelsToMesh(voxels, voxelSize, "Coin_Voxel");
}
