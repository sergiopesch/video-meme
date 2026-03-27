# Video Meme Editor API

Express API for deterministic meme rendering.

## Responsibilities
- accept image/video uploads
- normalize preset + caption + trim input
- run FFmpeg renders
- expose preset metadata
- serve rendered MP4 output files

## Main endpoints
- `GET /api/health`
- `GET /api/templates`
- `POST /api/renders`

Legacy aliases are still supported:
- `GET /meme-templates`
- `POST /generate-meme`

## Notes
- Rendering uses the system `ffmpeg`/`ffprobe` binaries by default.
- Caption styling is preset-driven.
- Uploaded files are treated as temporary and are deleted after rendering.
- Rendered output lands in `public/output/` unless overridden with env vars.
