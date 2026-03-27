# Verification

Use this skill before finishing work in `video-meme`.

## Choose The Smallest Useful Validation
Frontend-only:
- `npm --prefix client test`
- `npm --prefix client run lint`
- `npm --prefix client run build`

Backend-only:
- `npm --prefix server test`

Shared, uncertain, presets, API, rendering, or release-sensitive:
- `npm test`
- `npm run lint`
- `npm run build`

## Required Reporting
State:
- what you ran
- whether it passed
- any checks you could not run
- any remaining risk, especially around FFmpeg behavior or API contract drift

## Extra Attention Areas
- render pipeline changes can be test-green but still change output behavior
- preset changes affect both API metadata and UI expectations
- URL ingestion changes can affect backend validation and frontend instructions
