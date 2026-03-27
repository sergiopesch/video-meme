const TrimControls = ({
  visible,
  startSeconds,
  durationSeconds,
  onChange,
  maxDuration,
  sourceDuration,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <section className="panel-section">
      <div className="section-heading">
        <h2>4. Trim the clip</h2>
        <p>Set the start point and how long the exported meme should run.</p>
      </div>

      <div className="field-grid compact">
        <label className="field-block">
          <span>Start at (seconds)</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={startSeconds}
            onChange={(event) => onChange('startSeconds', event.target.value)}
          />
        </label>

        <label className="field-block">
          <span>Duration (seconds)</span>
          <input
            type="number"
            min="1"
            max={maxDuration || undefined}
            step="0.1"
            value={durationSeconds}
            onChange={(event) => onChange('durationSeconds', event.target.value)}
          />
        </label>
      </div>

      {sourceDuration ? (
        <p className="support-copy">Source clip length: {sourceDuration.toFixed(1)}s</p>
      ) : null}
    </section>
  );
};

export default TrimControls;
