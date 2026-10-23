# Frontend work guidance

## Ownership

- `app.js`: public GitHub data, commit-tree caching, snapshot fallback, projected 3D folder graph, search, file links, history, and drawers.
- `hologram.js`: the restored original graph aesthetic: 3D orbital/helix/hive positions, perspective orbit, gimbal rings, glowing hexagonal cores, targeting reticles, tendrils, and flowing energy.
- `filePreview.js`: independent holographic file windows, per-window requests, safe text/image previews, pointer and keyboard move/resize, tiling, maximize/restore, wrapping, and secondary GitHub navigation.
- `styles.css`: full-viewport layout, desktop/phone adaptation, original cyan/gold/acid themes, focus and other interaction states.
- `engine/`, `visualizers/`, and `audio/` contain the original experimental modules. The live application does not import them.

## Contracts

- Summon the holographic preview from node and Files clicks. Fetch immutable raw content at the selected commit SHA; retain Open on GitHub as a secondary link. Insert source text with DOM text APIs; keep HTML and scripts inert. Bound text/image sizes and cancel stale requests.
- Preserve the current graph on API failure. Guard async requests so an old repository or timeline selection cannot replace a newer one.
- A cached pre-preview HTML shell must migrate once to a fresh shell before initializing. Keep the query's repository selection and avoid reload loops.
- Real folder structure determines edges. Hover and Files expose full paths when labels collide.
- File panes are nonmodal so users can open several files and still operate the graph. Each pane owns its request and geometry. Focus brings it forward; Escape dismisses the focused pane. History/repository changes close all panes. Preserve graph orbit pause while panes are open.
- Wrap source lines by default, including long tokens. Provide a per-pane Wrap toggle, title-bar drag, edge/corner resize, maximize/restore, Tile files, and keyboard arrow controls for title bars and resize grips. Clamp panes to the workspace after viewport changes.
- Save open panes, immutable commit references, geometry, stacking order, wrapping, and maximize/restore state in browser localStorage per repository. Debounce moves and flush on pagehide. Restore once after initial data loading, without overwriting saved layouts during startup or repository transitions. Validate stored records and tolerate unavailable storage.
- Match the original slow automatic orbit by default. Pause orbit when a node is hovered, stop it during manual drag, and respect reduced motion. Audio stays off. Support wheel, pinch, and native file links.
- Full-screen inspection must leave the graph visible without document scrolling. Drawers are optional, dismissible overlays.

## Verification

Run `node --check src/app.js`. Exercise canvas-node navigation, search and empty results, folder focus, drawer keyboard access, history/playback, API failure, and desktop/phone layout in a real browser.
