# Repo Workflow

Use this skill when working in `video-meme`.

## Goal
Route changes to the correct package, use the repo's real scripts, and keep docs/tests aligned with behavior.

## Quick Start
1. Read `AGENTS.md`.
2. Identify whether the change is:
- client-only
- server-only
- shared contract or product behavior

3. Inspect the nearest relevant files before editing.

## Routing
Client work usually touches:
- `client/src/App.jsx`
- `client/src/components/*`
- `client/src/lib/*`

Server work usually touches:
- `server/src/routes/*`
- `server/src/validation/*`
- `server/src/services/*`
- `server/src/presets/*`

Shared behavior often requires:
- client changes
- server changes
- README updates
- broader verification

## Standard Commands
Install:
- `npm run install-all`

Dev:
- `npm run dev`

Full verification:
- `npm test`
- `npm run lint`
- `npm run build`

## When To Update Docs
Update docs in the same change when setup, API behavior, presets, or user-visible render behavior changes.
