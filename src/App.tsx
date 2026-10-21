import React, { useState, useEffect, useCallback } from 'react';
import { CardImageState, PrintSettings, CardSizeOption, CARD_SIZES } from './types';
import { Header } from './components/Header';
import { UploadCard } from './components/UploadCard';
import { PrintSettingsPanel } from './components/PrintSettings';
import { LivePreview } from './components/LivePreview';
import { ActionBar } from './components/ActionBar';
import { generateSampleCard } from './utils/imageProcessor';
import { downloadAadhaarPdf, printDirectly } from './utils/pdfGenerator';
import { CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

const initialCardState: CardImageState = {
  file: null,
  dataUrl: null,
  originalDataUrl: null,
  name: '',
  rotation: 0,
  brightness: 100,
  contrast: 100,
  width: 0,
  height: 0,
};

const initialSettings: PrintSettings = {
  cardSize: 'small',
  paperFormat: 'strip',
  alignment: 'top',
  cardGapMm: 8,
  showCuttingGuide: true,
  guideStyle: 'dashed',
  addBorderStroke: true,
  enhanceTextClarity: true,
  roundedCorners: false,
};

export default function App() {
  const [frontCard, setFrontCard] = useState<CardImageState>(initialCardState);
  const [backCard, setBackCard] = useState<CardImageState>(initialCardState);
  const [settings, setSettings] = useState<PrintSettings>(initialSettings);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(
    null
  );

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const handleClearAll = useCallback(() => {
    if (frontCard.dataUrl && frontCard.dataUrl.startsWith('blob:')) {
      URL.revokeObjectURL(frontCard.dataUrl);
    }
    if (backCard.dataUrl && backCard.dataUrl.startsWith('blob:')) {
      URL.revokeObjectURL(backCard.dataUrl);
    }
    setFrontCard(initialCardState);
    setBackCard(initialCardState);
    showToast('Images cleared.', 'info');
  }, [frontCard.dataUrl, backCard.dataUrl, showToast]);

  const handleLoadSample = async () => {
    try {
      showToast('Loading demo cards...', 'info');
      const [sampleFront, sampleBack] = await Promise.all([
        generateSampleCard('front'),
        generateSampleCard('back'),
      ]);
      setFrontCard(sampleFront);
      setBackCard(sampleBack);
      showToast('Demo cards loaded.', 'success');
    } catch {
      showToast('Failed to load sample cards.', 'error');
    }
  };

  const canGenerate = Boolean(frontCard.dataUrl && backCard.dataUrl);
  const hasAnyImage = Boolean(frontCard.dataUrl || backCard.dataUrl);

  const handleCardSizeChange = (size: CardSizeOption) => {
    setSettings((prev) => ({
      ...prev,
      cardSize: size,
    }));
  };

  // Generate & Download PDF
  const handleGeneratePdf = async () => {
    if (!canGenerate) {
      showToast('Upload both Front and Back photos before generating PDF.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const sizeTag = settings.cardSize === 'large' ? '100x230mm' : '85.6x54mm';
      const fileName = `Aadhaar_Print_${sizeTag}.pdf`;
      await downloadAadhaarPdf(frontCard, backCard, settings, fileName);
      showToast('PDF downloaded successfully.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error generating PDF.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Direct Print
  const handleDirectPrint = async () => {
    if (!canGenerate) {
      showToast('Upload both Front and Back photos before printing.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      await printDirectly(frontCard, backCard, settings);
      showToast('Print dialog opened.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Failed to open print dialog.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Keyboard shortcuts (Ctrl+Enter to generate, Ctrl+P to print)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (canGenerate && !isGenerating) {
          handleGeneratePdf();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        if (canGenerate) {
          e.preventDefault();
          handleDirectPrint();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canGenerate, isGenerating, frontCard, backCard, settings]);

  const targetAspect =
    settings.cardSize === 'large'
      ? CARD_SIZES.large.widthMm / CARD_SIZES.large.heightMm
      : CARD_SIZES.small.widthMm / CARD_SIZES.small.heightMm;

  return (
    <div className="app-layout">
      {/* Top Header */}
      <Header
        onLoadSample={handleLoadSample}
        onClearAll={handleClearAll}
        hasImages={hasAnyImage}
      />

      {/* Clean Workflow Indicator */}
      <div className="workflow-steps-bar">
        <div className={`step-item ${frontCard.dataUrl ? 'step-done' : 'step-active'}`}>
          <div className="step-num">{frontCard.dataUrl ? <CheckCircle2 size={15} /> : '1'}</div>
          <span className="step-label">Front Photo</span>
        </div>
        <ArrowRight size={14} className="step-arrow" />

        <div
          className={`step-item ${
            backCard.dataUrl ? 'step-done' : frontCard.dataUrl ? 'step-active' : 'step-waiting'
          }`}
        >
          <div className="step-num">{backCard.dataUrl ? <CheckCircle2 size={15} /> : '2'}</div>
          <span className="step-label">Back Photo</span>
        </div>
        <ArrowRight size={14} className="step-arrow" />

        <div className={`step-item ${canGenerate ? 'step-done' : 'step-waiting'}`}>
          <div className="step-num">3</div>
          <span className="step-label">Size &amp; Preview</span>
        </div>
        <ArrowRight size={14} className="step-arrow" />

        <div className={`step-item ${canGenerate ? 'step-active' : 'step-waiting'}`}>
          <div className="step-num">4</div>
          <span className="step-label">Generate PDF</span>
        </div>
      </div>

      {/* Main Single-Page Desktop Container */}
      <main className="main-content">
        {/* Upload Row: Front on Left, Back on Right */}
        <section className="upload-row-section">
          <UploadCard
            side="front"
            title="Front Side Photo"
            badgeText="Front (Left)"
            cardState={frontCard}
            targetAspect={targetAspect}
            onChange={setFrontCard}
            onRemove={() => setFrontCard(initialCardState)}
          />

          <UploadCard
            side="back"
            title="Back Side Photo"
            badgeText="Back (Right)"
            cardState={backCard}
            targetAspect={targetAspect}
            onChange={setBackCard}
            onRemove={() => setBackCard(initialCardState)}
          />
        </section>

        {/* Live Preview Section with Card Size Selection */}
        <section className="preview-section">
          <LivePreview
            frontCard={frontCard}
            backCard={backCard}
            settings={settings}
            onCardSizeChange={handleCardSizeChange}
          />
        </section>

        {/* Print Settings Panel */}
        <section className="settings-section-wrapper">
          <PrintSettingsPanel
            settings={settings}
            onChange={setSettings}
          />
        </section>
      </main>

      {/* Fixed Sticky Action Bar at Bottom */}
      <ActionBar
        canGenerate={canGenerate}
        isGenerating={isGenerating}
        onGenerate={handleGeneratePdf}
        onDirectPrint={handleDirectPrint}
        onClearAll={handleClearAll}
        hasAnyImage={hasAnyImage}
      />

      {/* Toast notifications */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle2 size={16} />}
          {toast.type === 'error' && <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
