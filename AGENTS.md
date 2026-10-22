# DOX framework

DOX is a highly performant `AGENTS.md` hierarchy installed here (`raiinman/dox`, forked from `agent0ai/dox`).
Agents must follow DOX instructions across any edits.

## Core Contract

- `AGENTS.md` files are binding work contracts for their subtrees.
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable `AGENTS.md` plus every parent `AGENTS.md` above it.
- **Clean-Room MIT Licensing Mandate**: This repository (`raiinman/xeno-stark-visualizer`) is a 100% original, clean-room MIT-licensed creation. Never copy or import GPL-3.0 code from `Jany-M/repo-visualizer`.

## Read Before Editing

1. Read the root `AGENTS.md`.
2. Identify every file or folder you expect to touch.
3. Walk from the repository root to each target path and read every `AGENTS.md` found along each route.
4. If a parent `AGENTS.md` lists a child `AGENTS.md` whose scope contains the path, read that child and continue from there.
5. Use the nearest `AGENTS.md` as the local contract and parent docs for repo-wide rules.
6. Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done. Update the closest owning `AGENTS.md` when a change affects:
- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- `AGENTS.md` creation, deletion, move, rename, or index contents

## Hierarchy & Style

- Root `AGENTS.md` is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index.
- Child `AGENTS.md` files own domain-specific instructions and their own Child DOX Index (`Purpose`, `Ownership`, `Local Contracts`, `Work Guidance`, `Verification`, `Child DOX Index`).
- Keep docs concise, current, and operational.

## User Preferences

- **Visual Direction ("Tony Stark meets Alien")**: Fuse Tony Stark's J.A.R.V.I.S. Mark-85 golden-cyan 3D orbital holographic HUD with H.R. Giger / *Alien* Nostromo MUTHUR-6000 obsidian biomechanical ribs and glowing acid-emerald synaptic tendrils.
- **ImageGen Assets Required**: Use bespoke AI-generated biomechanical/holographic textures (`public/assets/`) rather than plain flat circles.
- **License**: Permissive MIT License (`LICENSE`), completely independent of GPL-3.0.

## Child DOX Index

- [`src/AGENTS.md`](src/AGENTS.md) — Owns the 3D Orbital/Helix/Hive layout engine (`src/engine/`), Three.js + 2D Tactical HUD renderer (`src/visualizers/`), transitive blast-radius contagion solver, UI inspector components (`src/components/`), and Web Audio synthesizer (`src/audio/`).
- [`scripts/AGENTS.md`](scripts/AGENTS.md) — Owns the zero-dependency Node.js CLI git history & multi-language import parser (`scripts/analyze.mjs`, `scripts/importParsers.mjs`) and GitHub publishing workflow (`scripts/publish-github.sh`).
- [`public/AGENTS.md`](public/AGENTS.md) — Owns the custom ImageGen "Tony Stark meets Alien" visual assets (`public/assets/`) and compiled git timeline dataset (`public/data/history.json`).
