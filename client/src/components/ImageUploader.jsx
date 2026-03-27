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

  const sourceLabel = media.file?.name || media.mediaUrl || '';
  const inlinePreview = canInlinePreview(media);

  return (
    <section className="panel-section">
      <div className="section-heading">
        <h2>2. Add source media</h2>
        <p>
          Upload a still image or short video clip, paste a direct media URL, or drop in a YouTube page URL for the
          bounded import flow. Everything exports as a short, no-audio GIF tuned for phones.
        </p>
      </div>

      <div
        className={`upload-surface ${media.previewUrl ? 'has-preview' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        role="presentation"
      >
        {media.previewUrl ? (
          inlinePreview && media.mediaType === 'video' ? (
            <video
              src={media.previewUrl}
              controls
              className="upload-preview"
              onLoadedMetadata={(event) => onVideoMetadata(event.currentTarget.duration)}
            />
          ) : inlinePreview && media.mediaType === 'image' ? (
            <img src={media.previewUrl} alt="Uploaded source" className="upload-preview" />
          ) : (
            <div className="upload-copy url-summary">
              <span className="upload-icon">↗</span>
              <strong>{isYouTubeUrl(media.mediaUrl) ? 'YouTube URL ready' : 'Remote media URL ready'}</strong>
              <p>{media.mediaUrl}</p>
            </div>
          )
        ) : (
          <div className="upload-copy">
            <span className="upload-icon">⬆</span>
            <strong>Drop an image or short video clip here</strong>
            <p>PNG, JPG, WEBP, MP4, MOV, WEBM, or a YouTube watch/share URL</p>
          </div>
        )}
      </div>

      <div className="upload-actions">
        <button type="button" className="secondary-button" onClick={() => inputRef.current?.click()}>
          {media.previewUrl ? 'Replace local file' : 'Choose file'}
        </button>
        {sourceLabel && <span className="file-meta">{sourceLabel}</span>}
      </div>

      <div className="field-grid compact url-import">
        <label className="field-block">
          <span>Or paste a media or YouTube URL</span>
          <input
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={mediaUrlInput}
            onChange={(event) => setMediaUrlInput(event.target.value)}
          />
          <small>
            Direct image/video files work best. YouTube support is intentionally bounded and only accepts pages that
            expose a directly downloadable stream. The final export is still a mobile-share GIF.
          </small>
        </label>
        <div className="url-actions">
          <button type="button" className="secondary-button" onClick={applyMediaUrl}>
            Use URL
          </button>
        </div>
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
