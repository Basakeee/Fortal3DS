import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

import { generateAE86TruenoMesh } from "./ae86Generator.js";
import { generateSedan90sMesh } from "./carGenerator.js";
import { generateHumanMesh, HUMAN_PRESETS } from "./humanGenerator.js";
import { generateDragonGhastMesh } from "./dragonGhastGenerator.js";
import { generateDemonBossMesh } from "./demonBossGenerator.js";
import { generatePropFighterMesh } from "./airplaneGenerator.js";
import { generateBattleTankMesh } from "./tankGenerator.js";
import { generateOakTreeMesh } from "./treeGenerator.js";
import { generateSimpleTableMesh } from "./tableGenerator.js";

const log = (msg) => (document.getElementById("log").textContent = msg);

// Every preset the gallery can generate, grouped the way index.html renders
// them. Each entry is self-contained (generate + export filename), so adding
// a new preset later is "add one entry here" — the render/rebuild/export
// logic below never needs to change per-preset.
const HUMAN_LABELS = { male: "ผู้ชาย 170", female: "ผู้หญิง 158", child: "เด็ก 120" };
const PRESET_GROUPS = [
  {
    label: "รถยนต์",
    presets: [
      { key: "ae86", label: "AE86 Trueno", generate: () => generateAE86TruenoMesh(), filename: "ae86_trueno_voxel.glb" },
      { key: "sedan", label: "Sedan 90s", generate: () => generateSedan90sMesh(), filename: "sedan_90s_voxel.glb" },
    ],
  },
  {
    label: "เครื่องบิน",
    presets: [{ key: "propfighter", label: "Prop Fighter", generate: () => generatePropFighterMesh(), filename: "prop_fighter_voxel.glb" }],
  },
  {
    label: "รถถัง",
    presets: [{ key: "tank", label: "Battle Tank", generate: () => generateBattleTankMesh(), filename: "battle_tank_voxel.glb" }],
  },
  {
    label: "ต้นไม้",
    presets: [{ key: "tree", label: "Oak Tree", generate: () => generateOakTreeMesh(), filename: "oak_tree_voxel.glb" }],
  },
  {
    label: "โต๊ะ",
    presets: [{ key: "table", label: "Simple Table", generate: () => generateSimpleTableMesh(), filename: "simple_table_voxel.glb" }],
  },
  {
    label: "คน",
    presets: Object.keys(HUMAN_PRESETS).map((key) => ({
      key: `human_${key}`,
      label: HUMAN_LABELS[key],
      generate: () => generateHumanMesh(HUMAN_PRESETS[key]),
      filename: `human_${key}_voxel.glb`,
    })),
  },
  {
    label: "บอส",
    presets: [
      { key: "dragon", label: "Dragon Ghast Boss", generate: () => generateDragonGhastMesh(), filename: "dragon_ghast_boss_voxel.glb" },
      { key: "demon", label: "Demon Boss", generate: () => generateDemonBossMesh(), filename: "demon_boss_voxel.glb" },
    ],
  },
];
const ALL_PRESETS = PRESET_GROUPS.flatMap((g) => g.presets);

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

const controls = new OrbitControls(camera, renderer.domElement);

let grid = null;
let mesh = null;
let currentPreset = ALL_PRESETS[0];

// Rebuilds the whole scene around whichever preset is current — same
// dispose-then-regenerate pattern humanMain.js already used for switching
// between human presets, just generalized to any generator in ALL_PRESETS
// instead of one hardcoded family.
function rebuild() {
  if (mesh) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
  if (grid) scene.remove(grid);

  mesh = currentPreset.generate();
  scene.add(mesh);

  // Frame the camera from the mesh's own bounding sphere so wildly different
  // preset sizes (a table vs. a dragon boss) don't need per-preset camera tuning.
  mesh.geometry.computeBoundingSphere();
  const { center, radius } = mesh.geometry.boundingSphere;
  controls.target.copy(center);
  camera.position.set(center.x + radius * 1.8, center.y + radius * 0.7, center.z + radius * 1.8);
  controls.update();

  grid = new THREE.GridHelper(radius * 6, 20);
  scene.add(grid);
}

const groupsEl = document.getElementById("groups");
for (const group of PRESET_GROUPS) {
  const labelEl = document.createElement("div");
  labelEl.className = "group-label";
  labelEl.textContent = group.label;
  groupsEl.appendChild(labelEl);

  const rowEl = document.createElement("div");
  rowEl.className = "row";
  for (const preset of group.presets) {
    const btn = document.createElement("button");
    btn.textContent = preset.label;
    btn.className = preset === currentPreset ? "active" : "";
    btn.addEventListener("click", () => {
      currentPreset = preset;
      for (const b of groupsEl.querySelectorAll("button")) b.classList.remove("active");
      btn.classList.add("active");
      rebuild();
      log(`Generated ${preset.label}`);
    });
    rowEl.appendChild(btn);
  }
  groupsEl.appendChild(rowEl);
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
      a.download = currentPreset.filename;
      a.click();
      URL.revokeObjectURL(url);
      log(`Exported ${currentPreset.filename} — check scale/vertex colors after importing into Unity (needs a vertex-color shader, e.g. URP/Lit).`);
    },
    (error) => log("Export failed: " + error),
    { binary: true }
  );
});
