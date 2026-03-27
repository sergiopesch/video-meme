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
