# lolbeans_io-tools

Handy dandy tools for improving your LOLBeans gameplay.

## In-closure diagnostics

`lolbeans.js` includes a **read-only** diagnostic hook, `window.__lolbeansDiagnostics()`, inserted at the end of the game's main IIFE so it can inspect the private player/physics variables (`Mo`, `To`, `Co`, `Eo`, and `xo`).

The hook reports player IDs/state, position and velocity, input flags, scene/camera details, and physics object count. It does not change inputs, movement, or physics.

### Important: the live site does not load this repository's copy

Committing `lolbeans.js` to GitHub does not modify the JavaScript served by `https://lolbeans.io/`. The bookmarklet in `BOOKMARKLET.txt` only displays the report; it cannot create the private-scope hook or replace the site's already-running bundle.

To use the hook, the browser must execute this patched bundle in place of the site's original bundle **before the game initializes** (for example, through a suitable local resource override or a local test setup). Merely opening the raw GitHub URL or running the bookmarklet on the unmodified live site will not work.

See `BOOKMARKLET.txt` for the report-panel bookmarklet and its expected output.
