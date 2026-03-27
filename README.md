# GIF Meme Editor

A deterministic meme editor that turns an uploaded image or short video clip into a mobile-share GIF.

This repo is a minimal GIF remix tool:

- open the app and see featured GIFs
- search for another GIF or upload your own media
- add one strong caption
- export a short shareable GIF

## What this slice delivers

### Backend
- modular Express API instead of a single monolithic file
- FFmpeg render pipeline for image/video to GIF rendering
- structured preset registry returned by the API
- explicit GIF export metadata in preset + render responses
- static output hosting for rendered GIF files
- legacy route aliases kept for the old `/generate-meme` and `/meme-templates` paths

### Frontend
- one-page GIF-first editor UI
- mode switch for quick captioning vs remixing an existing meme
- image/video upload with local preview
- featured GIF discovery and GIF search through a server-side GIPHY integration
- direct image/video URL ingestion for remotely hosted assets
- bounded YouTube page ingestion when the page exposes a directly downloadable stream URL
- a single caption-focused editing flow
- remix flow that masks common top/bottom meme text zones before applying replacement copy
- automatic short GIF duration defaults for video sources
- pre-render interactive preview where text can be dragged into place before generation
- GIF preview with download/copy-link actions and native mobile share when available
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

## Editor Profile

The current product uses two editing profiles:

- `caption-punch`
- `classic-remix`

`caption-punch` keeps the interface intentionally small and supports:

- one caption field
- GIF-safe duration limits
- image and video inputs

`classic-remix` is tuned for editing existing memes:

- top + bottom replacement text fields
- automatic masking of common top/bottom text zones
- replacement text auto-formatted to classic uppercase meme styling
- GIF-safe duration limits
- image and video inputs

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

## Deploying Free On Render

This repo is set up to run as a single free Render web service:

- the React client is built during deploy
- the Express server serves both the API and the built frontend
- FFmpeg is installed in the container image

Included deployment files:

- `Dockerfile`
- `render.yaml`

### Recommended free setup

1. Push the repo to GitHub.
2. In Render, create a new Blueprint or Web Service from this repo.
3. Use the free instance type.
4. Keep the default health check at `/api/health`.

The `render.yaml` file already sets a hobby-friendly upload cap of `20 MB` to keep mobile uploads and GIF renders snappy on the free tier.

### Free-tier caveats

- Render free web services spin down after idle time and can take about a minute to wake up again.
- The filesystem is ephemeral, so generated GIFs are temporary and can disappear after a restart, redeploy, or spin-down.
- This setup is ideal for hobby use, testing, and playful experimentation, not durable long-term media storage.

### Environment

Copy `.env.example` or `server/.env.example` if you want to override paths, font, or API base settings.

Key variables:

- `PORT`
- `MAX_UPLOAD_SIZE`
- `GIPHY_API_KEY`
- `FFMPEG_BIN`
- `FFPROBE_BIN`
- `FONT_PATH`
- `VITE_API_BASE_URL`
- `VITE_API_PROXY_TARGET`

Add `GIPHY_API_KEY` in Render if you want the homepage to show featured GIFs and search results.

## API

### `GET /api/gifs/featured`
Returns the current trending GIFs from GIPHY when `GIPHY_API_KEY` is configured.

### `GET /api/gifs/search?q=<query>`
Searches GIPHY GIFs and returns a compact result set for the editor.

### `GET /api/templates`
Returns the active editor profile metadata.

### `POST /api/renders`
Multipart form-data fields:

- `media` — image or video file
- `mediaUrl` — direct image/video URL or a supported YouTube page URL when you want the server to fetch the source asset
- `presetId`
- `topText`
- `bottomText`
- `caption`
- `textLayout` (optional JSON map of slot IDs to normalized `{ x, y }` anchors, 0..1)
- `startSeconds` (video only)
- `durationSeconds`

Response shape:

```json
{
  "success": true,
  "outputUrl": "/output/meme-<id>.gif",
  "fileName": "meme-<id>.gif",
  "format": "gif",
  "mimeType": "image/gif",
  "preset": {
    "id": "story-stack"
  },
  "output": {
    "format": "gif",
    "mimeType": "image/gif",
    "hasAudio": false
  },
  "render": {
    "inputType": "image",
    "durationSeconds": 4,
    "width": 360,
    "height": 640,
    "fps": 12,
    "hasAudio": false
  }
}
```

### YouTube ingestion note

This slice supports a bounded YouTube import path: if the fetched page exposes a directly downloadable video stream URL in the page payload, the server can ingest it and continue through the normal FFmpeg render flow.

If the page only exposes ciphered/signature-protected streams, the API will reject it honestly and ask for a direct media URL or an uploaded clip instead.

## Verification

Useful commands:

```bash
npm test
npm run lint
npm run build
```

## Deliberate non-goals in this slice

Not implemented yet:

- full YouTube signature-decipher support for pages that do not expose a direct downloadable stream
- a large preset marketplace/catalog
- timeline editing beyond start + duration trim
- sticker layers, audio track editing, or multi-scene composition
- cloud storage / user accounts / persistence

Those are future seams, not missing by accident.
