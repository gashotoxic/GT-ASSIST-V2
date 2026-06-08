import React, { useCallback, useEffect, useRef } from 'react';
import { CanvasState, PhotoshopLayer, BlendMode } from '../../types/photoshop';

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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Main render loop — composite all layers
  const render = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const w = cvs.width;
    const h = cvs.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background (checkerboard for transparency)
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, w, h);
    // Draw checkerboard
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

    // Composite each visible layer
    const loadImage = (dataUrl: string): Promise<HTMLImageElement> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(img);
        img.src = dataUrl;
      });
    };

    // Sync render — draw all layers immediately
    const visibleLayers = layers.filter(l => l.visible);
    visibleLayers.forEach(layer => {
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      applyBlendMode(ctx, layer.blendMode);

      if (layer.dataUrl && layer.dataUrl.startsWith('data:')) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
          ctx.restore();
        };
        img.onerror = () => ctx.restore();
        img.src = layer.dataUrl;
      } else {
        ctx.restore();
      }
    });

    // Draw selection highlight on active layer
    if (activeLayerId) {
      const active = layers.find(l => l.id === activeLayerId);
      if (active && active.visible) {
        ctx.strokeStyle = '#1abc9c';
        ctx.lineWidth = 2 / canvas.zoom;
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

    ctx.restore();
  }, [canvas, layers, activeLayerId, gridVisible, gridType]);

  // Re-render on state changes
  useEffect(() => {
    render();
  }, [render]);

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
        render();
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [render]);

  // Mouse handlers for pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'pan' || e.button === 1) {
      onStartPan(e.clientX, e.clientY);
    }
  }, [activeTool, onStartPan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    onDoPan(e.clientX, e.clientY);
  }, [onDoPan]);

  const handleMouseUp = useCallback(() => {
    onEndPan();
  }, [onEndPan]);

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
