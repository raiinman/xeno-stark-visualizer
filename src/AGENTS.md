# Frontend work guidance

## Ownership

- `app.js`: public GitHub data, commit-tree caching, snapshot fallback, projected 3D folder graph, search, file links, history, and drawers.
- `styles.css`: full-viewport layout, desktop/phone adaptation, restrained themes, focus and other interaction states.
- `engine/`, `visualizers/`, and `audio/` contain the original experimental modules. The live application does not import them.

## Contracts

- Construct GitHub URLs from the selected commit SHA and individually encoded path segments. Render repository-provided text with DOM text APIs.
- Preserve the current graph on API failure. Guard async requests so an old repository or timeline selection cannot replace a newer one.
- Real folder structure determines edges. Hover and Files expose full paths when labels collide.
- Automatic rotation and audio are off by default. Support drag, wheel, pinch, native file links, and reduced motion.
- Full-screen inspection must leave the graph visible without document scrolling. Drawers are optional, dismissible overlays.

## Verification

Run `node --check src/app.js`. Exercise canvas-node navigation, search and empty results, folder focus, drawer keyboard access, history/playback, API failure, and desktop/phone layout in a real browser.
