import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  RotateCw,
  RotateCcw,
  Trash2,
  RefreshCw,
  Sliders,
  Crop,
  CheckCircle2,
  FileImage,
  AlertCircle,
} from 'lucide-react';
import { CardImageState, CropAdjustment } from '../types';
import { processUploadedFile } from '../utils/imageProcessor';
import { PhotoAdjustModal } from './PhotoAdjustModal';

interface UploadCardProps {
  side: 'front' | 'back';
  title: string;
  badgeText: string;
  cardState: CardImageState;
  targetAspect?: number;
  onChange: (updated: CardImageState) => void;
  onRemove: () => void;
}

export const UploadCard: React.FC<UploadCardProps> = ({
  side,
  title,
  badgeText,
  cardState,
  targetAspect = 85.6 / 54.0,
  onChange,
  onRemove,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setErrorMessage(null);

    try {
      const result = await processUploadedFile(file);
      onChange({
        file,
        dataUrl: result.dataUrl,
        originalDataUrl: result.originalDataUrl,
        name: result.name,
        rotation: 0,
        brightness: 100,
        contrast: 100,
        width: result.width,
        height: result.height,
        cropAdjustment: undefined,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to read image file.';
      setErrorMessage(msg);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleRotate = (degrees: number) => {
    const nextRotation = (cardState.rotation + degrees + 360) % 360;
    onChange({
      ...cardState,
      rotation: nextRotation,
    });
  };

  const handleApplyAdjustment = (croppedDataUrl: string, adjustment: CropAdjustment) => {
    onChange({
      ...cardState,
      dataUrl: croppedDataUrl,
      cropAdjustment: adjustment,
    });
    setShowAdjustModal(false);
  };

  const hasImage = Boolean(cardState.dataUrl);

  return (
    <>
      <div className={`upload-card ${hasImage ? 'has-image' : ''}`}>
        {/* Card Header */}
        <div className="upload-card-header">
          <div className="upload-header-left">
            <span className={`side-tag ${side === 'front' ? 'tag-front' : 'tag-back'}`}>
              {badgeText}
            </span>
            <h2 className="upload-title">{title}</h2>
          </div>

          {hasImage && (
            <span className="status-ready-chip">
              <CheckCircle2 size={14} />
              Ready
            </span>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/jpeg,image/jpg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />

        {errorMessage && (
          <div className="error-alert">
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Dropzone or Preview */}
        {!hasImage ? (
          <div
            className={`dropzone ${isDragging ? 'dropzone-active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                fileInputRef.current?.click();
              }
            }}
          >
            <div className="dropzone-icon-circle">
              <UploadCloud size={32} className="text-maroon" />
            </div>
            <div className="dropzone-text-group">
              <p className="dropzone-primary-text">
                <strong>Click to upload</strong> or drag &amp; drop {side} photo
              </p>
              <p className="dropzone-secondary-text">JPG, JPEG, PNG, WebP</p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <FileImage size={16} />
              Select {side === 'front' ? 'Front Photo' : 'Back Photo'}
            </button>
          </div>
        ) : (
          <div className="preview-container">
            <div className="image-viewport-wrapper">
              <div
                className="image-viewport"
                style={{
                  filter: `brightness(${cardState.brightness}%) contrast(${cardState.contrast}%)`,
                }}
              >
                <img
                  src={cardState.dataUrl || ''}
                  alt={`${side} Aadhaar card`}
                  className="uploaded-img"
                  style={{
                    transform: `rotate(${cardState.rotation}deg)`,
                    transition: 'transform 0.2s ease',
                  }}
                />
              </div>
              <div className="image-dimension-badge">
                {cardState.cropAdjustment && (
                  <span className="cropped-badge">Cropped</span>
                )}
                {cardState.rotation !== 0 && (
                  <span className="rotation-pill">{cardState.rotation}&deg;</span>
                )}
                <span>
                  {cardState.width} &times; {cardState.height} px
                </span>
              </div>
            </div>

            {/* Operator Toolbar */}
            <div className="card-toolbar">
              <div className="toolbar-group">
                {/* Adjust Photo Button */}
                <button
                  type="button"
                  className="btn-tool btn-tool-primary-action"
                  onClick={() => setShowAdjustModal(true)}
                  title="Crop background, zoom, move, and rotate"
                >
                  <Crop size={15} />
                  <span>Adjust Photo</span>
                </button>

                <button
                  type="button"
                  className="btn-tool"
                  onClick={() => handleRotate(-90)}
                  title="Rotate 90° Left"
                >
                  <RotateCcw size={15} />
                  <span>90&deg; Left</span>
                </button>

                <button
                  type="button"
                  className="btn-tool"
                  onClick={() => handleRotate(90)}
                  title="Rotate 90° Right"
                >
                  <RotateCw size={15} />
                  <span>90&deg; Right</span>
                </button>
              </div>

              <div className="toolbar-group">
                <button
                  type="button"
                  className="btn-tool"
                  onClick={() => fileInputRef.current?.click()}
                  title="Replace image"
                >
                  <RefreshCw size={14} />
                  <span>Replace</span>
                </button>

                <button
                  type="button"
                  className="btn-tool btn-tool-danger"
                  onClick={onRemove}
                  title="Remove image"
                >
                  <Trash2 size={14} />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Adjust Photo Modal */}
      {showAdjustModal && (
        <PhotoAdjustModal
          isOpen={showAdjustModal}
          title={title}
          imageSrc={cardState.originalDataUrl || cardState.dataUrl || ''}
          targetAspect={targetAspect}
          initialAdjustment={cardState.cropAdjustment}
          onApply={handleApplyAdjustment}
          onCancel={() => setShowAdjustModal(false)}
        />
      )}
    </>
  );
};
