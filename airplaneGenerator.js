import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match the cars: x = width, z = length (nose at z = 0), y = height.
// A blocky prop fighter, not any specific real aircraft — same "generic
// basic" tier as the sedan, not the AE86-level specific replica. No landing
// gear: at this voxel resolution thin gear legs read as noise, not detail.
export const PROP_FIGHTER_DEFAULTS = {
  fuselageLength: 14,
  fuselageWidth: 3,
  fuselageHeight: 3,
  noseLength: 2, // where the nose accent band sits, just behind the propeller
  wingSpan: 16, // total wingtip-to-wingtip width, including the fuselage it crosses
  wingChord: 3, // wing depth along z
  wingThickness: 1,
  wingZStart: 6, // where the wing's leading edge sits along the fuselage
  tailZMargin: 1, // gap between the tailplane and the very tail of the fuselage
  tailFinHeight: 3,
  tailPlaneSpan: 8,
  tailChord: 2,
  canopyLength: 3,
  canopyHeight: 1,
  canopyZStart: 3,
  propBladeLength: 2,
  fuselageLengthMeters: 3.6,
  bodyColor: 0xc0c0c8, // silver (BODY_PAINTS)
  stripeColor: 0xb22222, // candy red (BODY_PAINTS) — nose/tail accent
  glassColor: 0x1b2a38, // GLASS[0]
  darkColor: 0x1a1a1a, // GREYS — prop, tail fin
};

function buildVoxelList(params) {
  const p = { ...PROP_FIGHTER_DEFAULTS, ...params };
  const voxels = [];

  // Fuselage: a blocky tube, nose at z = 0. No taper — a red band stands in
  // for the shape the voxel grid is too coarse to sculpt cleanly.
  for (let z = 0; z < p.fuselageLength; z++) {
    const isTailBand = z === p.fuselageLength - 1;
    for (let x = 0; x < p.fuselageWidth; x++) {
      for (let y = 0; y < p.fuselageHeight; y++) {
        pushVoxel(voxels, x, y, z, isTailBand ? p.stripeColor : p.bodyColor);
      }
    }
  }

  // Nose accent band, same reasoning as the tail band above.
  for (let x = 0; x < p.fuselageWidth; x++) {
    for (let y = 0; y < p.fuselageHeight; y++) {
      pushVoxel(voxels, x, y, p.noseLength, p.stripeColor);
    }
  }

  // Canopy: raised glass block on top, mid-fuselage.
  for (let z = p.canopyZStart; z < p.canopyZStart + p.canopyLength; z++) {
    for (let x = 0; x < p.fuselageWidth; x++) {
      for (let y = p.fuselageHeight; y < p.fuselageHeight + p.canopyHeight; y++) {
        pushVoxel(voxels, x, y, z, p.glassColor);
      }
    }
  }

  // Wings: one flat slab crossing the fuselage, centered on it — span extends
  // symmetrically into negative x and past fuselageWidth.
  const wingXStart = -Math.floor((p.wingSpan - p.fuselageWidth) / 2);
  const wingXEnd = p.fuselageWidth + Math.floor((p.wingSpan - p.fuselageWidth) / 2);
  const wingY = Math.floor(p.fuselageHeight / 2);
  for (let x = wingXStart; x < wingXEnd; x++) {
    for (let z = p.wingZStart; z < p.wingZStart + p.wingChord; z++) {
      for (let y = wingY; y < wingY + p.wingThickness; y++) {
        pushVoxel(voxels, x, y, z, p.bodyColor);
      }
    }
  }

  // Tailplane: the wing's rear counterpart, smaller, at the tail.
  const tailZStart = p.fuselageLength - p.tailZMargin - p.tailChord;
  const tailXStart = -Math.floor((p.tailPlaneSpan - p.fuselageWidth) / 2);
  const tailXEnd = p.fuselageWidth + Math.floor((p.tailPlaneSpan - p.fuselageWidth) / 2);
  for (let x = tailXStart; x < tailXEnd; x++) {
    for (let z = tailZStart; z < tailZStart + p.tailChord; z++) {
      pushVoxel(voxels, x, wingY, z, p.bodyColor);
    }
  }

  // Tail fin: vertical fin above the fuselage, at the tail.
  const finX = Math.floor((p.fuselageWidth - 1) / 2);
  for (let i = 0; i < p.tailFinHeight; i++) {
    for (let z = tailZStart; z < tailZStart + p.tailChord; z++) {
      pushVoxel(voxels, finX, p.fuselageHeight + i, z, p.darkColor);
    }
  }

  // Propeller: a 2-blade cross ahead of the nose (x-y plane) — reads as a
  // static prop silhouette rather than attempting a spin blur.
  const hubX = Math.floor(p.fuselageWidth / 2);
  const hubY = Math.floor(p.fuselageHeight / 2);
  for (let i = -p.propBladeLength; i <= p.propBladeLength; i++) {
    if (i === 0) continue;
    pushVoxel(voxels, hubX, hubY + i, -1, p.darkColor); // vertical blade
    pushVoxel(voxels, hubX + i, hubY, -1, p.darkColor); // horizontal blade
  }
  pushVoxel(voxels, hubX, hubY, -1, p.darkColor); // hub

  return voxels;
}

export function generatePropFighterMesh(paramsOverride = {}) {
  const p = { ...PROP_FIGHTER_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const voxelSize = p.fuselageLengthMeters / p.fuselageLength;
  return voxelsToMesh(voxels, voxelSize, "PropFighter_Voxel");
}
