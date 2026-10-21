import { CardImageState, CARD_SIZES } from '../types';

/**
 * Loads an image file and returns its dimensions and dataUrl
 */
export async function processUploadedFile(file: File): Promise<{
  dataUrl: string;
  originalDataUrl: string;
  width: number;
  height: number;
  name: string;
}> {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    throw new Error('Please upload a valid JPG, JPEG, PNG, or WebP image file.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        resolve({
          dataUrl,
          originalDataUrl: dataUrl,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          name: file.name,
        });
      };
      img.onerror = () => reject(new Error('Failed to decode the image file.'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read the file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Crops and adjusts an image based on zoom, pan (move up/down/left/right), and rotation.
 * Renders into high-resolution output preserving aspect ratio.
 */
export async function renderCroppedImage({
  imageSrc,
  zoom,
  panX,
  panY,
  rotation,
  targetAspect = 85.6 / 54.0,
  outputWidth = 1200,
}: {
  imageSrc: string;
  zoom: number;
  panX: number; // pixel offset in preview coordinates
  panY: number; // pixel offset in preview coordinates
  rotation: number; // in degrees
  targetAspect?: number; // width / height
  outputWidth?: number;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const outputHeight = Math.round(outputWidth / targetAspect);
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fill clean white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, outputWidth, outputHeight);

      ctx.save();

      // Move context to center of output box
      ctx.translate(outputWidth / 2, outputHeight / 2);

      // Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // Determine dimensions taking rotation into account
      const isSwapped = rotation % 180 !== 0;
      const effectiveW = isSwapped ? img.naturalHeight : img.naturalWidth;
      const effectiveH = isSwapped ? img.naturalWidth : img.naturalHeight;

      // Base scale: fit image inside crop box
      const scaleFit = Math.max(outputWidth / effectiveW, outputHeight / effectiveH);
      const drawW = (isSwapped ? img.naturalHeight : img.naturalWidth) * scaleFit * zoom;
      const drawH = (isSwapped ? img.naturalWidth : img.naturalHeight) * scaleFit * zoom;

      // Normalize pan offsets relative to canvas size
      // panX and panY are passed as fraction or pixel offsets
      const offsetX = panX * (outputWidth / 400);
      const offsetY = panY * (outputHeight / 300);

      if (isSwapped) {
        // When rotated 90 or 270, draw unrotated image dimensions with rotated center
        const unrotatedDrawW = img.naturalWidth * scaleFit * zoom;
        const unrotatedDrawH = img.naturalHeight * scaleFit * zoom;
        ctx.drawImage(
          img,
          -unrotatedDrawW / 2 + (rotation === 90 ? offsetY : -offsetY),
          -unrotatedDrawH / 2 + (rotation === 90 ? -offsetX : offsetX),
          unrotatedDrawW,
          unrotatedDrawH
        );
      } else {
        ctx.drawImage(
          img,
          -drawW / 2 + (rotation === 180 ? -offsetX : offsetX),
          -drawH / 2 + (rotation === 180 ? -offsetY : offsetY),
          drawW,
          drawH
        );
      }

      ctx.restore();

      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => reject(new Error('Failed to load image for cropping.'));
    img.src = imageSrc;
  });
}

/**
 * Renders an image state (with rotation, brightness, contrast) onto an HTML5 Canvas at exact high resolution
 */
export async function renderProcessedImage(
  card: CardImageState,
  targetWidthMm: number = CARD_SIZES.small.widthMm,
  targetHeightMm: number = CARD_SIZES.small.heightMm,
  targetDpi: number = 300
): Promise<string> {
  const dataUrl = card.dataUrl;
  if (!dataUrl) return '';

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const pixelsPerMm = targetDpi / 25.4;
      const targetCanvasWidth = Math.round(targetWidthMm * pixelsPerMm);
      const targetCanvasHeight = Math.round(targetHeightMm * pixelsPerMm);

      const canvas = document.createElement('canvas');
      canvas.width = targetCanvasWidth;
      canvas.height = targetCanvasHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Background fill white
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetCanvasWidth, targetCanvasHeight);

      ctx.save();

      // Apply brightness & contrast filters
      const b = card.brightness ?? 100;
      const c = card.contrast ?? 100;
      ctx.filter = `brightness(${b}%) contrast(${c}%)`;

      // Translate to center of canvas for rotation
      ctx.translate(targetCanvasWidth / 2, targetCanvasHeight / 2);
      ctx.rotate((card.rotation * Math.PI) / 180);

      // Determine dimensions after rotation
      const isRotated90or270 = card.rotation % 180 !== 0;
      const sourceW = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
      const sourceH = isRotated90or270 ? img.naturalWidth : img.naturalHeight;

      // Fit image into target box preserving aspect ratio without distortion
      const targetAspect = targetCanvasWidth / targetCanvasHeight;
      const sourceAspect = sourceW / sourceH;

      let drawW: number;
      let drawH: number;

      const ratioDiff = Math.abs(sourceAspect - targetAspect);
      if (ratioDiff < 0.12) {
        // Close enough: fill card area
        drawW = targetCanvasWidth;
        drawH = targetCanvasHeight;
      } else if (sourceAspect > targetAspect) {
        // Wider than target: fit to width without distortion
        drawW = targetCanvasWidth;
        drawH = targetCanvasWidth / sourceAspect;
      } else {
        // Taller than target: fit to height without distortion
        drawH = targetCanvasHeight;
        drawW = targetCanvasHeight * sourceAspect;
      }

      if (isRotated90or270) {
        ctx.drawImage(img, -drawH / 2, -drawW / 2, drawH, drawW);
      } else {
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      }

      ctx.restore();

      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = dataUrl;
  });
}

