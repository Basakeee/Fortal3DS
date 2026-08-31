import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { generateDragonGhastMesh, assembleDragonGhastAnimatedRig } from "./dragonGhastGenerator.js";

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

// assembleDragonGhastAnimatedRig builds the exact same group + clip this page
// exports (see the "export-animated" handler below) — the live preview drives
// it with the returned tentacleRotationAt directly (native-framerate, not the
// baked samples) purely for smoothness; it's the same formula either way.
const { group: boss, clip: swayClip, swayingTentacles, tentacleRotationAt } = assembleDragonGhastAnimatedRig();
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
  for (const s of swayingTentacles) {
    const r = tentacleRotationAt(t, s);
    s.pivot.rotation.x = r.x;
    s.pivot.rotation.z = r.z;
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

document.getElementById("export-animated").addEventListener("click", () => {
  // Exports the live rig (body + 9 separately-named tentacle pivots) plus a
  // baked AnimationClip driving those pivots — this is the multi-node
  // structure the static button above deliberately avoids exporting. Reset
  // every pivot to its t = 0 pose first so the glTF's rest pose (what shows
  // before the clip plays, or in an engine that ignores animation) is a
  // sensible starting frame rather than whatever mid-sway pose the preview
  // happened to be in at click-time.
  for (const s of swayingTentacles) {
    const r = tentacleRotationAt(0, s);
    s.pivot.rotation.x = r.x;
    s.pivot.rotation.z = r.z;
  }

  const exporter = new GLTFExporter();
  exporter.parse(
    boss,
    (result) => {
      const blob = new Blob([result], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dragon_ghast_boss_animated.glb";
      a.click();
      URL.revokeObjectURL(url);
      log(
        "Exported dragon_ghast_boss_animated.glb — 9 separate tentacle nodes + a looping TentacleSway clip. " +
          "Check that Blender's glTF import brings the animation in (Import Animations, on by default) and that " +
          "its FBX export includes it (Include > Animation) before it reaches Unity — this round-trip hasn't been " +
          "verified yet, unlike the static single-mesh export."
      );
    },
    (error) => log("Export failed: " + error),
    { binary: true, animations: [swayClip] }
  );
});
