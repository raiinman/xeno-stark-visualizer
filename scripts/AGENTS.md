# scripts/AGENTS.md — Git History CLI Analyzer & GitHub Publisher

## Purpose
Provides zero-dependency Node.js CLI tools to walk any local git repository's commit log, extract multi-language import graphs, write `public/data/history.json`, and publish the repository to `github.com/raiinman`.

## Ownership
- `scripts/importParsers.mjs` — Per-language import extraction and repo-relative path resolution (JS/TS, Python, Go, Rust, C/C++, Java/Kotlin, Ruby, PHP, CSS/SCSS).
- `scripts/analyze.mjs` — Chronological `git log --reverse --numstat` walker and `history.json` compiler.
- `scripts/publish-github.sh` — One-command GitHub CLI (`gh`) repository creation and push script.

## Local Contracts
- `scripts/analyze.mjs` must use only built-in Node.js modules (`node:child_process`, `node:fs`, `node:path`) so it runs immediately with `node scripts/analyze.mjs /path/to/repo` without requiring `npm install`.

## Work Guidance
- Automatically exclude build artifacts (`node_modules/`, `dist/`, `.git/`, `__pycache__/`, `.venv/`) and merge custom excludes from `xenostark.config.json`.

## Verification
- Run `node scripts/analyze.mjs .` and verify `public/data/history.json` contains valid commit and import graph records.

## Child DOX Index
- Leaf DOX boundary (no child `AGENTS.md` files beneath `scripts/`).
