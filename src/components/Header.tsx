import React from 'react';
import { Printer, Sparkles, RotateCcw } from 'lucide-react';

interface HeaderProps {
  onLoadSample: () => void;
  onClearAll: () => void;
  hasImages: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onLoadSample, onClearAll, hasImages }) => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon-box">
          <Printer className="brand-icon" size={24} />
        </div>
        <h1 className="brand-title">Aadhaar PrintMate</h1>
      </div>

      <div className="header-actions">
        <button
          type="button"
          onClick={onLoadSample}
          className="btn btn-secondary btn-sm"
          title="Load sample cards"
        >
          <Sparkles size={15} />
          <span>Load Demo</span>
        </button>

        {hasImages && (
          <button
            type="button"
            onClick={onClearAll}
            className="btn btn-outline btn-sm text-maroon"
            title="Clear images for next customer"
          >
            <RotateCcw size={15} />
            <span>Clear All</span>
          </button>
        )}
      </div>
    </header>
  );
};
