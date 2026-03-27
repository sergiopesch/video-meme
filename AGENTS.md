# video-meme Codex Guide

## Purpose
video-meme is a deterministic meme editor that renders short GIFs from uploaded files or supported media URLs. The product is not an AI generator. Preserve that positioning in code, docs, and UX.

## Stack
- Root workspace: npm
- Client: React 19 + Vite
- Server: Express + Multer + FFmpeg/FFprobe
- Tests: Node test runner
- Lint: ESLint in client only

## Repo Workflow
Install:
- `npm run install-all`

Run locally:
- `npm run dev`

Validate full repo:
- `npm test`
- `npm run lint`
- `npm run build`

## Architecture
Client responsibilities:
- fetch preset metadata from `/api/templates`
- collect upload or remote media input
- collect caption and trim inputs
- preview render results

Server responsibilities:
- validate and normalize render requests
- fetch remote media when `mediaUrl` is supplied
- render GIF output with FFmpeg
- return structured render metadata
- serve `/output/*`

Important files:
- `client/src/App.jsx`: main editor flow
- `client/src/lib/api.js`: API URL resolution and fetch wrapper
- `client/src/lib/trim.js`: trim normalization helpers
- `server/src/routes/api.js`: HTTP boundary
- `server/src/validation/renderRequest.js`: request normalization
- `server/src/services/renderService.js`: render orchestration
- `server/src/services/ffmpegService.js`: FFmpeg/FFprobe execution
- `server/src/presets/presetRegistry.js`: product template registry

## Change Rules
- Reuse existing npm scripts. Do not invent alternate workflows.
- Keep route handlers thin. Put business logic in services or validation modules.
- Treat `presetRegistry` as product behavior, not a dumping ground for unrelated logic.
- When changing request or response shapes, update tests and relevant README files in the same change.
- Do not introduce dependencies without clear need.
- Do not hardcode localhost URLs in client code.
- Preserve the deterministic render model. Do not drift the repo back toward AI-generation assumptions.

## Verification Policy
For backend-only changes:
- `npm --prefix server test`

For frontend-only changes:
- `npm --prefix client test`
- `npm --prefix client run lint`
- `npm --prefix client run build`

For API contracts, presets, render pipeline, shared behavior, or uncertainty:
- `npm test`
- `npm run lint`
- `npm run build`

## Documentation Policy
Update docs when any of these change:
- setup commands
- environment variables
- API contract
- preset behavior
- user-visible render behavior
- local development workflow

Relevant docs:
- `README.md`
- `client/README.md`
- `server/README.md`

## Notes
CI is present in `.github/workflows/ci.yml`, but its test step is commented out and does not reflect the current repo state. Treat local verification scripts as the source of truth unless CI is updated.
