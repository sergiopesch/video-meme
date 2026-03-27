const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const { createHttpError } = require('../utils/errors');

const FETCH_TIMEOUT_MS = 15000;
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(parsedUrl, {
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

  if (!response.ok) {
    throw createHttpError(400, `Media URL returned HTTP ${response.status}.`);
  }

  const contentType = normalizeContentType(response.headers.get('content-type'));
  const contentLength = Number(response.headers.get('content-length') || 0);

  if (Number.isFinite(contentLength) && contentLength > env.maxUploadSize) {
    throw createHttpError(413, `Remote media exceeds the ${formatLimit(env.maxUploadSize)} upload limit.`);
  }

  const extension = inferExtension(parsedUrl.pathname, contentType);
  const mimeType = inferMimeType(contentType, extension);

  if (!mimeType || (!mimeType.startsWith('image/') && !mimeType.startsWith('video/'))) {
    throw createHttpError(
      400,
      'Only direct image or video URLs are supported right now. YouTube pages and generic web pages are not yet supported.'
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

  const baseName = sanitizeBaseName(path.basename(parsedUrl.pathname, extension) || parsedUrl.hostname);
  const targetExtension = extension || EXTENSION_BY_MIME[mimeType] || '';
  const originalname = `${baseName}${targetExtension}`;
  const targetPath = path.join(env.paths.uploadsDir, `remote-${randomUUID()}${targetExtension}`);

  await fs.writeFile(targetPath, buffer);

  return {
    path: targetPath,
    originalname,
    mimetype: mimeType,
    size: buffer.length,
    sourceUrl: parsedUrl.toString(),
  };
}

module.exports = {
  fetchRemoteMedia,
};
