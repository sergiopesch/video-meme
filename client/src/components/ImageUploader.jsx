import { useRef } from 'react';

const ImageUploader = ({ media, onChange, onVideoMetadata }) => {
  const inputRef = useRef(null);

  const updateFile = (file) => {
    if (!file) {
      return;
    }

    const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
    const previewUrl = URL.createObjectURL(file);
    onChange({ file, previewUrl, mediaType });
  };

  const handleDrop = (event) => {
    event.preventDefault();
    updateFile(event.dataTransfer.files?.[0]);
  };

  return (
    <section className="panel-section">
      <div className="section-heading">
        <h2>2. Upload source media</h2>
        <p>Use a still image for a quick meme loop or a short video clip when timing matters.</p>
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
          ) : (
            <img src={media.previewUrl} alt="Uploaded source" className="upload-preview" />
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
          {media.previewUrl ? 'Replace media' : 'Choose file'}
        </button>
        {media.file && <span className="file-meta">{media.file.name}</span>}
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
