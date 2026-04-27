# Video Meme Editor API

Express API for deterministic meme rendering.

## Responsibilities
- accept image/video uploads
- fetch supported remote media URLs with private-network blocking and byte limits
- normalize preset + caption + trim input
- normalize optional text anchor coordinates from the preview composer
- run FFmpeg renders
- expose preset metadata
- serve rendered GIF output files
- support remix presets that can mask common meme text zones before replacement copy

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
- Remote URL imports reject private, loopback, link-local, and other non-public addresses unless `ALLOW_PRIVATE_MEDIA_URLS=true`.
- Remote HTML page imports use `MAX_REMOTE_HTML_SIZE` before YouTube-style stream extraction.
- Rendered output lands in `public/output/` unless overridden with env vars.
