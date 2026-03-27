const fs = require('fs/promises');

async function removeFileIfExists(targetPath) {
  if (!targetPath) {
    return;
  }

  try {
    await fs.unlink(targetPath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function removeDirIfExists(targetPath) {
  if (!targetPath) {
    return;
  }

  try {
    await fs.rm(targetPath, { recursive: true, force: true });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

module.exports = {
  removeFileIfExists,
  removeDirIfExists,
};
