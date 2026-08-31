import fs from "node:fs";
import path from "node:path";

// GLTFExporter's binary path uses the browser's FileReader to turn its merged
// Blob into an ArrayBuffer. Node has no FileReader, but its global Blob (18+)
// already exposes arrayBuffer() directly, so this shim is a thin adapter, not
// a real re-implementation.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      if (this.onloadend) this.onloadend();
    });
  }
};

const { GLTFExporter } = await import("three/addons/exporters/GLTFExporter.js");
const { generateHumanMesh, HUMAN_PRESETS } = await import("./humanGenerator.js");
const { generateDragonGhastMesh } = await import("./dragonGhastGenerator.js");
const { generateAE86TruenoMesh } = await import("./ae86Generator.js");
const { generateSedan90sMesh } = await import("./carGenerator.js");
const { generatePropFighterMesh } = await import("./airplaneGenerator.js");
const { generateBattleTankMesh } = await import("./tankGenerator.js");
const { generateOakTreeMesh } = await import("./treeGenerator.js");
const { generateSimpleTableMesh } = await import("./tableGenerator.js");

const outDir = "./exports";
fs.mkdirSync(outDir, { recursive: true });

function exportMesh(mesh, filename) {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      mesh,
      (result) => {
        const buffer = Buffer.from(result);
        const outPath = path.join(outDir, filename);
        fs.writeFileSync(outPath, buffer);
        console.log(`wrote ${outPath} (${buffer.length} bytes)`);
        resolve();
      },
      (error) => reject(error),
      { binary: true }
    );
  });
}

for (const [name, preset] of Object.entries(HUMAN_PRESETS)) {
  await exportMesh(generateHumanMesh(preset), `human_${name}_voxel.glb`);
}
await exportMesh(generateDragonGhastMesh(), "dragon_ghast_boss_voxel.glb");
await exportMesh(generateAE86TruenoMesh(), "ae86_trueno_voxel.glb");
await exportMesh(generateSedan90sMesh(), "sedan_90s_voxel.glb");
await exportMesh(generatePropFighterMesh(), "prop_fighter_voxel.glb");
await exportMesh(generateBattleTankMesh(), "battle_tank_voxel.glb");
await exportMesh(generateOakTreeMesh(), "oak_tree_voxel.glb");
await exportMesh(generateSimpleTableMesh(), "simple_table_voxel.glb");
