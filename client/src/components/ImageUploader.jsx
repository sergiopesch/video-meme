import { useEffect, useRef, useState } from 'react';

function isYouTubeUrl(value) {
  const normalized = String(value || '').toLowerCase();
  return normalized.includes('youtube.com/') || normalized.includes('youtu.be/');
}

function inferMediaTypeFromUrl(value) {
  const normalized = String(value || '').toLowerCase();

  if (isYouTubeUrl(normalized) || /\.(mp4|mov|webm|mkv)(?:$|[?#])/.test(normalized)) {
    return 'video';
  }

  if (/\.(png|jpe?g|webp|gif)(?:$|[?#])/.test(normalized)) {
    return 'image';
  }

  return '';
}

function canInlinePreview(media) {
  if (media.file) {
    return true;
  }

  if (!media.mediaUrl) {
    return false;
  }

  return /\.(png|jpe?g|webp|gif|mp4|mov|webm|mkv)(?:$|[?#])/i.test(media.mediaUrl);
}

const ImageUploader = ({ media, onChange, onVideoMetadata }) => {
  const inputRef = useRef(null);
  const [mediaUrlInput, setMediaUrlInput] = useState(media.mediaUrl || '');

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  useEffect(() => {
    setMediaUrlInput(media.mediaUrl || '');
  }, [media.mediaUrl]);

  const updateFile = (file) => {
    if (!file) {
      return;
    }

    const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
    const previewUrl = URL.createObjectURL(file);
    onChange({ file, mediaUrl: '', previewUrl, mediaType });
  };

  const handleDrop = (event) => {
    event.preventDefault();
    updateFile(event.dataTransfer.files?.[0]);
  };

  const applyMediaUrl = () => {
    const trimmedUrl = mediaUrlInput.trim();

    if (!trimmedUrl) {
      return;
    }

    onChange({
      file: null,
      mediaUrl: trimmedUrl,
      previewUrl: trimmedUrl,
      mediaType: inferMediaTypeFromUrl(trimmedUrl),
    });
  };

  const clearMedia = () => {
    setMediaUrlInput('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }

    onChange({ file: null, mediaUrl: '', previewUrl: '', mediaType: '' });
  };

  const sourceLabel = media.file?.name || media.mediaUrl || '';
  const inlinePreview = canInlinePreview(media);

  return (
    <section className="panel-section">
      <div className="section-heading">
        <h2>2. Add a photo or clip</h2>
        <p>
          Upload a file or paste a direct media link.
        </p>
      </div>

      <div
        className={`upload-surface ${media.previewUrl ? 'has-preview' : ''}`}
        onClick={media.previewUrl ? undefined : openFilePicker}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        onKeyDown={(event) => {
          if (media.previewUrl) {
            return;
          }

          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openFilePicker();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={media.previewUrl ? 'Media preview area' : 'Upload media'}
      >
        {media.previewUrl ? (
          inlinePreview && media.mediaType === 'video' ? (
            <video
              src={media.previewUrl}
              controls
              className="upload-preview"
              playsInline
              onLoadedMetadata={(event) => onVideoMetadata(event.currentTarget.duration)}
              onClick={(event) => event.stopPropagation()}
            />
          ) : inlinePreview && media.mediaType === 'image' ? (
            <img
              src={media.previewUrl}
              alt="Uploaded source"
              className="upload-preview"
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <div className="upload-copy url-summary">
              <span className="upload-icon">↗</span>
              <strong>{isYouTubeUrl(media.mediaUrl) ? 'YouTube URL ready' : 'Remote media URL ready'}</strong>
              <p>{media.mediaUrl}</p>
            </div>
          )
        ) : (
          <div className="upload-copy">
            <span className="upload-icon">+</span>
            <strong>Upload</strong>
            <p>Photo, video, or GIF</p>
          </div>
        )}
      </div>

      <div className="upload-actions">
        <button type="button" className="secondary-button" onClick={openFilePicker}>
          {media.previewUrl ? 'Replace local file' : 'Choose file'}
        </button>
        {sourceLabel && (
          <button type="button" className="secondary-button" onClick={clearMedia}>
            Clear source
          </button>
        )}
        {sourceLabel && <span className="file-meta">{sourceLabel}</span>}
      </div>

      <div className="search-row url-import">
        <input
          className="search-input"
          type="url"
          placeholder="Paste a direct media link"
          value={mediaUrlInput}
          onChange={(event) => setMediaUrlInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              applyMediaUrl();
            }
          }}
          inputMode="url"
        />
        <button type="button" className="secondary-button search-button" onClick={applyMediaUrl}>
          Use
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={(event) => updateFile(event.target.files?.[0])}
      />
    </section>
  );
};

export default ImageUploader;
