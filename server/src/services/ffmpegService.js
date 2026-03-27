const { execFile } = require('child_process');
const util = require('util');

const execFileAsync = util.promisify(execFile);

function escapeFilterPath(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/,/g, '\\,')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

async function runBinary(binary, args) {
  try {
    return await execFileAsync(binary, args, {
      maxBuffer: 1024 * 1024 * 20,
    });
  } catch (error) {
    const stderr = error.stderr || error.stdout || error.message;
    error.message = stderr;
    throw error;
  }
}

async function runFfmpeg(binary, args) {
  await runBinary(binary, args);
}

async function probeMedia(binary, inputPath) {
  const { stdout } = await runBinary(binary, [
    '-v',
    'error',
    '-show_entries',
    'format=duration:stream=index,codec_type,width,height',
    '-of',
    'json',
    inputPath,
  ]);

  return JSON.parse(stdout);
}

module.exports = {
  escapeFilterPath,
  runFfmpeg,
  probeMedia,
};
