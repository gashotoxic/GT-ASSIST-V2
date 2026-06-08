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
} from '../../types/photoshop';
import { CropTool } from './tools/CropTool';
import { SelectTool } from './tools/SelectTool';
import { ResizeDialog } from './tools/ResizeDialog';
import { ExportDialog } from './tools/ExportDialog';

interface PhotoshopEditorProps {
  initialImageUrl?: string | null;
  onExport?: (blob: Blob) => void;
  onClose?: () => void;
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
  { id: 'eyedropper', label: 'Eyedrop', shortcut: 'I', icon: '◉' },
];

export const PhotoshopEditor: React.FC<PhotoshopEditorProps> = ({
  initialImageUrl,
  onExport,
  onClose,
}) => {
  const [activeTool, setActiveTool] = useState<PhotoshopTool>('move');
  const [brush, setBrush] = useState(DEFAULT_BRUSH);
  const [gridVisible, setGridVisible] = useState(false);
  const [gridType, setGridType] = useState<'none' | 'thirds' | 'golden' | 'square'>('thirds');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [resizeDialogOpen, setResizeDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
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

  const {
    pushSnapshot, undo, redo, canUndo, canRedo, clearHistory,
  } = useHistory();

  // Push snapshot when layers change (debounced)
  const lastSnapshot = useRef(0);
  useEffect(() => {
    if (layers.length === 0) return;
    const now = Date.now();
    if (now - lastSnapshot.current > 500) {
      lastSnapshot.current = now;
      pushSnapshot(layers, `Layer change`);
    }
  }, [layers, pushSnapshot]);

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
  undoRef.current = undo;
  redoRef.current = redo;
  loadLayersRef.current = loadLayers;
  zoomInRef.current = zoomIn;
  zoomOutRef.current = zoomOut;
  zoomToRef.current = zoomTo;
  layersRef.current = layers;

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

      const toolMap: Record<string, PhotoshopTool> = {
        v: 'move', h: 'pan', m: 'select', c: 'crop', r: 'resize',
        t: 'text', b: 'brush', e: 'eraser', g: 'fill', u: 'shape', i: 'eyedropper',
      };
      if (toolMap[key]) {
        setActiveTool(toolMap[key]);
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
    }
  }, [activeTool, layers, pushSnapshot, setActiveLayerId]);

  // Move tool: canvas mouse move
  const handleMouseMoveCanvas = useCallback((cx: number, cy: number) => {
    if (activeTool === 'move' && isDragging.current && activeLayerId) {
      const dx = cx - dragStart.current.x;
      const dy = cy - dragStart.current.y;
      updateLayer(activeLayerId, {
        x: layerStartPos.current.x + dx,
        y: layerStartPos.current.y + dy,
      });
    }
  }, [activeTool, activeLayerId, updateLayer]);

  // Move/select tool: canvas mouse up
  const handleMouseUpCanvas = useCallback(() => {
    isDragging.current = false;
  }, []);

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
          />
        </div>

        {/* Right panels */}
        <div className="w-60 flex flex-col bg-slate-900 border-l border-slate-800">
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
              <SelectTool onSelect={(mode) => console.log('Selection mode:', mode)} />
            </div>
          ) : null}
          <div className="flex-1 min-h-0">
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
