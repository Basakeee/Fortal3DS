import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { generateHumanMesh, HUMAN_PRESETS } from "./humanGenerator.js";
import { SHIRT_COLORS } from "./palette.js";

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

// 2m/1m reference gridlines to match the arena sim's own height ruler, so the
// preset heights (1.7 / 1.58 / 1.2 m) can be eyeballed against something familiar.
const grid = new THREE.GridHelper(4, 8);
scene.add(grid);

const controls = new OrbitControls(camera, renderer.domElement);

let mesh = null;
let currentPreset = "male";
let currentShirt = SHIRT_COLORS[0];

function rebuild() {
  if (mesh) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
  mesh = generateHumanMesh({ ...HUMAN_PRESETS[currentPreset], shirtColor: currentShirt });
  scene.add(mesh);

  mesh.geometry.computeBoundingSphere();
  const { center, radius } = mesh.geometry.boundingSphere;
  controls.target.copy(center);
  camera.position.set(center.x + radius * 2.2, center.y + radius * 0.6, center.z + radius * 2.2);
  controls.update();
}

const presetLabels = { male: "ผู้ชาย 170", female: "ผู้หญิง 158", child: "เด็ก 120" };
const presetsEl = document.getElementById("presets");
for (const key of Object.keys(HUMAN_PRESETS)) {
  const btn = document.createElement("button");
  btn.textContent = presetLabels[key];
  btn.className = key === currentPreset ? "active" : "";
  btn.addEventListener("click", () => {
    currentPreset = key;
    for (const b of presetsEl.children) b.classList.remove("active");
    btn.classList.add("active");
    rebuild();
  });
  presetsEl.appendChild(btn);
}

const shirtsEl = document.getElementById("shirts");
for (const color of SHIRT_COLORS) {
  const btn = document.createElement("button");
  btn.className = "swatch" + (color === currentShirt ? " active" : "");
  btn.style.background = "#" + color.toString(16).padStart(6, "0");
  btn.addEventListener("click", () => {
    currentShirt = color;
    for (const b of shirtsEl.children) b.classList.remove("active");
    btn.classList.add("active");
    rebuild();
  });
  shirtsEl.appendChild(btn);
}

rebuild();

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
      a.download = `human_${currentPreset}_voxel.glb`;
      a.click();
      URL.revokeObjectURL(url);
      log(`Exported human_${currentPreset}_voxel.glb — check scale/vertex colors after importing into Unity (needs a vertex-color shader, e.g. URP/Lit).`);
    },
    (error) => log("Export failed: " + error),
    { binary: true }
  );
});
