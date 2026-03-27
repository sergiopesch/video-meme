import { formatSeconds } from '../lib/trim';

const TrimControls = ({ visible, trim, onChange, presetTrim }) => {
  if (!visible || !trim || !presetTrim) {
    return null;
  }

  const hasSourceDuration = Number.isFinite(trim.sourceDuration);
  const selectionStyle = hasSourceDuration
    ? {
        left: `${trim.offsetPercent}%`,
        width: `${Math.max(trim.selectedPercent, 2)}%`,
      }
    : null;

  return (
    <section className="panel-section">
      <div className="section-heading">
        <h2>4. Trim the moment</h2>
        <p>Choose the part you want to turn into a GIF.</p>
      </div>

      <div className="trim-summary-card">
        <div>
          <span className="summary-label">Start</span>
          <strong>
            {formatSeconds(trim.startSeconds)}
          </strong>
        </div>
        <div>
          <span className="summary-label">Length</span>
          <strong>{formatSeconds(trim.durationSeconds)}</strong>
        </div>
      </div>

      {hasSourceDuration ? (
        <div className="trim-window-visual">
          <div className="trim-window-track">
            <span className="trim-window-selection" style={selectionStyle} />
          </div>
          <div className="trim-window-scale">
            <span>0s</span>
            <span>{formatSeconds(trim.sourceDuration)}</span>
          </div>
        </div>
      ) : (
        <p className="support-copy">
          The sliders unlock once the clip length is loaded.
        </p>
      )}

      <div className="trim-control-stack">
        <label className="trim-control-card">
          <div className="trim-control-head">
            <span>Start at</span>
            <strong>{formatSeconds(trim.startSeconds)}</strong>
          </div>
          <input
            className="trim-range"
            type="range"
            min="0"
            max={hasSourceDuration ? trim.maxStart : 0}
            step="0.1"
            value={trim.startSeconds}
            onChange={(event) => onChange('startSeconds', event.target.value)}
            disabled={!hasSourceDuration}
          />
          <div className="trim-control-meta">
            <span>0s</span>
            <span>{hasSourceDuration ? `Max ${formatSeconds(trim.maxStart)}` : 'Waiting for clip'}</span>
          </div>
          <input
            type="number"
            min="0"
            max={hasSourceDuration ? trim.maxStart : undefined}
            step="0.1"
            value={trim.startSeconds}
            onChange={(event) => onChange('startSeconds', event.target.value)}
            inputMode="decimal"
          />
        </label>

        <label className="trim-control-card">
          <div className="trim-control-head">
            <span>Duration</span>
            <strong>{formatSeconds(trim.durationSeconds)}</strong>
          </div>
          <input
            className="trim-range"
            type="range"
            min={trim.minDuration}
            max={trim.durationLimit}
            step="0.1"
            value={trim.durationSeconds}
            onChange={(event) => onChange('durationSeconds', event.target.value)}
          />
          <div className="trim-control-meta">
            <span>{formatSeconds(trim.minDuration)} min</span>
            <span>{formatSeconds(trim.durationLimit)} max</span>
          </div>
          <input
            type="number"
            min={trim.minDuration}
            max={trim.durationLimit}
            step="0.1"
            value={trim.durationSeconds}
            onChange={(event) => onChange('durationSeconds', event.target.value)}
            inputMode="decimal"
          />
        </label>
      </div>
    </section>
  );
};

export default TrimControls;
