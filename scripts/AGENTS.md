# Script work guidance

## Ownership

- `snapshot.mjs`: generates `public/data/repository.json` from actual Git objects and, with `--site`, packages `dist/` for Pages. Called by the deployment workflow.
- `analyze.mjs` and `importParsers.mjs`: original optional history/import analysis utilities. Their `history.json` is not the live map's data format.
- `publish-github.sh`: original GitHub publishing utility.

## Contracts

Keep snapshot generation dependency-free, using Node.js built-ins and argument-based Git subprocess calls. Read committed files and up to 40 real commits. The deployment checkout must include history (`fetch-depth: 0`). Generated snapshots and `dist/` stay ignored by Git.

Version the built shell's CSS/module URLs and relative module imports with the commit SHA so Pages caches cannot mix releases. Keep source files unversioned for local development.

## Verification

Run `node scripts/snapshot.mjs --site`; parse `dist/public/data/repository.json`, compare its latest SHA and file listing with Git, and confirm `dist/index.html`, `dist/src/app.js`, and artwork exist.
