const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { RenderService } = require('../src/services/renderService');
const { probeMedia } = require('../src/services/ffmpegService');
const { getPresetById } = require('../src/presets/presetRegistry');
const {
  createTempHarness,
  createSampleImage,
  createSampleVideo,
} = require('../test-support/helpers');

test('RenderService renders an image into a GIF meme clip', async () => {
  const harness = await createTempHarness();

  try {
    const imagePath = await createSampleImage(path.join(harness.rootDir, 'input.png'));
    const renderService = new RenderService(harness.env);

    const result = await renderService.render({
      preset: getPresetById('classic-impact'),
      presetId: 'classic-impact',
      inputType: 'image',
      mediaPath: imagePath,
      topText: 'BUILD SHIPPED',
      bottomText: 'NO REGRETS',
      caption: '',
      startSeconds: 0,
      durationSeconds: 3,
    });

    assert.equal(result.success, true);
    assert.equal(result.format, 'gif');
    assert.equal(result.mimeType, 'image/gif');
    assert.equal(result.render.inputType, 'image');
    assert.equal(result.render.hasAudio, false);
    assert.match(result.outputUrl, /^\/output\/meme-.*\.gif$/);

    const outputPath = path.join(harness.env.paths.outputDir, path.basename(result.outputUrl));
    const probe = await probeMedia(harness.env.ffprobeBin, outputPath);
    const duration = Number(probe.format.duration);

    assert.ok(duration >= 2.8 && duration <= 3.2, `unexpected duration ${duration}`);
    assert.equal(probe.streams.find((stream) => stream.codec_type === 'video').width, 480);
    assert.equal(probe.streams.some((stream) => stream.codec_type === 'audio'), false);
  } finally {
    await harness.cleanup();
  }
});

test('RenderService trims video input into a bounded GIF and strips audio', async () => {
  const harness = await createTempHarness();

  try {
    const videoPath = await createSampleVideo(path.join(harness.rootDir, 'input.mp4'));
    const renderService = new RenderService(harness.env);

    const result = await renderService.render({
      preset: getPresetById('caption-punch'),
      presetId: 'caption-punch',
      inputType: 'video',
      mediaPath: videoPath,
      topText: 'WHEN PROD IS CALM',
      bottomText: '',
      caption: '...for about three minutes.',
      startSeconds: 1,
      durationSeconds: 1.5,
    });

    assert.equal(result.success, true);
    assert.equal(result.format, 'gif');
    assert.equal(result.mimeType, 'image/gif');
    assert.equal(result.render.inputType, 'video');
    assert.equal(result.render.hasAudio, false);
    assert.ok(result.render.sourceDurationSeconds >= 2.9);

    const outputPath = path.join(harness.env.paths.outputDir, path.basename(result.outputUrl));
    const probe = await probeMedia(harness.env.ffprobeBin, outputPath);
    const duration = Number(probe.format.duration);

    assert.ok(duration >= 1.3 && duration <= 1.8, `unexpected duration ${duration}`);
    assert.equal(probe.streams.find((stream) => stream.codec_type === 'video').width, 480);
    assert.equal(probe.streams.some((stream) => stream.codec_type === 'audio'), false);
  } finally {
    await harness.cleanup();
  }
});
