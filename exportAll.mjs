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
const { generateHumanMesh, HUMAN_PRESETS, generateFarmerMesh } = await import("./humanGenerator.js");
const { generateDragonGhastMesh, assembleDragonGhastAnimatedRig } = await import("./dragonGhastGenerator.js");
const { generateDemonBossMesh } = await import("./demonBossGenerator.js");
const { generateGiantFishMesh } = await import("./giantFishGenerator.js");
const { generateGemMesh, GEM_PRESETS } = await import("./gemGenerator.js");
const { generateCoinMesh, COIN_PRESETS } = await import("./coinGenerator.js");
const { generateGlassTileMesh, assembleGlassTileBreakRig } = await import("./glassTileGenerator.js");
const { generatePigMesh } = await import("./pigGenerator.js");
const { generateDogMesh } = await import("./dogGenerator.js");
const { generateCowMesh } = await import("./cowGenerator.js");
const { generateCatMesh } = await import("./catGenerator.js");
const { generateChickenMesh } = await import("./chickenGenerator.js");
const { generateAE86TruenoMesh } = await import("./ae86Generator.js");
const { generateSedan90sMesh } = await import("./carGenerator.js");
const { generatePropFighterMesh } = await import("./airplaneGenerator.js");
const { generateBattleTankMesh } = await import("./tankGenerator.js");
const { generateOakTreeMesh } = await import("./treeGenerator.js");
const { generateSimpleTableMesh } = await import("./tableGenerator.js");

const outDir = "./exports";
fs.mkdirSync(outDir, { recursive: true });

function exportMesh(mesh, filename, exportOptions = {}) {
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
      { binary: true, ...exportOptions }
    );
  });
}

for (const [name, preset] of Object.entries(HUMAN_PRESETS)) {
  await exportMesh(generateHumanMesh(preset), `human_${name}_voxel.glb`);
}
await exportMesh(generateFarmerMesh(), "farmer_voxel.glb");
await exportMesh(generateDragonGhastMesh(), "dragon_ghast_boss_voxel.glb");
{
  const { group, clip } = assembleDragonGhastAnimatedRig();
  await exportMesh(group, "dragon_ghast_boss_animated.glb", { animations: [clip] });
}
await exportMesh(generateDemonBossMesh(), "demon_boss_voxel.glb");
await exportMesh(generateGiantFishMesh(), "giant_fish_boss_voxel.glb");
for (const [name, preset] of Object.entries(GEM_PRESETS)) {
  await exportMesh(generateGemMesh(preset), `gem_${name}_voxel.glb`);
}
for (const [name, preset] of Object.entries(COIN_PRESETS)) {
  await exportMesh(generateCoinMesh(preset), `coin_${name}_voxel.glb`);
}
await exportMesh(generateGlassTileMesh(), "glass_tile_voxel.glb");
{
  const { group, clip } = assembleGlassTileBreakRig();
  await exportMesh(group, "glass_tile_break.glb", { animations: [clip] });
}
await exportMesh(generatePigMesh(), "pig_voxel.glb");
await exportMesh(generateDogMesh(), "dog_voxel.glb");
await exportMesh(generateCowMesh(), "cow_voxel.glb");
await exportMesh(generateCatMesh(), "cat_voxel.glb");
await exportMesh(generateChickenMesh(), "chicken_voxel.glb");
await exportMesh(generateAE86TruenoMesh(), "ae86_trueno_voxel.glb");
await exportMesh(generateSedan90sMesh(), "sedan_90s_voxel.glb");
await exportMesh(generatePropFighterMesh(), "prop_fighter_voxel.glb");
await exportMesh(generateBattleTankMesh(), "battle_tank_voxel.glb");
await exportMesh(generateOakTreeMesh(), "oak_tree_voxel.glb");
await exportMesh(generateSimpleTableMesh(), "simple_table_voxel.glb");
