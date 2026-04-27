import { useEffect, useMemo, useRef, useState } from 'react';
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getFallbackAnchor(position) {
  if (position === 'top') {
    return { x: 0.5, y: 0.14 };
  }

  if (position === 'bottom') {
    return { x: 0.5, y: 0.86 };
  }

  return { x: 0.5, y: 0.6 };
}

function resolvePreviewText({ slot, selectedPreset, textValues }) {
  const rawText = String(textValues?.[slot.id] || '').trim();
  const textTransform = selectedPreset?.styling?.textTransform;

  if (!rawText) {
    return '';
  }

  if (textTransform === 'uppercase') {
    return rawText.toUpperCase();
  }

  return rawText;
}

const MemePreview = ({
  result,
  selectedPreset,
  isLoading,
  loadingMessage,
  sourceMedia,
  textSlots = [],
  textValues = {},
  textLayout = {},
  onTextLayoutChange,
  onSourceVideoMetadata,
}) => {
  const assetUrl = result?.outputUrl ? buildApiUrl(result.outputUrl) : '';
  const stageRef = useRef(null);
  const [actionMessage, setActionMessage] = useState('');
  const [activeDragSlot, setActiveDragSlot] = useState('');
  const output = useMemo(() => buildOutputDetails(result), [result]);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const hasSourceMedia = Boolean(sourceMedia?.previewUrl);

  useEffect(() => {
    setActionMessage('');
  }, [result?.outputUrl]);

  const updatePositionFromPointer = (slotId, clientX, clientY) => {
    if (!stageRef.current || typeof onTextLayoutChange !== 'function') {
      return;
    }

    const bounds = stageRef.current.getBoundingClientRect();
    const normalizedX = clamp((clientX - bounds.left) / Math.max(bounds.width, 1), 0.05, 0.95);
    const normalizedY = clamp((clientY - bounds.top) / Math.max(bounds.height, 1), 0.05, 0.95);

    onTextLayoutChange(slotId, {
      x: Number(normalizedX.toFixed(3)),
      y: Number(normalizedY.toFixed(3)),
    });
  };

  const handleDragStart = (slotId, event) => {
    if (typeof onTextLayoutChange !== 'function') {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveDragSlot(slotId);
    updatePositionFromPointer(slotId, event.clientX, event.clientY);
  };

  const handleDragMove = (slotId, event) => {
    if (activeDragSlot !== slotId) {
      return;
    }

    updatePositionFromPointer(slotId, event.clientX, event.clientY);
  };

  const handleDragEnd = (slotId, event) => {
    if (activeDragSlot !== slotId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setActiveDragSlot('');
  };

  const handleDownload = async () => {
    if (!assetUrl) {
      return;
    }

    try {
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
    } catch {
      setActionMessage('Download failed. Try opening the GIF in a new tab.');
    }
  };

  const handleCopy = async () => {
    if (!assetUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(assetUrl);
      setActionMessage('Link copied.');
    } catch {
      setActionMessage('Copy failed. Long-press the GIF and copy the link manually.');
    }
  };

  const handleShare = async () => {
    if (!assetUrl) {
      return;
    }

    if (!canNativeShare) {
      await handleCopy();
      return;
    }

    try {
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
    } catch {
      setActionMessage('Share failed. Try downloading the GIF instead.');
    }
  };

  return (
    <section className="result-shell">
      <div className="section-heading">
        <h2>Preview</h2>
        <p>{selectedPreset ? selectedPreset.name : 'Your GIF will show up here.'}</p>
      </div>

      {isLoading ? (
        <div className="empty-state busy">
          <div className="spinner" />
          <p>{loadingMessage || 'FFmpeg is building the final GIF…'}</p>
        </div>
      ) : result ? (
        <>
          <img src={assetUrl} alt="Rendered meme GIF preview" className="result-gif" />
          <div className="result-actions">
            {canNativeShare && (
              <button type="button" className="primary-button" onClick={handleShare}>
                Share
              </button>
            )}
            <button type="button" className={canNativeShare ? 'secondary-button' : 'primary-button'} onClick={handleDownload}>
              Download
            </button>
            <button type="button" className="secondary-button" onClick={handleCopy}>
              Copy link
            </button>
          </div>
          {actionMessage && <p className="support-copy result-feedback">{actionMessage}</p>}
        </>
      ) : hasSourceMedia ? (
        <div className="preview-composer">
          <p className="support-copy preview-guide">
            Drag text where you want it, then tap Make GIF.
          </p>

          <div className="preview-stage-frame" ref={stageRef}>
            {sourceMedia.mediaType === 'video' ? (
              <video
                src={sourceMedia.previewUrl}
                className="preview-source-media"
                autoPlay
                loop
                muted
                playsInline
                onLoadedMetadata={(event) => onSourceVideoMetadata?.(event.currentTarget.duration)}
              />
            ) : (
              <img src={sourceMedia.previewUrl} alt="Source media preview" className="preview-source-media" />
            )}

            <div className="preview-overlay-layer">
              {textSlots.map((slot) => {
                const previewText = resolvePreviewText({
                  slot,
                  selectedPreset,
                  textValues,
                });
                const anchoredPosition = textLayout[slot.id] || getFallbackAnchor(slot.position);
                const isPlaceholder = !previewText;
                const isDragging = activeDragSlot === slot.id;

                return (
                  <button
                    key={slot.id}
                    type="button"
                    className={`preview-text-chip ${isPlaceholder ? 'placeholder' : ''} ${isDragging ? 'dragging' : ''}`}
                    style={{
                      left: `${anchoredPosition.x * 100}%`,
                      top: `${anchoredPosition.y * 100}%`,
                    }}
                    onPointerDown={(event) => handleDragStart(slot.id, event)}
                    onPointerMove={(event) => handleDragMove(slot.id, event)}
                    onPointerUp={(event) => handleDragEnd(slot.id, event)}
                    onPointerCancel={(event) => handleDragEnd(slot.id, event)}
                    aria-label={`Position ${slot.label}`}
                    title={`Drag to position ${slot.label}`}
                  >
                    {previewText || `Drag ${slot.label.toLowerCase()}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>Create something and it will appear here.</p>
        </div>
      )}
    </section>
  );
};

export default MemePreview;
