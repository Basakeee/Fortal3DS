import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { generateGlassTileMesh, assembleGlassTileBreakRig } from "./glassTileGenerator.js";

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

// assembleGlassTileBreakRig builds the exact same group + clip this page
// exports (see the export-break handler below) — the live preview drives it
// with the returned shardBreakTransformAt directly against a replaying
// clock (not the baked samples), same reasoning dragonMain.js gives for its
// tentacle sway: it's the same formula either way, just not sample-stepped.
const { group: tile, clip: breakClip, fallingShards, shardBreakTransformAt } = assembleGlassTileBreakRig();
scene.add(tile);

const bounds = new THREE.Box3().setFromObject(tile);
const center = bounds.getCenter(new THREE.Vector3());
const radius = Math.max(0.3, bounds.getSize(new THREE.Vector3()).length() * 0.5);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(center);
camera.position.set(center.x + radius * 1.8, center.y + radius * 1.2, center.z + radius * 1.8);
controls.update();

const grid = new THREE.GridHelper(radius * 8, 20);
scene.add(grid);

// The preview replays the break on a loop (press-and-watch convenience) even
// though the baked/exported clip is meant to play ONCE in-game on a break
// trigger — see the export-break handler's log message for the real
// one-shot guidance.
const breakDurationSeconds = breakClip.duration;
const previewLoopSeconds = breakDurationSeconds + 0.6; // brief pause on the settled pose before replaying
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime() % previewLoopSeconds;
  const progress = Math.min(1, t / breakDurationSeconds);
  for (const s of fallingShards) {
    const transform = shardBreakTransformAt(progress, s);
    s.pivot.position.set(transform.position.x, transform.position.y, transform.position.z);
    s.pivot.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
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
  // Exports the intact frame+pane 2-node group (GlassTile_Frame merged
  // vertex-colored bezel + GlassTile_Pane separate uniform-color mesh) — the
  // "before break" state. Same 2-node-group shape as farmer_voxel.glb, whose
  // Farmer_Body/Farmer_Shirt split already round-trips through Blender/FBX
  // correctly.
  const exportMesh = generateGlassTileMesh();
  const exporter = new GLTFExporter();
  exporter.parse(
    exportMesh,
    (result) => {
      const blob = new Blob([result], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "glass_tile_voxel.glb";
      a.click();
      URL.revokeObjectURL(url);
      log(
        "Exported glass_tile_voxel.glb — GlassTile_Frame (vertex-colored bezel) + GlassTile_Pane (separate, uniform " +
          "color: leave its Unity material on default URP/Lit and recolor it live via script for hidden/safe/break/" +
          "broken/wrong, same pattern as Farmer_Shirt — only Frame needs Fortal/VertexColorLit reassigned)."
      );
    },
    (error) => log("Export failed: " + error),
    { binary: true }
  );
});

document.getElementById("export-break").addEventListener("click", () => {
  // Reset every shard pivot to its t = 0 (intact) pose before exporting, same
  // reasoning as dragonMain.js's export-animated handler: the glTF's rest
  // pose is whatever the pivots are at when parse() runs, and that should be
  // "not yet broken," not whatever mid-fall frame the preview loop happened
  // to be on at click-time.
  for (const s of fallingShards) {
    const transform = shardBreakTransformAt(0, s);
    s.pivot.position.set(transform.position.x, transform.position.y, transform.position.z);
    s.pivot.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
  }

  const exporter = new GLTFExporter();
  exporter.parse(
    tile,
    (result) => {
      const blob = new Blob([result], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "glass_tile_break.glb";
      a.click();
      URL.revokeObjectURL(url);
      log(
        "Exported glass_tile_break.glb — GlassTile_Frame (static) + N GlassTile_Shard_i nodes + a ONE-SHOT GlassBreak " +
          "clip (falls once, does not loop back to the intact pose). Different Unity playback shape than " +
          "dragon_ghast_boss_animated.glb's looping TentacleSway: dragon uses a Legacy Animation component set to " +
          "loop, this clip needs its wrap mode set to Once/ClampForever (Legacy) or an Animator state with Loop Time " +
          "off, triggered on break rather than always-on. Round-trip through Blender/FBX not yet verified for this " +
          "preset specifically (same multi-node-clip caveat the dragon's animated export already carries)."
      );
    },
    (error) => log("Export failed: " + error),
    { binary: true, animations: [breakClip] }
  );
});
