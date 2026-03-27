const path = require('path');
const { createHttpError } = require('../utils/errors');
const { getDefaultPreset, getPresetById } = require('../presets/presetRegistry');

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parsePositiveNumber(rawValue, fallback) {
  const value = Number(rawValue);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizeText(value, maxLength) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  return normalized.slice(0, maxLength);
}

function parseLegacySettings(rawSettings) {
  if (!rawSettings) {
    return {};
  }

  if (typeof rawSettings === 'object') {
    return rawSettings;
  }

  try {
    return JSON.parse(rawSettings);
  } catch (_error) {
    throw createHttpError(400, 'settings must be valid JSON when provided.');
  }
}

function parseJsonObject(rawValue, fieldName) {
  if (!rawValue) {
    return {};
  }

  if (typeof rawValue === 'object' && rawValue !== null) {
    return rawValue;
  }

  if (typeof rawValue === 'string') {
    try {
      const parsedValue = JSON.parse(rawValue);
      if (typeof parsedValue === 'object' && parsedValue !== null) {
        return parsedValue;
      }
    } catch (_error) {
      // handled below
    }
  }

  throw createHttpError(400, `${fieldName} must be a valid JSON object when provided.`);
}

function normalizeTextLayout(rawLayout, slotIds) {
  const parsedLayout = parseJsonObject(rawLayout, 'textLayout');
  const normalizedLayout = {};

  for (const slotId of slotIds) {
    const entry = parsedLayout?.[slotId];
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const x = Number(entry.x);
    const y = Number(entry.y);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }

    normalizedLayout[slotId] = {
      x: clamp(x, 0.05, 0.95),
      y: clamp(y, 0.05, 0.95),
    };
  }

  return normalizedLayout;
}

function inferInputType(file) {
  if (!file) {
    return null;
  }

  if (file.mimetype === 'image/gif') {
    return 'video';
  }

  if (file.mimetype.startsWith('image/')) {
    return 'image';
  }

  if (file.mimetype.startsWith('video/')) {
    return 'video';
  }

  const extension = path.extname(file.originalname || '').toLowerCase();

  if (extension === '.gif') {
    return 'video';
  }

  if (['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
    return 'image';
  }

  if (['.mp4', '.mov', '.webm', '.mkv'].includes(extension)) {
    return 'video';
  }

  return null;
}

function normalizeRenderRequest({ body, file }) {
  if (!file) {
    throw createHttpError(400, 'Upload an image or video file, or provide a direct media URL, before rendering.');
  }

  const legacySettings = parseLegacySettings(body.settings);
  const requestedPresetId = body.presetId || body.template || legacySettings.presetId;
  const preset = requestedPresetId
    ? getPresetById(requestedPresetId)
    : getDefaultPreset();
  const inputType = inferInputType(file);

  if (!preset) {
    throw createHttpError(400, 'Unknown preset requested.');
  }

  if (!inputType) {
    throw createHttpError(400, 'Unsupported upload type. Use an image or short video clip.');
  }

  if (!preset.inputTypes.includes(inputType)) {
    throw createHttpError(400, `${preset.name} does not support ${inputType} input.`);
  }

  const topSlot = preset.textSlots.find((slot) => slot.id === 'topText');
  const bottomSlot = preset.textSlots.find((slot) => slot.id === 'bottomText');
  const captionSlot = preset.textSlots.find((slot) => slot.id === 'caption');

  const topText = normalizeText(body.topText ?? legacySettings.topText, topSlot?.maxLength || 80);
  const bottomText = normalizeText(body.bottomText ?? legacySettings.bottomText, bottomSlot?.maxLength || 80);
  const caption = normalizeText(body.caption ?? legacySettings.caption, captionSlot?.maxLength || 120);

  const requestedStart = parsePositiveNumber(body.startSeconds ?? legacySettings.startSeconds, 0);
  const requestedDuration = parsePositiveNumber(
    body.durationSeconds ?? legacySettings.durationSeconds,
    preset.trim.defaultDurationSeconds,
  );
  const textLayout = normalizeTextLayout(
    body.textLayout ?? legacySettings.textLayout,
    preset.textSlots.map((slot) => slot.id),
  );

  return {
    preset,
    presetId: preset.id,
    inputType,
    mediaPath: file.path,
    fileName: file.originalname,
    mimeType: file.mimetype,
    topText,
    bottomText,
    caption,
    textLayout,
    startSeconds: clamp(requestedStart, preset.trim.minStartSeconds, Number.MAX_SAFE_INTEGER),
    durationSeconds: clamp(
      requestedDuration,
      preset.trim.minDurationSeconds,
      preset.trim.maxDurationSeconds,
    ),
  };
}

module.exports = {
  normalizeRenderRequest,
  clamp,
};
