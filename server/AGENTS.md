# Server Guide

## Scope
The server owns media ingestion, request normalization, preset lookup, FFmpeg rendering, and output metadata.

## Important Files
- `src/app.js`: app assembly
- `src/routes/api.js`: HTTP routes and upload wiring
- `src/validation/renderRequest.js`: normalization and bounds
- `src/services/remoteMediaService.js`: remote URL ingestion
- `src/services/renderService.js`: render pipeline
- `src/services/ffmpegService.js`: process execution
- `src/presets/presetRegistry.js`: preset definitions

## Rules
- Keep routes thin.
- Put validation in `validation/`.
- Put rendering and external-process logic in `services/`.
- Clean up temporary files in the same flows that create or acquire them.
- When changing presets, keep metadata consistent across supported input types, trim limits, text slots, output/export metadata, and client expectations.
- When changing output shape or error behavior, update API tests.

## Required Checks
- `npm --prefix server test`

## Extra Checks For Render Or Preset Changes
- `npm test`
