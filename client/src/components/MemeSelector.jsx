const MemeSelector = ({ presets, selectedPresetId, onSelect }) => {
  if (!presets.length) {
    return <section className="panel-section"><p>No presets are available yet.</p></section>;
  }

  return (
    <section className="panel-section">
      <div className="section-heading">
        <h2>1. Choose a preset</h2>
        <p>Presets define aspect ratio, output pacing, and caption treatment.</p>
      </div>

      <div className="preset-grid">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`preset-card ${selectedPresetId === preset.id ? 'selected' : ''}`}
            onClick={() => onSelect(preset.id)}
          >
            <span
              className="preset-swatch"
              style={{ background: preset.styling.surface, borderColor: preset.styling.accentColor }}
            >
              {preset.output.width}×{preset.output.height}
            </span>
            <div>
              <strong>{preset.name}</strong>
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
