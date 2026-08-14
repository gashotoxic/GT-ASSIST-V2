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
  SelectionState,
  ColorState,
  ShapeSettings,
  GradientSettings,
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
import { Cheatsheet } from './Cheatsheet';
import { AIPanel } from './ai/AIPanel';
import { AIPhotoAction } from '../../services/aiPhotoService';

let layerIdCounter = 0;
function nextLayerId(): string { return `ps-layer-${++layerIdCounter}-${Date.now()}`; }
import { AdjustmentsPanel } from './adjustments/AdjustmentsPanel';
import { FilterGallery } from './adjustments/FilterGallery';
import { compositeAdjustment } from '../../utils/canvasFilters';
import { renderTextToDataUrl, rerenderTextLayer, TextLayerData } from './tools/textUtils';
import { drawBrushStroke, fillCanvas } from './tools/colorUtils';
import { drawShapeOnCanvas, drawGradientOnCanvas } from './tools/shapeUtils';

interface PhotoshopEditorProps {
  initialImageUrl?: string | null;
  onExport?: (blob: Blob) => void;
  onClose?: () => void;
  isAuthenticated?: boolean;
  onRequestAuth?: () => void;
  userId?: string | null;
  chutesService?: any;
  deductCredits?: (type: string, model?: string) => Promise<boolean>;
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
  const [gridType, setGridType] = useState<'none' | 'thirds' | 'golden' | 'square'>('thirds');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [resizeDialogOpen, setResizeDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  // Open text input dialog
  const openTextDialog = useCallback(() => {
    setTextInputOpen(true);
  }, []);

  // Handle text tool canvas click — open dialog and set position
  // (Text is rendered on a new layer after the dialog confirms)

    
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
  } = useLayerManager(canvas.width, canvas.height);

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
      setLayers(prev => [...prev, {
        id,
        name: 'Text ' + (prev.length + 1),
        type: 'text' as const,
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal' as const,
        dataUrl: result.dataUrl,
        x: 0, y: 0,
        width: result.width,
        height: result.height,
        text: textData,
      }]);
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

      if (ctrl && key === '0') { e.preventDefault(); zoomToRef.current(1); return; }
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
    return () => window.removeEventListener('keydown', handler);
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
  const handleAdjustment = useCallback(async (type: string, params: any) => {
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
    // Brush/eraser drawing — persistent canvas, no async Image() per pixel
    if (activeTool === 'brush' || activeTool === 'eraser') {
      if (!activeLayerId || isDrawing) return;
      const layer = layers.find(l => l.id === activeLayerId);
      if (!layer || !layer.dataUrl) return;
      setIsDrawing(true);
      pushSnapshot(layers, 'Paint stroke');
      drawStartPos.current = { x: cx - layer.x, y: cy - layer.y };
      lastMousePos.current = { x: cx - layer.x, y: cy - layer.y };
      // Pre-load layer image into a persistent offscreen canvas
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
        const mode = activeTool === 'brush' ? brushMode === 'eraser' ? 'eraser' as const : 'brush' as const : 'eraser' as const;
        drawBrushStroke(ctx, drawStartPos.current.x, drawStartPos.current.y, drawStartPos.current.x, drawStartPos.current.y, brush.size, brush.hardness, brush.opacity, brush.color, mode);
      };
      img.src = layer.dataUrl;
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
    // Shape/gradient drawing
    if (activeTool === 'shape' || activeTool === 'gradient') {
      if (!activeLayerId) return;
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
      updateLayer(activeLayerId, {
        x: layerStartPos.current.x + dx,
        y: layerStartPos.current.y + dy,
      });
      return;
    }
    // Brush/eraser drawing while moving — paint ONTO persistent canvas (no Image loading)
    lastMousePos.current = { x: cx, y: cy };
    if ((activeTool === 'brush' || activeTool === 'eraser') && isDrawing && activeLayerId && strokeCanvas.current) {
      const layer = layers.find(l => l.id === activeLayerId);
      if (!layer) return;
      const ctx = strokeCanvas.current.getContext('2d');
      if (!ctx) return;
      const prev = drawStartPos.current;
      const cur = { x: cx - layer.x, y: cy - layer.y };
      const mode = activeTool === 'brush' ? brushMode === 'eraser' ? 'eraser' as const : 'brush' as const : 'eraser' as const;
      drawBrushStroke(ctx, prev.x, prev.y, cur.x, cur.y, brush.size, brush.hardness, brush.opacity, brush.color, mode);
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
  }, [activeTool, activeLayerId, updateLayer, layers, isDrawing, brush, brushMode, selection.isDrawing]);

  // Move/select tool: canvas mouse up
  const handleMouseUpCanvas = useCallback(() => {
    isDragging.current = false;
    // Finalize brush/eraser stroke — commit to layer
    if ((activeTool === 'brush' || activeTool === 'eraser') && activeLayerId && strokeCanvas.current) {
      const dataUrl = strokeCanvas.current.toDataURL();
      updateLayer(activeLayerId, { dataUrl });
      strokeCanvas.current = null;
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
      if (!layer || !layer.dataUrl) return;
      const start = drawStartPos.current;
      const end = { x: lastMousePos.current.x, y: lastMousePos.current.y };
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x) || 1;
      const h = Math.abs(end.y - start.y) || 1;

      const img = new Image();
      img.onload = () => {
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

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
      img.src = layer.dataUrl;
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
          />
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
                  if (p.fontWeight !== undefined) setTextWeight(p.fontWeight as any);
                  if (p.fontStyle !== undefined) setTextStyle(p.fontStyle as any);
                  if (p.color !== undefined) setTextColor(p.color);
                  if (p.textAlign !== undefined) setTextAlign(p.textAlign as any);
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
          onExport={handleExport}
          onExportBlog={handleExportBlog}
          onClose={() => setExportDialogOpen(false)}
        />
      )}
    </div>
  );
};
