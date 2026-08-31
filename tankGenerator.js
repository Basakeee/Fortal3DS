import { pushVoxel, voxelsToMesh } from "./voxelKit.js";

// Grid axes match the cars: x = width, z = length (front at z = 0), y = height
// — reusing that convention (rather than a tank-specific one) is what lets
// this share palette colors and read consistently next to the vehicle presets.
export const BATTLE_TANK_DEFAULTS = {
  hullLength: 14,
  hullWidth: 7,
  hullHeight: 4,
  turretWidth: 5,
  turretDepth: 5,
  turretHeight: 3,
  turretZOffset: 2, // turret sits back from the hull's rear edge, not dead-centered
  barrelLength: 8,
  barrelThickness: 1,
  trackWidth: 1, // how far each track protrudes past the hull side
  trackHeight: 3,
  roadWheelRadius: 1,
  roadWheelGap: 2, // spacing between road-wheel centers along the track
  hullLengthMeters: 3.4,
  hullColor: 0x556b2f, // olive green (BODY_PAINTS)
  darkColor: 0x2f3a4a, // gunmetal (BODY_PAINTS) — tracks, barrel
  trimColor: 0xc9b896, // tan (BODY_PAINTS) — road wheels, turret band
};

function buildVoxelList(params) {
  const p = { ...BATTLE_TANK_DEFAULTS, ...params };
  const voxels = [];

  const trackBaseY = 0;
  const hullBaseY = p.trackHeight;

  // Tracks: two solid strips along the full hull length, protruding past both
  // sides — this alone is what reads as tracked rather than wheeled, even
  // before the road wheels go on top of it.
  for (const side of [-1, 1]) {
    const xStart = side === -1 ? -p.trackWidth : p.hullWidth;
    for (let dx = 0; dx < p.trackWidth; dx++) {
      for (let z = 0; z < p.hullLength; z++) {
        for (let y = trackBaseY; y < trackBaseY + p.trackHeight; y++) {
          pushVoxel(voxels, xStart + dx, y, z, p.darkColor);
        }
      }
    }
  }

  // Road wheels: small discs let into the outer face of each track, spaced
  // evenly along its length — same y-z disc math as voxelKit's pushWheel, but
  // walked over a row of positions instead of one fixed wheelZ.
  for (const side of [-1, 1]) {
    const wheelX = side === -1 ? -p.trackWidth : p.hullWidth + p.trackWidth - 1;
    const wheelY = trackBaseY + p.roadWheelRadius;
    for (let wz = p.roadWheelRadius; wz < p.hullLength - p.roadWheelRadius; wz += p.roadWheelGap) {
      for (let dz = -p.roadWheelRadius; dz <= p.roadWheelRadius; dz++) {
        for (let dy = -p.roadWheelRadius; dy <= p.roadWheelRadius; dy++) {
          if (dz * dz + dy * dy > p.roadWheelRadius * p.roadWheelRadius) continue;
          pushVoxel(voxels, wheelX, wheelY + dy, wz + dz, p.trimColor);
        }
      }
    }
  }

  // Hull: solid slab between the tracks.
  for (let x = 0; x < p.hullWidth; x++) {
    for (let z = 0; z < p.hullLength; z++) {
      for (let y = hullBaseY; y < hullBaseY + p.hullHeight; y++) {
        pushVoxel(voxels, x, y, z, p.hullColor);
      }
    }
  }

  // Turret: smaller box on top, set back toward the rear so the barrel has
  // somewhere to overhang the nose without the turret itself sticking out front.
  const turretXStart = Math.floor((p.hullWidth - p.turretWidth) / 2);
  const turretZStart = p.hullLength - p.turretZOffset - p.turretDepth;
  const turretBaseY = hullBaseY + p.hullHeight;
  for (let x = turretXStart; x < turretXStart + p.turretWidth; x++) {
    for (let z = turretZStart; z < turretZStart + p.turretDepth; z++) {
      for (let y = turretBaseY; y < turretBaseY + p.turretHeight; y++) {
        const isTrimBand = y === turretBaseY;
        pushVoxel(voxels, x, y, z, isTrimBand ? p.trimColor : p.hullColor);
      }
    }
  }

  // Barrel: protrudes from the turret's front face toward z = 0 (forward),
  // centered on the turret.
  const barrelXStart = turretXStart + Math.floor((p.turretWidth - p.barrelThickness) / 2);
  const barrelY = turretBaseY + Math.floor(p.turretHeight / 2);
  for (let dz = 1; dz <= p.barrelLength; dz++) {
    const z = turretZStart - dz;
    for (let dx = 0; dx < p.barrelThickness; dx++) {
      for (let dy = 0; dy < p.barrelThickness; dy++) {
        pushVoxel(voxels, barrelXStart + dx, barrelY + dy, z, p.darkColor);
      }
    }
  }

  return voxels;
}

export function generateBattleTankMesh(paramsOverride = {}) {
  const p = { ...BATTLE_TANK_DEFAULTS, ...paramsOverride };
  const voxels = buildVoxelList(p);
  const voxelSize = p.hullLengthMeters / p.hullLength;
  return voxelsToMesh(voxels, voxelSize, "BattleTank_Voxel");
}
