const fs = require('fs/promises');
const path = require('path');
const dns = require('dns/promises');
const net = require('net');
const { randomUUID } = require('crypto');
const { createHttpError } = require('../utils/errors');

const FETCH_TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 5;
const DEFAULT_MAX_REMOTE_HTML_SIZE = 2 * 1024 * 1024;
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

function normalizeHostname(hostname) {
  return String(hostname || '').replace(/^\[|\]$/g, '').toLowerCase();
}

function isPrivateIPv4(address) {
  const parts = address.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [first, second] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function isPrivateIPv6(address) {
  const normalized = normalizeHostname(address);
  const lower = normalized.toLowerCase();

  if (lower === '::' || lower === '::1') {
    return true;
  }

  const mappedIpv4 = lower.match(/(?:::ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedIpv4) {
    return isPrivateIPv4(mappedIpv4[1]);
  }

  return (
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80:') ||
    lower.startsWith('ff')
  );
}

function isPrivateIpAddress(address) {
  const ipVersion = net.isIP(normalizeHostname(address));

  if (ipVersion === 4) {
    return isPrivateIPv4(normalizeHostname(address));
  }

  if (ipVersion === 6) {
    return isPrivateIPv6(address);
  }

  return true;
}

async function assertPublicMediaUrl(targetUrl, env) {
  const parsedUrl = targetUrl instanceof URL ? targetUrl : new URL(targetUrl);

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw createHttpError(400, 'mediaUrl must use http or https.');
  }

  if (env.allowPrivateMediaUrls) {
    return;
  }

  const hostname = normalizeHostname(parsedUrl.hostname);

  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw createHttpError(400, 'mediaUrl must resolve to a public internet address.');
  }

  if (net.isIP(hostname)) {
    if (isPrivateIpAddress(hostname)) {
      throw createHttpError(400, 'mediaUrl must resolve to a public internet address.');
    }

    return;
  }

  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch (error) {
    throw createHttpError(400, 'Could not resolve the media URL hostname.', error.message);
  }

  if (!addresses.length || addresses.some((entry) => isPrivateIpAddress(entry.address))) {
    throw createHttpError(400, 'mediaUrl must resolve to a public internet address.');
  }
}

function isRedirectResponse(response) {
  return [301, 302, 303, 307, 308].includes(response.status);
}

async function fetchWithTimeout(targetUrl, env, redirectsRemaining = MAX_REDIRECTS) {
  const parsedUrl = targetUrl instanceof URL ? targetUrl : new URL(targetUrl);
  await assertPublicMediaUrl(parsedUrl, env);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(parsedUrl, {
      redirect: 'manual',
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

  if (!isRedirectResponse(response)) {
    return response;
  }

  if (redirectsRemaining <= 0) {
    throw createHttpError(400, 'Media URL redirected too many times.');
  }

  const location = response.headers.get('location');
  if (!location) {
    throw createHttpError(400, 'Media URL returned a redirect without a location.');
  }

  await response.body?.cancel?.();
  return fetchWithTimeout(new URL(location, parsedUrl), env, redirectsRemaining - 1);
}

async function streamResponseToBuffer(response, maxBytes, overflowMessage) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of response.body) {
    const buffer = Buffer.from(chunk);
    totalBytes += buffer.length;

    if (totalBytes > maxBytes) {
      throw createHttpError(413, overflowMessage);
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks, totalBytes);
}

async function writeResponseBodyToFile(response, targetPath, maxBytes) {
  const fileHandle = await fs.open(targetPath, 'w');
  let totalBytes = 0;

  try {
    for await (const chunk of response.body) {
      const buffer = Buffer.from(chunk);
      totalBytes += buffer.length;

      if (totalBytes > maxBytes) {
        throw createHttpError(413, `Remote media exceeds the ${formatLimit(maxBytes)} upload limit.`);
      }

      await fileHandle.write(buffer);
    }
  } catch (error) {
    await fs.rm(targetPath, { force: true });
    throw error;
  } finally {
    await fileHandle.close();
  }

  return totalBytes;
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

  const targetExtension = extension || EXTENSION_BY_MIME[mimeType] || '';
  const baseName = sanitizeBaseName(fileBaseName || path.basename(parsedSourceUrl.pathname, extension) || parsedSourceUrl.hostname);
  const originalname = `${baseName}${targetExtension}`;
  const targetPath = path.join(env.paths.uploadsDir, `remote-${randomUUID()}${targetExtension}`);
  const size = await writeResponseBodyToFile(response, targetPath, env.maxUploadSize);

  if (size === 0) {
    await fs.rm(targetPath, { force: true });
    throw createHttpError(400, 'The provided media URL returned an empty file.');
  }

  return {
    path: targetPath,
    originalname,
    mimetype: mimeType,
    size,
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

  const initialResponse = await fetchWithTimeout(parsedUrl, env);
  const initialContentType = normalizeContentType(initialResponse.headers.get('content-type'));

  if (isHtmlContentType(initialContentType)) {
    const contentLength = Number(initialResponse.headers.get('content-length') || 0);
    const htmlLimit = env.maxRemoteHtmlSize || DEFAULT_MAX_REMOTE_HTML_SIZE;

    if (Number.isFinite(contentLength) && contentLength > htmlLimit) {
      throw createHttpError(413, `Remote page exceeds the ${formatLimit(htmlLimit)} page import limit.`);
    }

    const html = (await streamResponseToBuffer(
      initialResponse,
      htmlLimit,
      `Remote page exceeds the ${formatLimit(htmlLimit)} page import limit.`,
    )).toString('utf8');
    const resolvedSource = resolveYouTubeMediaSource(parsedUrl, html);

    if (!resolvedSource?.mediaUrl) {
      throw createHttpError(
        400,
        'Only direct image/video URLs and supported YouTube page URLs are accepted right now.'
      );
    }

    const mediaResponse = await fetchWithTimeout(resolvedSource.mediaUrl, env);
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
