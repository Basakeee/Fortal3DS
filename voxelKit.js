import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Shared building blocks for every voxel car preset — keeps each car's generator
// focused on *shape*, not on merge/export mechanics.

export function pushVoxel(voxels, x, y, z, colorHex) {
  voxels.push({ x, y, z, colorHex });
}

// Voxel disc in the Y-Z plane (wheel axle runs along X), offset outward from the
// body side by `wheelWidth`. Shared across every car preset since wheels don't
// vary by car identity the way bodywork does.
export function pushWheel(voxels, { side, width, wheelZ, wheelRadius, wheelWidth, tireColor, rimColor }) {
  const rimRadius = wheelRadius * 0.4;
  for (let dz = -wheelRadius; dz <= wheelRadius; dz++) {
    for (let dy = -wheelRadius; dy <= wheelRadius; dy++) {
      if (dz * dz + dy * dy > wheelRadius * wheelRadius) continue;
      const color = dz * dz + dy * dy <= rimRadius * rimRadius ? rimColor : tireColor;
      const y = wheelRadius + dy;
      const z = wheelZ + dz;
      // Flush with the body's outer edge column (not offset past it) — an outward
      // offset left an empty gap column between the body and the wheel, which read
      // as the wheels floating apart from the body rather than tucked under it.
      for (let w = 0; w < wheelWidth; w++) {
        const x = side === -1 ? w : width - 1 - w;
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
