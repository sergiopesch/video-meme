export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toFiniteNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function roundToTenth(value) {
  return Math.round(value * 10) / 10;
}

function floorToTenth(value) {
  return Math.floor((value + 0.000001) * 10) / 10;
}

export function formatSeconds(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }

  const rounded = roundToTenth(value);
  return Number.isInteger(rounded) ? `${rounded}s` : `${rounded.toFixed(1)}s`;
}

export function normalizeVideoTrim(draft, preset, sourceDuration) {
  if (!preset) {
    return {
      startSeconds: roundToTenth(Math.max(toFiniteNumber(draft?.startSeconds), 0)),
      durationSeconds: roundToTenth(Math.max(toFiniteNumber(draft?.durationSeconds), 0)),
    };
  }

  const requestedStart = toFiniteNumber(draft?.startSeconds, preset.trim.minStartSeconds || 0);
  const requestedDuration = roundToTenth(toFiniteNumber(draft?.durationSeconds, preset.trim.defaultDurationSeconds));
  const minStart = preset.trim.minStartSeconds || 0;
  const presetMinDuration = preset.trim.minDurationSeconds;
  const presetMaxDuration = preset.trim.maxDurationSeconds;
  const roundedStart = roundToTenth(requestedStart);

  if (!Number.isFinite(sourceDuration) || sourceDuration <= 0) {
    return {
      startSeconds: Math.max(roundedStart, minStart),
      durationSeconds: clamp(requestedDuration, presetMinDuration, presetMaxDuration),
    };
  }

  const boundedMaxDuration = Math.min(presetMaxDuration, sourceDuration);
  const effectiveMinDuration = Math.min(presetMinDuration, boundedMaxDuration || presetMinDuration);
  const maxStart = floorToTenth(Math.max(sourceDuration - effectiveMinDuration, minStart));
  const startSeconds = clamp(roundedStart, minStart, maxStart);
  const remainingDuration = Math.max(sourceDuration - startSeconds, effectiveMinDuration);
  const durationLimit = Math.max(effectiveMinDuration, floorToTenth(Math.min(boundedMaxDuration, remainingDuration)));
  const durationSeconds = clamp(requestedDuration, effectiveMinDuration, durationLimit);

  return {
    startSeconds,
    durationSeconds,
  };
}

export function buildTrimState({ preset, sourceDuration, startSeconds, durationSeconds }) {
  if (!preset) {
    return null;
  }

  const normalized = normalizeVideoTrim({ startSeconds, durationSeconds }, preset, sourceDuration);
  const maxDuration = Number.isFinite(sourceDuration) && sourceDuration > 0
    ? Math.min(preset.trim.maxDurationSeconds, sourceDuration)
    : preset.trim.maxDurationSeconds;
  const minDuration = Number.isFinite(sourceDuration) && sourceDuration > 0
    ? Math.min(preset.trim.minDurationSeconds, maxDuration || preset.trim.minDurationSeconds)
    : preset.trim.minDurationSeconds;
  const maxStart = Number.isFinite(sourceDuration) && sourceDuration > 0
    ? floorToTenth(Math.max(sourceDuration - minDuration, preset.trim.minStartSeconds || 0))
    : null;
  const durationLimit = Number.isFinite(sourceDuration) && sourceDuration > 0
    ? Math.max(minDuration, floorToTenth(Math.min(maxDuration, sourceDuration - normalized.startSeconds)))
    : maxDuration;
  const endSeconds = Number.isFinite(sourceDuration) && sourceDuration > 0
    ? Math.min(normalized.startSeconds + normalized.durationSeconds, sourceDuration)
    : normalized.startSeconds + normalized.durationSeconds;
  const remainingSeconds = Number.isFinite(sourceDuration) && sourceDuration > 0
    ? Math.max(sourceDuration - endSeconds, 0)
    : null;
  const offsetPercent = Number.isFinite(sourceDuration) && sourceDuration > 0
    ? (normalized.startSeconds / sourceDuration) * 100
    : 0;
  const selectedPercent = Number.isFinite(sourceDuration) && sourceDuration > 0
    ? (normalized.durationSeconds / sourceDuration) * 100
    : 0;

  return {
    ...normalized,
    sourceDuration: Number.isFinite(sourceDuration) && sourceDuration > 0 ? roundToTenth(sourceDuration) : null,
    minDuration,
    maxDuration,
    maxStart,
    durationLimit,
    endSeconds: roundToTenth(endSeconds),
    remainingSeconds: remainingSeconds == null ? null : roundToTenth(remainingSeconds),
    offsetPercent,
    selectedPercent,
  };
}
