import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { generateDragonGhastMesh, generateDragonGhastRig } from "./dragonGhastGenerator.js";

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

const boss = new THREE.Group();
const { bodyMesh, tentacles } = generateDragonGhastRig();
boss.add(bodyMesh);

// Each tentacle mesh sits under its own pivot at the attachment row, so
// rotating the pivot swings it from the top like a dangling limb (see
// generateDragonGhastRig's comment for why this is a separate mesh set from
// the single merged mesh the export button uses).
const swayingTentacles = tentacles.map(({ mesh, pivotPosition, swayAmplitudeX, swayAmplitudeZ, swaySpeed, swayPhase }) => {
  const pivot = new THREE.Group();
  pivot.position.set(pivotPosition.x, pivotPosition.y, pivotPosition.z);
  pivot.add(mesh);
  boss.add(pivot);
  return { pivot, swayAmplitudeX, swayAmplitudeZ, swaySpeed, swayPhase };
});
scene.add(boss);

const bounds = new THREE.Box3().setFromObject(boss);
const center = bounds.getCenter(new THREE.Vector3());
const radius = bounds.getSize(new THREE.Vector3()).length() * 0.5;
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(center);
camera.position.set(center.x + radius * 1.8, center.y + radius * 0.4, center.z + radius * 1.8);
controls.update();

const grid = new THREE.GridHelper(radius * 6, 20);
scene.add(grid);

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  for (const { pivot, swayAmplitudeX, swayAmplitudeZ, swaySpeed, swayPhase } of swayingTentacles) {
    // Two axes, slightly different speed/phase per axis so the sway reads as
    // a lazy drifting circle rather than a flat side-to-side metronome.
    pivot.rotation.x = Math.sin(t * swaySpeed + swayPhase) * swayAmplitudeX;
    pivot.rotation.z = Math.cos(t * swaySpeed * 0.7 + swayPhase) * swayAmplitudeZ;
  }
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById("export").addEventListener("click", () => {
  // Exports the original single merged mesh (body + tentacles baked into one
  // geometry), not the animated boss group above — the verified Unity import
  // path expects exactly that one static mesh, and exporting the swaying
  // group would bake in whatever pose the tentacles happened to be in at
  // click-time.
  const exportMesh = generateDragonGhastMesh();
  const exporter = new GLTFExporter();
  exporter.parse(
    exportMesh,
    (result) => {
      const blob = new Blob([result], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dragon_ghast_boss_voxel.glb";
      a.click();
      URL.revokeObjectURL(url);
      log("Exported dragon_ghast_boss_voxel.glb — check scale/vertex colors after importing into Unity (needs a vertex-color shader, e.g. URP/Lit).");
    },
    (error) => log("Export failed: " + error),
    { binary: true }
  );
});
