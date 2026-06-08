// Photoshop Corner — Type Definitions

export type PhotoshopTool =
  | 'move'
  | 'select'
  | 'crop'
  | 'resize'
  | 'text'
  | 'brush'
  | 'eraser'
  | 'fill'
  | 'gradient'
  | 'shape'
  | 'eyedropper'
  | 'pan';

export type PhotoshopShapeType = 'rectangle' | 'rounded-rect' | 'ellipse' | 'line' | 'arrow' | 'polygon';

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'difference'
  | 'hard-light'
  | 'soft-light';

export type LayerType = 'image' | 'text' | 'shape' | 'adjustment';

export interface PhotoshopLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: {
    content: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: 'light' | 'regular' | 'bold' | 'black';
    fontStyle: 'normal' | 'italic';
    color: string;
    bgColor?: string;
    textAlign: 'left' | 'center' | 'right';
    lineHeight: number;
    letterSpacing: number;
  };
  shape?: {
    type: PhotoshopShapeType;
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    cornerRadius?: number;
    polygonPoints?: { x: number; y: number }[];
    arrowStart?: boolean;
    arrowEnd?: boolean;
  };
  selectionMask?: string;
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  width: number;
  height: number;
  rotation: number;
}

export interface HistorySnapshot {
  id: string;
  label: string;
  timestamp: number;
  layers: PhotoshopLayer[];
}

export interface BrushSettings {
  size: number;
  hardness: number;
  opacity: number;
  flow: number;
  spacing: number;
  color: string;
  preset: 'round' | 'soft-round' | 'chalk' | 'marker' | 'airbrush' | 'calligraphy';
  mode: 'normal' | 'multiply' | 'screen' | 'overlay';
}

export const DEFAULT_BRUSH: BrushSettings = {
  size: 20,
  hardness: 0.8,
  opacity: 1,
  flow: 1,
  spacing: 0.25,
  color: '#000000',
  preset: 'round',
  mode: 'normal',
};

export const BLEND_MODE_LABELS: Record<BlendMode, string> = {
  normal: 'Normal',
  multiply: 'Multiply',
  screen: 'Screen',
  overlay: 'Overlay',
  darken: 'Darken',
  lighten: 'Lighten',
  'color-dodge': 'Color Dodge',
  difference: 'Difference',
  'hard-light': 'Hard Light',
  'soft-light': 'Soft Light',
};

export const CROP_ASPECT_RATIOS = [
  { label: 'Freeform', value: null },
  { label: '1:1 (Square)', value: '1:1' },
  { label: '16:9 (Widescreen)', value: '16:9' },
  { label: '4:3 (Classic)', value: '4:3' },
  { label: '3:2 (35mm)', value: '3:2' },
  { label: '9:16 (Story)', value: '9:16' },
  { label: 'OG Card 1200x630', value: '1200:630' },
] as const;

export const FONT_FAMILIES = [
  'Arial', 'Helvetica', 'Georgia', 'Times New Roman',
  'Courier New', 'Impact', 'Comic Sans MS',
  'Montserrat', 'Inter', 'Lato',
];

export const ZOOM_LEVELS = [
  0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 8.0, 16.0, 32.0
];
// Color state for drawing tools
export interface ColorState {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  alpha: number;
}

// Brush settings for painting tools
// Shape tool settings
export interface ShapeSettings {
  type: 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'polygon' | 'star';
  fill: boolean;
  fillColor: string;
  stroke: boolean;
  strokeWidth: number;
  strokeColor: string;
  sides: number; // for polygon/star
  starRatio: number; // inner radius ratio for star
}

// Gradient settings
export interface GradientSettings {
  type: 'linear' | 'radial' | 'conic';
  colors: { offset: number; color: string }[];
  angle: number;
  repeat: boolean;
}

export const DEFAULT_COLOR: ColorState = {
  hex: '#1abc9c',
  rgb: { r: 26, g: 188, b: 156 },
  hsl: { h: 168, s: 76, l: 42 },
  alpha: 1,
};

export const DEFAULT_SHAPE_SETTINGS: ShapeSettings = {
  type: 'rectangle',
  fill: true,
  fillColor: '#1abc9c',
  stroke: true,
  strokeWidth: 2,
  strokeColor: '#ffffff',
  sides: 6,
  starRatio: 0.5,
};

export const DEFAULT_GRADIENT_SETTINGS: GradientSettings = {
  type: 'linear',
  colors: [
    { offset: 0, color: '#1abc9c' },
    { offset: 1, color: '#3498db' },
  ],
  angle: 45,
  repeat: false,
};

// Color utilities
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}
