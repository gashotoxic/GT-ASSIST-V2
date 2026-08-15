import React, { useCallback, useEffect, useRef } from 'react';
import { CanvasState, PhotoshopLayer, BlendMode, SelectionState, SelectionRect, LayerEffects } from '../../types/photoshop';
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

// --- Phase 3: Effect rendering helpers ---

function hasEffects(effects?: LayerEffects): boolean {
  if (!effects) return false;
  return !!(effects.dropShadow?.enabled || effects.stroke?.enabled || effects.outerGlow?.enabled);
}

function hasMask(maskDataUrl?: string): boolean {
  return !!maskDataUrl;
}

function renderLayerEffects(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  layer: PhotoshopLayer
) {
  const effects = layer.effects;
  if (!effects) return;

  const w = layer.width;
  const h = layer.height;
  // Calculate padding needed for effects (shadow offset + blur, glow blur)
  let padX = 0, padY = 0;
  if (effects.dropShadow?.enabled) {
    const ds = effects.dropShadow;
    padX = Math.max(padX, Math.abs(ds.offsetX) + ds.blur * 2);
    padY = Math.max(padY, Math.abs(ds.offsetY) + ds.blur * 2);
  }
  if (effects.outerGlow?.enabled) {
    const og = effects.outerGlow;
    padX = Math.max(padX, og.blur * 2);
    padY = Math.max(padY, og.blur * 2);
  }

  if (padX === 0 && padY === 0) return; // Only stroke, no padding needed

  // Create padded temp canvas
  const padW = w + padX * 2;
  const padH = h + padY * 2;
  const temp = document.createElement('canvas');
  temp.width = padW;
  temp.height = padH;
  const tctx = temp.getContext('2d');
  if (!tctx) return;

  // Draw shadow
  if (effects.dropShadow?.enabled) {
    const ds = effects.dropShadow;
    tctx.save();
    tctx.globalAlpha = ds.opacity;
    tctx.shadowOffsetX = ds.offsetX;
    tctx.shadowOffsetY = ds.offsetY;
    tctx.shadowBlur = ds.blur;
    tctx.shadowColor = ds.color;
    // Draw image silhouette as shadow source
    tctx.drawImage(img, padX, padY, w, h);
    tctx.restore();
  }

  // Draw glow
  if (effects.outerGlow?.enabled) {
    const og = effects.outerGlow;
    tctx.save();
    tctx.globalAlpha = og.opacity;
    tctx.shadowOffsetX = 0;
    tctx.shadowOffsetY = 0;
    tctx.shadowBlur = og.blur;
    tctx.shadowColor = og.color;
    tctx.drawImage(img, padX, padY, w, h);
    tctx.restore();
  }

  // Draw stroke
  if (effects.stroke?.enabled) {
    const st = effects.stroke;
    tctx.save();
    tctx.strokeStyle = st.color;
    tctx.lineWidth = st.size * 2;
    tctx.globalAlpha = 1;
    // Create silhouette path from image alpha
    // Use the image as a clip mask then stroke
    tctx.beginPath();
    // Draw the image to a temp to extract alpha
    const alphaCvs = document.createElement('canvas');
    alphaCvs.width = w;
    alphaCvs.height = h;
    const actx = alphaCvs.getContext('2d');
    if (actx) {
      actx.drawImage(img, 0, 0, w, h);
      const imgData = actx.getImageData(0, 0, w, h);
      const data = imgData.data;
      // Find edge pixels (alpha > 0 and adjacent to alpha === 0)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const a = data[idx + 3];
          if (a > 10) {
            tctx.fillStyle = st.color;
            tctx.fillRect(padX + x, padY + y, 1, 1);
          }
        }
      }
    }
    tctx.restore();
  }

  // Draw the actual image on top
  tctx.drawImage(img, padX, padY, w, h);

  // Composite padded result back to main ctx, offset by padding
  ctx.drawImage(temp, layer.x - padX, layer.y - padY, padW, padH);
}

