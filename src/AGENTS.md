# Frontend work guidance

## Ownership

- `app.js`: public GitHub data, commit-tree caching, snapshot fallback, projected 3D folder graph, search, file links, history, and drawers.
- `hologram.js`: the restored original graph aesthetic: 3D orbital/helix/hive positions, perspective orbit, gimbal rings, glowing hexagonal cores, targeting reticles, tendrils, and flowing energy.
- `filePreview.js`: independent holographic file windows, per-window requests, safe text/image previews, pointer and keyboard move/resize, tiling, maximize/restore, wrapping, and secondary GitHub navigation.
- `repositoryExplorer.js`: restored command deck below the graph, public repository selection, real commit/file telemetry, folder focus, tracked AGENTS.md previews, display controls, and exports.
- `styles.css`: full-viewport layout, desktop/phone adaptation, original cyan/gold/acid themes, focus and other interaction states.
- `engine/`, `visualizers/`, and `audio/` contain the original experimental modules. The live application does not import them.

## Contracts

- `hologram.js` gives lenses distinct rendering: original fusion machinery, blue tactical circuitry, and green organic scanning. Topologies use folder orbital clusters, two intertwined helix strands, and spherical hive cells. Guides are decorative, never invented dependency links.
- The command deck previews the actual graph beside its selectors. Render that secondary canvas only while visible. Sector clusters browse/search files in place with bounded results and explicit pagination. Only Focus in graph or projecting a file navigates upward.
- Persist validated camera yaw, pitch, zoom, and orbit state with workspace settings. Debounce manual changes, periodically save orbit progress, and flush on pagehide/hidden. Do not reset the camera during repository loads. Keep reset/zoom/rotate buttons working.
- Display actual selected-repository commit authors with explicit authorship labels; app branding is separate.
- Summon the holographic preview from node and Files clicks. Fetch immutable raw content at the selected commit SHA; retain Open on GitHub as a secondary link. Insert source text with DOM text APIs; keep HTML and scripts inert. Bound text/image sizes and cancel stale requests.
- Preserve the current graph on API failure. Guard async requests so an old repository or timeline selection cannot replace a newer one.
- A cached pre-preview HTML shell must migrate once to a fresh shell before initializing. Keep the query's repository selection and avoid reload loops.
- Real folder structure determines edges. Hover and Files expose full paths when labels collide.
- File panes are nonmodal so users can open several files and still operate the graph. Each pane owns its request and geometry. Focus brings it forward; Escape dismisses the focused pane. History/repository changes close all panes. Preserve graph orbit pause while panes are open.
- Wrap source lines by default, including long tokens. Provide a per-pane Wrap toggle, title-bar drag, edge/corner resize, maximize/restore, Tile files, and keyboard arrow controls for title bars and resize grips. Clamp panes to the workspace after viewport changes.
- Save the selected repository, validated theme, and topology under xeno-stark:workspace:v1. Restore before initial loading and sync both control sets. An explicit valid repo query overrides storage. Tolerate unavailable or malformed storage.
- Save open panes, immutable commit references, geometry, stacking order, wrapping, and maximize/restore state in browser localStorage per repository. Debounce moves and flush on pagehide. Restore once after initial data loading, without overwriting saved layouts during startup or repository transitions. Validate stored records and tolerate unavailable storage.
- Minimized panes stay open and retain requests and geometry. Dock buttons restore them; Show graph minimizes every visible pane. Only visible panes participate in tiling or active-node targeting. Persist minimized state with schema 2, migrating schema 1 viewport coordinates into workspace-relative coordinates.
- Match the original slow automatic orbit by default. Pause orbit when a node is hovered, stop it during manual drag, and respect reduced motion. Audio stays off. Normal wheel and vertical touch gestures must scroll the page. Ctrl/Command plus wheel and zoom buttons zoom; horizontal touch drags rotate. Keep native file links.
- The graph, header, and timeline occupy 84% of the viewport (minimum 420px), exposing the explorer below. The page scrolls to the repository explorer underneath. File windows use workspace-relative absolute positions so they scroll away with the graph; previews opened from the explorer return to the graph. Drawers remain dismissible overlays.

## Verification

Run `node --check src/app.js`. Exercise canvas-node navigation, search and empty results, folder focus, drawer keyboard access, history/playback, API failure, and desktop/phone layout in a real browser.
