const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const http = require('http');
const { once } = require('events');
const { createApp } = require('../src/app');
const { createTempHarness, createSampleImage } = require('../test-support/helpers');

test('API exposes presets and renders a meme through the HTTP boundary', async () => {
  const harness = await createTempHarness();
  const app = createApp({ env: harness.env });
  const server = http.createServer(app);

  try {
    server.listen(0);
    await once(server, 'listening');

    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const presetsResponse = await fetch(`${baseUrl}/api/templates`);
    assert.equal(presetsResponse.status, 200);
    const presetsPayload = await presetsResponse.json();

    assert.ok(Array.isArray(presetsPayload.presets));
    assert.equal(presetsPayload.defaultPresetId, 'classic-impact');
    assert.ok(presetsPayload.presets.every((preset) => preset.thumbnail?.src));
    assert.ok(presetsPayload.presets.some((preset) => preset.id === 'status-drop'));

    const imagePath = await createSampleImage(path.join(harness.rootDir, 'request.png'));
    const imageBuffer = await fs.readFile(imagePath);
    const formData = new FormData();
    formData.append('presetId', 'story-stack');
    formData.append('topText', 'POV: THE FIX WORKED');
    formData.append('caption', 'Ship it, then have tea.');
    formData.append('bottomText', 'MORALE RESTORED');
    formData.append('durationSeconds', '2');
    formData.append('media', new File([imageBuffer], 'request.png', { type: 'image/png' }));

    const renderResponse = await fetch(`${baseUrl}/api/renders`, {
      method: 'POST',
      body: formData,
    });

    assert.equal(renderResponse.status, 201);
    const renderPayload = await renderResponse.json();

    assert.equal(renderPayload.render.inputType, 'image');
    assert.equal(renderPayload.render.durationSeconds, 2);

    const videoResponse = await fetch(`${baseUrl}${renderPayload.outputUrl}`);
    assert.equal(videoResponse.status, 200);
    assert.equal(videoResponse.headers.get('content-type'), 'video/mp4');
  } finally {
    server.close();
    await once(server, 'close');
    await harness.cleanup();
  }
});
