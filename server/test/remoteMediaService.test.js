const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const http = require('http');
const { once } = require('events');
const { fetchRemoteMedia } = require('../src/services/remoteMediaService');
const { createTempHarness } = require('../test-support/helpers');

async function startServer(server) {
  server.listen(0);
  await once(server, 'listening');
  return server.address().port;
}

async function stopServer(server) {
  if (!server?.listening) {
    return;
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

test('fetchRemoteMedia blocks private network URLs by default', async () => {
  const harness = await createTempHarness();
  harness.env.allowPrivateMediaUrls = false;

  try {
    await assert.rejects(
      () =>
        fetchRemoteMedia({
          env: harness.env,
          mediaUrl: 'http://127.0.0.1:12345/fixture.png',
        }),
      (error) => error?.status === 400 && /public internet address/.test(error.message),
    );
  } finally {
    await harness.cleanup();
  }
});

test('fetchRemoteMedia enforces upload limits while streaming remote bodies', async () => {
  const harness = await createTempHarness();
  harness.env.maxUploadSize = 8;
  harness.env.allowPrivateMediaUrls = true;

  const remoteServer = http.createServer((_req, res) => {
    res.setHeader('content-type', 'image/png');
    res.write(Buffer.alloc(6));
    res.end(Buffer.alloc(6));
  });

  try {
    const remotePort = await startServer(remoteServer);

    await assert.rejects(
      () =>
        fetchRemoteMedia({
          env: harness.env,
          mediaUrl: `http://127.0.0.1:${remotePort}/oversized.png`,
        }),
      (error) => error?.status === 413 && /Remote media exceeds/.test(error.message),
    );

    const uploadsEntries = await fs.readdir(harness.env.paths.uploadsDir);
    assert.equal(uploadsEntries.some((entry) => entry.startsWith('remote-')), false);
  } finally {
    await stopServer(remoteServer);
    await harness.cleanup();
  }
});

test('fetchRemoteMedia enforces a separate page import limit for HTML sources', async () => {
  const harness = await createTempHarness();
  harness.env.maxRemoteHtmlSize = 16;
  harness.env.allowPrivateMediaUrls = true;

  const remoteServer = http.createServer((_req, res) => {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end('<!doctype html><html><body>too large</body></html>');
  });

  try {
    const remotePort = await startServer(remoteServer);

    await assert.rejects(
      () =>
        fetchRemoteMedia({
          env: harness.env,
          mediaUrl: `http://127.0.0.1:${remotePort}/watch?v=demo`,
        }),
      (error) => error?.status === 413 && /page import limit/.test(error.message),
    );
  } finally {
    await stopServer(remoteServer);
    await harness.cleanup();
  }
});
