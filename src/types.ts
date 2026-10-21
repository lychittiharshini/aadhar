export type PaperFormat = 'strip' | 'a4-portrait' | 'a4-landscape';

export type AlignmentPosition = 'top' | 'center';

export type CardSizeOption = 'small' | 'large';

export interface CropAdjustment {
  panX: number; // in percentage or px offset
  panY: number;
  zoom: number; // 1.0 to 3.0
  rotation: number; // 0, 90, 180, 270
}

export interface CardImageState {
  file: File | null;
  dataUrl: string | null;
  originalDataUrl: string | null; // Raw uncropped original
  name: string;
  rotation: number; // 0, 90, 180, 270
  brightness: number; // 80 - 140 (default 100)
  contrast: number; // 80 - 140 (default 100)
  width: number;
  height: number;
  cropAdjustment?: CropAdjustment;
}

export interface PrintSettings {
  cardSize: CardSizeOption; // 'small' | 'large'
  paperFormat: PaperFormat;
  alignment: AlignmentPosition;
  cardGapMm: number; // e.g. 8mm
  showCuttingGuide: boolean;
  guideStyle: 'dashed' | 'solid';
  addBorderStroke: boolean;
  enhanceTextClarity: boolean;
  roundedCorners: boolean;
}

export interface PaperDimensionsMm {
  width: number;
  height: number;
  name: string;
  description: string;
}

// Card Sizes
export const CARD_SIZES = {
  small: {
    widthMm: 85.6,
    heightMm: 54.0,
    label: 'Small Card',
    dimensionsText: '85.6 × 54 mm (8.56 × 5.4 cm)',
    shortDesc: 'Standard ID-1 Size',
  },
  large: {
    widthMm: 100.0,
    heightMm: 230.0,
    label: 'Large Card',
    dimensionsText: '100 × 230 mm (10 × 23 cm)',
    shortDesc: 'Full Laminated Format',
  },
} as const;

export const CARD_CORNER_RADIUS_MM = 3.18;
