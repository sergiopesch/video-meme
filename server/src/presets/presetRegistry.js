const mobileShareExport = {
  format: 'gif',
  mimeType: 'image/gif',
  fileExtension: 'gif',
  hasAudio: false,
  loop: 0,
  maxColors: 128,
  delivery: 'mobile-share',
};

const presetRegistry = [
  {
    id: 'caption-punch',
    name: 'Caption Punch',
    description: 'Fast meme remix layout with one strong caption field.',
    inputTypes: ['image', 'video'],
    output: {
      width: 480,
      height: 270,
      fps: 12,
      defaultDuration: 3.5,
      maxDuration: 5,
    },
    export: { ...mobileShareExport },
    trim: {
      minStartSeconds: 0,
      minDurationSeconds: 1,
      defaultDurationSeconds: 3.5,
      maxDurationSeconds: 5,
    },
    textSlots: [
      {
        id: 'caption',
        label: 'Caption',
        placeholder: 'Add the one line that sells the joke',
        maxLength: 120,
        position: 'caption',
      },
    ],
    styling: {
      fontScale: 0.07,
      textColor: 'white',
      strokeColor: 'black',
      strokeWidth: 3,
      boxMode: 'caption-card',
    },
  },
  {
    id: 'classic-remix',
    name: 'Classic Remix',
    description: 'Strip common meme text zones and replace with your own top/bottom copy.',
    inputTypes: ['image', 'video'],
    output: {
      width: 480,
      height: 270,
      fps: 12,
      defaultDuration: 3.5,
      maxDuration: 5,
    },
    export: { ...mobileShareExport },
    trim: {
      minStartSeconds: 0,
      minDurationSeconds: 1,
      defaultDurationSeconds: 3.5,
      maxDurationSeconds: 5,
    },
    cleanupMasks: [
      {
        id: 'top-band',
        position: 'top',
        heightRatio: 0.22,
        color: 'black@1.0',
      },
      {
        id: 'bottom-band',
        position: 'bottom',
        heightRatio: 0.22,
        color: 'black@1.0',
      },
    ],
    textSlots: [
      {
        id: 'topText',
        label: 'Top text',
        placeholder: 'same joke, your own words',
        maxLength: 80,
        maxLines: 2,
        position: 'top',
      },
      {
        id: 'bottomText',
        label: 'Bottom text',
        placeholder: 'new punchline',
        maxLength: 80,
        maxLines: 2,
        position: 'bottom',
      },
    ],
    styling: {
      fontScale: 0.074,
      textColor: 'white',
      strokeColor: 'black',
      strokeWidth: 4,
      boxMode: 'none',
      textTransform: 'uppercase',
      maxTextWidthRatio: 0.92,
      minFontScale: 0.048,
      topOffsetRatio: 0.05,
      bottomOffsetRatio: 0.05,
      lineSpacing: 3,
    },
  },
];

function clonePreset(preset) {
  if (!preset) {
    return null;
  }

  return {
    ...preset,
    inputTypes: [...preset.inputTypes],
    output: { ...preset.output },
    export: { ...preset.export },
    trim: { ...preset.trim },
    cleanupMasks: (preset.cleanupMasks || []).map((mask) => ({ ...mask })),
    textSlots: preset.textSlots.map((slot) => ({ ...slot })),
    styling: { ...preset.styling },
  };
}

function listPresets() {
  return presetRegistry.map(clonePreset);
}

function getPresetById(presetId) {
  return clonePreset(presetRegistry.find((preset) => preset.id === presetId));
}

function getDefaultPreset() {
  return clonePreset(presetRegistry[0]);
}

module.exports = {
  presetRegistry,
  listPresets,
  getPresetById,
  getDefaultPreset,
};
