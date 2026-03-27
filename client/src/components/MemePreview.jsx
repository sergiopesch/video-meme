import { buildApiUrl } from '../lib/api';

const MemePreview = ({ result, selectedPreset, isLoading }) => {
  const videoUrl = result?.outputUrl ? buildApiUrl(result.outputUrl) : '';

  const handleDownload = async () => {
    if (!videoUrl) {
      return;
    }

    const response = await fetch(videoUrl);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${result.preset.id}.mp4`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const handleCopy = async () => {
    if (!videoUrl) {
      return;
    }

    await navigator.clipboard.writeText(videoUrl);
  };

  return (
    <section className="result-shell">
      <div className="section-heading">
        <h2>Render preview</h2>
        <p>{selectedPreset ? selectedPreset.name : 'Pick a preset to start shaping the edit.'}</p>
      </div>

      {isLoading ? (
        <div className="empty-state busy">
          <div className="spinner" />
          <p>FFmpeg is rendering the final MP4…</p>
        </div>
      ) : result ? (
        <>
          <video src={videoUrl} controls className="result-video" />
          <div className="result-meta">
            <div>
              <span>Preset</span>
              <strong>{result.preset.name}</strong>
            </div>
            <div>
              <span>Duration</span>
              <strong>{result.render.durationSeconds}s</strong>
            </div>
            <div>
              <span>Output</span>
              <strong>
                {result.render.width}×{result.render.height}
              </strong>
            </div>
          </div>
          <div className="result-actions">
            <button type="button" className="primary-button" onClick={handleDownload}>
              Download MP4
            </button>
            <button type="button" className="secondary-button" onClick={handleCopy}>
              Copy link
            </button>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p>Your render appears here once the edit is ready.</p>
        </div>
      )}
    </section>
  );
};

export default MemePreview;
