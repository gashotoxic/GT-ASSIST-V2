import { useCallback, useRef, useState } from 'react';
import { CanvasState, ZOOM_LEVELS } from '../types/photoshop';

const DEFAULT_CANVAS: CanvasState = {
  zoom: 1.0,
  panX: 0,
  panY: 0,
  width: 1920,
  height: 1080,
  rotation: 0,
};

export function useCanvasEngine(initialSize?: { width: number; height: number }) {
  const [canvas, setCanvas] = useState<CanvasState>(() => ({
    ...DEFAULT_CANVAS,
    ...(initialSize || {}),
  }));

  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const zoomIn = useCallback(() => {
    setCanvas(prev => {
      const nextZoom = ZOOM_LEVELS.find(z => z > prev.zoom + 0.01) || prev.zoom;
      return { ...prev, zoom: nextZoom };
    });
  }, []);

  const zoomOut = useCallback(() => {
    setCanvas(prev => {
      const reversed = [...ZOOM_LEVELS].reverse();
      const nextZoom = reversed.find(z => z < prev.zoom - 0.01) || prev.zoom;
      return { ...prev, zoom: nextZoom };
    });
  }, []);

  const zoomTo = useCallback((zoom: number) => {
    setCanvas(prev => ({ ...prev, zoom: Math.max(0.1, Math.min(32, zoom)) }));
  }, []);

  const zoomToFit = useCallback((imgW: number, imgH: number, containerW: number, containerH: number) => {
    const zoomX = containerW / imgW;
    const zoomY = containerH / imgH;
    const zoom = Math.min(zoomX, zoomY, 1) * 0.9;
    setCanvas(prev => ({
      ...prev,
      zoom: Math.max(0.1, zoom),
      panX: 0,
      panY: 0,
      width: imgW,
      height: imgH,
    }));
  }, []);

  const startPan = useCallback((clientX: number, clientY: number) => {
    isPanning.current = true;
    lastPos.current = { x: clientX, y: clientY };
  }, []);

  const doPan = useCallback((clientX: number, clientY: number) => {
    if (!isPanning.current) return;
    const dx = clientX - lastPos.current.x;
    const dy = clientY - lastPos.current.y;
    lastPos.current = { x: clientX, y: clientY };
    setCanvas(prev => ({
      ...prev,
      panX: prev.panX + dx,
      panY: prev.panY + dy,
    }));
  }, []);

  const endPan = useCallback(() => {
    isPanning.current = false;
  }, []);

  const resetView = useCallback(() => {
    setCanvas(prev => ({ ...prev, zoom: 1, panX: 0, panY: 0, rotation: 0 }));
  }, []);

  const screenToCanvas = useCallback((screenX: number, screenY: number, containerRect: DOMRect) => {
    const x = (screenX - containerRect.left - canvas.panX) / canvas.zoom;
    const y = (screenY - containerRect.top - canvas.panY) / canvas.zoom;
    return { x: Math.round(x), y: Math.round(y) };
  }, [canvas]);

  const canvasToScreen = useCallback((canvasX: number, canvasY: number, containerRect: DOMRect) => {
    const x = canvasX * canvas.zoom + containerRect.left + canvas.panX;
    const y = canvasY * canvas.zoom + containerRect.top + canvas.panY;
    return { x: Math.round(x), y: Math.round(y) };
  }, [canvas]);

  return {
    canvas,
    setCanvas,
    zoomIn,
    zoomOut,
    zoomTo,
    zoomToFit,
    startPan,
    doPan,
    endPan,
    resetView,
    screenToCanvas,
    canvasToScreen,
    isPanning,
  };
}
