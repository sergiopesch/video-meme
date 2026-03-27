import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrimState, formatSeconds, normalizeVideoTrim } from './trim.js';

const preset = {
  trim: {
    minStartSeconds: 0,
    minDurationSeconds: 1,
    defaultDurationSeconds: 4,
    maxDurationSeconds: 8,
  },
};

test('normalizeVideoTrim clamps duration to the remaining source length', () => {
  assert.deepEqual(
    normalizeVideoTrim({ startSeconds: 9.4, durationSeconds: 7 }, preset, 12),
    { startSeconds: 9.4, durationSeconds: 2.6 },
  );
});

test('normalizeVideoTrim clamps start to leave enough time for the minimum duration', () => {
  assert.deepEqual(
    normalizeVideoTrim({ startSeconds: 11.8, durationSeconds: 2 }, preset, 12),
    { startSeconds: 11, durationSeconds: 1 },
  );
});

test('buildTrimState exposes window bounds and remaining time', () => {
  assert.deepEqual(
    buildTrimState({ preset, sourceDuration: 12, startSeconds: 3.2, durationSeconds: 4.5 }),
    {
      startSeconds: 3.2,
      durationSeconds: 4.5,
      sourceDuration: 12,
      minDuration: 1,
      maxDuration: 8,
      maxStart: 11,
      durationLimit: 8,
      endSeconds: 7.7,
      remainingSeconds: 4.3,
      offsetPercent: 26.666666666666668,
      selectedPercent: 37.5,
    },
  );
});

test('formatSeconds keeps the display compact', () => {
  assert.equal(formatSeconds(4), '4s');
  assert.equal(formatSeconds(4.25), '4.3s');
});
