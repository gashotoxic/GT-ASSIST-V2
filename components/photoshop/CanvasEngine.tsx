import React, { useCallback, useEffect, useRef } from 'react';
import { CanvasState, PhotoshopLayer, BlendMode, SelectionState, SelectionRect } from '../../types/photoshop';
import { renderTextOnCtx, TextLayerData } from './tools/textUtils';

interface CanvasEngineProps {
  canvas: CanvasState;
  layers: PhotoshopLayer[];
  activeLayerId: string | null;
  onStartPan: (x: number, y: number) => void;
  onDoPan: (x: number, y: number) => void;
  onEndPan: () => void;
  onWheelZoom: (deltaY: number) => void;
  activeTool: string;
  gridVisible: boolean;
  gridType: 'none' | 'thirds' | 'golden' | 'square';
  // Move tool — canvas-space coordinates
  onMouseDownCanvas?: (canvasX: number, canvasY: number, layerId: string | null) => void;
  onMouseMoveCanvas?: (canvasX: number, canvasY: number) => void;
  onMouseUpCanvas?: () => void;
  screenToCanvas?: (sx: number, sy: number, rect: DOMRect) => { x: number; y: number };
  selection?: SelectionState;
}

function applyBlendMode(ctx: CanvasRenderingContext2D, mode: BlendMode) {
  const map: Record<string, GlobalCompositeOperation> = {
    normal: 'source-over',
    multiply: 'multiply',
    screen: 'screen',
    overlay: 'overlay',
    darken: 'darken',
    lighten: 'lighten',
    'color-dodge': 'color-dodge',
    difference: 'difference',
    'hard-light': 'hard-light',
    'soft-light': 'soft-light',
  };
  ctx.globalCompositeOperation = map[mode] || 'source-over';
}

