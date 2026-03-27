const path = require('path');
const multer = require('multer');
const { createHttpError } = require('./utils/errors');

function createUploadMiddleware(env) {
  const storage = multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, env.paths.uploadsDir);
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname || '').toLowerCase();
      const safeBase = path
        .basename(file.originalname || 'upload', extension)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'upload';
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      callback(null, `${safeBase}-${uniqueSuffix}${extension}`);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: env.maxUploadSize,
    },
    fileFilter: (_req, file, callback) => {
      if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        callback(null, true);
        return;
      }

      callback(createHttpError(400, 'Only image and video uploads are supported.'));
    },
  }).fields([
    { name: 'media', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ]);
}

function extractUploadedFile(files) {
  if (!files) {
    return null;
  }

  return files.media?.[0] || files.image?.[0] || files.video?.[0] || null;
}

module.exports = {
  createUploadMiddleware,
  extractUploadedFile,
};
