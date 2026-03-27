const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const { clamp } = require('../validation/renderRequest');
const { createHttpError } = require('../utils/errors');
const { removeDirIfExists } = require('../utils/files');
const { escapeFilterPath, probeMedia, runFfmpeg } = require('./ffmpegService');

function formatNumber(value) {
  return Number(value).toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function normalizeCleanupRatio(value, fallback = 0.2) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return clamp(parsedValue, 0.05, 0.45);
}

class RenderService {
  constructor(env) {
    this.env = env;
  }

  async render(request) {
    const jobId = randomUUID();
    const jobDir = await fs.mkdtemp(path.join(this.env.paths.jobsDir, `${jobId}-`));

    try {
      const prepared = await this.prepareRequest(request);
      const exportProfile = prepared.preset.export || {};
      const extension = exportProfile.fileExtension || 'gif';
      const outputFileName = `meme-${jobId}.${extension}`;
      const outputPath = path.join(this.env.paths.outputDir, outputFileName);
      const filter = await this.buildFilterGraph(prepared, jobDir);
      const ffmpegArgs = this.buildFfmpegArgs(prepared, filter, outputPath);

      await runFfmpeg(this.env.ffmpegBin, ffmpegArgs);

      const outputStats = await fs.stat(outputPath);
      const outputProbe = await probeMedia(this.env.ffprobeBin, outputPath);
      const videoStream = outputProbe.streams.find((stream) => stream.codec_type === 'video') || {};
      const hasAudio = outputProbe.streams.some((stream) => stream.codec_type === 'audio');
      const outputUrl = `/output/${outputFileName}`;

      return {
        success: true,
        outputUrl,
        url: outputUrl,
        fileName: outputFileName,
        format: exportProfile.format || 'gif',
        mimeType: exportProfile.mimeType || 'image/gif',
        method: 'ffmpeg',
        preset: prepared.preset,
        output: {
          url: outputUrl,
          fileName: outputFileName,
          format: exportProfile.format || 'gif',
          mimeType: exportProfile.mimeType || 'image/gif',
          hasAudio,
        },
        render: {
          inputType: prepared.inputType,
          sourceDurationSeconds: prepared.sourceDurationSeconds,
          startSeconds: prepared.startSeconds,
          durationSeconds: prepared.durationSeconds,
          width: videoStream.width || prepared.preset.output.width,
          height: videoStream.height || prepared.preset.output.height,
          fps: prepared.preset.output.fps,
          sizeBytes: outputStats.size,
          hasAudio,
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

      throw createHttpError(500, 'Failed to render meme GIF.', error.message || error);
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

  async buildFilterGraph(prepared, jobDir) {
    const {
      preset,
      topText,
      bottomText,
      caption,
      durationSeconds,
    } = prepared;
    const exportProfile = preset.export || {};

    const baseFilter = [
      `fps=${preset.output.fps}`,
      `scale=${preset.output.width}:${preset.output.height}:force_original_aspect_ratio=decrease:flags=lanczos`,
      `pad=${preset.output.width}:${preset.output.height}:(ow-iw)/2:(oh-ih)/2:color=black`,
      'setsar=1',
      `trim=duration=${formatNumber(durationSeconds)}`,
      'setpts=PTS-STARTPTS',
    ];
    const cleanupFilters = this.createCleanupFilters(preset);

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

    const baseChain = [...baseFilter, ...cleanupFilters, ...drawtextFilters].join(',');
    const maxColors = exportProfile.maxColors || 128;

    return [
      `[0:v]${baseChain},split[gifbase][gifpalette]`,
      `[gifpalette]palettegen=stats_mode=diff:max_colors=${maxColors}[palette]`,
      '[gifbase][palette]paletteuse=dither=sierra2_4a:new=1[gifout]',
    ].join(';');
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

  createCleanupFilters(preset) {
    const masks = Array.isArray(preset.cleanupMasks) ? preset.cleanupMasks : [];

    return masks
      .map((mask) => {
        const position = String(mask.position || '').toLowerCase();
        const ratio = normalizeCleanupRatio(mask.heightRatio);
        const height = `max(1\\,round(ih*${formatNumber(ratio)}))`;
        const y = position === 'bottom' ? `ih-${height}` : position === 'top' ? '0' : null;

        if (!y) {
          return null;
        }

        return `drawbox=x=0:y=${y}:w=iw:h=${height}:color=${mask.color || 'black@1.0'}:t=fill`;
      })
      .filter(Boolean);
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
    const exportProfile = preset.export || {};

    if (inputType === 'image') {
      return [
        '-y',
        '-loop',
        '1',
        '-framerate',
        String(preset.output.fps),
        '-t',
        formatNumber(durationSeconds),
        '-i',
        mediaPath,
        '-filter_complex',
        filter,
        '-map',
        '[gifout]',
        '-an',
        '-loop',
        String(exportProfile.loop ?? 0),
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
      '-filter_complex',
      filter,
      '-map',
      '[gifout]',
      '-an',
      '-loop',
      String(exportProfile.loop ?? 0),
      outputPath,
    ];
  }
}

module.exports = {
  RenderService,
};
