const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');
const { clamp } = require('../validation/renderRequest');
const { createHttpError } = require('../utils/errors');
const { removeDirIfExists } = require('../utils/files');
const { escapeFilterPath, probeMedia, runFfmpeg } = require('./ffmpegService');

function formatNumber(value) {
  return Number(value).toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

class RenderService {
  constructor(env) {
    this.env = env;
  }

  async render(request) {
    const jobId = randomUUID();
    const jobDir = await fs.mkdtemp(path.join(this.env.paths.jobsDir, `${jobId}-`));
    const outputFileName = `meme-${jobId}.mp4`;
    const outputPath = path.join(this.env.paths.outputDir, outputFileName);

    try {
      const prepared = await this.prepareRequest(request);
      const filter = await this.buildFilter(prepared, jobDir);
      const ffmpegArgs = this.buildFfmpegArgs(prepared, filter, outputPath);

      await runFfmpeg(this.env.ffmpegBin, ffmpegArgs);

      const outputStats = await fs.stat(outputPath);
      const outputProbe = await probeMedia(this.env.ffprobeBin, outputPath);
      const videoStream = outputProbe.streams.find((stream) => stream.codec_type === 'video') || {};

      return {
        success: true,
        outputUrl: `/output/${outputFileName}`,
        url: `/output/${outputFileName}`,
        method: 'ffmpeg',
        preset: prepared.preset,
        render: {
          inputType: prepared.inputType,
          sourceDurationSeconds: prepared.sourceDurationSeconds,
          startSeconds: prepared.startSeconds,
          durationSeconds: prepared.durationSeconds,
          width: videoStream.width || prepared.preset.output.width,
          height: videoStream.height || prepared.preset.output.height,
          sizeBytes: outputStats.size,
          texts: {
            topText: prepared.topText,
            bottomText: prepared.bottomText,
            caption: prepared.caption,
          },
        },
      };
    } catch (error) {
      if (error.status) {
        throw error;
      }

      throw createHttpError(500, 'Failed to render meme video.', error.message || error);
    } finally {
      await removeDirIfExists(jobDir);
    }
  }

  async prepareRequest(request) {
    if (request.inputType === 'image') {
      return {
        ...request,
        sourceDurationSeconds: request.durationSeconds,
        startSeconds: 0,
      };
    }

    const probe = await probeMedia(this.env.ffprobeBin, request.mediaPath);
    const durationSeconds = Number(probe.format?.duration || 0);

    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw createHttpError(400, 'Could not read the uploaded video clip.');
    }

    const boundedStart = clamp(
      request.startSeconds,
      0,
      Math.max(durationSeconds - request.preset.trim.minDurationSeconds, 0),
    );
    const remainingDuration = Math.max(durationSeconds - boundedStart, request.preset.trim.minDurationSeconds);
    const boundedDuration = clamp(
      request.durationSeconds,
      request.preset.trim.minDurationSeconds,
      Math.min(request.preset.trim.maxDurationSeconds, remainingDuration),
    );

    return {
      ...request,
      sourceDurationSeconds: durationSeconds,
      startSeconds: boundedStart,
      durationSeconds: boundedDuration,
    };
  }

  async buildFilter(prepared, jobDir) {
    const {
      preset,
      topText,
      bottomText,
      caption,
    } = prepared;

    const baseFilter = [
      `scale=${preset.output.width}:${preset.output.height}:force_original_aspect_ratio=decrease`,
      `pad=${preset.output.width}:${preset.output.height}:(ow-iw)/2:(oh-ih)/2:color=black`,
      'setsar=1',
      'format=yuv420p',
    ];

    const drawtextFilters = [];
    const overlaySpecs = [
      { text: topText, slotId: 'topText' },
      { text: bottomText, slotId: 'bottomText' },
      { text: caption, slotId: 'caption' },
    ];

    for (const overlay of overlaySpecs) {
      if (!overlay.text) {
        continue;
      }

      const filter = await this.createDrawtextFilter({
        preset,
        slotId: overlay.slotId,
        text: overlay.text,
        jobDir,
      });

      if (filter) {
        drawtextFilters.push(filter);
      }
    }

    return [...baseFilter, ...drawtextFilters].join(',');
  }

  async createDrawtextFilter({ preset, slotId, text, jobDir }) {
    const slot = preset.textSlots.find((entry) => entry.id === slotId);

    if (!slot) {
      return null;
    }

    const textFilePath = path.join(jobDir, `${slotId}.txt`);
    await fs.writeFile(textFilePath, text, 'utf8');

    const fontSize = Math.round(preset.output.width * preset.styling.fontScale);
    const escapedFontPath = escapeFilterPath(this.env.fontPath);
    const escapedTextPath = escapeFilterPath(textFilePath);
    const y = this.resolveYExpression(slot.position, preset.output.height);
    const base = [
      `drawtext=fontfile='${escapedFontPath}'`,
      `textfile='${escapedTextPath}'`,
      `fontcolor=${preset.styling.textColor}`,
      `fontsize=${fontSize}`,
      `bordercolor=${preset.styling.strokeColor}`,
      `borderw=${preset.styling.strokeWidth}`,
      "x=(w-text_w)/2",
      `y=${y}`,
      'line_spacing=8',
    ];

    if (slot.position === 'caption' && preset.styling.boxMode === 'caption-card') {
      base.push('box=1');
      base.push('boxcolor=black@0.55');
      base.push(`boxborderw=${Math.round(fontSize * 0.6)}`);
    }

    return base.join(':');
  }

  resolveYExpression(position, height) {
    switch (position) {
      case 'top':
        return `${Math.round(height * 0.08)}`;
      case 'bottom':
        return `h-text_h-${Math.round(height * 0.08)}`;
      case 'caption':
        return `(h-text_h)/2+${Math.round(height * 0.18)}`;
      default:
        return '(h-text_h)/2';
    }
  }

  buildFfmpegArgs(prepared, filter, outputPath) {
    const { inputType, mediaPath, durationSeconds, startSeconds, preset } = prepared;

    if (inputType === 'image') {
      return [
        '-y',
        '-loop',
        '1',
        '-framerate',
        String(preset.output.fps),
        '-i',
        mediaPath,
        '-t',
        formatNumber(durationSeconds),
        '-vf',
        filter,
        '-r',
        String(preset.output.fps),
        '-an',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        outputPath,
      ];
    }

    return [
      '-y',
      '-ss',
      formatNumber(startSeconds),
      '-i',
      mediaPath,
      '-t',
      formatNumber(durationSeconds),
      '-vf',
      filter,
      '-r',
      String(preset.output.fps),
      '-map',
      '0:v:0',
      '-map',
      '0:a?',
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      outputPath,
    ];
  }
}

module.exports = {
  RenderService,
};
