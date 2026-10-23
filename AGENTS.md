# Repository work guidance

## Product contract

Xeno-Stark is a GitHub Pages file visualizer. Keep the graph visible immediately and throughout the first viewport on desktop and phones. The user's priority is following project files, inside the original immersive Tony Stark/Alien hologram.

- Keep the header and history strip compact. The restored repository command deck belongs below the visualizer, reached by scrolling or Explore, while the graph fills the first viewport.
- File-node clicks summon a floating holographic preview of that file at the selected real commit. Files uses the same preview; Open on GitHub remains a secondary action.
- Multiple file windows must remain open together, draggable and resizable over the graph. Wrap long lines by default and preserve side-by-side tiling and individual close controls.
- Remember each repository's open windows and layout in this browser across refreshes. Closing panes updates the saved layout; restoring to a smaller viewport keeps panes reachable.
- Minimize file panes into the small graph dock without closing or losing their geometry. Show graph minimizes all visible panes. Persist docked state with the window layout.
- Show actual repository files and history. Folder connections represent hierarchy; dependency claims require measured import data.
- Preserve the original luminous hexagonal nodes, 3D orbital clusters, gimbal rings, tendrils, and Orbital/Helix/Hive layouts. Keep readable file names, keyboard access, and reduced-motion behavior.
- Retain the MIT license and original artwork. Use the original chamber behind the graph and the command-deck image in the explorer below it. GitHub repository lists, commit statistics, and changed files must be real data.

## Structure

- `index.html` is the page shell; `src/app.js` and `src/styles.css` implement the live interface.
- `.github/workflows/pages.yml` builds and deploys the site with a real Git snapshot. Its Pages source is GitHub Actions.
- Read the applicable child guidance before editing its subtree. Update the owning guidance when responsibilities or behavior change.

## Verification

Check JavaScript syntax and generate a snapshot. In a browser, verify the graph fits the first viewport at desktop and phone widths, node clicks project real file contents with the correct commit reference, search clears correctly, history changes the file map, and an API failure retains the default snapshot.

## Child guidance

- [src/AGENTS.md](src/AGENTS.md): live map, rendering, interactions, and retained engine utilities.
- [scripts/AGENTS.md](scripts/AGENTS.md): snapshot generation, analyzer, and publishing utilities.
- [public/AGENTS.md](public/AGENTS.md): original artwork and generated datasets.
