import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvasEngine } from '../../hooks/useCanvasEngine';
import { useLayerManager } from '../../hooks/useLayerManager';
import { useHistory } from '../../hooks/useHistory';
import { CanvasEngine } from './CanvasEngine';
import { LayerPanel } from './LayerPanel';
import {
  PhotoshopTool,
  DEFAULT_BRUSH,
  ZOOM_LEVELS,
  DEFAULT_COLOR,
  DEFAULT_SHAPE_SETTINGS,
  DEFAULT_GRADIENT_SETTINGS,
  DEFAULT_SELECTION,
  DEFAULT_CLONE_SETTINGS,
  DEFAULT_RETOUCH_SETTINGS,
  SelectionState,
  ColorState,
  ShapeSettings,
  GradientSettings,
  CloneSettings,
  RetouchSettings,
  Guide,
  GridSettings,
  SnappingSettings,
  DEFAULT_GRID_SETTINGS,
  DEFAULT_SNAPPING_SETTINGS,
} from '../../types/photoshop';
import { CropTool } from './tools/CropTool';
import { SelectTool } from './tools/SelectTool';
import { ResizeDialog } from './tools/ResizeDialog';
import { ExportDialog } from './tools/ExportDialog';
import { ColorPicker } from './tools/ColorPicker';
import { StrokeSettingsPanel } from './tools/StrokeSettingsPanel';
import { BrushTool } from './tools/BrushTool';
import { ShapeTool } from './tools/ShapeTool';
import { GradientTool } from './tools/GradientTool';
import { TextTool } from './tools/TextTool';
import { TextInputDialog } from './tools/TextInputDialog';
import { CloneTool } from './tools/CloneTool';
import { RetouchTool } from './tools/RetouchTool';
import { Cheatsheet } from './Cheatsheet';
import { AIPanel } from './ai/AIPanel';
import { AIPhotoAction } from '../../services/aiPhotoService';

let layerIdCounter = 0;
function nextLayerId(): string { return `ps-layer-${++layerIdCounter}-${Date.now()}`; }
import { AdjustmentsPanel } from './adjustments/AdjustmentsPanel';
import { FilterGallery } from './adjustments/FilterGallery';
import { compositeAdjustment } from '../../utils/canvasFilters';
import { ExportPreset, ResizeMode } from '../../types/photoshop';
import { renderTextToDataUrl, rerenderTextLayer, TextLayerData } from './tools/textUtils';
import { drawBrushStroke, fillCanvas, drawCloneDab, applyBlurRegion, applySharpenRegion, applySmudgeRegion } from './tools/colorUtils';
import { drawShapeOnCanvas, drawGradientOnCanvas } from './tools/shapeUtils';

interface PhotoshopEditorProps {
  initialImageUrl?: string | null;
  onExport?: (blob: Blob) => void;
  onClose?: () => void;
  isAuthenticated?: boolean;
  onRequestAuth?: () => void;
  userId?: string | null;
  chutesService?: import('../../services/chutes').ChutesService;
  deductCredits?: (type: string, model?: string) => Promise<boolean>;
  onExportToMedia?: (blob: Blob, name: string) => void;
}

const TOOLS: { id: PhotoshopTool; label: string; shortcut: string; icon: string }[] = [
  { id: 'move', label: 'Move', shortcut: 'V', icon: '✥' },
  { id: 'pan', label: 'Pan', shortcut: 'H', icon: '✋' },
  { id: 'select', label: 'Select', shortcut: 'M', icon: '◻' },
  { id: 'crop', label: 'Crop', shortcut: 'C', icon: '✂' },
  { id: 'resize', label: 'Resize', shortcut: 'R', icon: '↔' },
  { id: 'text', label: 'Text', shortcut: 'T', icon: 'A' },
  { id: 'brush', label: 'Brush', shortcut: 'B', icon: '✏' },
  { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: '○' },
  { id: 'fill', label: 'Fill', shortcut: 'G', icon: '▣' },
  { id: 'shape', label: 'Shape', shortcut: 'U', icon: '⬡' },
  { id: 'gradient', label: 'Gradient', shortcut: 'Y', icon: '◈' },
  { id: 'eyedropper', label: 'Eyedrop', shortcut: 'I', icon: '◉' },
  { id: 'clone', label: 'Clone', shortcut: 'S', icon: '⎘' },
  { id: 'retouch', label: 'Retouch', shortcut: 'O', icon: '✧' },
  { id: 'ai', label: 'AI', shortcut: 'K', icon: '⚡' },
];

