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
