import { jsPDF } from 'jspdf';
import {
  CardImageState,
  PrintSettings,
  CARD_SIZES,
} from '../types';
import { renderProcessedImage } from './imageProcessor';

export interface CardPlacementResult {
  pageWidthMm: number;
  pageHeightMm: number;
  frontX: number;
  frontY: number;
  backX: number;
  backY: number;
  cardWidth: number;
  cardHeight: number;
  gapMm: number;
}

/**
 * Calculates the exact positions and page dimensions in millimeters
 */
export function calculateCardPlacement(settings: PrintSettings): CardPlacementResult {
  const selectedSize = CARD_SIZES[settings.cardSize || 'small'];
  const cardWidth = selectedSize.widthMm;
  const cardHeight = selectedSize.heightMm;

  // For large card, ensure gap doesn't exceed page margin
  const gap = settings.cardSize === 'large' ? Math.min(settings.cardGapMm, 6) : settings.cardGapMm;
  const totalCardsWidth = cardWidth * 2 + gap;

  let pageWidth = 0;
  let pageHeight = 0;
  let startX = 0;
  let startY = 0;

  switch (settings.paperFormat) {
    case 'strip': {
      // Sized to fit both cards side by side with minimal margins
      const marginX = 10;
      const marginY = 10;
      pageWidth = totalCardsWidth + marginX * 2;
      pageHeight = cardHeight + marginY * 2;
      startX = marginX;
      startY = marginY;
      break;
    }

    case 'a4-portrait': {
      pageWidth = 210;
      pageHeight = 297;
      startX = (pageWidth - totalCardsWidth) / 2;
      if (startX < 2) startX = 2; // Keep inside page
      if (settings.alignment === 'top') {
        startY = settings.cardSize === 'large' ? 15 : 25;
      } else {
        startY = (pageHeight - cardHeight) / 2;
      }
      break;
    }

    case 'a4-landscape': {
      // If Large Card is 230mm high, 210mm height would be too short, so expand to fit
      if (cardHeight > 200) {
        pageWidth = 297;
        pageHeight = cardHeight + 20;
      } else {
        pageWidth = 297;
        pageHeight = 210;
      }
      startX = (pageWidth - totalCardsWidth) / 2;
      if (settings.alignment === 'top') {
        startY = 15;
      } else {
        startY = (pageHeight - cardHeight) / 2;
      }
      break;
    }
  }

  const frontX = startX;
  const frontY = startY;
  const backX = startX + cardWidth + gap;
  const backY = startY;

  return {
    pageWidthMm: Number(pageWidth.toFixed(2)),
    pageHeightMm: Number(pageHeight.toFixed(2)),
    frontX: Number(frontX.toFixed(2)),
    frontY: Number(frontY.toFixed(2)),
    backX: Number(backX.toFixed(2)),
    backY: Number(backY.toFixed(2)),
    cardWidth,
    cardHeight,
    gapMm: gap,
  };
}

/**
 * Generates the jsPDF document containing the side-by-side Aadhaar cards
 */
export async function createAadhaarPdf(
  frontCard: CardImageState,
  backCard: CardImageState,
  settings: PrintSettings
): Promise<jsPDF> {
  const placement = calculateCardPlacement(settings);

  // Render high-resolution images taking rotation, cropping, and filter tweaks into account (300 DPI)
  const [frontDataUrl, backDataUrl] = await Promise.all([
    renderProcessedImage(frontCard, placement.cardWidth, placement.cardHeight, 300),
    renderProcessedImage(backCard, placement.cardWidth, placement.cardHeight, 300),
  ]);

  const orientation = placement.pageWidthMm > placement.pageHeightMm ? 'landscape' : 'portrait';

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [placement.pageWidthMm, placement.pageHeightMm],
    compress: true,
  });

  // Draw Front Card on the LEFT
  if (frontDataUrl) {
    doc.addImage(
      frontDataUrl,
      'JPEG',
      placement.frontX,
      placement.frontY,
      placement.cardWidth,
      placement.cardHeight,
      undefined,
      'FAST'
    );
  }

  // Draw Back Card on the RIGHT
  if (backDataUrl) {
    doc.addImage(
      backDataUrl,
      'JPEG',
      placement.backX,
      placement.backY,
      placement.cardWidth,
      placement.cardHeight,
      undefined,
      'FAST'
    );
  }

  // Draw Cutting Guides or Borders if enabled
  if (settings.showCuttingGuide || settings.addBorderStroke) {
    doc.saveGraphicsState();

    if (settings.addBorderStroke) {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.2);

      if (settings.roundedCorners && settings.cardSize === 'small') {
        doc.roundedRect(
          placement.frontX,
          placement.frontY,
          placement.cardWidth,
          placement.cardHeight,
          3.18,
          3.18,
          'S'
        );
        doc.roundedRect(
          placement.backX,
          placement.backY,
          placement.cardWidth,
          placement.cardHeight,
          3.18,
          3.18,
          'S'
        );
      } else {
        doc.rect(placement.frontX, placement.frontY, placement.cardWidth, placement.cardHeight, 'S');
        doc.rect(placement.backX, placement.backY, placement.cardWidth, placement.cardHeight, 'S');
      }
    }

    if (settings.showCuttingGuide) {
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.15);

      if (settings.guideStyle === 'dashed') {
        doc.setLineDashPattern([2, 2], 0);
      }

      doc.rect(
        placement.frontX - 0.2,
        placement.frontY - 0.2,
        placement.cardWidth + 0.4,
        placement.cardHeight + 0.4,
        'S'
      );
      doc.rect(
        placement.backX - 0.2,
        placement.backY - 0.2,
        placement.cardWidth + 0.4,
        placement.cardHeight + 0.4,
        'S'
      );

      // Scissor center guide line between cards if gap is large enough
      if (placement.gapMm >= 4) {
        const centerLineX = placement.frontX + placement.cardWidth + placement.gapMm / 2;
        doc.setDrawColor(150, 150, 150);
        doc.line(
          centerLineX,
          placement.frontY - 3,
          centerLineX,
          placement.frontY + placement.cardHeight + 3
        );
      }

      doc.restoreGraphicsState();
    }
  }

  return doc;
}

/**
 * Downloads the PDF directly
 */
export async function downloadAadhaarPdf(
  frontCard: CardImageState,
  backCard: CardImageState,
  settings: PrintSettings,
  fileName = 'Aadhaar_Print.pdf'
): Promise<void> {
  const doc = await createAadhaarPdf(frontCard, backCard, settings);
  doc.save(fileName);
}

/**
 * Triggers direct browser printing for Xerox operators
 */
export async function printDirectly(
  frontCard: CardImageState,
  backCard: CardImageState,
  settings: PrintSettings
): Promise<void> {
  const doc = await createAadhaarPdf(frontCard, backCard, settings);
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '0';
  printIframe.style.height = '0';
  printIframe.style.border = '0';
  printIframe.src = blobUrl;

  document.body.appendChild(printIframe);

  printIframe.onload = () => {
    try {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    } catch {
      window.open(blobUrl, '_blank');
    }
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      if (document.body.contains(printIframe)) {
        document.body.removeChild(printIframe);
      }
    }, 60000);
  };
}
