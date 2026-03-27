const MemeSelector = ({ presets, selectedPresetId, onSelect }) => {
  if (!presets.length) {
    return <section className="panel-section"><p>No presets are available yet.</p></section>;
  }

  return (
    <section className="panel-section">
      <div className="section-heading">
        <h2>1. Choose a preset</h2>
        <p>Presets define the mobile-share GIF shape, pacing, and caption treatment.</p>
      </div>

      <div className="preset-grid">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`preset-card ${selectedPresetId === preset.id ? 'selected' : ''}`}
            onClick={() => onSelect(preset.id)}
          >
            <div
              className="preset-media"
              style={{ background: preset.styling.surface, borderColor: preset.styling.accentColor }}
              title={preset.thumbnail?.alt}
            >
              {preset.thumbnail?.src ? (
                <img
                  className="preset-thumbnail"
                  src={preset.thumbnail.src}
                  alt=""
                  loading="lazy"
                  aria-hidden="true"
                />
              ) : (
                <span className="preset-thumbnail-fallback">{preset.name}</span>
              )}
              <span className="preset-dimensions">
                {preset.output.width}×{preset.output.height}
              </span>
            </div>
            <div className="preset-copy">
              <div className="preset-copy-head">
                <strong>{preset.name}</strong>
                <span className="preset-type-pill">{preset.inputTypes.join(' / ')}</span>
              </div>
              <p>{preset.description}</p>
              <span className="preset-tags">{preset.tags.join(' • ')}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default MemeSelector;
