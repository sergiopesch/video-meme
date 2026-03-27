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
        <h2>4. Trim the clip</h2>
        <p>Choose one short export window from the source clip. GIFs travel better on phones when the moment stays tight.</p>
      </div>

      <div className="trim-summary-card">
        <div>
          <span className="summary-label">Selected window</span>
          <strong>
            {formatSeconds(trim.startSeconds)} → {formatSeconds(trim.endSeconds)}
          </strong>
        </div>
        <div>
          <span className="summary-label">Clip length</span>
          <strong>{formatSeconds(trim.durationSeconds)}</strong>
        </div>
      </div>

      <div className="trim-stats-grid">
        <div>
          <span className="summary-label">Source length</span>
          <strong>{hasSourceDuration ? formatSeconds(trim.sourceDuration) : 'Waiting for metadata'}</strong>
        </div>
        <div>
          <span className="summary-label">Preset range</span>
          <strong>
            {formatSeconds(trim.minDuration)} – {formatSeconds(trim.maxDuration)}
          </strong>
        </div>
        <div>
          <span className="summary-label">Remaining after export</span>
          <strong>{trim.remainingSeconds == null ? '—' : formatSeconds(trim.remainingSeconds)}</strong>
        </div>
        <div>
          <span className="summary-label">Default clip</span>
          <strong>{formatSeconds(presetTrim.defaultDurationSeconds)}</strong>
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
          If the source length can be read in the browser, the sliders clamp against the actual clip. For bounded URL
          imports without metadata, the server still applies the final short-GIF guardrails.
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
            <span>{hasSourceDuration ? `Latest start ${formatSeconds(trim.maxStart)}` : 'Awaiting clip metadata'}</span>
          </div>
          <input
            type="number"
            min="0"
            max={hasSourceDuration ? trim.maxStart : undefined}
            step="0.1"
            value={trim.startSeconds}
            onChange={(event) => onChange('startSeconds', event.target.value)}
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
            <span>{formatSeconds(trim.durationLimit)} max right now</span>
          </div>
          <input
            type="number"
            min={trim.minDuration}
            max={trim.durationLimit}
            step="0.1"
            value={trim.durationSeconds}
            onChange={(event) => onChange('durationSeconds', event.target.value)}
          />
        </label>
      </div>
    </section>
  );
};

export default TrimControls;