export const CanvasEngine: React.FC<CanvasEngineProps> = ({
  canvas,
  layers,
  activeLayerId,
  onStartPan,
  onDoPan,
  onEndPan,
  onWheelZoom,
  activeTool,
  gridVisible,
  gridType,
  onMouseDownCanvas,
  onMouseMoveCanvas,
  onMouseUpCanvas,
  screenToCanvas: screenToCanvasProp,
  selection,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const dataUrlVersions = useRef<Map<string, string>>(new Map());
  const zoomOffset = useRef({ x: 0, y: 0 }); // For calibrating screenToCanvas
  const marchOffset = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const renderRef = useRef<() => void>(() => {});

  // Pre-load images when layers change — ensures sync rendering
  useEffect(() => {
    let cancelled = false;
    const loadPromises = layers
      .filter(l => l.dataUrl && l.dataUrl.startsWith('data:') && (!imageCache.current.has(l.id) || dataUrlVersions.current.get(l.id) !== l.dataUrl))
      .map(layer => new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          if (!cancelled) {
            imageCache.current.set(layer.id, img);
            dataUrlVersions.current.set(layer.id, layer.dataUrl);
          }
          resolve();
        };
        img.onerror = () => {
          resolve(); // Don't cache on error
        };
        img.src = layer.dataUrl;
      }));

    // Clean up removed layers from cache
    for (const key of imageCache.current.keys()) {
      if (!layers.find(l => l.id === key)) {
        imageCache.current.delete(key);
        dataUrlVersions.current.delete(key);
      }
    }

    if (loadPromises.length > 0) {
      Promise.all(loadPromises).then(() => {
        if (!cancelled) requestAnimationFrame(() => render());
      });
    } else {
      // Still need to re-render for property changes (opacity, etc.)
      requestAnimationFrame(() => render());
    }

    return () => { cancelled = true; };
  }, [layers]); // Only re-run when layers identity changes

  // Sync render — draws everything immediately from cache
  const render = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const w = cvs.width;
    const h = cvs.height;

    // Clear entire canvas
    ctx.clearRect(0, 0, w, h);

    // Draw checkerboard background
    const tileSize = 16;
    for (let y = 0; y < h; y += tileSize) {
      for (let x = 0; x < w; x += tileSize) {
        const isEven = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
        ctx.fillStyle = isEven ? '#2a2a3e' : '#1a1a2e';
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    // Apply zoom + pan transform
    ctx.save();
    ctx.translate(canvas.panX, canvas.panY);
    ctx.scale(canvas.zoom, canvas.zoom);

    // Composite each visible layer — SYNC from cache
    const visibleLayers = layers.filter(l => l.visible);
    for (const layer of visibleLayers) {
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      applyBlendMode(ctx, layer.blendMode);

      // Text layers: render live from text data (re-editable)
      if (layer.text && layer.text.content) {
        renderTextOnCtx(
          ctx, layer.text.content, layer.text.fontFamily, layer.text.fontSize,
          layer.text.fontWeight, layer.text.fontStyle,
          layer.text.color, layer.text.bgColor,
          layer.text.textAlign,
          layer.text.lineHeight,
          layer.x, layer.y, layer.width, layer.height
        );
      } else {
        const cached = imageCache.current.get(layer.id);
        if (cached) {
          ctx.drawImage(cached, layer.x, layer.y, layer.width, layer.height);
        }
      }
      ctx.restore(); // restore per-layer
    }

    // Draw selection marching ants overlay
    if (selection && selection.type !== 'none') {
      let sx = 0, sy = 0, sw = 0, sh = 0;
      let hasRect = false;

      if (selection.rect) {
        sx = selection.rect.x; sy = selection.rect.y;
        sw = selection.rect.width; sh = selection.rect.height;
        hasRect = sw > 0 && sh > 0;
      } else if (selection.startPoint && selection.currentPoint) {
        // In-progress drawing — compute preview rect
        sx = Math.min(selection.startPoint.x, selection.currentPoint.x);
        sy = Math.min(selection.startPoint.y, selection.currentPoint.y);
        sw = Math.abs(selection.currentPoint.x - selection.startPoint.x);
        sh = Math.abs(selection.currentPoint.y - selection.startPoint.y);
        hasRect = sw > 2 && sh > 2;
      }

      if (hasRect) {
        ctx.save();
        const lineWidth = 1 / canvas.zoom;
        const dashSize = 4 / canvas.zoom;
        const offset = marchOffset.current;

        // White outline (background)
        ctx.lineWidth = lineWidth;
        ctx.setLineDash([dashSize, dashSize]);
        ctx.lineDashOffset = -offset / canvas.zoom;
        ctx.strokeStyle = '#ffffff';
        if (selection.type === 'ellipse' && sw > 0 && sh > 0) {
          ctx.beginPath();
          ctx.ellipse(sx + sw / 2, sy + sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.strokeRect(sx, sy, sw, sh);
        }

        // Black dashes (foreground, offset by half dash for marching effect)
        ctx.lineDashOffset = -(offset + dashSize) / canvas.zoom;
        ctx.strokeStyle = '#000000';
        if (selection.type === 'ellipse' && sw > 0 && sh > 0) {
          ctx.beginPath();
          ctx.ellipse(sx + sw / 2, sy + sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.strokeRect(sx, sy, sw, sh);
        }

        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    // Draw active layer highlight (subtle blue border)
    if (activeLayerId && !(selection && selection.type !== 'none')) {
      const active = layers.find(l => l.id === activeLayerId);
      if (active && active.visible) {
        ctx.strokeStyle = 'rgba(26, 188, 156, 0.4)';
        ctx.lineWidth = 1 / canvas.zoom;
        ctx.setLineDash([4 / canvas.zoom, 4 / canvas.zoom]);
        ctx.strokeRect(active.x, active.y, active.width, active.height);
        ctx.setLineDash([]);
      }
    }

    // Draw grid if enabled
    if (gridVisible) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1 / canvas.zoom;
      if (gridType === 'thirds') {
        const thirdW = canvas.width / 3;
        const thirdH = canvas.height / 3;
        ctx.beginPath();
        ctx.moveTo(thirdW, 0); ctx.lineTo(thirdW, canvas.height);
        ctx.moveTo(thirdW * 2, 0); ctx.lineTo(thirdW * 2, canvas.height);
        ctx.moveTo(0, thirdH); ctx.lineTo(canvas.width, thirdH);
        ctx.moveTo(0, thirdH * 2); ctx.lineTo(canvas.width, thirdH * 2);
        ctx.stroke();
      } else if (gridType === 'square') {
        const step = 50;
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += step) {
          ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
        }
        for (let y = 0; y <= canvas.height; y += step) {
          ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
      }
    }

    ctx.restore(); // match the outer save() for zoom/pan
  }, [canvas, layers, activeLayerId, gridVisible, gridType, selection]);

  // Re-render on state changes (zoom, pan, opacity, etc.)
  useEffect(() => {
    requestAnimationFrame(() => render());
  }, [render]);

  // Sync renderRef so animation loop always calls latest render
  renderRef.current = render;

  // Marching ants animation loop
  useEffect(() => {
    const hasSelection = selection && selection.type !== 'none' && (
      selection.rect || (selection.startPoint && selection.currentPoint)
    );
    if (!hasSelection) {
      marchOffset.current = 0;
      return;
    }

    let running = true;
    const tick = () => {
      if (!running) return;
      marchOffset.current = (marchOffset.current + 0.5) % 20;
      renderRef.current();
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [selection?.rect, selection?.type, selection?.startPoint, selection?.currentPoint]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const cvs = canvasRef.current;
      const rect = container.getBoundingClientRect();
      if (cvs) {
        cvs.width = rect.width;
        cvs.height = rect.height;
        requestAnimationFrame(() => render());
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [render]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'pan' || e.button === 1) {
      onStartPan(e.clientX, e.clientY);
      return;
    }
    // Fire tool-specific canvas callbacks
    if (onMouseDownCanvas && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const cx = (e.clientX - rect.left - canvas.panX) / canvas.zoom;
      const cy = (e.clientY - rect.top - canvas.panY) / canvas.zoom;
      // Find if clicking on active layer
      const active = layers.find(l => l.id === activeLayerId);
      const hitLayer = active && cx >= active.x && cx <= active.x + active.width && cy >= active.y && cy <= active.y + active.height
        ? activeLayerId : null;
      onMouseDownCanvas(Math.round(cx), Math.round(cy), hitLayer);
    }
  }, [activeTool, onStartPan, onMouseDownCanvas, canvas, layers, activeLayerId]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    onDoPan(e.clientX, e.clientY);
    if (onMouseMoveCanvas && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const cx = (e.clientX - rect.left - canvas.panX) / canvas.zoom;
      const cy = (e.clientY - rect.top - canvas.panY) / canvas.zoom;
      onMouseMoveCanvas(Math.round(cx), Math.round(cy));
    }
  }, [onDoPan, onMouseMoveCanvas, canvas]);

  const handleMouseUp = useCallback(() => {
    onEndPan();
    if (onMouseUpCanvas) onMouseUpCanvas();
  }, [onEndPan, onMouseUpCanvas]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      onWheelZoom(e.deltaY);
    }
  }, [onWheelZoom]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-slate-900 rounded-lg"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: activeTool === 'pan' ? 'grab' : activeTool === 'move' ? 'move' : 'crosshair' }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
      />
    </div>
  );
};
