const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');
const { runFfmpeg } = require('../src/services/ffmpegService');

const TEST_FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

async function createTempHarness() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-meme-test-'));
  const env = {
    port: 0,
    clientUrl: 'http://localhost:5173',
    maxUploadSize: 50 * 1024 * 1024,
    maxRemoteHtmlSize: 2 * 1024 * 1024,
    allowPrivateMediaUrls: true,
    giphyApiKey: '',
    giphyApiBaseUrl: 'http://127.0.0.1',
    ffmpegBin: 'ffmpeg',
    ffprobeBin: 'ffprobe',
    fontPath: TEST_FONT,
    paths: {
      publicDir: path.join(rootDir, 'public'),
      uploadsDir: path.join(rootDir, 'uploads'),
      outputDir: path.join(rootDir, 'public', 'output'),
      jobsDir: path.join(rootDir, 'uploads', 'jobs'),
    },
  };

  await fs.mkdir(env.paths.outputDir, { recursive: true });
  await fs.mkdir(env.paths.jobsDir, { recursive: true });

  return {
    rootDir,
    env,
    async cleanup() {
      await fs.rm(rootDir, { recursive: true, force: true });
    },
  };
}

async function createSampleImage(targetPath) {
  await runFfmpeg('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'color=c=0x2563eb:s=800x800:d=1',
    '-frames:v',
    '1',
    targetPath,
  ]);

  return targetPath;
}

async function createSampleVideo(targetPath) {
  await runFfmpeg('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'color=c=0xf97316:s=960x540:d=3',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=880:duration=3',
    '-shortest',
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    targetPath,
  ]);

  return targetPath;
}

function createUploadedFile(filePath, mimeType) {
  return {
    path: filePath,
    originalname: `fixture-${randomUUID()}.${mimeType.startsWith('image/') ? 'png' : 'mp4'}`,
    mimetype: mimeType,
  };
}

module.exports = {
  TEST_FONT,
  createTempHarness,
  createSampleImage,
  createSampleVideo,
  createUploadedFile,
};
