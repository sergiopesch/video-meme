const { createApp } = require('./src/app');
const { loadEnv } = require('./src/config/env');

const env = loadEnv();
const app = createApp({ env });

app.listen(env.port, () => {
  console.log(`Video meme API listening on port ${env.port}`);
});
