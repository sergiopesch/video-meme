const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const http = require('http');
const dns = require('dns/promises');
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


test('remote URLs block mapped IPv6, link-local ranges and private redirects', async () => {
  const harness = await createTempHarness();
  harness.env.allowPrivateMediaUrls = false;
  const originalLookup = dns.lookup;
  const remoteServer = http.createServer((_req, res) => {
    res.writeHead(302, { location: 'http://127.0.0.1/private.png' });
    res.end();
  });
  try {
    for (const address of ['[::ffff:127.0.0.1]', '[::ffff:7f00:1]', '[febf::1]']) {
      await assert.rejects(
        () => fetchRemoteMedia({ env: harness.env, mediaUrl: `http://${address}/fixture.png` }),
        (error) => error?.status === 400 && /public internet address/.test(error.message),
      );
    }
    // Let one public hostname reach a fixture, then enforce the redirect's address.
    const port = await startServer(remoteServer);
    dns.lookup = async () => [{ address: '8.8.8.8', family: 4 }];
    const originalGet = http.get;
    http.get = (url, options, callback) => {
      http.get = originalGet;
      return originalGet(`http://127.0.0.1:${port}`, options, callback);
    };
    try {
      await assert.rejects(
        () => fetchRemoteMedia({ env: harness.env, mediaUrl: 'http://public.example/fixture.png' }),
        (error) => error?.status === 400 && /public internet address/.test(error.message),
      );
    } finally {
      http.get = originalGet;
    }
  } finally {
    dns.lookup = originalLookup;
    await stopServer(remoteServer);
    await harness.cleanup();
  }
});

test('remote connection rejects DNS rebinding before opening a private socket', async () => {
  const harness = await createTempHarness();
  harness.env.allowPrivateMediaUrls = false;
  const originalLookup = dns.lookup;
  let lookups = 0;
  let requests = 0;
  const remoteServer = http.createServer((_req, res) => {
    requests += 1;
    res.end('private');
  });
  try {
    const port = await startServer(remoteServer);
    dns.lookup = async () => [{ address: ++lookups === 1 ? '8.8.8.8' : '127.0.0.1', family: 4 }];
    await assert.rejects(
      () => fetchRemoteMedia({ env: harness.env, mediaUrl: `http://rebind.example:${port}/fixture.png` }),
      (error) => error?.status === 400 && /public internet address/.test(error.message),
    );
    assert.equal(lookups, 2);
    assert.equal(requests, 0);
  } finally {
    dns.lookup = originalLookup;
    await stopServer(remoteServer);
    await harness.cleanup();
  }
});
