# Public asset work guidance

## Ownership

- `assets/`: original reactor, command deck, scanner, and radar artwork. Preserve the source images and their aspect ratios.
- `data/repository.json`: generated deployment snapshot used by the live map, containing real commit metadata and the latest tracked file tree.
- `data/history.json`: optional output from the original analyzer, not consumed by the live map.

## Contracts

Generate `repository.json` with `node scripts/snapshot.mjs`; do not invent files or history. The Pages workflow regenerates it at every deployment. It is intentionally ignored in source control. Ambient artwork must remain visually subordinate to file nodes and labels.

## Verification

Confirm original images remain intact and the generated snapshot parses. A failed GitHub API request must still allow browsing the default deployment snapshot and opening its file links.
