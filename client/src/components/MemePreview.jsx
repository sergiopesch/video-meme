import { useEffect, useMemo, useState } from 'react';
import { buildApiUrl } from '../lib/api';

function buildOutputDetails(result) {
  const format = result?.output?.format || result?.format || 'gif';
  const mimeType = result?.output?.mimeType || result?.mimeType || 'image/gif';
  const fileName = result?.output?.fileName || result?.fileName || `${result?.preset?.id || 'meme'}.${format}`;

  return {
    format,
    mimeType,
    fileName,
  };
}

const MemePreview = ({ result, selectedPreset, isLoading }) => {
  const assetUrl = result?.outputUrl ? buildApiUrl(result.outputUrl) : '';
  const [actionMessage, setActionMessage] = useState('');
  const output = useMemo(() => buildOutputDetails(result), [result]);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    setActionMessage('');
  }, [result?.outputUrl]);

  const handleDownload = async () => {
    if (!assetUrl) {
      return;
    }

    const response = await fetch(assetUrl);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = output.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    setActionMessage('GIF downloaded.');
  };

  const handleCopy = async () => {
    if (!assetUrl) {
      return;
    }

    await navigator.clipboard.writeText(assetUrl);
    setActionMessage('Link copied.');
  };

  const handleShare = async () => {
    if (!assetUrl) {
      return;
    }

    if (!canNativeShare) {
      await handleCopy();
      return;
    }

    const response = await fetch(assetUrl);
    const blob = await response.blob();
    const file = new File([blob], output.fileName, { type: output.mimeType });
    const sharePayload = {
      title: `${result.preset.name} GIF`,
      text: 'Optimized mobile-share GIF. No audio.',
      files: [file],
    };

    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      await navigator.share(sharePayload);
      setActionMessage('GIF handed off to the native share sheet.');
      return;
    }

    await navigator.share({
      title: sharePayload.title,
      text: sharePayload.text,
      url: assetUrl,
    });
    setActionMessage('Link handed off to the native share sheet.');
  };

  return (
    <section className="result-shell">
      <div className="section-heading">
        <h2>GIF preview</h2>
        <p>{selectedPreset ? selectedPreset.name : 'Pick a preset to start shaping the edit.'}</p>
      </div>

      {isLoading ? (
        <div className="empty-state busy">
          <div className="spinner" />
          <p>FFmpeg is building the final GIF…</p>
        </div>
      ) : result ? (
        <>
          <img src={assetUrl} alt="Rendered meme GIF preview" className="result-gif" />
          <div className="result-meta">
            <div>
              <span>Format</span>
              <strong>{output.format.toUpperCase()} • no audio</strong>
            </div>
            <div>
              <span>Duration</span>
              <strong>{result.render.durationSeconds}s</strong>
            </div>
            <div>
              <span>Output</span>
              <strong>
                {result.render.width}×{result.render.height} @ {result.render.fps}fps
              </strong>
            </div>
          </div>
          <p className="support-copy result-support-copy">
            This is the optimized mobile-share GIF path. It trades audio and full-video fidelity for lighter sharing.
          </p>
          <div className="result-actions">
            {canNativeShare && (
              <button type="button" className="primary-button" onClick={handleShare}>
                Share GIF
              </button>
            )}
            <button type="button" className={canNativeShare ? 'secondary-button' : 'primary-button'} onClick={handleDownload}>
              Download GIF
            </button>
            <button type="button" className="secondary-button" onClick={handleCopy}>
              Copy link
            </button>
          </div>
          {actionMessage && <p className="support-copy result-feedback">{actionMessage}</p>}
        </>
      ) : (
        <div className="empty-state">
          <p>Your GIF appears here once the edit is ready.</p>
        </div>
      )}
    </section>
  );
};

export default MemePreview;
