import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Check,
  X,
  Crop,
  Layers,
} from 'lucide-react';
import { CropAdjustment } from '../types';
import { renderCroppedImage } from '../utils/imageProcessor';

interface PhotoAdjustModalProps {
  isOpen: boolean;
  title: string;
  imageSrc: string; // Original or current data URL
  targetAspect?: number; // width / height
  initialAdjustment?: CropAdjustment;
  onApply: (croppedDataUrl: string, adjustment: CropAdjustment) => void;
  onCancel: () => void;
}

export const PhotoAdjustModal: React.FC<PhotoAdjustModalProps> = ({
  isOpen,
  title,
  imageSrc,
  targetAspect = 85.6 / 54.0,
  initialAdjustment,
  onApply,
  onCancel,
}) => {
  const [zoom, setZoom] = useState<number>(initialAdjustment?.zoom ?? 1.0);
  const [panX, setPanX] = useState<number>(initialAdjustment?.panX ?? 0);
  const [panY, setPanY] = useState<number>(initialAdjustment?.panY ?? 0);
  const [rotation, setRotation] = useState<number>(initialAdjustment?.rotation ?? 0);
  const [livePreviewUrl, setLivePreviewUrl] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);

  // Dragging interaction state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });

  // Update live preview whenever parameters change
  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const preview = await renderCroppedImage({
          imageSrc,
          zoom,
          panX,
          panY,
          rotation,
          targetAspect,
          outputWidth: 600,
        });
        if (isMounted) {
          setLivePreviewUrl(preview);
        }
      } catch (err) {
        console.error(err);
      }
    }, 40);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, imageSrc, zoom, panX, panY, rotation, targetAspect]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: panX,
      initialPanY: panY,
    };
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanX(dragStartRef.current.initialPanX + dx);
    setPanY(dragStartRef.current.initialPanY + dy);
  }, []);

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleNudge = (dx: number, dy: number) => {
    setPanX((prev) => prev + dx);
    setPanY((prev) => prev + dy);
  };

  const handleRotate = (delta: number) => {
    setRotation((prev) => (prev + delta + 360) % 360);
  };

  const handleReset = () => {
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
    setRotation(0);
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      // High-res output (1200px width for 300 DPI clarity)
      const croppedResult = await renderCroppedImage({
        imageSrc,
        zoom,
        panX,
        panY,
        rotation,
        targetAspect,
        outputWidth: 1400,
      });

      onApply(croppedResult, {
        zoom,
        panX,
        panY,
        rotation,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <Crop size={20} className="text-maroon" />
            <h3 className="modal-title">Adjust Photo &bull; {title}</h3>
          </div>
          <button type="button" className="btn-close" onClick={onCancel} title="Cancel and close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Workspace + Preview */}
        <div className="modal-body-grid">
          {/* Main Interactive Crop Workspace */}
          <div className="crop-workspace-wrapper">
            <div className="workspace-header-bar">
              <span className="workspace-hint">Drag image to position inside crop frame</span>
              <button type="button" className="btn-tool" onClick={handleReset}>
                <Maximize2 size={13} />
                <span>Reset</span>
              </button>
            </div>

            <div
              className="crop-canvas-area"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Target Crop Frame */}
              <div
                className="crop-target-frame"
                style={{
                  aspectRatio: `${targetAspect}`,
                }}
              >
                {/* Image Inside Frame */}
                <div
                  className="crop-inner-content"
                  style={{
                    transform: `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                    cursor: 'grab',
                  }}
                >
                  <img
                    src={imageSrc}
                    alt="Adjusting card"
                    className="crop-source-img"
                    draggable={false}
                  />
                </div>

                {/* Framing guides */}
                <div className="crop-corner top-left" />
                <div className="crop-corner top-right" />
                <div className="crop-corner bottom-left" />
                <div className="crop-corner bottom-right" />
                <div className="crop-crosshair" />
              </div>
            </div>

            {/* Quick Directional Nudge Pad */}
            <div className="nudge-controls">
              <span className="nudge-label">Move Card:</span>
              <div className="nudge-pad">
                <button
                  type="button"
                  className="btn-nudge"
                  onClick={() => handleNudge(0, -15)}
                  title="Move Up"
                >
                  <ArrowUp size={16} />
                </button>
                <div className="nudge-middle-row">
                  <button
                    type="button"
                    className="btn-nudge"
                    onClick={() => handleNudge(-15, 0)}
                    title="Move Left"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn-nudge btn-nudge-center"
                    onClick={() => {
                      setPanX(0);
                      setPanY(0);
                    }}
                    title="Center Image"
                  >
                    &bull;
                  </button>
                  <button
                    type="button"
                    className="btn-nudge"
                    onClick={() => handleNudge(15, 0)}
                    title="Move Right"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-nudge"
                  onClick={() => handleNudge(0, 15)}
                  title="Move Down"
                >
                  <ArrowDown size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Controls & Live Preview Column */}
          <div className="modal-controls-col">
            {/* Live Crop Result Preview */}
            <div className="modal-preview-box">
              <div className="preview-box-header">
                <Layers size={15} className="text-maroon" />
                <span>Live Preview Result</span>
              </div>
              <div className="live-crop-thumb-container">
                {livePreviewUrl ? (
                  <img
                    src={livePreviewUrl}
                    alt="Live crop preview"
                    className="live-crop-thumb-img"
                    style={{ aspectRatio: `${targetAspect}` }}
                  />
                ) : (
                  <div className="thumb-placeholder">Loading preview...</div>
                )}
              </div>
            </div>

            {/* Zoom Slider */}
            <div className="control-group">
              <div className="control-label-row">
                <label className="control-title">Zoom</label>
                <span className="control-val">{Math.round(zoom * 100)}%</span>
              </div>
              <div className="zoom-slider-row">
                <button
                  type="button"
                  className="btn-zoom-step"
                  onClick={() => setZoom((z) => Math.max(0.7, Number((z - 0.1).toFixed(2))))}
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>
                <input
                  type="range"
                  min="0.7"
                  max="2.5"
                  step="0.02"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="modal-range"
                />
                <button
                  type="button"
                  className="btn-zoom-step"
                  onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))}
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>
              </div>
            </div>

            {/* Rotation Controls */}
            <div className="control-group">
              <div className="control-label-row">
                <label className="control-title">Rotate</label>
                <span className="control-val">{rotation}&deg;</span>
              </div>
              <div className="rotate-btn-row">
                <button
                  type="button"
                  className="btn-rotate-large"
                  onClick={() => handleRotate(-90)}
                >
                  <RotateCcw size={16} />
                  <span>90&deg; Left</span>
                </button>
                <button
                  type="button"
                  className="btn-rotate-large"
                  onClick={() => handleRotate(90)}
                >
                  <RotateCw size={16} />
                  <span>90&deg; Right</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer: Apply and Cancel */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary btn-md"
            onClick={onCancel}
            disabled={isApplying}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={handleApply}
            disabled={isApplying}
          >
            {isApplying ? (
              <span>Applying...</span>
            ) : (
              <>
                <Check size={18} />
                <span>Apply</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
