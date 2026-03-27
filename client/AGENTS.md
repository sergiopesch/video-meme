# Client Guide

## Scope
The client is a preset-first editor. Its job is to shape input, guide the user, and display the render result. Rendering logic belongs on the server.

## Important Files
- `src/App.jsx`: editor state, preset loading, render submission
- `src/components/*`: UI pieces
- `src/lib/api.js`: API base resolution
- `src/lib/trim.js`: trim math and display helpers

## Rules
- Keep API calls routed through `src/lib/api.js`.
- Keep trim calculations in `src/lib/trim.js` unless there is a strong reason to move them.
- Prefer small presentational components under `src/components`.
- Preserve the current product language around GIF rendering, presets, uploads, and remote media URLs.
- Avoid introducing frontend state machinery unless the existing local state model becomes clearly inadequate.

## Required Checks
- `npm --prefix client test`
- `npm --prefix client run lint`
- `npm --prefix client run build`
