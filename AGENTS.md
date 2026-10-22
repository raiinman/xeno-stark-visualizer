# Repository work guidance

## Product contract

Xeno-Stark is a GitHub Pages file visualizer. Keep the graph visible immediately and throughout the first viewport on desktop and phones. The user's priority is following project files, inside the original immersive Tony Stark/Alien hologram.

- Keep the header and history strip compact. Secondary controls belong in the existing drawers.
- File-node clicks open that file on GitHub at the selected real commit. Provide equivalent native links in Files.
- Show actual repository files and history. Folder connections represent hierarchy; dependency claims require measured import data.
- Preserve the original luminous hexagonal nodes, 3D orbital clusters, gimbal rings, tendrils, and Orbital/Helix/Hive layouts. Keep readable file names, keyboard access, and reduced-motion behavior.
- Retain the MIT license and original artwork. Use the original chamber behind the graph, while keeping unrelated dashboard panels out of the viewport.

## Structure

- `index.html` is the page shell; `src/app.js` and `src/styles.css` implement the live interface.
- `.github/workflows/pages.yml` builds and deploys the site with a real Git snapshot. Its Pages source is GitHub Actions.
- Read the applicable child guidance before editing its subtree. Update the owning guidance when responsibilities or behavior change.

## Verification

Check JavaScript syntax and generate a snapshot. In a browser, verify the graph fits the first viewport at desktop and phone widths, node clicks open correct GitHub URLs, search clears correctly, history changes the file map, and an API failure retains the default snapshot.

## Child guidance

- [src/AGENTS.md](src/AGENTS.md): live map, rendering, interactions, and retained engine utilities.
- [scripts/AGENTS.md](scripts/AGENTS.md): snapshot generation, analyzer, and publishing utilities.
- [public/AGENTS.md](public/AGENTS.md): original artwork and generated datasets.

