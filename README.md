# Fortal3DS

Web-based procedural 3D model generator (Three.js) for producing game-ready assets — no Unity Editor or license needed to use it.

Scope: a **parameter/preset driven** generator (choose a theme preset, tweak numeric parameters like dimensions/proportions). It does not accept free-text prompts and does not call any AI text-to-3D service — that path was ruled out because AI-generated UVs are unreliable for production use.

## Current technique: voxel + vertex color

Each car preset is built as a grid of unit cubes (`voxelKit.js`), merged into a single mesh with **per-vertex color** instead of a textured UV layout. This sidesteps procedural UV-unwrapping entirely (a hard, unsolved problem for arbitrary generated shapes) at the cost of needing a vertex-color-aware shader on the Unity side (e.g. URP/Lit does **not** read vertex color by default — needs a Shader Graph with the Vertex Color node, or a custom shader).

Colors are drawn from a shared 64-swatch palette (`palette.js`) so future themes stay visually consistent instead of each one inventing its own colors.

## Presets

- `carGenerator.js` — generic parameterized 90s sedan (boxy body, upright greenhouse).
- `ae86Generator.js` — Toyota Sprinter Trueno AE86: hatchback proportions, "panda" two-tone paint (position-dependent, not a single flat body color), pop-up headlights, signature black rear garnish with red lens segments. A specific real car needed its own layout rather than a sedan-preset variant, since panda paint and pop-up lights aren't expressible as sedan parameters.

## Status

Pipeline (Three.js → `.glb` → Unity import) has not yet been confirmed working end-to-end — still waiting on the round-trip test (scale, vertex colors, normals) to be reported back.

## Run locally

Needs a local server — opening `index.html` directly (`file://`) fails because browsers block ES module imports over `file://`.

```bash
npx serve .
```

Then open the printed `http://localhost:...` URL. Click **Export .glb**, then drag the downloaded file into a Unity project's `Assets/` folder and check scale, vertex colors, and normals survive the round-trip.

## Next steps

- Confirm the vertex-color round-trip actually renders correctly in Unity (needs a vertex-color shader — not guaranteed to "just work").
- Add CSG boolean geometry (e.g. `three-bvh-csg`) for hard-surface theme presets (ship parts, weapons) once a non-voxel style is needed.
- Add noise-displaced sphere geometry for organic theme presets (asteroids, rocks).
- Build a theme-picker UI once more than one style family exists.
