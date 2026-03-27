const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { loadEnv } = require('./config/env');
const { createApiRouter } = require('./routes/api');
const { RenderService } = require('./services/renderService');
const { errorToResponse } = require('./utils/errors');

function createApp({ env = loadEnv(), renderService = new RenderService(env) } = {}) {
  const app = express();
  const apiRouter = createApiRouter({ env, renderService });

  app.use(
    cors({
      origin: true,
    }),
  );
  app.use(express.json());

  app.use('/output', express.static(env.paths.outputDir));
  app.use('/api', apiRouter);
  app.use('/', apiRouter);

  if (fs.existsSync(env.paths.clientDistDir)) {
    app.use(express.static(env.paths.clientDistDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/output')) {
        next();
        return;
      }

      res.sendFile(path.join(env.paths.clientDistDir, 'index.html'));
    });
  }

  app.use((error, _req, res, _next) => {
    const status = error.status || 500;
    res.status(status).json(errorToResponse(error));
  });

  return app;
}

module.exports = {
  createApp,
};