export const PhotoshopEditor: React.FC<PhotoshopEditorProps> = ({
  initialImageUrl,
  onExport,
  onClose,
  isAuthenticated = false,
  onRequestAuth,
  userId,
  chutesService,
  deductCredits,
  onExportToMedia,
}) => {
  const [activeTool, setActiveTool] = useState<PhotoshopTool>('move');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [brush, setBrush] = useState(DEFAULT_BRUSH);
  const [gridVisible, setGridVisible] = useState(false);
  const [currentColor, setCurrentColor] = useState<ColorState>(DEFAULT_COLOR);
  const [shapeSettings, setShapeSettings] = useState<ShapeSettings>(DEFAULT_SHAPE_SETTINGS);
  const [gradientSettings, setGradientSettings] = useState<GradientSettings>(DEFAULT_GRADIENT_SETTINGS);
  const [textFont, setTextFont] = useState('Arial');
  const [textSize, setTextSize] = useState(48);
  const [textWeight, setTextWeight] = useState<'light' | 'regular' | 'bold' | 'black'>('bold');
  const [textStyle, setTextStyle] = useState<'normal' | 'italic'>('normal');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [textLineHeight, setTextLineHeight] = useState(1.2);
  const [textBgColor, setTextBgColor] = useState<string | undefined>(undefined);
  const [cloneSettings, setCloneSettings] = useState<CloneSettings>(DEFAULT_CLONE_SETTINGS);
  const [retouchSettings, setRetouchSettings] = useState<RetouchSettings>(DEFAULT_RETOUCH_SETTINGS);
  const cloneSourcePos = useRef<{ x: number; y: number } | null>(null);
  const altKeyDown = useRef(false);
  const cloneLastPos = useRef({ x: 0, y: 0 });
  const retouchLastPos = useRef({ x: 0, y: 0 });

  const [textInputOpen, setTextInputOpen] = useState(false);
  const [editingTextLayer, setEditingTextLayer] = useState<string | null>(null);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const [adjustmentsOpen, setAdjustmentsOpen] = useState(false);
  const [brushMode, setBrushMode] = useState<'brush' | 'eraser' | 'fill'>('brush');
  const [isDrawing, setIsDrawing] = useState(false);
  const [selection, setSelection] = useState<SelectionState>(DEFAULT_SELECTION);
  const selectionClipboard = useRef<ImageData | null>(null);
  const drawStartPos = useRef({ x: 0, y: 0 });
  const lastMousePos = useRef({ x: 0, y: 0 });
  const strokeCanvas = useRef<HTMLCanvasElement | null>(null); // persistent offscreen for brush strokes
  const strokeReady = useRef(false); // true once the layer image has loaded into strokeCanvas
  const strokePendingCommit = useRef(false); // mouse-up fired before image load — commit when ready
  const [gridType, setGridType] = useState<'none' | 'thirds' | 'golden' | 'square' | 'custom'>('thirds');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [resizeDialogOpen, setResizeDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  // Open text input dialog
  const openTextDialog = useCallback(() => {
    setTextInputOpen(true);
  }, []);

  // Handle text tool canvas click — open dialog and set position
  // (Text is rendered on a new layer after the dialog confirms)
  const pendingTextPos = useRef<{ x: number; y: number } | null>(null);

// Open ResizeDialog when resize tool is selected in toolbar
  useEffect(() => {
    if (activeTool === 'resize') {
      setResizeDialogOpen(true);
      setActiveTool('move');
    }
  }, [activeTool]);


  // Move tool dragging state
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const layerStartPos = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    canvas, setCanvas,
    zoomIn, zoomOut, zoomTo, zoomToFit,
    startPan, doPan, endPan,
    screenToCanvas,
  } = useCanvasEngine();

  const {
    layers, activeLayer, activeLayerId, setActiveLayerId,
    addImageLayer, removeLayer, updateLayer,
    setLayerVisibility, setLayerOpacity, setLayerBlendMode,
    setLayerLocked, duplicateLayer, reorderLayer,
    loadLayers, clearLayers, setLayers,
    addGroup, addToGroup, removeFromGroup, setGroupCollapsed,
    setLayerEffects, addLayerMask, removeLayerMask,
  } = useLayerManager(canvas.width, canvas.height);

  // Phase 3: paint-on-mask mode
  const [paintOnMask, setPaintOnMask] = useState(false);

  // Phase 4: rulers, guides, grid, snapping, navigator
  const [guides, setGuides] = useState<Guide[]>([]);
  const [guidesVisible, setGuidesVisible] = useState(true);
  const [guidesLocked, setGuidesLocked] = useState(false);
  const [showRulers, setShowRulers] = useState(true);
  const [gridSettings, setGridSettings] = useState<GridSettings>(DEFAULT_GRID_SETTINGS);
  const [snapping, setSnapping] = useState<SnappingSettings>(DEFAULT_SNAPPING_SETTINGS);
  const [showNavigator, setShowNavigator] = useState(false);
  const [snappingOpen, setSnappingOpen] = useState(false);
  const [gridSettingsOpen, setGridSettingsOpen] = useState(false);
  const topRulerRef = useRef<HTMLCanvasElement>(null);
  const leftRulerRef = useRef<HTMLCanvasElement>(null);
  const navigatorRef = useRef<HTMLCanvasElement>(null);
  const navigatorDragRef = useRef(false);
  const navThumbTimerRef = useRef<number | null>(null);
  const guideDragRef = useRef<{ id: string } | null>(null);
  const rulerDragging = useRef(false);
  const rulerDragOrientation = useRef<'horizontal' | 'vertical' | null>(null);
  const rulerDragCanvasPos = useRef<number>(0);

  // Handle text confirmation from TextInputDialog — create or update text layer
  const handleTextConfirm = useCallback((text: string, editLayerId?: string) => {
    if (!text.trim()) return;
    const textData: TextLayerData = {
      content: text,
      fontFamily: textFont,
      fontSize: textSize,
      fontWeight: textWeight,
      fontStyle: textStyle,
      color: textColor,
      bgColor: textBgColor || undefined,
      textAlign: textAlign,
      lineHeight: textLineHeight,
      letterSpacing: 0,
    };
    if (editLayerId) {
      const result = rerenderTextLayer(textData);
      updateLayer(editLayerId, {
        dataUrl: result.dataUrl,
        width: result.width,
        height: result.height,
        text: textData,
      });
      setActiveLayerId(editLayerId);
    } else {
      const result = renderTextToDataUrl(
        text, textFont, textSize, textWeight, textStyle,
        textColor, textBgColor, textAlign, textLineHeight, 400
      );
      const id = 'ps-layer-text-' + Date.now();
      const pos = pendingTextPos.current;
      setLayers(prev => [...prev, {
        id,
        name: 'Text ' + (prev.length + 1),
        type: 'text' as const,
        layerType: 'layer' as const,
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal' as const,
        dataUrl: result.dataUrl,
        x: pos?.x ?? 0, y: pos?.y ?? 0,
        width: result.width,
        height: result.height,
        text: textData,
      }]);
      pendingTextPos.current = null;
      setActiveLayerId(id);
    }
    setTextInputOpen(false);
    setActiveTool('move');
    setEditingTextLayer(null);
  }, [textFont, textSize, textWeight, textStyle, textColor, textBgColor, textAlign, textLineHeight, setLayers, setActiveLayerId, updateLayer, setActiveTool]);



  const {
    pushSnapshot, undo, redo, canUndo, canRedo, clearHistory,
  } = useHistory();



  // Load initial image
  useEffect(() => {
    if (!initialImageUrl || imageLoaded) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      const canvasEl = document.createElement('canvas');
      canvasEl.width = w;
      canvasEl.height = h;
      const ctx = canvasEl.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      const dataUrl = canvasEl.toDataURL('image/png');

      setCanvas(prev => ({ ...prev, width: w, height: h }));
      addImageLayer(dataUrl, w, h);
      setImageLoaded(true);

      // Fit to view after layout
      requestAnimationFrame(() => {
        const container = document.querySelector('.photoshop-canvas-container');
        if (container) {
          const rect = container.getBoundingClientRect();
          zoomToFit(w, h, rect.width, rect.height);
        }
      });
    };
    img.src = initialImageUrl;
  }, [initialImageUrl, imageLoaded, setCanvas, addImageLayer, zoomToFit]);

  // Keyboard shortcuts — stable listener via refs
  const undoRef = useRef(undo);
  const redoRef = useRef(redo);
  const loadLayersRef = useRef(loadLayers);
  const zoomInRef = useRef(zoomIn);
  const zoomOutRef = useRef(zoomOut);
  const zoomToRef = useRef(zoomTo);
  const layersRef = useRef(layers);
  const removeLayerRef = useRef(removeLayer);
  const activeLayerIdRef = useRef(activeLayerId);
  undoRef.current = undo;
  redoRef.current = redo;
  loadLayersRef.current = loadLayers;
  zoomInRef.current = zoomIn;
  zoomOutRef.current = zoomOut;
  zoomToRef.current = zoomTo;
  layersRef.current = layers;
  removeLayerRef.current = removeLayer;
  activeLayerIdRef.current = activeLayerId;

  // Phase 4: Refs for keyboard handler
  const zoomToFitRef = useRef(zoomToFit);
  zoomToFitRef.current = zoomToFit;
  const canvasStateRef = useRef(canvas);
  canvasStateRef.current = canvas;


  // Phase 4: Snap calculation for move tool
  const calculateSnap = useCallback((layerX: number, layerY: number, layerW: number, layerH: number) => {
    if (!snapping.enabled) return { x: layerX, y: layerY };
    const zoom = canvasStateRef.current.zoom;
    const threshold = snapping.threshold / zoom; // convert screen px to canvas px
    let snapX = layerX;
    let snapY = layerY;
    let snapped = false;

    const edges = {
      left: layerX,
      right: layerX + layerW,
      centerX: layerX + layerW / 2,
      top: layerY,
      bottom: layerY + layerH,
      centerY: layerY + layerH / 2,
    };

    const canvasW = canvasStateRef.current.width;
    const canvasH = canvasStateRef.current.height;

    // Snap to guides
    if (snapping.snapToGuides && guidesVisible && guides.length > 0) {
      for (const guide of guides) {
        if (guide.orientation === 'vertical') {
          // Check left, center, right edges against vertical guide
          for (const edgeX of [edges.left, edges.centerX, edges.right]) {
            if (Math.abs(edgeX - guide.position) < threshold) {
              snapX = guide.position - (edgeX - layerX);
              snapped = true;
              break;
            }
          }
        } else {
          // Check top, center, bottom edges against horizontal guide
          for (const edgeY of [edges.top, edges.centerY, edges.bottom]) {
            if (Math.abs(edgeY - guide.position) < threshold) {
              snapY = guide.position - (edgeY - layerY);
              snapped = true;
              break;
            }
          }
        }
      }
    }

    // Snap to grid
    if (snapping.snapToGrid && gridVisible && gridType === 'custom' && gridSettings) {
      const gridSize = gridSettings.size;
      for (const edgeX of [edges.left, edges.centerX, edges.right]) {
        const nearestGridX = Math.round(edgeX / gridSize) * gridSize;
        if (Math.abs(edgeX - nearestGridX) < threshold) {
          snapX = nearestGridX - (edgeX - layerX);
          break;
        }
      }
      for (const edgeY of [edges.top, edges.centerY, edges.bottom]) {
        const nearestGridY = Math.round(edgeY / gridSize) * gridSize;
        if (Math.abs(edgeY - nearestGridY) < threshold) {
          snapY = nearestGridY - (edgeY - layerY);
          break;
        }
      }
    }

    // Snap to canvas center
    if (snapping.snapToCenter) {
      const canvasCenterX = canvasW / 2;
      const canvasCenterY = canvasH / 2;
      for (const edgeX of [edges.left, edges.centerX, edges.right]) {
        if (Math.abs(edgeX - canvasCenterX) < threshold) {
          snapX = canvasCenterX - (edgeX - layerX);
          break;
        }
      }
      for (const edgeY of [edges.top, edges.centerY, edges.bottom]) {
        if (Math.abs(edgeY - canvasCenterY) < threshold) {
          snapY = canvasCenterY - (edgeY - layerY);
          break;
        }
      }
    }

    // Snap to canvas edges
    if (snapping.snapToEdges) {
      for (const edgeX of [edges.left, edges.right]) {
        if (Math.abs(edgeX) < threshold) {
          snapX = - (edgeX - layerX);
          break;
        }
        if (Math.abs(edgeX - canvasW) < threshold) {
          snapX = canvasW - (edgeX - layerX);
          break;
        }
      }
      for (const edgeY of [edges.top, edges.bottom]) {
        if (Math.abs(edgeY) < threshold) {
          snapY = - (edgeY - layerY);
          break;
        }
        if (Math.abs(edgeY - canvasH) < threshold) {
          snapY = canvasH - (edgeY - layerY);
          break;
        }
      }
    }

    return snapped ? { x: snapX, y: snapY } : { x: layerX, y: layerY };
  }, [snapping, guides, guidesVisible, gridVisible, gridType, gridSettings]);

  // Selection refs for keyboard handler
  const selectionRef = useRef(selection);
  const setSelectionRef = useRef(setSelection);
  const selectionClipboardRef = useRef(selectionClipboard);
  const layersForSelectionRef = useRef(layers);
  selectionRef.current = selection;
  setSelectionRef.current = setSelection;
  selectionClipboardRef.current = selectionClipboard;
  layersForSelectionRef.current = layers;

  // Selection handler implementations
  const handleSelectAllRef = useRef(() => {});
  const handleSelectNoneRef = useRef(() => {});
  const handleSelectInvertRef = useRef(() => {});
  const handleCopyRef = useRef(() => {});
  const handleCutRef = useRef(() => {});
  const handlePasteRef = useRef(() => {});

  // Sync selection handler refs on each render so keyboard handler gets latest closures
  handleSelectAllRef.current = () => {
    setSelection({
      type: 'rectangle',
      x: 0, y: 0,
      width: canvas.width, height: canvas.height,
      isDrawing: false,
      lassoPoints: [],
      startPoint: null, currentPoint: null,
      rect: { x: 0, y: 0, width: canvas.width, height: canvas.height },
    });
  };

  handleSelectNoneRef.current = () => {
    setSelection(DEFAULT_SELECTION);
  };

  handleSelectInvertRef.current = () => {
    // Full inversion is complex — for now, clear the selection
    setSelection(DEFAULT_SELECTION);
  };

  handleCopyRef.current = () => {
    if (!activeLayerId || !selection.rect) return;
    const layer = layers.find(l => l.id === activeLayerId);
    if (!layer || !layer.dataUrl) return;
    const rect = selection.rect;
    const img = new Image();
    img.onload = () => {
      const offscreen = document.createElement('canvas');
      offscreen.width = Math.max(1, Math.round(rect.width));
      offscreen.height = Math.max(1, Math.round(rect.height));
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(
        img,
        rect.x - layer.x, rect.y - layer.y, rect.width, rect.height,
        0, 0, rect.width, rect.height
      );
      selectionClipboard.current = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
    };
    img.src = layer.dataUrl;
  };

  handleCutRef.current = () => {
    if (!activeLayerId || !selection.rect) return;
    const layer = layers.find(l => l.id === activeLayerId);
    if (!layer || !layer.dataUrl) return;
    const rect = selection.rect;

    // Copy first
    handleCopyRef.current();

    // Then delete the selected area
    pushSnapshot(layers, 'Cut selection');
    const img = new Image();
    img.onload = () => {
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
      ctx.clearRect(rect.x - layer.x, rect.y - layer.y, rect.width, rect.height);
      updateLayer(activeLayerId, { dataUrl: offscreen.toDataURL() });
    };
    img.src = layer.dataUrl;
  };

  handlePasteRef.current = () => {
    if (!selectionClipboard.current) return;
    const clip = selectionClipboard.current;
    const offscreen = document.createElement('canvas');
    offscreen.width = clip.width;
    offscreen.height = clip.height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(clip, 0, 0);
    const dataUrl = offscreen.toDataURL();
    const id = 'ps-layer-paste-' + Date.now();
    setLayers(prev => [...prev, {
      id,
      name: 'Pasted',
      type: 'image' as const,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal' as const,
      dataUrl,
      x: selection.rect?.x ?? 0,
      y: selection.rect?.y ?? 0,
      width: clip.width,
      height: clip.height,
    }]);
    setActiveLayerId(id);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // Track Alt key state for clone stamp
      if (e.key === 'Alt') { altKeyDown.current = true; }

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          const result = redoRef.current();
          if (result) loadLayersRef.current(result);
        } else {
          const result = undoRef.current(layersRef.current);
          if (result) loadLayersRef.current(result);
        }
        return;
      }

      if (ctrl && key === '0') {
        e.preventDefault();
        const container = document.querySelector('.photoshop-canvas-container');
        if (container) {
          const rect = container.getBoundingClientRect();
          zoomToFitRef.current(canvasStateRef.current.width, canvasStateRef.current.height, rect.width, rect.height);
        }
        return;
      }
      if (ctrl && key === '1') { e.preventDefault(); zoomToRef.current(1); return; }
      if (key === '+' || key === '=') { e.preventDefault(); zoomInRef.current(); return; }
      if (key === '-') { e.preventDefault(); zoomOutRef.current(); return; }

      // Selection shortcuts
      if (ctrl && key === 'a') {
        e.preventDefault();
        handleSelectAllRef.current();
        return;
      }
      if (ctrl && key === 'd') {
        e.preventDefault();
        handleSelectNoneRef.current();
        return;
      }
      if (ctrl && e.shiftKey && key === 'i') {
        e.preventDefault();
        handleSelectInvertRef.current();
        return;
      }
      if (ctrl && key === 'c') {
        e.preventDefault();
        handleCopyRef.current();
        return;
      }
      if (ctrl && key === 'x') {
        e.preventDefault();
        handleCutRef.current();
        return;
      }
      if (ctrl && key === 'v') {
        e.preventDefault();
        handlePasteRef.current();
        return;
      }

      const toolMap: Record<string, PhotoshopTool> = {
        v: 'move', h: 'pan', m: 'select', c: 'crop', r: 'resize',
        t: 'text', b: 'brush', e: 'eraser', g: 'fill', u: 'shape', y: 'gradient', i: 'eyedropper', k: 'ai',
        s: 'clone', o: 'retouch',
      };
      if (toolMap[key]) {
        setActiveTool(toolMap[key]);
      }
      if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        if (activeLayerIdRef.current) removeLayerRef.current(activeLayerIdRef.current);
        return;
      }
      if (key === '?' || key === '/') {
        setCheatsheetOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    const handleKeyUp = (e: KeyboardEvent) => { if (e.key === 'Alt') altKeyDown.current = false; };
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handler); window.removeEventListener('keyup', handleKeyUp); };
  }, []); // Empty deps — refs keep it fresh

  // Load image from file
  const handleFileOpen = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setCanvas(prev => ({ ...prev, width: img.width, height: img.height }));
        addImageLayer(dataUrl, img.width, img.height);
        const container = document.querySelector('.photoshop-canvas-container');
        if (container) {
          const rect = container.getBoundingClientRect();
          zoomToFit(img.width, img.height, rect.width, rect.height);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [setCanvas, addImageLayer, zoomToFit]);

  // Add blank canvas
  const handleNewCanvas = useCallback(() => {
    clearLayers();
    clearHistory();
    setImageLoaded(false);
    setCanvas(prev => ({ ...prev, width: 1920, height: 1080, zoom: 0.5, panX: 0, panY: 0 }));
  }, [clearLayers, clearHistory, setCanvas]);

    // Apply image adjustment/filter to active layer
  const handleAdjustment = useCallback(async (type: string, params: Record<string, unknown>) => {
    if (!activeLayerId) return;
    const layer = layers.find(l => l.id === activeLayerId);
    if (!layer || !layer.dataUrl) return;
    pushSnapshot(layers, type);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        // Apply filter preset
        if (type === 'filterPreset' && params.preset && params.preset !== 'normal') {
          const result = await compositeAdjustment(tempCanvas, 'filterPreset', { preset: params.preset });
          updateLayer(activeLayerId, { dataUrl: result });
        } else if (type === 'filterPreset' && params.preset === 'normal') {
          // Normal = revert to pre-adjustment state (undo)
          const snapResult = undoRef.current(layers);
          if (snapResult) loadLayersRef.current(snapResult);
        } else if (type !== 'filterPreset') {
          const result = await compositeAdjustment(tempCanvas, type, params);
          updateLayer(activeLayerId, { dataUrl: result });
        }
      };
      img.src = layer.dataUrl;
    } catch (e) { console.error('Adjustment error:', e); }
  }, [activeLayerId, layers, pushSnapshot, updateLayer, undoRef, loadLayersRef]);


  // Phase 4: Guide management
  const addGuide = useCallback((orientation: 'horizontal' | 'vertical', position: number) => {
    const id = 'guide-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    setGuides(prev => [...prev, { id, orientation, position }]);
  }, []);

  const removeGuide = useCallback((id: string) => {
    setGuides(prev => prev.filter(g => g.id !== id));
  }, []);

  const clearGuides = useCallback(() => {
    setGuides([]);
  }, []);

  // Phase 4: Ruler rendering
  const renderRulers = useCallback(() => {
    const zoom = canvas.zoom;
    const panX = canvas.panX;
    const panY = canvas.panY;

    // Top ruler
    const topCanvas = topRulerRef.current;
    if (topCanvas) {
      const ctx = topCanvas.getContext('2d');
      if (ctx) {
        const w = topCanvas.width;
        const h = topCanvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#475569';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';

        // Calculate tick interval based on zoom
        let tickInterval = 100;
        if (zoom >= 4) tickInterval = 10;
        else if (zoom >= 2) tickInterval = 25;
        else if (zoom >= 1) tickInterval = 50;
        else if (zoom >= 0.5) tickInterval = 100;
        else tickInterval = 200;

        const startCanvasX = -panX / zoom;
        const endCanvasX = (w - panX) / zoom;

        const firstTick = Math.floor(startCanvasX / tickInterval) * tickInterval;

        ctx.beginPath();
        for (let cx = firstTick; cx <= endCanvasX; cx += tickInterval) {
          const sx = cx * zoom + panX;
          if (sx < 0 || sx > w) continue;
          const isMajor = cx % (tickInterval * 5) === 0;
          const tickH = isMajor ? 12 : 6;
          ctx.moveTo(sx, h);
          ctx.lineTo(sx, h - tickH);
          if (isMajor) {
            ctx.fillText(cx.toString(), sx, h - 14);
          }
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, h - 0.5);
        ctx.lineTo(w, h - 0.5);
        ctx.stroke();
      }
    }

    // Left ruler
    const leftCanvas = leftRulerRef.current;
    if (leftCanvas) {
      const ctx = leftCanvas.getContext('2d');
      if (ctx) {
        const w = leftCanvas.width;
        const h = leftCanvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#475569';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px monospace';

        let tickInterval = 100;
        if (zoom >= 4) tickInterval = 10;
        else if (zoom >= 2) tickInterval = 25;
        else if (zoom >= 1) tickInterval = 50;
        else if (zoom >= 0.5) tickInterval = 100;
        else tickInterval = 200;

        const startCanvasY = -panY / zoom;
        const endCanvasY = (h - panY) / zoom;
        const firstTick = Math.floor(startCanvasY / tickInterval) * tickInterval;

        ctx.beginPath();
        for (let cy = firstTick; cy <= endCanvasY; cy += tickInterval) {
          const sy = cy * zoom + panY;
          if (sy < 0 || sy > h) continue;
          const isMajor = cy % (tickInterval * 5) === 0;
          const tickW = isMajor ? 12 : 6;
          ctx.moveTo(w, sy);
          ctx.lineTo(w - tickW, sy);
          if (isMajor) {
            ctx.save();
            ctx.translate(w - 14, sy);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.fillText(cy.toString(), 0, 0);
            ctx.restore();
          }
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(w - 0.5, 0);
        ctx.lineTo(w - 0.5, h);
        ctx.stroke();
      }
    }
  }, [canvas]);

  // Render rulers on every canvas change
  useEffect(() => {
    if (showRulers) {
      requestAnimationFrame(renderRulers);
    }
  }, [showRulers, renderRulers, canvas.zoom, canvas.panX, canvas.panY, layers]);

  // Phase 4: Resize ruler canvases
  useEffect(() => {
    const resizeRulers = () => {
      const container = document.querySelector('.photoshop-canvas-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (topRulerRef.current) {
        topRulerRef.current.width = rect.width - 20;
        topRulerRef.current.height = 20;
      }
      if (leftRulerRef.current) {
        leftRulerRef.current.width = 20;
        leftRulerRef.current.height = rect.height - 20;
      }
      requestAnimationFrame(renderRulers);
    };
    resizeRulers();
    const observer = new ResizeObserver(resizeRulers);
    const container = document.querySelector('.photoshop-canvas-container');
    if (container) observer.observe(container);
    return () => observer.disconnect();
  }, [showRulers, renderRulers]);

  // Phase 4: Ruler mouse handlers for guide creation
  const handleRulerMouseDown = useCallback((e: React.MouseEvent, orientation: 'horizontal' | 'vertical') => {
    if (guidesLocked) return;
    e.preventDefault();
    rulerDragging.current = true;
    rulerDragOrientation.current = orientation;
    const container = document.querySelector('.photoshop-canvas-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const zoom = canvas.zoom;
    const panX = canvas.panX;
    const panY = canvas.panY;
    if (orientation === 'horizontal') {
      rulerDragCanvasPos.current = (e.clientY - rect.top - panY) / zoom;
    } else {
      rulerDragCanvasPos.current = (e.clientX - rect.left - panX) / zoom;
    }
  }, [canvas, guidesLocked]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!rulerDragging.current) return;
      const container = document.querySelector('.photoshop-canvas-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const zoom = canvas.zoom;
      const panX = canvas.panX;
      const panY = canvas.panY;
      if (rulerDragOrientation.current === 'horizontal') {
        rulerDragCanvasPos.current = (e.clientY - rect.top - panY) / zoom;
      } else {
        rulerDragCanvasPos.current = (e.clientX - rect.left - panX) / zoom;
      }
    };
    const handleMouseUp = () => {
      if (rulerDragging.current) {
        rulerDragging.current = false;
        const pos = rulerDragCanvasPos.current;
        if (pos >= 0 && pos <= (rulerDragOrientation.current === 'horizontal' ? canvas.height : canvas.width)) {
          addGuide(rulerDragOrientation.current, Math.round(pos));
        }
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [canvas, addGuide]);

  // Phase 4: Navigator thumbnail rendering
  const navImageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const renderNavigator = useCallback(() => {
    const navCanvas = navigatorRef.current;
    if (!navCanvas) return;
    const ctx = navCanvas.getContext('2d');
    if (!ctx) return;

    const thumbW = 160;
    const thumbH = Math.max(1, Math.round((canvas.height / Math.max(1, canvas.width)) * thumbW));
    navCanvas.width = thumbW;
    navCanvas.height = thumbH;

    // Draw checkerboard
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, thumbW, thumbH);

    // Scale to fit
    const scale = canvas.width > 0 ? thumbW / canvas.width : 1;
    ctx.save();
    ctx.scale(scale, scale);

    // Draw layers using local image cache
    let pending = 0;
    for (const layer of layers) {
      if (!layer.visible || layer.layerType === 'group') continue;
      if (layer.dataUrl && layer.dataUrl.startsWith('data:')) {
        let cached = navImageCache.current.get(layer.id);
        if (!cached || cached.src !== layer.dataUrl) {
          const img = new Image();
          img.onload = () => { navImageCache.current.set(layer.id, img); requestAnimationFrame(renderNavigator); };
          img.src = layer.dataUrl;
          navImageCache.current.set(layer.id, img);
          pending++;
        } else if (cached.complete) {
          ctx.drawImage(cached, layer.x, layer.y, layer.width, layer.height);
        }
      }
    }

    ctx.restore();

    if (pending > 0) return; // Will re-render after images load

    // Draw viewport rectangle
    const container = document.querySelector('.photoshop-canvas-container');
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const vpX = (-canvas.panX / canvas.zoom) * scale;
      const vpY = (-canvas.panY / canvas.zoom) * scale;
      const vpW = (containerRect.width / canvas.zoom) * scale;
      const vpH = (containerRect.height / canvas.zoom) * scale;

      ctx.strokeStyle = 'rgba(26, 188, 156, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(vpX, vpY, vpW, vpH);
      ctx.fillStyle = 'rgba(26, 188, 156, 0.05)';
      ctx.fillRect(vpX, vpY, vpW, vpH);
    }
  }, [canvas, layers]);

  useEffect(() => {
    if (showNavigator) {
      navThumbTimerRef.current = window.setTimeout(renderNavigator, 100);
      return () => { if (navThumbTimerRef.current) clearTimeout(navThumbTimerRef.current); };
    }
  }, [showNavigator, renderNavigator, canvas, layers]);

  // Phase 4: Navigator drag to pan
  const handleNavigatorMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    navigatorDragRef.current = true;
    handleNavigatorDrag(e);
  }, []);

  const handleNavigatorDrag = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    if (!navigatorDragRef.current) return;
    const navCanvas = navigatorRef.current;
    if (!navCanvas) return;
    const rect = navCanvas.getBoundingClientRect();
    const navX = e.clientX - rect.left;
    const navY = e.clientY - rect.top;
    const scale = navCanvas.width / canvas.width;
    const canvasX = navX / scale;
    const canvasY = navY / scale;
    const container = document.querySelector('.photoshop-canvas-container');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const newPanX = -(canvasX * canvas.zoom) + containerRect.width / 2;
    const newPanY = -(canvasY * canvas.zoom) + containerRect.height / 2;
    setCanvas(prev => ({ ...prev, panX: newPanX, panY: newPanY }));
  }, [canvas, setCanvas]);

  useEffect(() => {
    const handleNavMouseMove = (e: MouseEvent) => handleNavigatorDrag(e);
    const handleNavMouseUp = () => { navigatorDragRef.current = false; };
    window.addEventListener('mousemove', handleNavMouseMove);
    window.addEventListener('mouseup', handleNavMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleNavMouseMove);
      window.removeEventListener('mouseup', handleNavMouseUp);
    };
  }, [handleNavigatorDrag]);

  // AI handler — receives action + prompt, calls service, updates layer
  const handleAIAction = useCallback(async (action: AIPhotoAction, prompt: string) => {
    if (!isAuthenticated || !activeLayerId || aiGenerating) return;
    const layer = layers.find(l => l.id === activeLayerId);
    if (!layer || !layer.dataUrl) return;
    setAiGenerating(true);
    pushSnapshot(layers, 'AI: ' + action);
    try {
      const { aiGenerateImage, aiEditImage, aiRemoveBackground, aiUpscaleImage, aiStyleTransfer, aiSmartFill } = await import('../../services/aiPhotoService');
      const config = { chutesService, deductCredits: deductCredits || (async () => true), onRequestAuth, isAuthenticated };
      let blob: Blob | null = null;
      switch (action) {
        case 'generate': blob = await aiGenerateImage(config, prompt, '16:9'); break;
        case 'edit': blob = await aiEditImage(config, layer.dataUrl, prompt); break;
        case 'remove_bg': blob = await aiRemoveBackground(config, layer.dataUrl); break;
        case 'upscale': blob = await aiUpscaleImage(config, layer.dataUrl, 2); break;
        case 'style_transfer': blob = await aiStyleTransfer(config, layer.dataUrl, prompt); break;
        case 'smart_fill': blob = await aiSmartFill(config, layer.dataUrl, prompt, ''); break;
      }
      if (blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          const img = new Image();
          img.onload = () => {
            if (action === 'generate') { addImageLayer(dataUrl, img.width, img.height); }
            else { updateLayer(activeLayerId, { dataUrl, width: img.width, height: img.height }); }
            pushSnapshot(layers, 'AI: ' + action + ' complete');
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(blob);
      }
    } catch (e) { console.error('AI error:', e); }
    finally { setAiGenerating(false); }
  }, [isAuthenticated, activeLayerId, layers, aiGenerating, pushSnapshot, addImageLayer, updateLayer, chutesService, deductCredits, onRequestAuth]);

  const handleFillLayer = useCallback(() => {
    if (!activeLayerId) return;
    const layer = layers.find(l => l.id === activeLayerId);
    if (!layer) return;
    pushSnapshot(layers, 'Fill layer');
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;
    fillCanvas(offscreen, brush.color);
    updateLayer(activeLayerId, { dataUrl: offscreen.toDataURL() });
  }, [activeLayerId, layers, canvas, brush, pushSnapshot, updateLayer]);

  // Handle zoom wheel
  const handleWheelZoom = useCallback((deltaY: number) => {
    if (deltaY > 0) zoomOut();
    else zoomIn();
  }, [zoomIn, zoomOut]);

  // Move tool: canvas mouse down
  const handleMouseDownCanvas = useCallback((cx: number, cy: number, hitLayerId: string | null) => {
    if (activeTool === 'move') {
      if (!hitLayerId) return;
      setActiveLayerId(hitLayerId);
      isDragging.current = true;
      dragStart.current = { x: cx, y: cy };
      const layer = layers.find(l => l.id === hitLayerId);
      if (layer) layerStartPos.current = { x: layer.x, y: layer.y };
      pushSnapshot(layers, 'Move layer');
      return;
    }
    // Clone stamp — Alt+click sets source point
    if (activeTool === 'clone' && altKeyDown.current) {
      const layer = layers.find(l => l.id === activeLayerId);
      if (!layer) return;
      cloneSourcePos.current = { x: cx - layer.x, y: cy - layer.y };
      setCloneSettings(prev => ({ ...prev, sourceX: cx - layer.x, sourceY: cy - layer.y }));
      return;
    }
    // Clone stamp — normal click-drag paints from source
    if (activeTool === 'clone') {
      if (!activeLayerId || isDrawing) return;
      const layer = layers.find(l => l.id === activeLayerId);
      if (!layer || !layer.dataUrl) return;
      if (cloneSourcePos.current === null) return;
      setIsDrawing(true);
      pushSnapshot(layers, cloneSettings.mode === 'heal' ? 'Healing brush' : 'Clone stamp');
      drawStartPos.current = { x: cx - layer.x, y: cy - layer.y };
      lastMousePos.current = { x: cx - layer.x, y: cy - layer.y };
      cloneLastPos.current = { x: cx - layer.x, y: cy - layer.y };
      // Pre-load layer image into offscreen canvas
      const img = new Image();
      img.onload = () => {
        if (!strokeCanvas.current || strokeCanvas.current.width !== layer.width || strokeCanvas.current.height !== layer.height) {
          const cvs = document.createElement('canvas');
          cvs.width = layer.width;
          cvs.height = layer.height;
          strokeCanvas.current = cvs;
        }
        const ctx = strokeCanvas.current.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, strokeCanvas.current.width, strokeCanvas.current.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = layer.dataUrl;
      return;
    }
    // Retouch tool — blur/sharpen/smudge
    if (activeTool === 'retouch') {
      if (!activeLayerId || isDrawing) return;
      const layer = layers.find(l => l.id === activeLayerId);
      if (!layer || !layer.dataUrl) return;
      setIsDrawing(true);
      const label = retouchSettings.mode === 'blur' ? 'Blur' : retouchSettings.mode === 'sharpen' ? 'Sharpen' : 'Smudge';
      pushSnapshot(layers, label);
      drawStartPos.current = { x: cx - layer.x, y: cy - layer.y };
      lastMousePos.current = { x: cx - layer.x, y: cy - layer.y };
      retouchLastPos.current = { x: cx - layer.x, y: cy - layer.y };
      // Pre-load layer image
      const img = new Image();
      img.onload = () => {
        if (!strokeCanvas.current || strokeCanvas.current.width !== layer.width || strokeCanvas.current.height !== layer.height) {
          const cvs = document.createElement('canvas');
          cvs.width = layer.width;
          cvs.height = layer.height;
          strokeCanvas.current = cvs;
        }
        const ctx = strokeCanvas.current.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, strokeCanvas.current.width, strokeCanvas.current.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = layer.dataUrl;
      return;
    }
    // Brush/eraser drawing — persistent canvas, no async Image() per pixel
    if (activeTool === 'brush' || activeTool === 'eraser') {
      if (!activeLayerId || isDrawing) return;
      const layer = layers.find(l => l.id === activeLayerId);
      // Paint-on-mask: brush paints black (hide), eraser paints white (reveal)
      const paintingMask = paintOnMask && layer?.maskDataUrl;
      if (!layer || (!paintingMask && !layer.dataUrl)) return;
      setIsDrawing(true);
      strokeReady.current = false; // gate until image loads
      strokeCanvas.current = null; // never draw on a stale canvas
      pushSnapshot(layers, paintingMask ? 'Paint mask' : 'Paint stroke');
      drawStartPos.current = { x: cx - layer.x, y: cy - layer.y };
      lastMousePos.current = { x: cx - layer.x, y: cy - layer.y };
      // Pre-load layer (or mask) image into a persistent offscreen canvas
      const img = new Image();
      img.onload = () => {
        if (!strokeCanvas.current || strokeCanvas.current.width !== layer.width || strokeCanvas.current.height !== layer.height) {
          const cvs = document.createElement('canvas');
          cvs.width = layer.width;
          cvs.height = layer.height;
          strokeCanvas.current = cvs;
        }
        const ctx = strokeCanvas.current.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, strokeCanvas.current.width, strokeCanvas.current.height);
        ctx.drawImage(img, 0, 0);
        strokeReady.current = true;
        const mode = activeTool === 'brush' ? brushMode === 'eraser' ? 'eraser' as const : 'brush' as const : 'eraser' as const;
        if (paintingMask) {
          const maskColor = (activeTool === 'eraser' || mode === 'eraser') ? '#ffffff' : '#000000';
          drawBrushStroke(ctx, drawStartPos.current.x, drawStartPos.current.y, drawStartPos.current.x, drawStartPos.current.y, brush.size, brush.hardness, brush.opacity, maskColor, 'brush');
        } else {
          drawBrushStroke(ctx, drawStartPos.current.x, drawStartPos.current.y, drawStartPos.current.x, drawStartPos.current.y, brush.size, brush.hardness, brush.opacity, brush.color, mode);
        }
        // Flush a deferred mouse-up commit if it fired while loading
        if (strokePendingCommit.current) {
          strokePendingCommit.current = false;
          const layer2 = layers.find(l => l.id === activeLayerId);
          if (paintOnMask && layer2?.maskDataUrl) {
            updateLayer(activeLayerId, { maskDataUrl: strokeCanvas.current!.toDataURL() });
          } else {
            updateLayer(activeLayerId, { dataUrl: strokeCanvas.current!.toDataURL() });
          }
          strokeCanvas.current = null;
        }
      };
      img.src = paintingMask ? layer.maskDataUrl! : layer.dataUrl;
      return;
    }
    // Select tool — draw selection marquee
    if (activeTool === 'select') {
      setSelection(prev => ({
        ...prev,
        isDrawing: true,
        startPoint: { x: cx, y: cy },
        currentPoint: { x: cx, y: cy },
        rect: null,
        lassoPoints: prev.type === 'lasso' ? [{ x: cx, y: cy }] : [],
      }));
      return;
    }
    // Text tool — click canvas to place text there
    if (activeTool === 'text') {
      pendingTextPos.current = { x: cx, y: cy };
      setTextInputOpen(true);
      return;
    }
    // Shape/gradient drawing
    if (activeTool === 'shape' || activeTool === 'gradient') {
      if (!activeLayerId) return;
      const shLayer = layers.find(l => l.id === activeLayerId);
      if (!shLayer || shLayer.locked) return;
      setIsDrawing(true);
      drawStartPos.current = { x: cx, y: cy };
      lastMousePos.current = { x: cx, y: cy };
      return;
    }
  }, [activeTool, layers, activeLayerId, pushSnapshot, setActiveLayerId, brush, brushMode, updateLayer]);

  // Move tool: canvas mouse move
  const handleMouseMoveCanvas = useCallback((cx: number, cy: number) => {
    if (activeTool === 'move' && isDragging.current && activeLayerId) {
      const dx = cx - dragStart.current.x;
      const dy = cy - dragStart.current.y;
      const rawX = layerStartPos.current.x + dx;
      const rawY = layerStartPos.current.y + dy;
      const layer = layers.find(l => l.id === activeLayerId);
      const snapped = calculateSnap(rawX, rawY, layer?.width ?? 0, layer?.height ?? 0);
      updateLayer(activeLayerId, { x: snapped.x, y: snapped.y });
      return;
    }
    // Clone stamp — paint from source offset
    if (activeTool === 'clone' && isDrawing && activeLayerId && strokeCanvas.current && cloneSourcePos.current) {
      const layer = layers.find(l => l.id === activeLayerId);
      if (!layer) return;
      const ctx = strokeCanvas.current.getContext('2d');
      if (!ctx) return;
      const cur = { x: cx - layer.x, y: cy - layer.y };
      const srcX = cloneSourcePos.current.x + (cur.x - cloneLastPos.current.x);
      const srcY = cloneSourcePos.current.y + (cur.y - cloneLastPos.current.y);
      drawCloneDab(ctx, strokeCanvas.current, srcX, srcY, cur.x, cur.y, brush.size, brush.hardness, brush.opacity, cloneSettings.mode);
      cloneLastPos.current = cur;
      cloneSourcePos.current = { x: srcX, y: srcY };
      lastMousePos.current = cur;
      return;
    }
    // Retouch tool — blur/sharpen/smudge while moving
    if (activeTool === 'retouch' && isDrawing && activeLayerId && strokeCanvas.current) {
      const layer = layers.find(l => l.id === activeLayerId);
      if (!layer) return;
      const ctx = strokeCanvas.current.getContext('2d');
      if (!ctx) return;
      const cur = { x: cx - layer.x, y: cy - layer.y };
      const imgData = ctx.getImageData(0, 0, strokeCanvas.current.width, strokeCanvas.current.height);
      const data = imgData.data;
      const radius = brush.size / 2;
      if (retouchSettings.mode === 'blur') {
        applyBlurRegion(data, strokeCanvas.current.width, strokeCanvas.current.height, cur.x, cur.y, radius, retouchSettings.strength);
      } else if (retouchSettings.mode === 'sharpen') {
        applySharpenRegion(data, strokeCanvas.current.width, strokeCanvas.current.height, cur.x, cur.y, radius, retouchSettings.strength);
      } else if (retouchSettings.mode === 'smudge') {
        applySmudgeRegion(data, strokeCanvas.current.width, strokeCanvas.current.height, retouchLastPos.current.x, retouchLastPos.current.y, cur.x, cur.y, radius, retouchSettings.strength);
      }
      ctx.putImageData(imgData, 0, 0);
      retouchLastPos.current = cur;
      lastMousePos.current = cur;
      return;
    }
    // Brush/eraser drawing while moving — paint ONTO persistent canvas (no Image loading)
    lastMousePos.current = { x: cx, y: cy };
    if ((activeTool === 'brush' || activeTool === 'eraser') && isDrawing && activeLayerId && strokeCanvas.current && strokeReady.current) {
      const layer = layers.find(l => l.id === activeLayerId);
      if (!layer) return;
      const ctx = strokeCanvas.current.getContext('2d');
      if (!ctx) return;
      const prev = drawStartPos.current;
      const cur = { x: cx - layer.x, y: cy - layer.y };
      const mode = activeTool === 'brush' ? brushMode === 'eraser' ? 'eraser' as const : 'brush' as const : 'eraser' as const;
      if (paintOnMask && layer.maskDataUrl) {
        // Painting on mask: brush = black (hide), eraser = white (reveal)
        const maskColor = (activeTool === 'eraser' || mode === 'eraser') ? '#ffffff' : '#000000';
        drawBrushStroke(ctx, prev.x, prev.y, cur.x, cur.y, brush.size, brush.hardness, brush.opacity, maskColor, 'brush');
      } else {
        drawBrushStroke(ctx, prev.x, prev.y, cur.x, cur.y, brush.size, brush.hardness, brush.opacity, brush.color, mode);
      }
      drawStartPos.current = cur;
    }
    // Select tool — update selection preview while drawing
    if (activeTool === 'select' && selection.isDrawing) {
      setSelection(prev => ({
        ...prev,
        currentPoint: { x: cx, y: cy },
        lassoPoints: prev.type === 'lasso'
          ? [...prev.lassoPoints, { x: cx, y: cy }]
          : prev.lassoPoints,
      }));
    }
  }, [activeTool, activeLayerId, updateLayer, layers, isDrawing, brush, brushMode, selection.isDrawing, cloneSettings, retouchSettings]);

  // Move/select tool: canvas mouse up
  const handleMouseUpCanvas = useCallback(() => {
    isDragging.current = false;
    // Finalize clone stamp stroke — commit to layer
    if (activeTool === 'clone' && activeLayerId && strokeCanvas.current) {
      const dataUrl = strokeCanvas.current.toDataURL();
      updateLayer(activeLayerId, { dataUrl });
      strokeCanvas.current = null;
    }
    // Finalize retouch stroke — commit to layer
    if (activeTool === 'retouch' && activeLayerId && strokeCanvas.current) {
      const dataUrl = strokeCanvas.current.toDataURL();
      updateLayer(activeLayerId, { dataUrl });
      strokeCanvas.current = null;
    }
    // Finalize brush/eraser stroke — commit to layer (or mask when painting on mask)
    if ((activeTool === 'brush' || activeTool === 'eraser') && activeLayerId && strokeCanvas.current) {
      if (!strokeReady.current) {
        // Image still loading — defer commit until onload completes
        strokePendingCommit.current = true;
      } else {
        const layer = layers.find(l => l.id === activeLayerId);
        if (paintOnMask && layer?.maskDataUrl) {
          updateLayer(activeLayerId, { maskDataUrl: strokeCanvas.current.toDataURL() });
        } else {
          updateLayer(activeLayerId, { dataUrl: strokeCanvas.current.toDataURL() });
        }
        strokeCanvas.current = null;
      }
    }
    setIsDrawing(false);
    // Finalize selection — compute bounding rect
    if (activeTool === 'select') {
      setSelection(prev => {
        if (!prev.startPoint || !prev.currentPoint) return { ...prev, isDrawing: false };
        if (prev.type === 'lasso') {
          // Lasso: close the path, compute bounding rect
          const points = prev.lassoPoints;
          if (points.length < 3) return { ...prev, isDrawing: false, lassoPoints: [] };
          const minX = Math.min(...points.map(p => p.x));
          const minY = Math.min(...points.map(p => p.y));
          const maxX = Math.max(...points.map(p => p.x));
          const maxY = Math.max(...points.map(p => p.y));
          return {
            ...prev,
            isDrawing: false,
            rect: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
          };
        }
        // Rectangle/ellipse: compute bounding rect from start and current
        const x = Math.min(prev.startPoint.x, prev.currentPoint.x);
        const y = Math.min(prev.startPoint.y, prev.currentPoint.y);
        const w = Math.abs(prev.currentPoint.x - prev.startPoint.x);
        const h = Math.abs(prev.currentPoint.y - prev.startPoint.y);
        if (w < 2 && h < 2) return { ...prev, isDrawing: false, rect: null, startPoint: null, currentPoint: null };
        return {
          ...prev,
          isDrawing: false,
          rect: { x, y, width: w, height: h },
          startPoint: null,
          currentPoint: null,
        };
      });
      return;
    }
    // Finalize shape/gradient — actually draw on the layer
    if (activeTool === 'shape' || activeTool === 'gradient') {
      if (!activeLayerId) return;
      const layer = layers.find(l => l.id === activeLayerId);
      if (!layer) return;
      const start = drawStartPos.current;
      const end = { x: lastMousePos.current.x, y: lastMousePos.current.y };
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x) || 1;
      const h = Math.abs(end.y - start.y) || 1;

      const drawCommitted = () => {
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return;
        if (layer.dataUrl) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
            finishShape(ctx, offscreen);
          };
          img.onerror = () => finishShape(ctx, offscreen);
          img.src = layer.dataUrl;
        } else {
          finishShape(ctx, offscreen);
        }
      };
      const finishShape = (ctx: CanvasRenderingContext2D, offscreen: HTMLCanvasElement) => {

        if (activeTool === 'shape') {
          drawShapeOnCanvas(ctx, shapeSettings.type, x, y, w, h,
            shapeSettings.fill, shapeSettings.fillColor,
            shapeSettings.stroke, shapeSettings.strokeWidth, shapeSettings.strokeColor,
            shapeSettings.sides, shapeSettings.starRatio);
        } else {
          drawGradientOnCanvas(ctx, gradientSettings.type, x, y, w, h,
            gradientSettings.colorStops, gradientSettings.angle, gradientSettings.repeat);
        }

        updateLayer(activeLayerId, { dataUrl: offscreen.toDataURL() });
        pushSnapshot(layers, activeTool === 'shape' ? 'Draw shape' : 'Apply gradient');
      };
      drawCommitted();
    }
  }, [activeTool, activeLayerId, layers, canvas, pushSnapshot, updateLayer, shapeSettings, gradientSettings]);

  // Apply crop
  const handleApplyCrop = useCallback((x: number, y: number, w: number, h: number) => {
    // Snap current state before modifying (so undo returns to exact pre-crop state)
    pushSnapshot(layers, 'Crop');
    setLayers(prev => prev.map(l => ({
      ...l,
      x: Math.max(0, l.x - x),
      y: Math.max(0, l.y - y),
      width: Math.min(w, l.width),
      height: Math.min(h, l.height),
    })));
    setCanvas(prev => ({ ...prev, width: w, height: h }));
    setActiveTool('move');
  }, [setCanvas, setLayers, pushSnapshot, layers]);

  // Resize handler
  const handleResizeCanvas = useCallback((newW: number, newH: number, _label: string) => {
    pushSnapshot(layers, 'Resize canvas');
    const scaleX = newW / canvas.width;
    const scaleY = newH / canvas.height;
    setLayers(prev => prev.map(l => ({
      ...l,
      x: Math.round(l.x * scaleX),
      y: Math.round(l.y * scaleY),
      width: Math.round(l.width * scaleX),
      height: Math.round(l.height * scaleY),
    })));
    setCanvas(prev => ({ ...prev, width: newW, height: newH }));
    setResizeDialogOpen(false);
  }, [canvas, setCanvas, setLayers, pushSnapshot, layers]);

  // Export handler
  const handleExport = useCallback(async (format: 'png' | 'jpeg' | 'webp', quality: number) => {
    setExportDialogOpen(false);
    await doExport(format, quality);
  }, []);

  // Blog export handler
  const handleExportBlog = useCallback(async (size: 'og-card' | 'blog-inline' | 'original-webp') => {
    setExportDialogOpen(false);
    const blogSizes: Record<string, { w: number; h: number }> = {
      'og-card': { w: 1200, h: 630 },
      'blog-inline': { w: 800, h: 600 },
      'original-webp': { w: canvas.width, h: canvas.height },
    };
    const { w, h } = blogSizes[size];
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = w;
    exportCanvas.height = h;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    const visibleLayers = layers.filter(l => l.visible);
    for (const layer of visibleLayers) {
      ctx.globalAlpha = layer.opacity;
      if (layer.dataUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const sx = layer.x * (w / canvas.width);
            const sy = layer.y * (h / canvas.height);
            const sw = layer.width * (w / canvas.width);
            const sh = layer.height * (h / canvas.height);
            ctx.drawImage(img, sx, sy, sw, sh);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = layer.dataUrl;
        });
      }
    }

    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blog-${size}-${Date.now()}.webp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/webp', 0.9);
  }, [canvas, layers]);

  // Phase 5: Export with preset resize
  const handleExportPreset = useCallback(async (
    format: 'png' | 'jpeg' | 'webp',
    quality: number,
    preset: ExportPreset,
    resizeMode: ResizeMode,
    bgColor: string,
  ) => {
    setExportDialogOpen(false);
    const srcW = canvas.width;
    const srcH = canvas.height;
    const targetW = preset.width;
    const targetH = preset.height;

    let exportW: number, exportH: number;
    if (resizeMode === 'stretch') {
      exportW = targetW;
      exportH = targetH;
    } else {
      const scale = Math.min(targetW / srcW, targetH / srcH);
      exportW = Math.round(srcW * scale);
      exportH = Math.round(srcH * scale);
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = targetW;
    exportCanvas.height = targetH;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, targetW, targetH);

    const offsetX = Math.round((targetW - exportW) / 2);
    const offsetY = Math.round((targetH - exportH) / 2);

    const visibleLayers = layers.filter(l => l.visible);
    for (const layer of visibleLayers) {
      ctx.globalAlpha = layer.opacity;
      if (layer.dataUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const lx = layer.x * (exportW / srcW) + offsetX;
            const ly = layer.y * (exportH / srcH) + offsetY;
            const lw = layer.width * (exportW / srcW);
            const lh = layer.height * (exportH / srcH);
            ctx.drawImage(img, lx, ly, lw, lh);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = layer.dataUrl;
        });
      }
    }
    ctx.globalAlpha = 1;

    const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const ext = format;
    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${preset.id}-${targetW}x${targetH}-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, mimeType, format === 'png' ? undefined : quality);
  }, [canvas, layers]);

  // Phase 5: Batch layer export — each visible layer as separate file
  const handleBatchLayerExport = useCallback(async (format: 'png' | 'jpeg' | 'webp', quality: number) => {
    setExportDialogOpen(false);
    const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const ext = format;
    const visibleLayers = layers.filter(l => l.visible);

    for (const layer of visibleLayers) {
      const layerCanvas = document.createElement('canvas');
      layerCanvas.width = canvas.width;
      layerCanvas.height = canvas.height;
      const ctx = layerCanvas.getContext('2d');
      if (!ctx) continue;

      // Transparent background for layer export
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.globalAlpha = layer.opacity;
      if (layer.dataUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = layer.dataUrl;
        });
      }
      ctx.globalAlpha = 1;

      const blob = await new Promise<Blob | null>(resolve =>
        layerCanvas.toBlob(resolve, mimeType, format === 'png' ? undefined : quality),
      );
      if (!blob) continue;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = layer.name.replace(/[^a-zA-Z0-9-_]/g, '_');
      a.download = `layer-${safeName}-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Small delay between downloads so browser doesn't block
      await new Promise(r => setTimeout(r, 100));
    }
  }, [canvas, layers]);

  // Phase 5: Send to Media Studio
  const handleSendToMedia = useCallback((blob: Blob, name: string) => {
    setExportDialogOpen(false);
    if (onExportToMedia) {
      onExportToMedia(blob, name);
    } else {
      console.warn('onExportToMedia not provided — cannot send to Media Studio');
    }
  }, [onExportToMedia]);

  // Extracted export logic for reuse
  const doExport = useCallback(async (format: 'png' | 'jpeg' | 'webp', quality: number) => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const visibleLayers = layers.filter(l => l.visible);
    for (const layer of visibleLayers) {
      ctx.globalAlpha = layer.opacity;
      if (layer.dataUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = layer.dataUrl;
        });
      }
    }

    const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const ext = format;
    const q = format === 'png' ? undefined : quality;
    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photoshop-export-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, mimeType, q);
  }, [canvas, layers]);



  // Quick export button
  const handleDownload = useCallback(async (format: 'png' | 'jpeg' | 'webp' = 'png') => {
    await doExport(format, format === 'png' ? 1 : 0.9);
  }, [doExport]);

  // Get current zoom level display
  const zoomPercent = Math.round(canvas.zoom * 100);

  return (
    <div className="flex flex-col w-full h-full bg-slate-950 rounded-lg overflow-hidden">
      {/* Menu bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-primary tracking-wide">Photoshop Corner</span>
          <span className="text-[10px] text-slate-600 px-2 py-0.5 rounded bg-slate-800">v2</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleNewCanvas} className="text-[11px] px-2 py-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">New</button>
          <button onClick={() => fileInputRef.current?.click()} className="text-[11px] px-2 py-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">Open</button>
          <button onClick={() => setResizeDialogOpen(true)} className="text-[11px] px-2 py-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">Resize</button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileOpen} />
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <button onClick={() => setExportDialogOpen(true)} className="text-[11px] px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors font-medium">Export</button>
          <button onClick={() => setAdjustmentsOpen(true)} className="text-[11px] px-2 py-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">Adjust</button>
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <button onClick={() => setCheatsheetOpen(true)} className="text-[11px] w-6 h-6 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors font-bold flex items-center justify-center" title="Shortcuts (?)">?</button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex flex-1 min-h-0">
        {/* Left toolbar */}
        <div className="w-12 flex flex-col items-center py-2 gap-0.5 bg-slate-900 border-r border-slate-800">
          {TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
              className={`
                w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-all
                ${activeTool === tool.id
                  ? 'bg-primary/20 text-primary shadow-sm shadow-primary/10'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                }
              `}
            >
              {tool.icon}
            </button>
          ))}
        </div>

        {/* Canvas area */}
        <div className="flex-1 min-w-0 relative photoshop-canvas-container">
          <CanvasEngine
            canvas={canvas}
            layers={layers}
            activeLayerId={activeLayerId}
            onStartPan={startPan}
            onDoPan={doPan}
            onEndPan={endPan}
            onWheelZoom={handleWheelZoom}
            activeTool={activeTool}
            gridVisible={gridVisible}
            gridType={gridType}
            onMouseDownCanvas={handleMouseDownCanvas}
            onMouseMoveCanvas={handleMouseMoveCanvas}
            onMouseUpCanvas={handleMouseUpCanvas}
            selection={selection}
            guides={guides}
            guidesVisible={guidesVisible}
            gridSettings={gridSettings}
          />

          {showRulers && (
            <>
              <canvas
                ref={topRulerRef}
                onMouseDown={(e) => handleRulerMouseDown(e, 'horizontal')}
                className="absolute top-0 left-0 right-0 h-5 z-30 cursor-ns-resize bg-slate-900/95 border-b border-slate-700 pointer-events-auto"
              />
              <canvas
                ref={leftRulerRef}
                onMouseDown={(e) => handleRulerMouseDown(e, 'vertical')}
                className="absolute top-0 left-0 bottom-0 w-5 z-30 cursor-ew-resize bg-slate-900/95 border-r border-slate-700 pointer-events-auto"
              />
            </>
          )}
          {showNavigator && (
            <div className="absolute bottom-3 right-3 z-30 bg-slate-900/95 border border-slate-700 rounded-lg p-1 shadow-xl">
              <canvas
                ref={navigatorRef}
                width={160}
                onMouseDown={handleNavigatorMouseDown}
                className="rounded cursor-pointer block"
              />
            </div>
          )}
        </div>

        {/* Right panels */}
        <div className="w-60 flex flex-col bg-slate-900 border-l border-slate-800">
          {/* Phase 1 tool panels */}
          {activeTool === 'crop' ? (
            <div className="p-2 border-b border-slate-700/50">
              <CropTool
                canvasWidth={canvas.width}
                canvasHeight={canvas.height}
                onApplyCrop={handleApplyCrop}
                onCancel={() => setActiveTool('move')}
              />
            </div>
          ) : activeTool === 'select' ? (
            <div className="p-2 border-b border-slate-700/50">
              <SelectTool
              selectionType={selection.type}
              onSelectionTypeChange={(type) => setSelection(prev => ({ ...prev, type, rect: null, lassoPoints: [], startPoint: null, currentPoint: null }))}
              selection={selection}
              onDeselect={() => setSelection(DEFAULT_SELECTION)}
            />
            </div>
          ) : activeTool === 'brush' || activeTool === 'eraser' ? (
            <div className="border-b border-slate-700/50">
              <ColorPicker color={currentColor} onChange={(c) => { setCurrentColor(c); setBrush(b => ({ ...b, color: c.hex })); }} />
              <StrokeSettingsPanel settings={brush} onChange={setBrush} />
              <BrushTool
                brushSettings={brush}
                activeMode={brushMode}
                onModeChange={setBrushMode}
                onFillLayer={handleFillLayer}
                onPresetSelect={(presetSettings) => setBrush(b => ({ ...b, ...presetSettings }))}
              />
            </div>
          ) : activeTool === 'fill' ? (
            <div className="border-b border-slate-700/50">
              <ColorPicker color={currentColor} onChange={(c) => { setCurrentColor(c); setBrush(b => ({ ...b, color: c.hex })); }} />
              <BrushTool
                brushSettings={brush}
                activeMode="fill"
                onModeChange={setBrushMode}
                onFillLayer={handleFillLayer}
              />
            </div>
          ) : activeTool === 'shape' ? (
            <div className="border-b border-slate-700/50">
              <ColorPicker color={currentColor} onChange={(c) => { setCurrentColor(c); setShapeSettings(s => ({ ...s, fillColor: c.hex, strokeColor: c.hex })); }} />
              <ShapeTool settings={shapeSettings} color={currentColor} onChange={setShapeSettings} />
            </div>
          ) : activeTool === 'text' ? (
            <div className="border-b border-slate-700/50">
              <ColorPicker color={currentColor} onChange={(c) => { setCurrentColor(c); setTextColor(c.hex); }} />
              <TextTool
                fontFamily={textFont} fontSize={textSize} fontWeight={textWeight}
                fontStyle={textStyle} color={textColor} textAlign={textAlign}
                lineHeight={textLineHeight} bgColor={textBgColor}
                onChange={(p) => {
                  if (p.fontFamily !== undefined) setTextFont(p.fontFamily);
                  if (p.fontSize !== undefined) setTextSize(p.fontSize);
                  if (p.fontWeight !== undefined) setTextWeight(p.fontWeight as 'light' | 'regular' | 'bold' | 'black');
                  if (p.fontStyle !== undefined) setTextStyle(p.fontStyle as 'normal' | 'italic');
                  if (p.color !== undefined) setTextColor(p.color);
                  if (p.textAlign !== undefined) setTextAlign(p.textAlign as 'left' | 'center' | 'right');
                  if (p.lineHeight !== undefined) setTextLineHeight(p.lineHeight);
                  if (p.bgColor !== undefined) setTextBgColor(p.bgColor);
                }}
                onAddText={openTextDialog}
              />
            </div>
          ) : activeTool === 'gradient' ? (
            <div className="border-b border-slate-700/50">
              <GradientTool settings={gradientSettings} color={currentColor} onChange={setGradientSettings} />
            </div>
          ) : activeTool === 'clone' ? (
            <div className="border-b border-slate-700/50">
              <StrokeSettingsPanel settings={brush} onChange={setBrush} />
              <CloneTool settings={cloneSettings} onChange={setCloneSettings} />
            </div>
          ) : activeTool === 'retouch' ? (
            <div className="border-b border-slate-700/50">
              <StrokeSettingsPanel settings={brush} onChange={setBrush} />
              <RetouchTool settings={retouchSettings} onChange={setRetouchSettings} />
            </div>
          ) : activeTool === 'ai' ? (
            <div className="border-b border-slate-700/50">
              <AIPanel
                isAuthenticated={isAuthenticated}
                isGenerating={aiGenerating}
                onGenerate={handleAIAction}
                onRequestAuth={() => onRequestAuth?.()}
              />
            </div>
          ) : null}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <LayerPanel
              layers={layers}
              activeLayerId={activeLayerId}
              onSelectLayer={setActiveLayerId}
              onToggleVisibility={(id) => {
                const l = layers.find(x => x.id === id);
                if (l) setLayerVisibility(id, !l.visible);
              }}
              onChangeOpacity={setLayerOpacity}
              onChangeBlendMode={setLayerBlendMode}
              onToggleLock={(id) => {
                const l = layers.find(x => x.id === id);
                if (l) setLayerLocked(id, !l.locked);
              }}
              onDuplicate={duplicateLayer}
              onRemove={removeLayer}
              onReorder={reorderLayer}
              onAddGroup={() => { pushSnapshot(layers, 'New group'); addGroup(); }}
              onAddToGroup={(layerId, groupId) => { pushSnapshot(layers, 'Add to group'); addToGroup(layerId, groupId); }}
              onRemoveFromGroup={(layerId) => { pushSnapshot(layers, 'Remove from group'); removeFromGroup(layerId); }}
              onToggleGroupCollapsed={(groupId) => { const g = layers.find(l => l.id === groupId); setGroupCollapsed(groupId, !(g?.collapsed ?? false)); }}
              onChangeEffects={(layerId, effects) => { setLayerEffects(layerId, effects); }}
              onAddMask={(layerId) => { pushSnapshot(layers, 'Add layer mask'); addLayerMask(layerId); }}
              onRemoveMask={(layerId) => { pushSnapshot(layers, 'Remove layer mask'); removeLayerMask(layerId); }}
              paintOnMask={paintOnMask}
              onTogglePaintOnMask={() => setPaintOnMask(m => !m)}
            />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-900 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500">{canvas.width} x {canvas.height} px</span>
          <span className="text-[10px] text-slate-500">{layers.length} layers</span>
          <span className="text-[10px] text-slate-500">Tool: {activeTool}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { const r = undo(layers); if (r) loadLayers(r); }}
            disabled={!canUndo}
            className="text-[10px] px-1.5 py-0.5 rounded text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors"
            title="Undo (Ctrl+Z)"
          >↩</button>
          <button
            onClick={() => { const r = redo(); if (r) loadLayers(r); }}
            disabled={!canRedo}
            className="text-[10px] px-1.5 py-0.5 rounded text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors"
            title="Redo (Ctrl+Shift+Z)"
          >↪</button>
          <div className="w-px h-3 bg-slate-700" />
          <button
            onClick={() => setGridVisible(v => !v)}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${gridVisible ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-slate-300'}`}
            title="Toggle grid"
          >⊞</button>
          <button
            onClick={() => setShowRulers(v => !v)}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${showRulers ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-slate-300'}`}
            title="Toggle rulers"
          >📏</button>
          <button
            onClick={() => setGuidesVisible(v => !v)}
            disabled={guides.length === 0}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors disabled:opacity-30 ${guidesVisible && guides.length > 0 ? 'text-cyan-400 bg-cyan-400/10' : 'text-slate-500 hover:text-slate-300'}`}
            title="Toggle guides"
          >📍</button>
          <button
            onClick={clearGuides}
            disabled={guides.length === 0}
            className="text-[10px] px-1.5 py-0.5 rounded text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors"
            title="Clear all guides"
          >✕📍</button>
          <button
            onClick={() => setSnapping(v => ({ ...v, enabled: !v.enabled }))}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${snapping.enabled ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-slate-300'}`}
            title="Toggle snapping"
          >🧲</button>
          <button
            onClick={() => setShowNavigator(v => !v)}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${showNavigator ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-slate-300'}`}
            title="Toggle navigator"
          >🗺</button>
          <span className="text-[11px] text-slate-400 font-mono w-12 text-right">{zoomPercent}%</span>
          <button onClick={zoomOut} className="text-[10px] px-1 py-0.5 rounded text-slate-500 hover:text-slate-300">−</button>
          <input
            type="range"
            min="10"
            max="3200"
            value={zoomPercent}
            onChange={(e) => zoomTo(Number(e.target.value) / 100)}
            className="w-20 h-1 accent-primary"
          />
          <button onClick={zoomIn} className="text-[10px] px-1 py-0.5 rounded text-slate-500 hover:text-slate-300">+</button>
          <button onClick={() => zoomTo(1)} className="text-[10px] px-1.5 py-0.5 rounded text-slate-500 hover:text-slate-300">100%</button>
          <button
            onClick={() => {
              const container = document.querySelector('.photoshop-canvas-container');
              if (container) {
                const rect = container.getBoundingClientRect();
                zoomToFit(canvas.width, canvas.height, rect.width, rect.height);
              }
            }}
            className="text-[10px] px-1.5 py-0.5 rounded text-slate-500 hover:text-slate-300"
          >Fit</button>
        </div>
      </div>
      {adjustmentsOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/50 backdrop-blur-sm" onClick={() => setAdjustmentsOpen(false)}>
          <div className="w-[380px] max-h-[85vh] overflow-y-auto custom-scrollbar bg-slate-900 border border-slate-700 rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
              <h3 className="text-xs font-semibold text-slate-200">Adjustments &amp; Filters</h3>
              <button onClick={() => setAdjustmentsOpen(false)} className="text-slate-500 hover:text-slate-300 text-lg leading-none">&times;</button>
            </div>
            <FilterGallery onApplyFilter={(preset) => { handleAdjustment('filterPreset', { preset }); setAdjustmentsOpen(false); }} disabled={!activeLayerId} />
            <div className="border-t border-slate-700/50" />
            <AdjustmentsPanel onAdjust={(type, params) => { handleAdjustment(type, params); }} />
          </div>
        </div>
      )}
      {cheatsheetOpen && (
        <Cheatsheet onClose={() => setCheatsheetOpen(false)} />
      )}
      {textInputOpen && (
        <TextInputDialog
          fontFamily={textFont} fontSize={textSize} fontWeight={textWeight}
          fontStyle={textStyle} textColor={textColor} textAlign={textAlign}
          lineHeight={textLineHeight}
          existingText={layers.find(l => l.id === editingTextLayer)?.text?.content || ''}
          onConfirm={(txt) => {
            setTextInputOpen(false);
            handleTextConfirm(txt, editingTextLayer || undefined);
          }}
          onClose={() => { setTextInputOpen(false); setEditingTextLayer(null); }}
        />
      )}
      {resizeDialogOpen && (
        <ResizeDialog
          width={canvas.width}
          height={canvas.height}
          onConfirm={handleResizeCanvas}
          onClose={() => setResizeDialogOpen(false)}
        />
      )}
      {exportDialogOpen && (
        <ExportDialog
          canvasWidth={canvas.width}
          canvasHeight={canvas.height}
          layers={layers}
          onExport={handleExport}
          onExportBlog={handleExportBlog}
          onClose={() => setExportDialogOpen(false)}
          onExportPreset={handleExportPreset}
          onBatchLayerExport={handleBatchLayerExport}
          onSendToMedia={handleSendToMedia}
        />
      )}
    </div>
  );
};
