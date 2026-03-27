# Video Meme Editor Client

React + Vite editor for the deterministic meme rendering API.

## What changed
- the UI now behaves like a meme editor, not an AI demo
- presets are fetched from the API
- uploads support images and videos
- trim controls appear for video input
- render output is previewable and downloadable
- API URLs are resolved through a helper instead of hardcoded localhost strings

## Dev notes

### Default local flow
Vite proxies `/api` and `/output` to `http://127.0.0.1:5000` during development.

### When the API lives elsewhere
Set:

```bash
VITE_API_BASE_URL=https://your-api.example.com
```

Or override the local proxy target:

```bash
VITE_API_PROXY_TARGET=http://127.0.0.1:5000
```
