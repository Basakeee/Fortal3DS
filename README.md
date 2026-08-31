# Fortal3DS

Web-based procedural 3D model generator (Three.js) for producing game-ready assets — no Unity Editor or license needed to use it.

Scope: a **parameter/preset driven** generator (choose a theme preset, tweak numeric parameters like dimensions/proportions). It does not accept free-text prompts and does not call any AI text-to-3D service — that path was ruled out because AI-generated UVs are unreliable for production use.

## Current technique: voxel + vertex color

Each car preset is built as a grid of unit cubes (`voxelKit.js`), merged into a single mesh with **per-vertex color** instead of a textured UV layout. This sidesteps procedural UV-unwrapping entirely (a hard, unsolved problem for arbitrary generated shapes) at the cost of needing a vertex-color-aware shader on the Unity side (e.g. URP/Lit does **not** read vertex color by default — needs a Shader Graph with the Vertex Color node, or a custom shader).

Colors are drawn from a shared 64-swatch palette (`palette.js`) so future themes stay visually consistent instead of each one inventing its own colors.

## Presets

- `carGenerator.js` — generic parameterized 90s sedan (boxy body, upright greenhouse).
- `ae86Generator.js` — Toyota Sprinter Trueno AE86: hatchback proportions, "panda" two-tone paint (position-dependent, not a single flat body color), pop-up headlights, signature black rear garnish with red lens segments. A specific real car needed its own layout rather than a sedan-preset variant, since panda paint and pop-up lights aren't expressible as sedan parameters.
- `humanGenerator.js` — voxel human character (head/neck/torso/arms/hip/legs/feet), scaled to a target real-world height rather than a fixed voxel size. Presets (`HUMAN_PRESETS.male/female/child`) mirror the player-size options in the Fortal Main Arena sim (170/158/120 cm) — built to replace that sim's current placeholder (an armless torso-and-leg box). Preview at `human.html` / `humanMain.js` with a preset switcher and shirt-color picker.
- `dragonGhastGenerator.js` — boss creature for the Boss Slayer arena game: same silhouette as Minecraft's Ghast (cubic floating body + a grid of dangling tentacles), re-skinned as a dragon — scale-pattern body, lighter belly, slit reptilian eyes, horns, and a protruding toothed snout instead of Ghast's flat white face. Preview at `dragon.html` / `dragonMain.js`, which can export it two ways — see "Animated export" below.
- `demonBossGenerator.js` — second Boss Slayer creature: a cute cube blob, not a biped — one dominant cube body carries the face directly (no separate head/neck/torso, and no limbs at all — sits flush on the ground), with only horns and a tail as appendages. Red skin, pink belly patch, big white-over-black eyes, a single center fang, curled black horn tips.
- `airplaneGenerator.js` — generic blocky prop fighter (fuselage, wings, tailplane/fin, static 2-blade propeller). No landing gear — at this voxel resolution thin gear legs read as noise, not detail.
- `tankGenerator.js` — generic battle tank: hull, side tracks with evenly spaced road wheels, turret set back from the hull's front so the barrel can overhang the nose.
- `treeGenerator.js` — oak tree: banded-bark trunk, canopy is a blocky sphere (distance test, not a box) so it reads as a tree silhouette from any angle.
- `tableGenerator.js` — four legs and a slab, no joinery detail. The deliberately plainest preset in the set.

## Status

Confirmed working end-to-end (2026-08-31): `.glb` (this repo) → Blender (import glTF, export `.fbx`) → Unity import → custom URP shader `Fortal/VertexColorLit` (reads the mesh's vertex color directly) → correct color in-scene.

The one non-obvious step: Blender's material for an imported glTF mesh is a node graph (Attribute node → Base Color), and FBX's material format can't represent a node graph — only a flat color — so the material Unity extracts from the `.fbx` comes back plain grey even though the vertex colors are intact on the mesh itself. `Fortal/VertexColorLit` (see the `deepspace` Unity project's `Assets/Shaders/`) sidesteps this by reading the vertex color directly instead of depending on the imported material.

## Preset gallery

`index.html` / `main.js` is the main entry point: a sidebar lists every preset above, grouped by category. Clicking one generates it into the shared viewer; **Export .glb** exports whichever preset is currently shown. Adding a future preset is "add one entry to `PRESET_GROUPS` in `main.js`" — the viewer, camera framing, and export logic are all generic over `mesh.geometry.boundingSphere` and don't know about any specific preset.

`human.html` / `dragon.html` stay as separate pages on top of that — they carry extras the gallery doesn't (human's shirt-color swatches, dragon's animated tentacle-sway preview) rather than just being older copies of the same thing.

## Run locally

Needs a local server — opening `index.html` directly (`file://`) fails because browsers block ES module imports over `file://`.

```bash
npx serve .
```

Then open the printed `http://localhost:...` URL. Click **Export .glb**, then drag the downloaded file into a Unity project's `Assets/` folder and check scale, vertex colors, and normals survive the round-trip.

## Batch export without a browser

`exportAll.mjs` runs every preset's exporter in Node (no page/click needed) and writes `.glb` files straight to `exports/` (gitignored — treat it as a local build output, not something to commit).

```bash
npm install
npm run export
```

Node has no `FileReader` (which `GLTFExporter`'s binary path uses internally), so the script shims a minimal one backed by Node's global `Blob.arrayBuffer()` — see the top of `exportAll.mjs`.

## Animated export (dragon boss only)

`dragon.html` has two export buttons:

- **Export .glb (static)** — the single merged mesh every other preset also exports. This is the round-trip that's actually been verified through Blender/FBX into Unity (see Status above).
- **Export .glb (animated tentacles)** — `assembleDragonGhastAnimatedRig()` in `dragonGhastGenerator.js` splits the 9 tentacles into their own named nodes (`TentaclePivot_0`..`8`) instead of merging them into the body, and ships a baked `TentacleSway` `AnimationClip` (9 `QuaternionKeyframeTrack`s, 24fps, 6s, looped by snapping the last frame back to the first) driving their rotation.

**Confirmed working end-to-end through Unity now (2026-08-31), with a caveat:** the single multi-node `AnimationClip` does **not** survive Blender → FBX intact — Blender ties one Action to one object, so it splits into **9 separate single-track clips** on import (`TentaclePivot_0|TentacleSway` .. `_8`), and Unity's Model Importer brings those in as **Generic**-type clips. An Animator Controller can't play 9 independent simultaneous clips on 9 different objects without an Avatar Mask per layer, which is a lot of setup for clips whose curves don't even overlap. The actual fix used: switch the FBX's Rig ▸ Animation Type to **Legacy**, add a legacy `Animation` component to the boss root with all 9 clips in its list, and `Assets/Scripts/Deepspace/TentacleSwayPlayer.cs` (in the `deepspace` Unity project) plays all 9 simultaneously on separate layers in `OnEnable()` (not `Start()` — the boss is `SetActive(false)`d during setup and only shown later, and `Start()` only ever fires once per component lifetime, so it can lose the race against that hide/show sequence).

Both buttons, and `exportAll.mjs`'s headless batch export, drive the same `tentacleRotationAt()` sway formula from one place in `dragonGhastGenerator.js` — the live preview, the two export paths, and the baked clip can't drift onto different motion.

## Next steps

- Confirm the vertex-color round-trip actually renders correctly in Unity (needs a vertex-color shader — not guaranteed to "just work").
- Add CSG boolean geometry (e.g. `three-bvh-csg`) for hard-surface theme presets (ship parts, weapons) once a non-voxel style is needed.
- Add noise-displaced sphere geometry for organic theme presets (asteroids, rocks).
