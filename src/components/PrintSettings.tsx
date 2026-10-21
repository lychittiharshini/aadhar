import React from 'react';
import {
  FileText,
  Scissors,
  Layers,
  Sparkles,
} from 'lucide-react';
import { PrintSettings, PaperFormat, AlignmentPosition, CARD_SIZES } from '../types';

interface PrintSettingsProps {
  settings: PrintSettings;
  onChange: (updated: PrintSettings) => void;
}

export const PrintSettingsPanel: React.FC<PrintSettingsProps> = ({ settings, onChange }) => {
  const handlePaperChange = (format: PaperFormat) => {
    onChange({
      ...settings,
      paperFormat: format,
    });
  };

  const handleAlignmentChange = (align: AlignmentPosition) => {
    onChange({
      ...settings,
      alignment: align,
    });
  };

  const handleGapChange = (gap: number) => {
    onChange({
      ...settings,
      cardGapMm: gap,
    });
  };

  const isA4 = settings.paperFormat.startsWith('a4');
  const currentCard = CARD_SIZES[settings.cardSize || 'small'];

  return (
    <div className="settings-card">
      <div className="settings-header">
        <div className="settings-title-group">
          <FileText size={18} className="text-maroon" />
          <h2 className="settings-title">Page &amp; Print Setup</h2>
        </div>
        <span className="dimension-badge-gold">
          {currentCard.label}: <strong>{currentCard.dimensionsText}</strong>
        </span>
      </div>

      <div className="settings-grid">
        {/* Paper Size */}
        <div className="settings-section">
          <label className="settings-label">
            <Layers size={14} />
            <span>Paper Format</span>
          </label>
          <div className="paper-format-buttons">
            <button
              type="button"
              className={`format-option-btn ${settings.paperFormat === 'strip' ? 'active' : ''}`}
              onClick={() => handlePaperChange('strip')}
            >
              <div className="format-top">
                <span className="format-name">Compact Strip</span>
                <span className="format-badge">Fitted</span>
              </div>
              <span className="format-desc">Minimal margins for card cutter</span>
            </button>

            <button
              type="button"
              className={`format-option-btn ${settings.paperFormat === 'a4-portrait' ? 'active' : ''}`}
              onClick={() => handlePaperChange('a4-portrait')}
            >
              <div className="format-top">
                <span className="format-name">A4 Portrait</span>
                <span className="format-badge">210 &times; 297 mm</span>
              </div>
              <span className="format-desc">Standard sheet</span>
            </button>

            <button
              type="button"
              className={`format-option-btn ${settings.paperFormat === 'a4-landscape' ? 'active' : ''}`}
              onClick={() => handlePaperChange('a4-landscape')}
            >
              <div className="format-top">
                <span className="format-name">A4 Landscape</span>
                <span className="format-badge">297 &times; 210 mm</span>
              </div>
              <span className="format-desc">Wide sheet</span>
            </button>
          </div>
        </div>

        {/* Alignment on A4 */}
        {isA4 && (
          <div className="settings-section">
            <label className="settings-label">
              <span>Position on A4</span>
            </label>
            <div className="segmented-control">
              <button
                type="button"
                className={`segment-btn ${settings.alignment === 'top' ? 'segment-active' : ''}`}
                onClick={() => handleAlignmentChange('top')}
              >
                Top
              </button>
              <button
                type="button"
                className={`segment-btn ${settings.alignment === 'center' ? 'segment-active' : ''}`}
                onClick={() => handleAlignmentChange('center')}
              >
                Center
              </button>
            </div>
          </div>
        )}

        {/* Spacing */}
        <div className="settings-section">
          <label className="settings-label">
            <Scissors size={14} />
            <span>Card Gap</span>
          </label>
          <div className="gap-buttons">
            {[
              { val: 4, label: '4 mm' },
              { val: 8, label: '8 mm' },
              { val: 12, label: '12 mm' },
            ].map((item) => (
              <button
                key={item.val}
                type="button"
                className={`gap-btn ${settings.cardGapMm === item.val ? 'gap-active' : ''}`}
                onClick={() => handleGapChange(item.val)}
              >
                <strong>{item.label}</strong>
              </button>
            ))}
          </div>
        </div>

        {/* Cutting Lines */}
        <div className="settings-section">
          <label className="settings-label">
            <Sparkles size={14} />
            <span>Guides</span>
          </label>
          <div className="toggles-column">
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={settings.showCuttingGuide}
                onChange={(e) =>
                  onChange({ ...settings, showCuttingGuide: e.target.checked })
                }
              />
              <span className="toggle-text">
                <strong>Cutting Guidelines</strong>
              </span>
            </label>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={settings.addBorderStroke}
                onChange={(e) =>
                  onChange({ ...settings, addBorderStroke: e.target.checked })
                }
              />
              <span className="toggle-text">
                <strong>Card Border (0.2 mm)</strong>
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
