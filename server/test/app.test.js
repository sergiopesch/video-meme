const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const http = require('http');
const { once } = require('events');
const { createApp } = require('../src/app');
const { createTempHarness, createSampleImage, createSampleVideo } = require('../test-support/helpers');

async function startServer(server) {
  server.listen(0);
  await once(server, 'listening');
  return server.address().port;
}

async function stopServer(server) {
  if (typeof server.closeIdleConnections === 'function') {
    server.closeIdleConnections();
  }

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

test('API exposes presets and renders a meme through the HTTP boundary', async () => {
  const harness = await createTempHarness();
  const app = createApp({ env: harness.env });
  const server = http.createServer(app);

  try {
    const port = await startServer(server);
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
    await stopServer(server);
    await harness.cleanup();
  }
});

test('API can fetch a direct media URL before rendering', async () => {
  const harness = await createTempHarness();
  const app = createApp({ env: harness.env });
  const apiServer = http.createServer(app);
  const remoteServer = http.createServer(async (req, res) => {
    if (req.url !== '/fixture.png') {
      res.statusCode = 404;
      res.end('not found');
      return;
    }

    const imagePath = path.join(harness.rootDir, 'remote-fixture.png');
    const imageBuffer = await fs.readFile(imagePath);
    res.setHeader('content-type', 'image/png');
    res.setHeader('content-length', String(imageBuffer.length));
    res.end(imageBuffer);
  });

  try {
    const imagePath = await createSampleImage(path.join(harness.rootDir, 'remote-fixture.png'));
    assert.ok(imagePath);

    const apiPort = await startServer(apiServer);
    const remotePort = await startServer(remoteServer);
    const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
    const mediaUrl = `http://127.0.0.1:${remotePort}/fixture.png`;

    const formData = new FormData();
    formData.append('presetId', 'classic-impact');
    formData.append('topText', 'REMOTE SOURCE');
    formData.append('bottomText', 'FETCHED CLEANLY');
    formData.append('durationSeconds', '2');
    formData.append('mediaUrl', mediaUrl);

    const renderResponse = await fetch(`${apiBaseUrl}/api/renders`, {
      method: 'POST',
      body: formData,
    });

    assert.equal(renderResponse.status, 201);
    const renderPayload = await renderResponse.json();
    assert.equal(renderPayload.render.inputType, 'image');
    assert.equal(renderPayload.render.durationSeconds, 2);

    const uploadsEntries = await fs.readdir(harness.env.paths.uploadsDir);
    assert.equal(uploadsEntries.some((entry) => entry.startsWith('remote-')), false);
  } finally {
    await stopServer(apiServer);
    await stopServer(remoteServer);
    await harness.cleanup();
  }
});

test('API can ingest a bounded YouTube-style page URL before rendering', async () => {
  const harness = await createTempHarness();
  const app = createApp({ env: harness.env });
  const apiServer = http.createServer(app);
  const remoteServer = http.createServer(async (req, res) => {
    if (req.url === '/fixture.mp4') {
      const videoPath = path.join(harness.rootDir, 'youtube-fixture.mp4');
      const videoBuffer = await fs.readFile(videoPath);
      res.setHeader('content-type', 'video/mp4');
      res.setHeader('content-length', String(videoBuffer.length));
      res.end(videoBuffer);
      return;
    }

    if (req.url === '/watch?v=demo') {
      const streamUrl = `http://127.0.0.1:${remoteServer.address().port}/fixture.mp4`;
      const playerResponse = {
        videoDetails: {
          title: 'Bounded YouTube Fixture',
        },
        streamingData: {
          formats: [
            {
              mimeType: 'video/mp4; codecs="avc1.4d401e, mp4a.40.2"',
              url: streamUrl,
              qualityLabel: '360p',
              height: 360,
            },
          ],
        },
      };

      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><html><body><script>var ytInitialPlayerResponse = ${JSON.stringify(playerResponse)};</script></body></html>`);
      return;
    }

    res.statusCode = 404;
    res.end('not found');
  });

  try {
    const videoPath = await createSampleVideo(path.join(harness.rootDir, 'youtube-fixture.mp4'));
    assert.ok(videoPath);

    const apiPort = await startServer(apiServer);
    const remotePort = await startServer(remoteServer);
    const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
    const mediaUrl = `http://127.0.0.1:${remotePort}/watch?v=demo`;

    const formData = new FormData();
    formData.append('presetId', 'caption-punch');
    formData.append('topText', 'YOUTUBE PAGE');
    formData.append('caption', 'Bounded import path');
    formData.append('durationSeconds', '1.5');
    formData.append('startSeconds', '0.5');
    formData.append('mediaUrl', mediaUrl);

    const renderResponse = await fetch(`${apiBaseUrl}/api/renders`, {
      method: 'POST',
      body: formData,
    });

    assert.equal(renderResponse.status, 201);
    const renderPayload = await renderResponse.json();
    assert.equal(renderPayload.render.inputType, 'video');
    assert.ok(renderPayload.render.sourceDurationSeconds >= 2.9);
    assert.equal(renderPayload.render.durationSeconds, 1.5);

    const uploadsEntries = await fs.readdir(harness.env.paths.uploadsDir);
    assert.equal(uploadsEntries.some((entry) => entry.startsWith('remote-')), false);
  } finally {
    await stopServer(apiServer);
    await stopServer(remoteServer);
    await harness.cleanup();
  }
});
