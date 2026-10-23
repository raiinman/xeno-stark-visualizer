# Frontend work guidance

## Ownership

- `app.js`: public GitHub data, commit-tree caching, snapshot fallback, projected 3D folder graph, search, file links, history, and drawers.
- `hologram.js`: the restored original graph aesthetic: 3D orbital/helix/hive positions, perspective orbit, gimbal rings, glowing hexagonal cores, targeting reticles, tendrils, and flowing energy.
- `filePreview.js`: native modal holographic file viewer, bounded raw-file fetching, safe syntax-colored text, image previews, cancellation, and secondary GitHub navigation.
- `styles.css`: full-viewport layout, desktop/phone adaptation, original cyan/gold/acid themes, focus and other interaction states.
- `engine/`, `visualizers/`, and `audio/` contain the original experimental modules. The live application does not import them.

## Contracts

- Summon the holographic preview from node and Files clicks. Fetch immutable raw content at the selected commit SHA; retain Open on GitHub as a secondary link. Insert source text with DOM text APIs; keep HTML and scripts inert. Bound text/image sizes and cancel stale requests.
- Preserve the current graph on API failure. Guard async requests so an old repository or timeline selection cannot replace a newer one.
- A cached pre-preview HTML shell must migrate once to a fresh shell before initializing. Keep the query's repository selection and avoid reload loops.
- Real folder structure determines edges. Hover and Files expose full paths when labels collide.
- The viewer uses native dialog focus trapping and Escape dismissal. Pause orbit while it is open and keep the graph visible behind it.
- Match the original slow automatic orbit by default. Pause orbit when a node is hovered, stop it during manual drag, and respect reduced motion. Audio stays off. Support wheel, pinch, and native file links.
- Full-screen inspection must leave the graph visible without document scrolling. Drawers are optional, dismissible overlays.

## Verification

Run `node --check src/app.js`. Exercise canvas-node navigation, search and empty results, folder focus, drawer keyboard access, history/playback, API failure, and desktop/phone layout in a real browser.
