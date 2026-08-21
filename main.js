import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { generateCar90sMesh } from "./carGenerator.js";

const log = (msg) => (document.getElementById("log").textContent = msg);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(3, 4, 2);
scene.add(sun);

const mesh = generateCar90sMesh();
scene.add(mesh);

// Frame the car regardless of voxelSize/length changes, instead of a hardcoded camera spot.
mesh.geometry.computeBoundingSphere();
const { center, radius } = mesh.geometry.boundingSphere;
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(center);
camera.position.set(center.x + radius * 1.6, center.y + radius * 1.2, center.z + radius * 1.6);
controls.update();

const grid = new THREE.GridHelper(radius * 6, 20);
grid.position.y = 0;
scene.add(grid);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById("export").addEventListener("click", () => {
  const exporter = new GLTFExporter();
  exporter.parse(
    mesh,
    (result) => {
      const blob = new Blob([result], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "car_90s_voxel.glb";
      a.click();
      URL.revokeObjectURL(url);
      log("Exported car_90s_voxel.glb — check scale/vertex colors after importing into Unity (needs a vertex-color-capable shader, e.g. URP/Lit).");
    },
    (error) => log("Export failed: " + error),
    { binary: true }
  );
});
