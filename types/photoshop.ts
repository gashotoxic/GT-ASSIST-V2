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
  color: string;
  preset: 'round' | 'soft-round' | 'chalk' | 'marker' | 'airbrush' | 'calligraphy';
}

export interface CropState {
  active: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: string | null;
  rotation: number;
}

export interface PhotoshopEditorState {
  canvas: CanvasState;
  layers: PhotoshopLayer[];
  activeLayerId: string | null;
  activeTool: PhotoshopTool;
  brush: BrushSettings;
  crop: CropState;
  history: HistorySnapshot[];
  historyIndex: number;
  selectedPreset: string | null;
  gridVisible: boolean;
  gridType: 'none' | 'thirds' | 'golden' | 'square';
}

export const DEFAULT_CANVAS_SIZE = { width: 1920, height: 1080 };

export const DEFAULT_BRUSH: BrushSettings = {
  size: 20,
  hardness: 0.8,
  opacity: 1.0,
  flow: 1.0,
  color: '#000000',
  preset: 'round',
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
