const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

function toAbsolutePath(baseDir, value) {
  if (!value) {
    return null;
  }

  return path.isAbsolute(value) ? value : path.resolve(baseDir, value);
}

function ensureDirSync(targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

function loadEnv() {
  const serverRoot = path.resolve(__dirname, '..', '..');
  const projectRoot = path.resolve(serverRoot, '..');
  const defaultFontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

  const env = {
    serverRoot,
    projectRoot,
    isProduction: process.env.NODE_ENV === 'production',
    port: Number(process.env.PORT || 5000),
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    maxUploadSize: Number(process.env.MAX_UPLOAD_SIZE || 50 * 1024 * 1024),
    giphyApiKey: process.env.GIPHY_API_KEY || '',
    giphyApiBaseUrl: process.env.GIPHY_API_BASE_URL || 'https://api.giphy.com/v1/gifs',
    ffmpegBin: process.env.FFMPEG_BIN || 'ffmpeg',
    ffprobeBin: process.env.FFPROBE_BIN || 'ffprobe',
    fontPath: toAbsolutePath(serverRoot, process.env.FONT_PATH) || defaultFontPath,
    paths: {
      publicDir: toAbsolutePath(serverRoot, process.env.PUBLIC_DIR) || path.join(serverRoot, 'public'),
      uploadsDir: toAbsolutePath(serverRoot, process.env.UPLOADS_DIR) || path.join(serverRoot, 'uploads'),
      outputDir: toAbsolutePath(serverRoot, process.env.OUTPUT_DIR) || path.join(serverRoot, 'public', 'output'),
      jobsDir: toAbsolutePath(serverRoot, process.env.JOBS_DIR) || path.join(serverRoot, 'uploads', 'jobs'),
      clientDistDir:
        toAbsolutePath(serverRoot, process.env.CLIENT_DIST_DIR) || path.join(projectRoot, 'client', 'dist'),
    },
  };

  [env.paths.publicDir, env.paths.uploadsDir, env.paths.outputDir, env.paths.jobsDir].forEach(ensureDirSync);

  return env;
}

module.exports = {
  loadEnv,
  ensureDirSync,
};
