#!/usr/bin/env bash
# One-command publisher to create & push raiinman/xeno-stark-visualizer on GitHub
set -euo pipefail

REPO_SLUG="${1:-raiinman/xeno-stark-visualizer}"
echo "[XENO-STARK] Publishing clean-room MIT repository + DOX tree to https://github.com/${REPO_SLUG} ..."

if command -v gh >/dev/null 2>&1; then
  gh repo create "${REPO_SLUG}" --public --source=. --remote=origin --push
else
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/${REPO_SLUG}.git"
  git branch -M main
  git push -u origin main
fi
echo "[XENO-STARK] Successfully pushed to https://github.com/${REPO_SLUG}"
