import React from 'react';
import { Download, Printer, RotateCcw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ActionBarProps {
  canGenerate: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onDirectPrint: () => void;
  onClearAll: () => void;
  hasAnyImage: boolean;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  canGenerate,
  isGenerating,
  onGenerate,
  onDirectPrint,
  onClearAll,
  hasAnyImage,
}) => {
  return (
    <div className="action-bar-container">
      <div className="action-bar-inner">
        <div className="action-info">
          {canGenerate ? (
            <div className="action-message ready">
              <CheckCircle2 size={18} className="text-success" />
              <span>Ready to generate PDF</span>
            </div>
          ) : (
            <div className="action-message incomplete">
              <AlertCircle size={18} className="text-maroon" />
              <span>
                {hasAnyImage
                  ? 'Upload second photo to generate PDF'
                  : 'Upload Front and Back photos to start'}
              </span>
            </div>
          )}
        </div>

        <div className="action-buttons-group">
          {hasAnyImage && (
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={onClearAll}
              disabled={isGenerating}
              title="Clear all"
            >
              <RotateCcw size={17} />
              <span>Clear</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-outline btn-lg"
            onClick={onDirectPrint}
            disabled={!canGenerate || isGenerating}
            title="Print directly"
          >
            <Printer size={18} />
            <span>Print</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-lg btn-generate"
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
            title="Download PDF"
          >
            {isGenerating ? (
              <>
                <Loader2 size={20} className="spin-animation" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download size={20} />
                <span>Generate PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
