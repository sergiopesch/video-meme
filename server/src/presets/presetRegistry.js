const presetRegistry = [
  {
    id: 'classic-impact',
    name: 'Classic Impact',
    description: 'Square output with heavy top and bottom meme text.',
    tags: ['classic', 'square', 'bold'],
    inputTypes: ['image', 'video'],
    output: {
      width: 1080,
      height: 1080,
      fps: 30,
      defaultDuration: 4,
      maxDuration: 8,
    },
    trim: {
      minStartSeconds: 0,
      minDurationSeconds: 1,
      defaultDurationSeconds: 4,
      maxDurationSeconds: 8,
    },
    textSlots: [
      {
        id: 'topText',
        label: 'Top text',
        placeholder: 'WHEN THE BUILD FINALLY PASSES',
        maxLength: 80,
        position: 'top',
      },
      {
        id: 'bottomText',
        label: 'Bottom text',
        placeholder: 'AND YOU DIDN\'T BREAK PROD',
        maxLength: 80,
        position: 'bottom',
      },
    ],
    styling: {
      accentColor: '#3b82f6',
      surface: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
      fontScale: 0.075,
      textColor: 'white',
      strokeColor: 'black',
      strokeWidth: 4,
      boxMode: 'none',
    },
  },
  {
    id: 'caption-punch',
    name: 'Caption Punch',
    description: 'Landscape output with a strong lower-third caption card.',
    tags: ['caption', 'landscape', 'reaction'],
    inputTypes: ['image', 'video'],
    output: {
      width: 1280,
      height: 720,
      fps: 30,
      defaultDuration: 5,
      maxDuration: 10,
    },
    trim: {
      minStartSeconds: 0,
      minDurationSeconds: 1,
      defaultDurationSeconds: 5,
      maxDurationSeconds: 10,
    },
    textSlots: [
      {
        id: 'caption',
        label: 'Caption',
        placeholder: 'Add the one line that sells the joke',
        maxLength: 120,
        position: 'caption',
      },
      {
        id: 'topText',
        label: 'Kicker',
        placeholder: 'OPTIONAL KICKER',
        maxLength: 60,
        position: 'top',
      },
    ],
    styling: {
      accentColor: '#f97316',
      surface: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
      fontScale: 0.062,
      textColor: 'white',
      strokeColor: 'black',
      strokeWidth: 3,
      boxMode: 'caption-card',
    },
  },
  {
    id: 'story-stack',
    name: 'Story Stack',
    description: 'Vertical output for social stories with punchy captions.',
    tags: ['vertical', 'story', 'mobile'],
    inputTypes: ['image', 'video'],
    output: {
      width: 1080,
      height: 1920,
      fps: 30,
      defaultDuration: 6,
      maxDuration: 12,
    },
    trim: {
      minStartSeconds: 0,
      minDurationSeconds: 1,
      defaultDurationSeconds: 6,
      maxDurationSeconds: 12,
    },
    textSlots: [
      {
        id: 'topText',
        label: 'Header',
        placeholder: 'POV: YOU SHIPPED THE FIX',
        maxLength: 70,
        position: 'top',
      },
      {
        id: 'caption',
        label: 'Story caption',
        placeholder: 'Short, readable, and brutal.',
        maxLength: 120,
        position: 'caption',
      },
      {
        id: 'bottomText',
        label: 'Footer',
        placeholder: 'SEND IT TO THE GROUP CHAT',
        maxLength: 70,
        position: 'bottom',
      },
    ],
    styling: {
      accentColor: '#8b5cf6',
      surface: 'linear-gradient(180deg, #0f172a 0%, #1d4ed8 100%)',
      fontScale: 0.058,
      textColor: 'white',
      strokeColor: 'black',
      strokeWidth: 3,
      boxMode: 'caption-card',
    },
  },
];

function listPresets() {
  return presetRegistry.map((preset) => ({ ...preset }));
}

function getPresetById(presetId) {
  return presetRegistry.find((preset) => preset.id === presetId) || null;
}

function getDefaultPreset() {
  return presetRegistry[0];
}

module.exports = {
  presetRegistry,
  listPresets,
  getPresetById,
  getDefaultPreset,
};
