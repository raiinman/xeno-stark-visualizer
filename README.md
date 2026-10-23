# Xeno-Stark

[Open the visualizer](https://raiinman.github.io/xeno-stark-visualizer/)

The original Stark/Alien holographic graph in a full-window GitHub file map. Glowing hexagonal cores float among 3D gimbal rings and flowing biomechanical tendrils. The graph is the interface: file nodes summon their actual contents in a floating holographic pane, folder nodes focus the map, and the bottom timeline explores real commits.

- Drag to rotate, scroll or pinch to zoom, and use Fit view to reset. The original slow automatic orbit pauses while hovering a node and respects reduced motion.
- Click a file to project its code or image inside the visualizer. Dismiss the pane with Escape or its close control. Open on GitHub is available as a secondary action.
- Open several files at once. Drag their title bars, resize from any edge or corner, and use Tile files to arrange them. Double-click a title bar or use its maximize control to expand/restore it. Long source lines wrap by default; each window has a Wrap toggle. Focus a title bar or the bottom-right resize grip and use arrow keys for keyboard positioning/sizing.
- Your open files, window positions/sizes, stacking order, wrapping, and maximized state are remembered per repository in this browser. Refresh to resume the same file versions and layout. Smaller viewports keep restored windows on screen. Clearing site data clears these saved layouts.
- Minimize an individual pane to park it in the dock, or use Show graph to park every pane. Dock buttons restore the same files and window geometry. Minimized state is remembered across refreshes too.
- Explore jumps to the restored repository command deck below the visualizer. Browse an owner's recent public repositories, inspect real commit changes, focus folder sectors, project tracked AGENTS.md files, switch display themes/layouts, and export the graph or current repository snapshot.
- Search by file name or path. The Files drawer provides keyboard access to the same holographic previews.
- Replay or scrub up to 40 recent commits. Previews and their GitHub links always point to the selected commit.
- View options contains the original Orbital Rings, Xeno Helix, and Hive Sphere layouts, the three display themes, a file-name toggle, and the public repository switcher. A repository can also be shared with `?repo=owner/repository`.
- Connections represent the actual folder hierarchy, not inferred dependencies. Changed file nodes briefly highlight when history advances or a new commit arrives.

The page reads public GitHub data without a token and checks for updates every five minutes while visible. Each deployment also includes a real Git snapshot so the default repository remains viewable when the API is unavailable. Loading other repositories or older commit trees requires GitHub API access and is subject to its public request limits.

## Run locally

No packages or build framework are required. Use Node.js 22 or later:

```sh
node scripts/snapshot.mjs
```

Serve the repository with a static HTTP server and open `index.html`. ES modules require HTTP rather than opening the file directly.

## Publish

Pushing to `main` runs `.github/workflows/pages.yml`. It creates the repository snapshot from Git, packages the site, and deploys it to GitHub Pages. Configure the repository's Pages source as **GitHub Actions**.

The original analyzer (`scripts/analyze.mjs`) and engine experiments remain available as development utilities; the deployed map runs from `src/app.js` and `src/styles.css`.

## License

MIT. See [LICENSE](LICENSE) and [DOX-LICENSE.txt](DOX-LICENSE.txt).

The selected repository, visual theme, and graph topology are remembered in this browser. Explicit repository links take priority. Scroll over the graph to reach the command deck below; use Ctrl/Command + scroll or the zoom buttons to zoom. On touch screens, swipe vertically to scroll and horizontally to rotate.
