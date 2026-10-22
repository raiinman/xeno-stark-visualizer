# public/AGENTS.md — ImageGen Visual Assets & Compiled History Dataset

## Purpose
Houses the custom AI-generated "Tony Stark meets Alien" biomechanical-holographic artwork and the analyzer's compiled `history.json` payload.

## Ownership
- `public/assets/hero-command-deck.jpg` — 16:9 Stark-Xeno Command Deck backdrop.
- `public/assets/arc-xeno-core.jpg` — 1:1 Arc-Xeno Reactor Core emblem.
- `public/assets/bio-scanner-pod.jpg` — 4:3 Bio-Holographic Cluster Containment Pod visual.
- `public/assets/anomaly-radar-orb.jpg` — 1:1 Xeno-Contagion Blast-Radius Anomaly Radar visual.
- `public/data/history.json` — Chronological commit & import graph JSON consumed by the web app.

## Local Contracts
- Keep image aspect ratios intact (`max-w-full h-auto` / `object-cover`) and never overwrite `public/assets/` with generic placeholders.

## Work Guidance
- Regenerate `public/data/history.json` via `npm run analyze` whenever repository commits are added.

## Verification
- Confirm all 4 image assets exist in `public/assets/` and `public/data/history.json` parses cleanly as JSON.

## Child DOX Index
- Leaf DOX boundary (no child `AGENTS.md` files beneath `public/`).
