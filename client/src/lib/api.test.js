import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApiUrl, resolveApiBaseUrl, trimTrailingSlash } from './api.js';

test('resolveApiBaseUrl prefers an explicit environment URL', () => {
  assert.equal(resolveApiBaseUrl('https://api.example.com/', 'http://localhost:5173'), 'https://api.example.com');
});

test('resolveApiBaseUrl falls back to the browser origin', () => {
  assert.equal(resolveApiBaseUrl('', 'http://localhost:5173/'), 'http://localhost:5173');
});

test('buildApiUrl handles absolute and relative paths', () => {
  assert.equal(buildApiUrl('/api/templates', 'http://localhost:5173'), 'http://localhost:5173/api/templates');
  assert.equal(buildApiUrl('https://cdn.example.com/video.mp4', 'http://localhost:5173'), 'https://cdn.example.com/video.mp4');
  assert.equal(trimTrailingSlash('https://api.example.com///'), 'https://api.example.com');
});
