const MemeSelector = ({ presets, selectedPresetId, onSelect }) => {
  if (!presets.length) {
    return <section className="panel-section"><p>No presets are available yet.</p></section>;
  }

  return (
    <section className="panel-section">
      <div className="section-heading">
        <h2>1. Pick a style</h2>
        <p>Choose the layout that fits the joke.</p>
      </div>

      <div className="preset-grid">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`preset-card ${selectedPresetId === preset.id ? 'selected' : ''}`}
            onClick={() => onSelect(preset.id)}
            aria-pressed={selectedPresetId === preset.id}
          >
            <div
              className="preset-media"
              style={{ background: '#161616', borderColor: selectedPresetId === preset.id ? '#ffffff' : '#3a3a3a' }}
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
                <span className="preset-type-pill">{preset.output.width}×{preset.output.height}</span>
              </div>
              <p>{preset.description}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default MemeSelector;
