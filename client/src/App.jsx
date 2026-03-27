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
const loadingHints = [
  'Waking up the editor…',
  'Rendering your GIF…',
  'Finishing the export…',
];

function App() {
  const [presets, setPresets] = useState([]);
  const [featuredGifs, setFeaturedGifs] = useState([]);
  const [mediaSource, setMediaSource] = useState('search');
  const [media, setMedia] = useState({ file: null, mediaUrl: '', previewUrl: '', mediaType: '' });
  const [sourceDuration, setSourceDuration] = useState(null);
  const [editor, setEditor] = useState({
    topText: '',
    bottomText: '',
    caption: '',
    startSeconds: 0,
    durationSeconds: 3.5,
  });
  const [renderResult, setRenderResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [gifDiscoveryError, setGifDiscoveryError] = useState('');
  const [isBooting, setIsBooting] = useState(true);
  const [loadingHintIndex, setLoadingHintIndex] = useState(0);

  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === DEFAULT_PRESET_ID) || null,
    [presets],
  );
  const activeLoadingHint = loadingHints[loadingHintIndex] || loadingHints[0];

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
    if (!selectedPreset) {
      return;
    }

    setEditor((current) => ({
      ...current,
      ...normalizeVideoTrim(
        {
          startSeconds: current.startSeconds,
          durationSeconds: current.durationSeconds || selectedPreset.trim.defaultDurationSeconds,
        },
        selectedPreset,
        sourceDuration,
      ),
    }));
  }, [selectedPreset, sourceDuration]);

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

  const handleTrimChange = (field, value) => {
    const numericValue = Number(value);

    setEditor((current) => {
      const next = {
        ...current,
        [field]: Number.isFinite(numericValue) ? numericValue : 0,
      };

      return {
        ...current,
        ...normalizeVideoTrim(next, selectedPreset, sourceDuration),
      };
    });
    setRenderResult(null);
  };

  const handleVideoMetadata = (duration) => {
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }

    setSourceDuration(duration);
  };

  const videoTrim = useMemo(() => {
    if (media.mediaType !== 'video' || !selectedPreset) {
      return null;
    }

    return buildTrimState({
      preset: selectedPreset,
      sourceDuration,
      startSeconds: editor.startSeconds,
      durationSeconds: editor.durationSeconds || selectedPreset.trim.defaultDurationSeconds,
    });
  }, [media.mediaType, selectedPreset, sourceDuration, editor.startSeconds, editor.durationSeconds]);

  const renderMeme = async () => {
    if (!selectedPreset || (!media.file && !media.mediaUrl)) {
      setError('Pick a GIF or upload something first.');
      return;
    }

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('presetId', selectedPreset.id);
    formData.append('caption', editor.caption);
    formData.append('durationSeconds', String(videoTrim?.durationSeconds || editor.durationSeconds));

    if (media.mediaType === 'video') {
      formData.append('startSeconds', String(videoTrim?.startSeconds || editor.startSeconds));
    }

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

  const activeTextSlots = selectedPreset?.textSlots || [];

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
              />

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
                    trim={videoTrim}
                    onChange={handleTrimChange}
                    presetTrim={selectedPreset?.trim}
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
          />
        </section>
      </main>
    </div>
  );
}

export default App;
