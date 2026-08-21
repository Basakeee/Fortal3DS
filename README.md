# Fortal3DS

Web-based procedural 3D model generator (Three.js) for producing game-ready assets with clean UVs — no Unity Editor or license needed to use it.

Scope: a **parameter/preset driven** generator (choose a theme preset, tweak numeric parameters like size/roughness/segment count). It does not accept free-text prompts and does not call any AI text-to-3D service — that path was ruled out because AI-generated UVs are unreliable for production use.

## Status

Proof-of-concept only: validates the Three.js → `.glb` (glTF) → Unity import pipeline using a single 1x1x1 meter box (built-in clean UVs, isolates pipeline issues from geometry-generation technique).

## Run locally

Needs a local server — opening `index.html` directly (`file://`) fails because browsers block ES module imports over `file://`.

```bash
npx serve .
```

Then open the printed `http://localhost:...` URL. Click **Export .glb**, then drag the downloaded file into any Unity project's `Assets/` folder and check scale, normals, and material survive the round-trip.

## Next steps

- Add CSG boolean geometry (e.g. `three-bvh-csg`) for hard-surface theme presets (ship parts, weapons).
- Add noise-displaced sphere geometry for organic theme presets (asteroids, rocks).
- Build the theme-preset → parameter mapping layer once both generation techniques are validated.
