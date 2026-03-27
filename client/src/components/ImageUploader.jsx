import { useEffect, useRef, useState } from 'react';

function inferMediaTypeFromUrl(value) {
  const normalized = String(value || '').toLowerCase();

  if (/\.(mp4|mov|webm|mkv)(?:$|[?#])/.test(normalized)) {
    return 'video';
  }

  if (/\.(png|jpe?g|webp|gif)(?:$|[?#])/.test(normalized)) {
    return 'image';
  }

  return '';
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

  return (
    <section className="panel-section">
      <div className="section-heading">
        <h2>2. Add source media</h2>
        <p>Upload a still image or short video clip, or paste a direct media URL when the asset already lives online.</p>
      </div>

      <div
        className={`upload-surface ${media.previewUrl ? 'has-preview' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        role="presentation"
      >
        {media.previewUrl ? (
          media.mediaType === 'video' ? (
            <video
              src={media.previewUrl}
              controls
              className="upload-preview"
              onLoadedMetadata={(event) => onVideoMetadata(event.currentTarget.duration)}
            />
          ) : media.mediaType === 'image' ? (
            <img src={media.previewUrl} alt="Uploaded source" className="upload-preview" />
          ) : (
            <div className="upload-copy url-summary">
              <span className="upload-icon">↗</span>
              <strong>Remote media URL ready</strong>
              <p>{media.mediaUrl}</p>
            </div>
          )
        ) : (
          <div className="upload-copy">
            <span className="upload-icon">⬆</span>
            <strong>Drop an image or short video clip here</strong>
            <p>PNG, JPG, WEBP, MP4, MOV, or WEBM</p>
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
          <span>Or paste a direct media URL</span>
          <input
            type="url"
            placeholder="https://cdn.example.com/meme-source.mp4"
            value={mediaUrlInput}
            onChange={(event) => setMediaUrlInput(event.target.value)}
          />
          <small>Direct image/video files only for now. YouTube page ingestion is still a later slice.</small>
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
