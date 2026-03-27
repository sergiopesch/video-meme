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
    id: 'story-stack',
    name: 'Story Stack',
    description: 'Vertical mobile-share GIF for stories, status posts, and group-chat chaos.',
    thumbnail: {
      src: '/preset-thumbnails/story-stack.svg',
      alt: 'Vertical meme thumbnail with stacked header, caption, and footer.',
    },
    tags: ['vertical', 'story', 'mobile'],
    inputTypes: ['image', 'video'],
    output: {
      width: 360,
      height: 640,
      fps: 12,
      defaultDuration: 4,
      maxDuration: 6,
    },
    export: { ...mobileShareExport },
    trim: {
      minStartSeconds: 0,
      minDurationSeconds: 1,
      defaultDurationSeconds: 4,
      maxDurationSeconds: 6,
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
      fontScale: 0.07,
      textColor: 'white',
      strokeColor: 'black',
      strokeWidth: 3,
      boxMode: 'caption-card',
    },
  },
  {
    id: 'status-drop',
    name: 'Status Drop',
    description: 'Vertical social cut for faux status updates, hot takes, and phone-first sharing.',
    thumbnail: {
      src: '/preset-thumbnails/status-drop.svg',
      alt: 'Vertical status-style thumbnail with headline, caption, and footer.',
    },
    tags: ['vertical', 'status', 'mobile'],
    inputTypes: ['image', 'video'],
    output: {
      width: 360,
      height: 640,
      fps: 12,
      defaultDuration: 4.5,
      maxDuration: 6,
    },
    export: { ...mobileShareExport },
    trim: {
      minStartSeconds: 0,
      minDurationSeconds: 1,
      defaultDurationSeconds: 4.5,
      maxDurationSeconds: 6,
    },
    textSlots: [
      {
        id: 'topText',
        label: 'Headline',
        placeholder: 'STATUS UPDATE',
        maxLength: 60,
        position: 'top',
      },
      {
        id: 'caption',
        label: 'Main caption',
        placeholder: 'We fixed it in prod, spiritually.',
        maxLength: 120,
        position: 'caption',
      },
      {
        id: 'bottomText',
        label: 'Footer',
        placeholder: 'FORWARD TO THE GROUP CHAT',
        maxLength: 70,
        position: 'bottom',
      },
    ],
    styling: {
      accentColor: '#06b6d4',
      surface: 'linear-gradient(180deg, #083344 0%, #581c87 100%)',
      fontScale: 0.068,
      textColor: 'white',
      strokeColor: 'black',
      strokeWidth: 3,
      boxMode: 'caption-card',
    },
  },
  {
    id: 'classic-impact',
    name: 'Classic Impact',
    description: 'Square reaction GIF with heavy top and bottom meme text.',
    thumbnail: {
      src: '/preset-thumbnails/classic-impact.svg',
      alt: 'Square meme thumbnail with bold top and bottom captions.',
    },
    tags: ['classic', 'square', 'bold'],
    inputTypes: ['image', 'video'],
    output: {
      width: 480,
      height: 480,
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
      fontScale: 0.08,
      textColor: 'white',
      strokeColor: 'black',
      strokeWidth: 3,
      boxMode: 'none',
    },
  },
  {
    id: 'reaction-zoom',
    name: 'Reaction Zoom',
    description: 'Square reaction format with a central punchline card and footer tag.',
    thumbnail: {
      src: '/preset-thumbnails/reaction-zoom.svg',
      alt: 'Square reaction thumbnail with a centre caption card and footer tag.',
    },
    tags: ['reaction', 'square', 'caption'],
    inputTypes: ['image', 'video'],
    output: {
      width: 480,
      height: 480,
      fps: 12,
      defaultDuration: 4,
      maxDuration: 5,
    },
    export: { ...mobileShareExport },
    trim: {
      minStartSeconds: 0,
      minDurationSeconds: 1,
      defaultDurationSeconds: 4,
      maxDurationSeconds: 5,
    },
    textSlots: [
      {
        id: 'topText',
        label: 'Setup',
        placeholder: 'WHEN THE PM SAYS QUICK CHANGE',
        maxLength: 70,
        position: 'top',
      },
      {
        id: 'caption',
        label: 'Punchline',
        placeholder: 'and you know the estimate is fiction',
        maxLength: 110,
        position: 'caption',
      },
      {
        id: 'bottomText',
        label: 'Footer tag',
        placeholder: 'STILL HITTING DEPLOY',
        maxLength: 60,
        position: 'bottom',
      },
    ],
    styling: {
      accentColor: '#22c55e',
      surface: 'linear-gradient(135deg, #052e16 0%, #0f766e 100%)',
      fontScale: 0.072,
      textColor: 'white',
      strokeColor: 'black',
      strokeWidth: 3,
      boxMode: 'caption-card',
    },
  },
  {
    id: 'caption-punch',
    name: 'Caption Punch',
    description: 'Wide GIF preset with a strong lower-third caption card for fast mobile sharing.',
    thumbnail: {
      src: '/preset-thumbnails/caption-punch.svg',
      alt: 'Landscape meme thumbnail with a lower-third caption card.',
    },
    tags: ['caption', 'landscape', 'reaction'],
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
      fontScale: 0.07,
      textColor: 'white',
      strokeColor: 'black',
      strokeWidth: 3,
      boxMode: 'caption-card',
    },
  },
  {
    id: 'lower-third-burn',
    name: 'Lower Third Burn',
    description: 'Wide-frame preset with a setup line and a bold burn card near the bottom.',
    thumbnail: {
      src: '/preset-thumbnails/lower-third-burn.svg',
      alt: 'Landscape thumbnail with a top setup line and lower-third burn card.',
    },
    tags: ['landscape', 'burn', 'reaction'],
    inputTypes: ['image', 'video'],
    output: {
      width: 480,
      height: 270,
      fps: 12,
      defaultDuration: 4,
      maxDuration: 5,
    },
    export: { ...mobileShareExport },
    trim: {
      minStartSeconds: 0,
      minDurationSeconds: 1,
      defaultDurationSeconds: 4,
      maxDurationSeconds: 5,
    },
    textSlots: [
      {
        id: 'topText',
        label: 'Setup',
        placeholder: 'LIVE FOOTAGE OF ME',
        maxLength: 60,
        position: 'top',
      },
      {
        id: 'caption',
        label: 'Burn',
        placeholder: 'pretending the rollback plan exists',
        maxLength: 120,
        position: 'caption',
      },
    ],
    styling: {
      accentColor: '#ef4444',
      surface: 'linear-gradient(135deg, #450a0a 0%, #7c2d12 100%)',
      fontScale: 0.068,
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
    thumbnail: { ...preset.thumbnail },
    tags: [...preset.tags],
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