/**
 * Creates sample demo cards for quick testing by Xerox operators
 */
export function generateSampleCard(side: 'front' | 'back'): Promise<CardImageState> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1011; // ~300 DPI for 85.6mm
    canvas.height = 638; // ~300 DPI for 54.0mm
    const ctx = canvas.getContext('2d')!;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#FFF9F0');
    grad.addColorStop(0.5, '#FFFDF8');
    grad.addColorStop(1, '#F7F3E8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle security pattern
    ctx.strokeStyle = '#EADEC7';
    ctx.lineWidth = 1;
    for (let i = -canvas.height; i < canvas.width; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.bezierCurveTo(i + 100, canvas.height / 2, i - 100, canvas.height / 2, i + 200, canvas.height);
      ctx.stroke();
    }

    // Top Header Bar
    const headerGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    headerGrad.addColorStop(0, '#025287');
    headerGrad.addColorStop(1, '#0b3954');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, canvas.width, 85);

    // Header Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('GOVERNMENT OF INDIA', 180, 42);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#FFD275';
    ctx.fillText('Unique Identification Authority of India', 180, 68);

    // Flag Stripe
    ctx.fillStyle = '#FF9933';
    ctx.fillRect(0, 85, canvas.width, 5);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 90, canvas.width, 4);
    ctx.fillStyle = '#138808';
    ctx.fillRect(0, 94, canvas.width, 5);

    // Emblem
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(90, 45, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#025287';
    ctx.font = 'bold 22px serif';
    ctx.fillText('सत्यमेव', 60, 45);
    ctx.fillText('जयते', 70, 62);

    if (side === 'front') {
      // Photo Box
      ctx.fillStyle = '#E5E9F0';
      ctx.fillRect(60, 140, 200, 250);
      ctx.strokeStyle = '#025287';
      ctx.lineWidth = 2;
      ctx.strokeRect(60, 140, 200, 250);

      // Silhouette
      ctx.fillStyle = '#4C566A';
      ctx.beginPath();
      ctx.arc(160, 220, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(160, 340, 80, 70, 0, 0, Math.PI, true);
      ctx.fill();

      // Info
      ctx.fillStyle = '#2E3440';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('ROHIT SHARMA', 290, 180);

      ctx.fillStyle = '#4C566A';
      ctx.font = '18px sans-serif';
      ctx.fillText('DOB: 15/08/1990', 290, 220);
      ctx.fillText('Gender: MALE', 290, 255);

      ctx.fillStyle = '#8F1D2C';
      ctx.font = '16px sans-serif';
      ctx.fillText('My Aadhaar, My Identity', 290, 310);

      // Aadhaar Number Box
      ctx.fillStyle = '#8F1D2C';
      ctx.fillRect(40, 420, canvas.width - 80, 3);

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 36px monospace';
      ctx.fillText('XXXX  XXXX  1234', 320, 480);

      ctx.fillStyle = '#8F1D2C';
      ctx.fillRect(40, 520, canvas.width - 80, 3);

      ctx.fillStyle = '#8F1D2C';
      ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('SAMPLE FRONT', 420, canvas.height - 15);
    } else {
      ctx.fillStyle = '#2E3440';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('Address / पता:', 60, 150);

      ctx.fillStyle = '#374151';
      ctx.font = '18px sans-serif';
      ctx.fillText('S/O: Mohan Sharma', 60, 190);
      ctx.fillText('H.No 42, Cross Road, Gandhi Nagar,', 60, 225);
      ctx.fillText('Opp. City Post Office, Bangalore,', 60, 260);
      ctx.fillText('Karnataka - 560001', 60, 295);

      // QR Code
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(680, 130, 260, 260);
      ctx.strokeStyle = '#025287';
      ctx.lineWidth = 2;
      ctx.strokeRect(680, 130, 260, 260);

      ctx.fillStyle = '#111827';
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if ((r + c) % 2 === 0 || (r < 3 && c < 3) || (r > 5 && c < 3) || (r < 3 && c > 5)) {
            ctx.fillRect(700 + c * 24, 150 + r * 24, 20, 20);
          }
        }
      }

      ctx.fillStyle = '#8F1D2C';
      ctx.fillRect(40, 420, canvas.width - 80, 3);

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 36px monospace';
      ctx.fillText('XXXX  XXXX  1234', 320, 480);

      ctx.fillStyle = '#8F1D2C';
      ctx.fillRect(40, 520, canvas.width - 80, 3);

      ctx.fillStyle = '#6B7280';
      ctx.font = '14px sans-serif';
      ctx.fillText('Toll Free: 1947 | help@uidai.gov.in', 360, 560);

      ctx.fillStyle = '#8F1D2C';
      ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('SAMPLE BACK', 420, canvas.height - 15);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    resolve({
      file: null,
      dataUrl,
      originalDataUrl: dataUrl,
      name: side === 'front' ? 'Sample_Front_Aadhaar.jpg' : 'Sample_Back_Aadhaar.jpg',
      rotation: 0,
      brightness: 100,
      contrast: 100,
      width: canvas.width,
      height: canvas.height,
    });
  });
}
