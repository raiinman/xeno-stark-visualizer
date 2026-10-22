# Xeno-Stark

[Open the visualizer](https://raiinman.github.io/xeno-stark-visualizer/)

A quiet, full-window GitHub file map with a Stark/Alien holographic feel. The graph is the interface: file nodes open their actual GitHub pages in a new tab, folder nodes focus the map, and the bottom timeline explores real commits.

- Drag to rotate, scroll or pinch to zoom, and use Fit view to reset.
- Search by file name or path. The Files drawer provides ordinary, keyboard-accessible links.
- Replay or scrub up to 40 recent commits. Links always point to the selected commit.
- View options contains the display theme, file-name toggle, and public repository switcher. A repository can also be shared with `?repo=owner/repository`.
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
