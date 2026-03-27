const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRenderRequest } = require('../src/validation/renderRequest');

function createUploadedFile() {
  return {
    path: '/tmp/fake-upload.png',
    originalname: 'fake-upload.png',
    mimetype: 'image/png',
  };
}

test('normalizeRenderRequest parses and clamps text layout coordinates', () => {
  const request = normalizeRenderRequest({
    body: {
      presetId: 'classic-remix',
      topText: 'same idea',
      bottomText: 'different delivery',
      textLayout: JSON.stringify({
        topText: { x: 1.2, y: -1 },
        bottomText: { x: 0.4, y: 0.7 },
        caption: { x: 0.6, y: 0.6 },
      }),
    },
    file: createUploadedFile(),
  });

  assert.deepEqual(request.textLayout, {
    topText: { x: 0.95, y: 0.05 },
    bottomText: { x: 0.4, y: 0.7 },
  });
});

test('normalizeRenderRequest rejects invalid textLayout payloads', () => {
  assert.throws(
    () =>
      normalizeRenderRequest({
        body: {
          presetId: 'classic-remix',
          textLayout: '{"topText":',
        },
        file: createUploadedFile(),
      }),
    (error) => error?.status === 400 && /textLayout/.test(error.message),
  );
});
