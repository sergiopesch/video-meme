import { useEffect, useMemo, useState } from 'react';
import './App.css';
import GifSearch from './components/GifSearch';
import ImageUploader from './components/ImageUploader';
import MemePreview from './components/MemePreview';
import TextInputs from './components/TextInputs';
import TrimControls from './components/TrimControls';
import { apiFetch } from './lib/api';
import { buildTrimState, normalizeVideoTrim } from './lib/trim';

const DEFAULT_PRESET_ID = 'caption-punch';
const REMIX_PRESET_ID = 'classic-remix';
const EDITOR_MODES = {
  CAPTION: 'caption',
  REMIX: 'remix',
};
const loadingHints = [
  'Waking up the editor…',
  'Rendering your GIF…',
  'Finishing the export…',
];

function getDefaultAnchor(position) {
  if (position === 'top') {
    return { x: 0.5, y: 0.14 };
  }

  if (position === 'bottom') {
    return { x: 0.5, y: 0.86 };
  }

  return { x: 0.5, y: 0.6 };
}

function App() {
  const [presets, setPresets] = useState([]);
  const [featuredGifs, setFeaturedGifs] = useState([]);
  const [editorMode, setEditorMode] = useState(EDITOR_MODES.CAPTION);
  const [mediaSource, setMediaSource] = useState('search');
  const [media, setMedia] = useState({ file: null, mediaUrl: '', previewUrl: '', mediaType: '' });
  const [sourceDuration, setSourceDuration] = useState(null);
  const [trimDraft, setTrimDraft] = useState({
    startSeconds: 0,
    durationSeconds: null,
  });
  const [editor, setEditor] = useState({
    topText: '',
    bottomText: '',
    caption: '',
  });
  const [textLayout, setTextLayout] = useState({});
  const [renderResult, setRenderResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [gifDiscoveryError, setGifDiscoveryError] = useState('');
  const [isBooting, setIsBooting] = useState(true);
  const [loadingHintIndex, setLoadingHintIndex] = useState(0);

  const activePresetId = editorMode === EDITOR_MODES.REMIX ? REMIX_PRESET_ID : DEFAULT_PRESET_ID;
  const selectedPreset = useMemo(
    () =>
      presets.find((preset) => preset.id === activePresetId) ||
      presets.find((preset) => preset.id === DEFAULT_PRESET_ID) ||
      presets[0] ||
      null,
    [presets, activePresetId],
  );
  const activeLoadingHint = loadingHints[loadingHintIndex] || loadingHints[0];
  const trimState = useMemo(() => {
    if (!selectedPreset || media.mediaType !== 'video') {
      return null;
    }

    return buildTrimState({
      preset: selectedPreset,
      sourceDuration,
      startSeconds: trimDraft.startSeconds,
      durationSeconds: trimDraft.durationSeconds ?? selectedPreset.trim.defaultDurationSeconds,
    });
  }, [media.mediaType, selectedPreset, sourceDuration, trimDraft]);

  useEffect(() => {
    if (!isLoading) {
      setLoadingHintIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setLoadingHintIndex((current) => (current + 1) % loadingHints.length);
    }, 1800);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isLoading]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const presetsResponse = await apiFetch('/api/templates');
        const presetsPayload = await presetsResponse.json();

        if (!presetsResponse.ok) {
          throw new Error(presetsPayload.error || 'Failed to load editor.');
        }

        if (!cancelled) {
          setPresets(presetsPayload.presets || []);
        }

        const featuredResponse = await apiFetch('/api/gifs/featured');
        const featuredPayload = await featuredResponse.json();

        if (!cancelled) {
          if (featuredResponse.ok) {
            setFeaturedGifs(featuredPayload.results || []);
            setGifDiscoveryError('');
          } else {
            setFeaturedGifs([]);
            setGifDiscoveryError(featuredPayload.error || 'GIF search is unavailable right now.');
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
        }
      } finally {
        if (!cancelled) {
          setIsBooting(false);
        }
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setRenderResult(null);
    setError('');
  }, [editorMode]);

  useEffect(() => {
    if (!selectedPreset?.textSlots?.length) {
      return;
    }

    setTextLayout((current) => {
      const next = {};

      for (const slot of selectedPreset.textSlots) {
        next[slot.id] = current[slot.id] || getDefaultAnchor(slot.position);
      }

      return next;
    });
  }, [selectedPreset]);

  useEffect(() => {
    return () => {
      if (media.file && media.previewUrl && media.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(media.previewUrl);
      }
    };
  }, [media.file, media.previewUrl]);

  const handleMediaChange = ({ file, mediaUrl = '', previewUrl, mediaType }) => {
    if (media.file && media.previewUrl && media.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(media.previewUrl);
    }

    setMedia({ file, mediaUrl, previewUrl, mediaType });
    setSourceDuration(null);
    setTrimDraft({
      startSeconds: 0,
      durationSeconds: null,
    });
    setRenderResult(null);
    setError('');
  };

  const handleGifSelect = (item) => {
    setMediaSource('search');
    handleMediaChange({
      file: null,
      mediaUrl: item.sourceUrl,
      previewUrl: item.sourceUrl,
      mediaType: item.sourceType === 'video' ? 'video' : 'image',
    });
  };

  const handleTextChange = (field, value) => {
    setEditor((current) => ({
      ...current,
      [field]: value,
    }));
    setRenderResult(null);
  };

  const handleLayoutChange = (slotId, nextPosition) => {
    setTextLayout((current) => ({
      ...current,
      [slotId]: nextPosition,
    }));
    setRenderResult(null);
  };

  const handleVideoMetadata = (duration) => {
    setSourceDuration(Number.isFinite(duration) && duration > 0 ? duration : null);
  };

  const handleTrimChange = (field, value) => {
    if (!selectedPreset) {
      return;
    }

    const normalizedTrim = normalizeVideoTrim(
      {
        startSeconds: trimState?.startSeconds ?? trimDraft.startSeconds,
        durationSeconds:
          trimState?.durationSeconds ??
          trimDraft.durationSeconds ??
          selectedPreset.trim.defaultDurationSeconds,
        [field]: value,
      },
      selectedPreset,
      sourceDuration,
    );

    setTrimDraft(normalizedTrim);
    setRenderResult(null);
  };

  const activeTextSlots = selectedPreset?.textSlots || [];

  const renderMeme = async () => {
    if (!selectedPreset || (!media.file && !media.mediaUrl)) {
      setError('Pick a GIF or upload something first.');
      return;
    }

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('presetId', selectedPreset.id);
    formData.append('topText', editor.topText);
    formData.append('bottomText', editor.bottomText);
    formData.append('caption', editor.caption);

    if (trimState) {
      formData.append('startSeconds', String(trimState.startSeconds));
      formData.append('durationSeconds', String(trimState.durationSeconds));
    }

    formData.append(
      'textLayout',
      JSON.stringify(
        activeTextSlots.reduce((layout, slot) => {
          const anchoredPosition = textLayout[slot.id];
          if (anchoredPosition) {
            layout[slot.id] = anchoredPosition;
          }

          return layout;
        }, {}),
      ),
    );

    if (media.file) {
      formData.append('media', media.file);
    } else if (media.mediaUrl) {
      formData.append('mediaUrl', media.mediaUrl);
    }

    try {
      const response = await apiFetch('/api/renders', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Render failed.');
      }

      setRenderResult(payload);
    } catch (renderError) {
      setError(renderError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-shell one-page">
      <header className="hero compact-hero">
        <h1>Video Meme</h1>
      </header>

      <main className="single-screen-layout">
        <section className="editor-panel card compact-editor">
          {isBooting ? (
            <div className="loading-copy">Loading…</div>
          ) : (
            <>
              <GifSearch
                featured={featuredGifs}
                error={gifDiscoveryError}
                onSelect={handleGifSelect}
                selectedSourceUrl={media.mediaUrl}
              />

              <div className="mode-switch" role="tablist" aria-label="Editing mode">
                <button
                  type="button"
                  className={`source-tab ${editorMode === EDITOR_MODES.CAPTION ? 'active' : ''}`}
                  onClick={() => setEditorMode(EDITOR_MODES.CAPTION)}
                >
                  Quick caption
                </button>
                <button
                  type="button"
                  className={`source-tab ${editorMode === EDITOR_MODES.REMIX ? 'active' : ''}`}
                  onClick={() => setEditorMode(EDITOR_MODES.REMIX)}
                >
                  Remix a meme
                </button>
              </div>

              <p className="support-copy mode-summary">
                {editorMode === EDITOR_MODES.REMIX
                  ? 'Remix mode removes common top/bottom text and replaces it in the same classic meme style.'
                  : 'Caption mode keeps the source visible and adds one strong caption.'}
              </p>

              <div className="source-switch" role="tablist" aria-label="Media source">
                <button
                  type="button"
                  className={`source-tab ${mediaSource === 'search' ? 'active' : ''}`}
                  onClick={() => setMediaSource('search')}
                >
                  GIFs
                </button>
                <button
                  type="button"
                  className={`source-tab ${mediaSource === 'upload' ? 'active' : ''}`}
                  onClick={() => setMediaSource('upload')}
                >
                  Upload
                </button>
              </div>

              {mediaSource === 'upload' && (
                <ImageUploader
                  media={media}
                  onChange={handleMediaChange}
                  onVideoMetadata={handleVideoMetadata}
                />
              )}

              {media.mediaUrl || media.file ? (
                <>
                  <TextInputs
                    slots={activeTextSlots}
                    values={editor}
                    onChange={handleTextChange}
                  />

                  <TrimControls
                    visible={media.mediaType === 'video'}
                    trim={trimState}
                    presetTrim={selectedPreset?.trim}
                    onChange={handleTrimChange}
                  />

                  <button
                    className="primary-button full-width render-button"
                    type="button"
                    onClick={renderMeme}
                    disabled={isLoading || !selectedPreset}
                  >
                    {isLoading ? 'Rendering…' : 'Make GIF'}
                  </button>
                </>
              ) : null}

              {error && <p className="error-banner">{error}</p>}
            </>
          )}
        </section>

        <section className="preview-panel card preview-stage">
          <MemePreview
            result={renderResult}
            selectedPreset={selectedPreset}
            isLoading={isLoading}
            loadingMessage={activeLoadingHint}
            sourceMedia={media}
            textSlots={activeTextSlots}
            textValues={editor}
            textLayout={textLayout}
            onTextLayoutChange={handleLayoutChange}
            onSourceVideoMetadata={handleVideoMetadata}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
