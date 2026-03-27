const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const { createHttpError } = require('../utils/errors');

const FETCH_TIMEOUT_MS = 15000;
const HTML_CONTENT_TYPES = new Set(['text/html', 'application/xhtml+xml']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.mkv']);
const MIME_BY_EXTENSION = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
};
const EXTENSION_BY_MIME = Object.entries(MIME_BY_EXTENSION).reduce((map, [extension, mimeType]) => {
  map[mimeType] = extension;
  return map;
}, {});

function formatLimit(maxBytes) {
  return `${Math.round(maxBytes / 1024 / 1024)}MB`;
}

function normalizeContentType(value) {
  return String(value || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
}

function sanitizeBaseName(value) {
  return String(value || 'remote-media')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'remote-media';
}

function inferExtension(urlPath, contentType) {
  const extensionFromUrl = path.extname(urlPath || '').toLowerCase();

  if (IMAGE_EXTENSIONS.has(extensionFromUrl) || VIDEO_EXTENSIONS.has(extensionFromUrl)) {
    return extensionFromUrl;
  }

  return EXTENSION_BY_MIME[contentType] || '';
}

function inferMimeType(contentType, extension) {
  if (contentType && (contentType.startsWith('image/') || contentType.startsWith('video/'))) {
    return contentType;
  }

  return MIME_BY_EXTENSION[extension] || '';
}

function isHtmlContentType(contentType) {
  return HTML_CONTENT_TYPES.has(contentType);
}

async function fetchWithTimeout(targetUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(targetUrl, {
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createHttpError(408, 'Timed out while fetching the media URL.');
    }

    throw createHttpError(400, 'Could not download the provided media URL.', error.message);
  } finally {
    clearTimeout(timeout);
  }
}

function extractJsonObjectAfterMarker(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const startIndex = source.indexOf('{', markerIndex + marker.length);
  if (startIndex === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const character = source[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (character === '\\') {
        isEscaped = true;
        continue;
      }

      if (character === '"') {
        inString = false;
      }

      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === '{') {
      depth += 1;
      continue;
    }

    if (character === '}') {
      depth -= 1;

      if (depth === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function parseYouTubePlayerResponse(html) {
  const markers = [
    'var ytInitialPlayerResponse = ',
    'ytInitialPlayerResponse = ',
    'window["ytInitialPlayerResponse"] = ',
    '"ytInitialPlayerResponse":',
  ];

  for (const marker of markers) {
    const jsonText = extractJsonObjectAfterMarker(html, marker);

    if (!jsonText) {
      continue;
    }

    try {
      return JSON.parse(jsonText);
    } catch (_error) {
      // keep scanning other markers
    }
  }

  return null;
}

function selectYouTubeStream(playerResponse) {
  const streamingData = playerResponse?.streamingData;
  if (!streamingData) {
    return null;
  }

  const directCandidates = [
    ...(streamingData.formats || []).map((format) => ({ ...format, source: 'format' })),
    ...(streamingData.adaptiveFormats || []).map((format) => ({ ...format, source: 'adaptive' })),
  ].filter((format) => typeof format.url === 'string' && String(format.mimeType || '').startsWith('video/'));

  if (directCandidates.length > 0) {
    directCandidates.sort((left, right) => {
      const leftSourceScore = left.source === 'format' ? 0 : 1;
      const rightSourceScore = right.source === 'format' ? 0 : 1;
      if (leftSourceScore !== rightSourceScore) {
        return leftSourceScore - rightSourceScore;
      }

      const leftMimeScore = String(left.mimeType || '').includes('mp4') ? 0 : 1;
      const rightMimeScore = String(right.mimeType || '').includes('mp4') ? 0 : 1;
      if (leftMimeScore !== rightMimeScore) {
        return leftMimeScore - rightMimeScore;
      }

      return (Number(left.height) || Number(left.bitrate) || 0) - (Number(right.height) || Number(right.bitrate) || 0);
    });

    return directCandidates[0];
  }

  const cipheredCandidates = [
    ...(streamingData.formats || []),
    ...(streamingData.adaptiveFormats || []),
  ].filter(
    (format) =>
      String(format.mimeType || '').startsWith('video/') &&
      (typeof format.signatureCipher === 'string' || typeof format.cipher === 'string')
  );

  if (cipheredCandidates.length > 0) {
    throw createHttpError(
      400,
      'This YouTube URL requires signature deciphering, which is not bundled in this repo yet. Upload the clip or paste a direct media URL instead.'
    );
  }

  return null;
}

function resolveYouTubeMediaSource(pageUrl, html) {
  const playerResponse = parseYouTubePlayerResponse(html);

  if (!playerResponse) {
    return null;
  }

  const stream = selectYouTubeStream(playerResponse);
  if (!stream?.url) {
    throw createHttpError(
      400,
      'Could not find a directly downloadable video stream in that YouTube page. Upload the clip or paste a direct media URL instead.'
    );
  }

  return {
    mediaUrl: stream.url,
    title: playerResponse.videoDetails?.title || path.basename(pageUrl.pathname || '') || 'youtube-clip',
  };
}

async function downloadMediaResponse({ env, response, sourceUrl, fileBaseName }) {
  if (!response.ok) {
    throw createHttpError(400, `Media URL returned HTTP ${response.status}.`);
  }

  const contentType = normalizeContentType(response.headers.get('content-type'));
  const contentLength = Number(response.headers.get('content-length') || 0);

  if (Number.isFinite(contentLength) && contentLength > env.maxUploadSize) {
    throw createHttpError(413, `Remote media exceeds the ${formatLimit(env.maxUploadSize)} upload limit.`);
  }

  const parsedSourceUrl = new URL(sourceUrl);
  const extension = inferExtension(parsedSourceUrl.pathname, contentType);
  const mimeType = inferMimeType(contentType, extension);

  if (!mimeType || (!mimeType.startsWith('image/') && !mimeType.startsWith('video/'))) {
    throw createHttpError(
      400,
      'Only direct image/video URLs and supported YouTube page URLs are accepted right now.'
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length === 0) {
    throw createHttpError(400, 'The provided media URL returned an empty file.');
  }

  if (buffer.length > env.maxUploadSize) {
    throw createHttpError(413, `Remote media exceeds the ${formatLimit(env.maxUploadSize)} upload limit.`);
  }

  const targetExtension = extension || EXTENSION_BY_MIME[mimeType] || '';
  const baseName = sanitizeBaseName(fileBaseName || path.basename(parsedSourceUrl.pathname, extension) || parsedSourceUrl.hostname);
  const originalname = `${baseName}${targetExtension}`;
  const targetPath = path.join(env.paths.uploadsDir, `remote-${randomUUID()}${targetExtension}`);

  await fs.writeFile(targetPath, buffer);

  return {
    path: targetPath,
    originalname,
    mimetype: mimeType,
    size: buffer.length,
    sourceUrl,
  };
}

async function fetchRemoteMedia({ env, mediaUrl }) {
  const rawUrl = String(mediaUrl || '').trim();

  if (!rawUrl) {
    return null;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch (_error) {
    throw createHttpError(400, 'mediaUrl must be a valid http or https URL.');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw createHttpError(400, 'mediaUrl must use http or https.');
  }

  const initialResponse = await fetchWithTimeout(parsedUrl);
  const initialContentType = normalizeContentType(initialResponse.headers.get('content-type'));

  if (isHtmlContentType(initialContentType)) {
    const html = await initialResponse.text();
    const resolvedSource = resolveYouTubeMediaSource(parsedUrl, html);

    if (!resolvedSource?.mediaUrl) {
      throw createHttpError(
        400,
        'Only direct image/video URLs and supported YouTube page URLs are accepted right now.'
      );
    }

    const mediaResponse = await fetchWithTimeout(resolvedSource.mediaUrl);
    return downloadMediaResponse({
      env,
      response: mediaResponse,
      sourceUrl: resolvedSource.mediaUrl,
      fileBaseName: resolvedSource.title,
    });
  }

  return downloadMediaResponse({
    env,
    response: initialResponse,
    sourceUrl: parsedUrl.toString(),
  });
}

module.exports = {
  fetchRemoteMedia,
  parseYouTubePlayerResponse,
  resolveYouTubeMediaSource,
};
