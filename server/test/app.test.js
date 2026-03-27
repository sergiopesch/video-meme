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
  if (!server?.listening) {
    return;
  }

  if (typeof server.closeIdleConnections === 'function') {
    server.closeIdleConnections();
  }

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error?.code === 'ERR_SERVER_NOT_RUNNING') {
        resolve();
        return;
      }

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
    assert.equal(presetsPayload.defaultPresetId, 'caption-punch');
    assert.equal(presetsPayload.presets.length, 1);
    assert.ok(presetsPayload.presets.every((preset) => preset.export?.format === 'gif'));

    const imagePath = await createSampleImage(path.join(harness.rootDir, 'request.png'));
    const imageBuffer = await fs.readFile(imagePath);
    const formData = new FormData();
    formData.append('presetId', 'caption-punch');
    formData.append('caption', 'Ship it, then have tea.');
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
    assert.equal(renderPayload.format, 'gif');
    assert.equal(renderPayload.mimeType, 'image/gif');
    assert.equal(renderPayload.render.hasAudio, false);

    const gifResponse = await fetch(`${baseUrl}${renderPayload.outputUrl}`);
    assert.equal(gifResponse.status, 200);
    assert.equal(gifResponse.headers.get('content-type'), 'image/gif');
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
    formData.append('presetId', 'caption-punch');
    formData.append('caption', 'REMOTE SOURCE');
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
    assert.equal(renderPayload.render.hasAudio, false);

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
    assert.equal(renderPayload.render.hasAudio, false);

    const uploadsEntries = await fs.readdir(harness.env.paths.uploadsDir);
    assert.equal(uploadsEntries.some((entry) => entry.startsWith('remote-')), false);
  } finally {
    await stopServer(apiServer);
    await stopServer(remoteServer);
    await harness.cleanup();
  }
});

test('API can search Tenor-style GIF results through the server endpoint', async () => {
  const harness = await createTempHarness();
  const remoteServer = http.createServer((req, res) => {
    const requestUrl = new URL(req.url, `http://127.0.0.1:${remoteServer.address().port}`);

    assert.equal(requestUrl.pathname, '/search');
    assert.equal(requestUrl.searchParams.get('q'), 'celebration');
    assert.equal(requestUrl.searchParams.get('client_key'), 'video-meme-test');

    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      next: 'next-page-token',
      results: [
        {
          id: 'tenor-demo',
          content_description: 'Celebration GIF',
          media_formats: {
            tinygif: {
              url: 'https://media.example.com/demo-tiny.gif',
              dims: [220, 220],
            },
            mp4: {
              url: 'https://media.example.com/demo.mp4',
              dims: [480, 480],
            },
          },
        },
      ],
    }));
  });

  harness.env.tenorApiKey = 'test-tenor-key';

  try {
    const remotePort = await startServer(remoteServer);
    harness.env.tenorApiBaseUrl = `http://127.0.0.1:${remotePort}`;

    const app = createApp({ env: harness.env });
    const apiServer = http.createServer(app);
    const apiPort = await startServer(apiServer);

    const response = await fetch(`http://127.0.0.1:${apiPort}/api/gifs/search?q=celebration`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.next, 'next-page-token');
    assert.equal(payload.results.length, 1);
    assert.equal(payload.results[0].id, 'tenor-demo');
    assert.equal(payload.results[0].previewUrl, 'https://media.example.com/demo-tiny.gif');
    assert.equal(payload.results[0].sourceUrl, 'https://media.example.com/demo.mp4');
    assert.equal(payload.results[0].sourceType, 'video');

    await stopServer(apiServer);
  } finally {
    await stopServer(remoteServer);
    await harness.cleanup();
  }
});

test('API can fetch featured Tenor-style GIFs through the server endpoint', async () => {
  const harness = await createTempHarness();
  const remoteServer = http.createServer((req, res) => {
    const requestUrl = new URL(req.url, `http://127.0.0.1:${remoteServer.address().port}`);

    assert.equal(requestUrl.pathname, '/featured');

    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      next: '',
      results: [
        {
          id: 'featured-demo',
          content_description: 'Featured GIF',
          media_formats: {
            tinygif: {
              url: 'https://media.example.com/featured-tiny.gif',
              dims: [220, 180],
            },
            gif: {
              url: 'https://media.example.com/featured.gif',
              dims: [480, 392],
            },
          },
        },
      ],
    }));
  });

  harness.env.tenorApiKey = 'test-tenor-key';

  try {
    const remotePort = await startServer(remoteServer);
    harness.env.tenorApiBaseUrl = `http://127.0.0.1:${remotePort}`;

    const app = createApp({ env: harness.env });
    const apiServer = http.createServer(app);
    const apiPort = await startServer(apiServer);

    const response = await fetch(`http://127.0.0.1:${apiPort}/api/gifs/featured`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.results[0].id, 'featured-demo');
    assert.equal(payload.results[0].previewUrl, 'https://media.example.com/featured-tiny.gif');
    assert.equal(payload.results[0].sourceUrl, 'https://media.example.com/featured.gif');

    await stopServer(apiServer);
  } finally {
    await stopServer(remoteServer);
    await harness.cleanup();
  }
});