function renderLayerWithMask(
  ctx: CanvasRenderingContext2D,
  layer: PhotoshopLayer,
  img: HTMLImageElement | HTMLCanvasElement,
  maskImg: HTMLImageElement
) {
  // Render layer + mask to temp canvas using destination-in
  const temp = document.createElement('canvas');
  temp.width = layer.width;
  temp.height = layer.height;
  const tctx = temp.getContext('2d');
  if (!tctx) return;

  // Draw the layer image
  tctx.drawImage(img, 0, 0, layer.width, layer.height);
  // Apply mask with destination-in
  tctx.globalCompositeOperation = 'destination-in';
  tctx.drawImage(maskImg, 0, 0, layer.width, layer.height);
  tctx.globalCompositeOperation = 'source-over';

  // Draw masked result
  ctx.drawImage(temp, layer.x, layer.y, layer.width, layer.height);
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
  const maskImageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const maskDataUrlVersions = useRef<Map<string, string>>(new Map());
  const zoomOffset = useRef({ x: 0, y: 0 });
  const marchOffset = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const renderRef = useRef<() => void>(() => {});

  // Pre-load images when layers change
  useEffect(() => {
    let cancelled = false;
    const loadPromises: Promise<void>[] = [];

    for (const layer of layers) {
      if (layer.layerType === 'group') continue; // Groups have no image
      // Layer image
      if (layer.dataUrl && layer.dataUrl.startsWith('data:') && (!imageCache.current.has(layer.id) || dataUrlVersions.current.get(layer.id) !== layer.dataUrl)) {
        loadPromises.push(new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            if (!cancelled) {
              imageCache.current.set(layer.id, img);
              dataUrlVersions.current.set(layer.id, layer.dataUrl);
            }
            resolve();
          };
          img.onerror = () => resolve();
          img.src = layer.dataUrl;
        }));
      }
      // Mask image
      if (layer.maskDataUrl && (!maskImageCache.current.has(layer.id) || maskDataUrlVersions.current.get(layer.id) !== layer.maskDataUrl)) {
        loadPromises.push(new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            if (!cancelled) {
              maskImageCache.current.set(layer.id, img);
              maskDataUrlVersions.current.set(layer.id, layer.maskDataUrl!);
            }
            resolve();
          };
          img.onerror = () => resolve();
          img.src = layer.maskDataUrl;
        }));
      }
    }

    // Clean up removed layers from caches
    for (const key of imageCache.current.keys()) {
      if (!layers.find(l => l.id === key)) {
        imageCache.current.delete(key);
        dataUrlVersions.current.delete(key);
      }
    }
    for (const key of maskImageCache.current.keys()) {
      if (!layers.find(l => l.id === key)) {
        maskImageCache.current.delete(key);
        maskDataUrlVersions.current.delete(key);
      }
    }

    if (loadPromises.length > 0) {
      Promise.all(loadPromises).then(() => {
        if (!cancelled) requestAnimationFrame(() => render());
      });
    } else {
      requestAnimationFrame(() => render());
    }

    return () => { cancelled = true; };
  }, [layers]);

  // Check if a layer is a child of any group
  const isChildOfGroup = useCallback((layerId: string): boolean => {
    return layers.some(l => l.layerType === 'group' && l.children?.includes(layerId));
  }, [layers]);

  // Render a single non-group layer (with effects + mask)
  const renderSingleLayer = useCallback((ctx: CanvasRenderingContext2D, layer: PhotoshopLayer) => {
    if (!layer.visible) return;
    if (layer.layerType === 'group') return; // Groups handled separately

    const cached = imageCache.current.get(layer.id);
    if (!cached && !layer.text) return;

    const effectsPresent = hasEffects(layer.effects);
    const maskPresent = hasMask(layer.maskDataUrl);

    // Create layer content element
    const contentElement = cached || (() => {
      // For text layers without cached image, create temp canvas
      const temp = document.createElement('canvas');
      temp.width = Math.max(1, layer.width);
      temp.height = Math.max(1, layer.height);
      const tctx = temp.getContext('2d');
      if (tctx && layer.text && layer.text.content) {
        renderTextOnCtx(
          tctx, layer.text.content, layer.text.fontFamily, layer.text.fontSize,
          layer.text.fontWeight, layer.text.fontStyle,
          layer.text.color, layer.text.bgColor,
          layer.text.textAlign,
          layer.text.lineHeight,
          0, 0, layer.width, layer.height
        );
      }
      return temp;
    })();

    // Handle mask: draw layer+mask to temp, then composite
    if (maskPresent) {
      const maskImg = maskImageCache.current.get(layer.id);
      if (maskImg) {
        // Layer + mask on temp canvas
        const temp = document.createElement('canvas');
        temp.width = Math.max(1, layer.width);
        temp.height = Math.max(1, layer.height);
        const tctx = temp.getContext('2d');
        if (tctx) {
          tctx.drawImage(contentElement, 0, 0, layer.width, layer.height);
          tctx.globalCompositeOperation = 'destination-in';
          tctx.drawImage(maskImg, 0, 0, layer.width, layer.height);
          tctx.globalCompositeOperation = 'source-over';

          // Now apply effects to the masked result
          if (effectsPresent) {
            renderLayerEffects(ctx, temp, layer);
          } else {
            ctx.drawImage(temp, layer.x, layer.y, layer.width, layer.height);
          }
        }
        return;
      }
    }

    // Handle effects only (no mask)
    if (effectsPresent) {
      renderLayerEffects(ctx, contentElement, layer);
    } else {
      // Simple draw
      ctx.drawImage(contentElement, layer.x, layer.y, layer.width, layer.height);
    }
  }, []);

  // Render a group and its children
  const renderGroup = useCallback((ctx: CanvasRenderingContext2D, group: PhotoshopLayer) => {
    if (!group.visible || group.layerType !== 'group') return;

    const childIds = group.children || [];
    if (childIds.length === 0) return;

    // If group is collapsed, still render children but don't skip
    // (collapsed is just UI, not rendering)

    const groupW = canvas.width;
    const groupH = canvas.height;

    // Create temp canvas for group compositing
    const temp = document.createElement('canvas');
    temp.width = groupW;
    temp.height = groupH;
    const tctx = temp.getContext('2d');
    if (!tctx) return;

    // Render children to temp canvas
    for (const childId of childIds) {
      const child = layers.find(l => l.id === childId);
      if (!child || !child.visible) continue;

      tctx.save();
      tctx.globalAlpha = child.opacity;
      applyBlendMode(tctx, child.blendMode);
      renderSingleLayer(tctx, child);
      tctx.restore();
    }

    // Composite group to main canvas with group opacity/blend
    ctx.save();
    ctx.globalAlpha = group.opacity;
    applyBlendMode(ctx, group.blendMode);
    ctx.drawImage(temp, 0, 0);
    ctx.restore();
  }, [canvas, layers, renderSingleLayer]);

  // Main render function
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

    // Composite each visible layer — bottom to top
    for (const layer of layers) {
      // Skip children of groups (they're rendered by their parent group)
      if (layer.parentId) continue;

      if (layer.layerType === 'group') {
        // Render group (children + group opacity/blend)
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        applyBlendMode(ctx, layer.blendMode);
        renderGroup(ctx, layer);
        ctx.restore();
      } else {
        // Regular layer
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        applyBlendMode(ctx, layer.blendMode);
        renderSingleLayer(ctx, layer);
        ctx.restore();
      }
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

    // Draw active layer highlight
    if (activeLayerId && !(selection && selection.type !== 'none')) {
      const active = layers.find(l => l.id === activeLayerId);
      if (active && active.visible && active.layerType !== 'group') {
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
  }, [canvas, layers, activeLayerId, gridVisible, gridType, selection, renderSingleLayer, renderGroup]);

  // Re-render on state changes
  useEffect(() => {
    requestAnimationFrame(() => render());
  }, [render]);

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
    if (onMouseDownCanvas && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const cx = (e.clientX - rect.left - canvas.panX) / canvas.zoom;
      const cy = (e.clientY - rect.top - canvas.panY) / canvas.zoom;
      const active = layers.find(l => l.id === activeLayerId);
      const hitLayer = active && active.layerType !== 'group' && cx >= active.x && cx <= active.x + active.width && cy >= active.y && cy <= active.y + active.height
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
