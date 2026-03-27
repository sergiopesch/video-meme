import { useEffect, useMemo, useState } from 'react';
import './App.css';
import MemeSelector from './components/MemeSelector';
import ImageUploader from './components/ImageUploader';
import MemePreview from './components/MemePreview';
import TextInputs from './components/TextInputs';
import TrimControls from './components/TrimControls';
import { apiFetch } from './lib/api';
import { buildTrimState, clamp, normalizeVideoTrim } from './lib/trim';

function App() {
  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [media, setMedia] = useState({ file: null, mediaUrl: '', previewUrl: '', mediaType: '' });
  const [sourceDuration, setSourceDuration] = useState(null);
  const [editor, setEditor] = useState({
    topText: '',
    bottomText: '',
    caption: '',
    startSeconds: 0,
    durationSeconds: 4,
  });
  const [renderResult, setRenderResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isBooting, setIsBooting] = useState(true);

  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId) || null,
    [presets, selectedPresetId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPresets() {
      try {
        const response = await apiFetch('/api/templates');
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load presets.');
        }

        if (cancelled) {
          return;
        }

        setPresets(payload.presets || []);
        setSelectedPresetId(payload.defaultPresetId || payload.presets?.[0]?.id || '');
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

    loadPresets();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPreset) {
      return;
    }

    setEditor((current) => {
      if (media.mediaType === 'video') {
        return {
          ...current,
          ...normalizeVideoTrim(
            {
              startSeconds: current.startSeconds,
              durationSeconds: current.durationSeconds || selectedPreset.trim.defaultDurationSeconds,
            },
            selectedPreset,
            sourceDuration,
          ),
        };
      }

      return {
        ...current,
        durationSeconds: clamp(
          current.durationSeconds || selectedPreset.trim.defaultDurationSeconds,
          selectedPreset.trim.minDurationSeconds,
          selectedPreset.trim.maxDurationSeconds,
        ),
      };
    });
  }, [media.mediaType, selectedPreset, sourceDuration]);

  useEffect(() => {
    return () => {
      if (media.file && media.previewUrl && media.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(media.previewUrl);
      }
    };
  }, [media.file, media.previewUrl]);

  const handlePresetSelect = (presetId) => {
    setSelectedPresetId(presetId);
    setRenderResult(null);
  };

  const handleMediaChange = ({ file, mediaUrl = '', previewUrl, mediaType }) => {
    if (media.file && media.previewUrl && media.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(media.previewUrl);
    }

    setMedia({ file, mediaUrl, previewUrl, mediaType });
    setSourceDuration(null);
    setRenderResult(null);
    setError('');
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

      if (media.mediaType !== 'video') {
        return next;
      }

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
    setEditor((current) => {
      if (!selectedPreset) {
        return current;
      }

      return {
        ...current,
        ...normalizeVideoTrim(
          {
            startSeconds: current.startSeconds,
            durationSeconds: current.durationSeconds || selectedPreset.trim.defaultDurationSeconds,
          },
          selectedPreset,
          duration,
        ),
      };
    });
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
      setError('Pick a preset and add an upload or direct media URL first.');
      return;
    }

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('presetId', selectedPreset.id);
    formData.append('topText', editor.topText);
    formData.append('bottomText', editor.bottomText);
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
    <div className="app-shell">
      <header className="hero">
        <div>
          <span className="eyebrow">Mobile-share GIF pipeline</span>
          <h1>GIF Meme Editor</h1>
          <p>
            Upload an image or short clip, or paste a direct media or YouTube URL, then add captions, trim the beat,
            and export an optimized GIF for phone sharing. No audio, no fake promises.
          </p>
        </div>
      </header>

      <main className="layout">
        <section className="editor-panel card">
          {isBooting ? (
            <p>Loading presets…</p>
          ) : (
            <>
              <MemeSelector
                presets={presets}
                selectedPresetId={selectedPresetId}
                onSelect={handlePresetSelect}
              />

              <ImageUploader
                media={media}
                onChange={handleMediaChange}
                onVideoMetadata={handleVideoMetadata}
              />

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

              {selectedPreset && (
                <div className="preset-summary">
                  <div>
                    <span className="summary-label">Output</span>
                    <strong>
                      {selectedPreset.export?.format?.toUpperCase() || 'GIF'} • {selectedPreset.output.width}×{selectedPreset.output.height}
                    </strong>
                  </div>
                  <div>
                    <span className="summary-label">Pacing</span>
                    <strong>
                      {selectedPreset.output.fps}fps • up to {selectedPreset.trim.maxDurationSeconds}s
                    </strong>
                  </div>
                  <div>
                    <span className="summary-label">Audio</span>
                    <strong>{selectedPreset.export?.hasAudio ? 'Included' : 'Removed for GIF export'}</strong>
                  </div>
                </div>
              )}

              <button
                className="primary-button full-width-mobile render-button"
                type="button"
                onClick={renderMeme}
                disabled={isLoading || !selectedPreset || (!media.file && !media.mediaUrl)}
              >
                {isLoading ? 'Rendering mobile-share GIF…' : 'Render mobile-share GIF'}
              </button>

              {error && <p className="error-banner">{error}</p>}
            </>
          )}
        </section>

        <aside className="preview-panel card">
          <MemePreview result={renderResult} selectedPreset={selectedPreset} isLoading={isLoading} />
        </aside>
      </main>
    </div>
  );
}

export default App;
