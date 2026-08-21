import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { GLTFExporter } from "https://unpkg.com/three@0.160.0/examples/jsm/exporters/GLTFExporter.js";

const log = (msg) => (document.getElementById("log").textContent = msg);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(2, 1.5, 2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

new OrbitControls(camera, renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(3, 4, 2);
scene.add(sun);

// 1x1x1 meter box — box UVs are built-in and clean, so this run isolates
// the export/import pipeline from any geometry-generation technique.
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x4a90d9, roughness: 0.6, metalness: 0.1 });
const mesh = new THREE.Mesh(geometry, material);
mesh.name = "PocCrate_1m";
scene.add(mesh);

const grid = new THREE.GridHelper(5, 5);
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
      a.download = "poc_crate.glb";
      a.click();
      URL.revokeObjectURL(url);
      log("Exported poc_crate.glb — check scale/normals/material after importing into Unity.");
    },
    (error) => log("Export failed: " + error),
    { binary: true }
  );
});
