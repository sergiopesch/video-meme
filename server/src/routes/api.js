const express = require('express');
const multer = require('multer');
const { listPresets, getDefaultPreset } = require('../presets/presetRegistry');
const { normalizeRenderRequest } = require('../validation/renderRequest');
const { createUploadMiddleware, extractUploadedFile } = require('../uploads');
const { createHttpError } = require('../utils/errors');
const { removeFileIfExists } = require('../utils/files');

function createApiRouter({ env, renderService }) {
  const router = express.Router();
  const upload = createUploadMiddleware(env);

  const sendPresetPayload = (_req, res) => {
    res.json({
      presets: listPresets(),
      defaultPresetId: getDefaultPreset().id,
    });
  };

  const renderHandler = async (req, res, next) => {
    const uploadedFile = extractUploadedFile(req.files);

    try {
      const request = normalizeRenderRequest({
        body: req.body,
        file: uploadedFile,
      });
      const result = await renderService.render(request);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    } finally {
      await removeFileIfExists(uploadedFile?.path);
    }
  };

  router.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'video-meme-api' });
  });

  router.get('/templates', sendPresetPayload);
  router.get('/meme-templates', sendPresetPayload);

  router.post('/renders', upload, renderHandler);
  router.post('/generate-meme', upload, renderHandler);

  router.use((error, _req, _res, next) => {
    if (error instanceof multer.MulterError) {
      next(createHttpError(400, error.message));
      return;
    }

    next(error);
  });

  return router;
}

module.exports = {
  createApiRouter,
};
