# Video Meme Editor

A deterministic meme editor that turns an uploaded image or short video clip into a shareable MP4.

This repo has been refocused away from AI generation. The product direction now starts with dependable editing and rendering:

- upload an **image** or **short video clip**
- choose a **preset/template**
- add **top text, bottom text, and/or caption text**
- trim **video** input with start + duration controls
- render a short **MP4 meme video** with FFmpeg

## What this slice delivers

### Backend
- modular Express API instead of a single monolithic file
- FFmpeg render pipeline for image-to-video and video-to-video meme rendering
- structured preset registry returned by the API
- static output hosting for rendered MP4 files
- legacy route aliases kept for the old `/generate-meme` and `/meme-templates` paths

### Frontend
- preset-first meme editor UI
- image/video upload with local preview
- caption inputs driven by preset metadata
- trim controls for video sources
- render preview with download/copy-link actions
- API base URL helper plus Vite proxy config so the client no longer hardcodes `localhost`

### Tests
- preset registry metadata tests
- render service tests that execute the real FFmpeg pipeline
- HTTP API integration test for preset listing + render endpoint
- client helper test for API URL resolution

## Architecture

```text
client/                 React editor
server/
  src/
    app.js              app factory
    routes/api.js       HTTP routes
    presets/            preset registry
    services/           FFmpeg + render pipeline
    validation/         request normalization
    uploads.js          multipart handling
```

## Presets

The preset system is now the foundation for a future template library. Each preset exposes:

- output dimensions + fps
- trim limits and default duration
- supported input types
- text slots and max lengths
- styling metadata for both server render and client UI

Current presets are intentionally small and foundation-focused:

- `classic-impact`
- `caption-punch`
- `story-stack`

## Running locally

### Prerequisites
- Node.js 20+
- npm
- `ffmpeg` and `ffprobe` on PATH
- a usable bold font for FFmpeg drawtext (the default is DejaVu Sans Bold)

### Install

```bash
npm run install-all
```

### Start development mode

```bash
npm run dev
```

- API: `http://127.0.0.1:5000`
- Client: `http://127.0.0.1:5173`

### Environment

Copy `.env.example` or `server/.env.example` if you want to override paths, font, or API base settings.

Key variables:

- `PORT`
- `MAX_UPLOAD_SIZE`
- `FFMPEG_BIN`
- `FFPROBE_BIN`
- `FONT_PATH`
- `VITE_API_BASE_URL`
- `VITE_API_PROXY_TARGET`

## API

### `GET /api/templates`
Returns structured preset metadata.

### `POST /api/renders`
Multipart form-data fields:

- `media` — image or video file
- `presetId`
- `topText`
- `bottomText`
- `caption`
- `startSeconds` (video only)
- `durationSeconds`

Response shape:

```json
{
  "success": true,
  "outputUrl": "/output/meme-<id>.mp4",
  "preset": {
    "id": "classic-impact"
  },
  "render": {
    "inputType": "image",
    "durationSeconds": 4,
    "width": 1080,
    "height": 1080
  }
}
```

## Verification

Useful commands:

```bash
npm test
npm run lint
npm run build
```

## Deliberate non-goals in this slice

Not implemented yet:

- YouTube/import URL ingestion
- a large preset marketplace/catalog
- timeline editing beyond start + duration trim
- sticker layers, audio track editing, or multi-scene composition
- cloud storage / user accounts / persistence

Those are future seams, not missing by accident.
