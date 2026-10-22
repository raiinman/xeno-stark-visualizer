# src/AGENTS.md — 3D Bio-Holographic Engine, Contagion Solver & HUD

## Purpose
Implements the clean-room 3D Orbital Hologram + Biomechanical Tendril renderer, incremental commit graph state, transitive dependency blast-radius solver, and synthesized audio engine.

## Ownership
- `src/engine/graphState.js` — Incremental node & synapse state across chronological git commits.
- `src/engine/bioForce3D.js` — 3D coordinate solvers for Orbital Gimbal Rings, Xeno Double-Helix, and Fibonacci Hive Sphere.
- `src/engine/contagionSolver.js` — Breadth-first transitive dependency impact calculator (1st, 2nd, and 3rd+ hop contagion).
- `src/visualizers/xenoStarkRenderer.js` — Dual-layer Three.js r128 WebGL + 2D J.A.R.V.I.S./MUTHUR tactical HUD renderer.
- `src/audio/nostromoJarvisSynth.js` — Procedural Web Audio API synthesizer for Stark HUD servos and Nostromo CRT clicks.

## Local Contracts
- Every visual theme (`fusion`, `jarvis`, `muthur`) and spatial layout (`orbital`, `helix`, `hive`) must switch live without losing playback state.
- All file nodes must report their governing `AGENTS.md` DOX contract in the Deep Node Bio-Scanner.

## Work Guidance
- Maintain 60 FPS interactive orbit/zoom performance and preserve responsive layout across mobile, tablet, and desktop viewports.

## Verification
- Run `python3 skills/web-app-generation/scripts/check_web_app.py index.html` and confirm zero errors or warnings.

## Child DOX Index
- Leaf DOX boundary (no child `AGENTS.md` files beneath `src/`).
