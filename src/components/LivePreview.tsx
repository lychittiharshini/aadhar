import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  Scissors,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { CardImageState, PrintSettings, CardSizeOption, CARD_SIZES } from '../types';
import { calculateCardPlacement } from '../utils/pdfGenerator';

interface LivePreviewProps {
  frontCard: CardImageState;
  backCard: CardImageState;
  settings: PrintSettings;
  onCardSizeChange: (size: CardSizeOption) => void;
}

export const LivePreview: React.FC<LivePreviewProps> = ({
  frontCard,
  backCard,
  settings,
  onCardSizeChange,
}) => {
  const [zoomScale, setZoomScale] = useState<number>(1);
  const placement = calculateCardPlacement(settings);

  const hasFront = Boolean(frontCard.dataUrl);
  const hasBack = Boolean(backCard.dataUrl);
  const bothUploaded = hasFront && hasBack;

  // Zoom handlers
  const zoomIn = () => setZoomScale((prev) => Math.min(prev + 0.15, 2.0));
  const zoomOut = () => setZoomScale((prev) => Math.max(prev - 0.15, 0.4));
  const resetZoom = () => setZoomScale(1);

  const mmToPx = 3.78;
  const sheetWidthPx = placement.pageWidthMm * mmToPx;
  const sheetHeightPx = placement.pageHeightMm * mmToPx;

  const cardWidthPx = placement.cardWidth * mmToPx;
  const cardHeightPx = placement.cardHeight * mmToPx;
  const gapPx = placement.gapMm * mmToPx;
  const frontXPx = placement.frontX * mmToPx;
  const frontYPx = placement.frontY * mmToPx;
  const backXPx = placement.backX * mmToPx;
  const backYPx = placement.backY * mmToPx;

  const maxDisplayWidth = 840;
  const baseScale = Math.min(1, maxDisplayWidth / sheetWidthPx);
  const effectiveScale = baseScale * zoomScale;

  return (
    <div className="preview-card-wrapper">
      {/* Top Bar with Card Size Selection */}
      <div className="preview-top-toolbar">
        <div className="card-size-selector-group">
          <span className="size-selector-label">Card Size:</span>
          <div className="card-size-toggle-buttons">
            <button
              type="button"
              className={`size-toggle-btn ${settings.cardSize === 'small' ? 'active' : ''}`}
              onClick={() => onCardSizeChange('small')}
            >
              <span className="size-name">{CARD_SIZES.small.label}</span>
              <span className="size-dim">{CARD_SIZES.small.dimensionsText}</span>
            </button>

            <button
              type="button"
              className={`size-toggle-btn ${settings.cardSize === 'large' ? 'active' : ''}`}
              onClick={() => onCardSizeChange('large')}
            >
              <span className="size-name">{CARD_SIZES.large.label}</span>
              <span className="size-dim">{CARD_SIZES.large.dimensionsText}</span>
            </button>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="preview-controls">
          <div className="zoom-group">
            <button
              type="button"
              className="btn-icon"
              onClick={zoomOut}
              title="Zoom Out"
              disabled={zoomScale <= 0.4}
            >
              <ZoomOut size={16} />
            </button>
            <span className="zoom-label">{Math.round(zoomScale * 100)}%</span>
            <button
              type="button"
              className="btn-icon"
              onClick={zoomIn}
              title="Zoom In"
              disabled={zoomScale >= 2.0}
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={resetZoom}
              title="Fit to Screen"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Header Info */}
      <div className="preview-header-bar">
        <div className="preview-title-block">
          <Eye size={18} className="text-maroon" />
          <h2 className="preview-title">Side-by-Side Preview</h2>
          <span className="paper-info-chip">
            {placement.pageWidthMm} &times; {placement.pageHeightMm} mm
          </span>
        </div>

        <div className="preview-status-strip">
          <div className="status-item">
            <span className="indicator-dot active-left" />
            <span>Front (Left): {hasFront ? 'Ready' : 'Pending'}</span>
          </div>
          <div className="status-item">
            <span className="indicator-dot active-right" />
            <span>Back (Right): {hasBack ? 'Ready' : 'Pending'}</span>
          </div>
          <div className="status-item dimension-item">
            <span>
              Each: <strong>{placement.cardWidth} &times; {placement.cardHeight} mm</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Virtual Paper Canvas */}
      <div className="preview-stage-container">
        <div
          className="preview-viewport-scroll"
          style={{ minHeight: `${Math.min(500, sheetHeightPx * effectiveScale + 60)}px` }}
        >
          <div
            className="virtual-paper-sheet"
            style={{
              width: `${sheetWidthPx}px`,
              height: `${sheetHeightPx}px`,
              transform: `scale(${effectiveScale})`,
              transformOrigin: 'top center',
            }}
          >
            {/* Front Card (LEFT) */}
            <div
              className={`virtual-card ${hasFront ? 'filled' : 'empty'} ${
                settings.roundedCorners && settings.cardSize === 'small' ? 'rounded-corners' : ''
              } ${settings.showCuttingGuide ? `cutting-guide-${settings.guideStyle}` : ''} ${
                settings.addBorderStroke ? 'bordered' : ''
              }`}
              style={{
                left: `${frontXPx}px`,
                top: `${frontYPx}px`,
                width: `${cardWidthPx}px`,
                height: `${cardHeightPx}px`,
              }}
            >
              {hasFront ? (
                <div
                  className="card-media-box"
                  style={{
                    filter: `brightness(${frontCard.brightness}%) contrast(${frontCard.contrast}%)`,
                  }}
                >
                  <img
                    src={frontCard.dataUrl || ''}
                    alt="Front Aadhaar Card"
                    className="card-preview-image"
                    style={{
                      transform: `rotate(${frontCard.rotation}deg)`,
                    }}
                  />
                  <div className="card-side-stamp stamp-front">FRONT (LEFT)</div>
                </div>
              ) : (
                <div className="empty-placeholder">
                  <AlertTriangle size={20} className="text-gold" />
                  <span>Front Photo</span>
                </div>
              )}

              <div className="dimension-tag-top">{placement.cardWidth} mm</div>
              <div className="dimension-tag-left">{placement.cardHeight} mm</div>
            </div>

            {/* Scissor guide line */}
            {settings.showCuttingGuide && placement.gapMm >= 4 && (
              <div
                className="scissor-guide-line"
                style={{
                  left: `${frontXPx + cardWidthPx + gapPx / 2}px`,
                  top: `${frontYPx - 8}px`,
                  height: `${cardHeightPx + 16}px`,
                }}
              >
                <Scissors size={14} className="scissor-icon" />
              </div>
            )}

            {/* Back Card (RIGHT) */}
            <div
              className={`virtual-card ${hasBack ? 'filled' : 'empty'} ${
                settings.roundedCorners && settings.cardSize === 'small' ? 'rounded-corners' : ''
              } ${settings.showCuttingGuide ? `cutting-guide-${settings.guideStyle}` : ''} ${
                settings.addBorderStroke ? 'bordered' : ''
              }`}
              style={{
                left: `${backXPx}px`,
                top: `${backYPx}px`,
                width: `${cardWidthPx}px`,
                height: `${cardHeightPx}px`,
              }}
            >
              {hasBack ? (
                <div
                  className="card-media-box"
                  style={{
                    filter: `brightness(${backCard.brightness}%) contrast(${backCard.contrast}%)`,
                  }}
                >
                  <img
                    src={backCard.dataUrl || ''}
                    alt="Back Aadhaar Card"
                    className="card-preview-image"
                    style={{
                      transform: `rotate(${backCard.rotation}deg)`,
                    }}
                  />
                  <div className="card-side-stamp stamp-back">BACK (RIGHT)</div>
                </div>
              ) : (
                <div className="empty-placeholder">
                  <AlertTriangle size={20} className="text-gold" />
                  <span>Back Photo</span>
                </div>
              )}

              <div className="dimension-tag-top">{placement.cardWidth} mm</div>
              <div className="dimension-tag-right">{placement.cardHeight} mm</div>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Footer */}
      <div className="preview-footer-note">
        {bothUploaded ? (
          <div className="ready-indicator-bar">
            <CheckCircle2 size={16} className="text-success" />
            <span>Front &amp; Back arranged side-by-side. Ready to print.</span>
          </div>
        ) : (
          <div className="pending-indicator-bar">
            <AlertTriangle size={16} className="text-gold" />
            <span>Upload both sides to enable PDF generation.</span>
          </div>
        )}
      </div>
    </div>
  );
};
