import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Shared building blocks for every voxel car preset — keeps each car's generator
// focused on *shape*, not on merge/export mechanics.

export function pushVoxel(voxels, x, y, z, colorHex) {
  voxels.push({ x, y, z, colorHex });
}

function cellKey(x, y, z) {
  return `${x},${y},${z}`;
}

export function makeOccupancy() {
  return new Set();
}

// Voxel disc in the Y-Z plane (wheel axle runs along X). Its thickness (wheelWidth)
// straddles the body's edge column — half embedded in the fender, half poking out
// past it — the way a real tire bulges past the bodywork rather than either
// floating outside it (a visible gap) or sitting fully flush/hidden inside it.
// `occupied` records every cell the wheel fills, so pushRockerFill can skip them.
export function pushWheel(voxels, occupied, { side, width, wheelZ, wheelRadius, wheelWidth, tireColor, rimColor }) {
  const rimRadius = wheelRadius * 0.4;
  const edgeX = side === -1 ? 0 : width;
  const inboardColumns = Math.floor(wheelWidth / 2);
  for (let dz = -wheelRadius; dz <= wheelRadius; dz++) {
    for (let dy = -wheelRadius; dy <= wheelRadius; dy++) {
      if (dz * dz + dy * dy > wheelRadius * wheelRadius) continue;
      const color = dz * dz + dy * dy <= rimRadius * rimRadius ? rimColor : tireColor;
      const y = wheelRadius + dy;
      const z = wheelZ + dz;
      for (let w = 0; w < wheelWidth; w++) {
        const x = edgeX - inboardColumns + w;
        occupied.add(cellKey(x, y, z));
        pushVoxel(voxels, x, y, z, color);
      }
    }
  }
}

// Fills the rocker/sill panel between the wheels (bounded by z/y range, full body
// width) so the underside reads as one continuous panel with wheel-arch cutouts —
// without this, the space between the wheels is empty and the wheels read as
// separate discs "floating" apart from each other and from the body above.
// Skips any cell a wheel already occupies to avoid two coincident, z-fighting cubes.
export function pushRockerFill(voxels, occupied, { width, minZ, maxZ, minY, maxY, color }) {
  for (let z = minZ; z < maxZ; z++) {
    for (let x = 0; x < width; x++) {
      for (let y = minY; y < maxY; y++) {
        if (occupied.has(cellKey(x, y, z))) continue;
        pushVoxel(voxels, x, y, z, color);
      }
    }
  }
}

export function voxelsToGeometry(voxels, voxelSize) {
  const geometries = voxels.map(({ x, y, z, colorHex }) => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(x + 0.5, y + 0.5, z + 0.5);
    const color = new THREE.Color(colorHex);
    const colors = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < geo.attributes.position.count; i++) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  });

  const merged = mergeGeometries(geometries, false);
  merged.scale(voxelSize, voxelSize, voxelSize);
  geometries.forEach((g) => g.dispose());
  return merged;
}

export function voxelsToMesh(voxels, voxelSize, name) {
  const geometry = voxelsToGeometry(voxels, voxelSize);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.15 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  return mesh;
}
