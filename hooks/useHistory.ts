import { useCallback, useRef, useState } from 'react';
import { HistorySnapshot, PhotoshopLayer } from '../types/photoshop';

const MAX_HISTORY = 50;

let snapCounter = 0;
function nextSnapId(): string { return `snap-${++snapCounter}-${Date.now()}`; }

/** Info for each history state shown in the History panel */
export interface HistoryStateInfo {
  index: number;
  label: string;
  timestamp: number;
  thumbnail: string;
}

/** Generate a small thumbnail from the composite of all visible layers */
export function createThumbnailFromLayers(layers: PhotoshopLayer[]): string {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, size, size);
  let hasLayer = false;
  for (const layer of layers) {
    if (!layer.visible || !layer.dataUrl) continue;
    hasLayer = true;
    ctx.globalAlpha = layer.opacity;
  }
  if (!hasLayer) return canvas.toDataURL('image/png');
  const tmp = document.createElement('canvas');
  tmp.width = size;
  tmp.height = size;
  const tctx = tmp.getContext('2d');
  if (!tctx) return canvas.toDataURL('image/png');
  for (const layer of layers) {
    if (!layer.visible || !layer.dataUrl) continue;
    tctx.globalAlpha = layer.opacity;
    const img = new Image();
    try {
      tctx.drawImage(img, 0, 0, size, size);
    } catch { /* ignore */ }
  }
  return tmp.toDataURL('image/png');
}

export function useHistory() {
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyIndexRef = useRef(-1);

  const updateIndex = useCallback((fn: number | ((prev: number) => number)) => {
    setHistoryIndex(prev => {
      const next = typeof fn === 'function' ? (fn as (p: number) => number)(prev) : fn;
      historyIndexRef.current = next;
      return next;
    });
  }, []);

  const pushSnapshot = useCallback((layers: PhotoshopLayer[], label: string) => {
    const currentIdx = historyIndexRef.current;
    setHistory(prev => {
      const base = prev.slice(0, currentIdx + 1);
      const snap: HistorySnapshot = {
        id: nextSnapId(),
        label,
        timestamp: Date.now(),
        layers: JSON.parse(JSON.stringify(layers)),
      };
      const next = [...base, snap];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    updateIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [updateIndex]);

  const undo = useCallback((currentLayers: PhotoshopLayer[]): PhotoshopLayer[] | null => {
    const idx = historyIndexRef.current;
    if (idx < 0) return null;
    if (idx === history.length - 1) {
      setHistory(prev => {
        if (prev.length === 0) return prev;
        const snap: HistorySnapshot = {
          id: nextSnapId(),
          label: 'auto-save',
          timestamp: Date.now(),
          layers: JSON.parse(JSON.stringify(currentLayers)),
        };
        const next = [...prev];
        next[next.length - 1] = snap;
        return next;
      });
    }
    const targetIdx = Math.max(0, idx - 1);
    const target = history[targetIdx];
    if (!target) return null;
    updateIndex(targetIdx);
    return JSON.parse(JSON.stringify(target.layers));
  }, [history, updateIndex]);

  const redo = useCallback((): PhotoshopLayer[] | null => {
    const idx = historyIndexRef.current;
    if (idx >= history.length - 1) return null;
    const targetIdx = idx + 1;
    const target = history[targetIdx];
    if (!target) return null;
    updateIndex(targetIdx);
    return JSON.parse(JSON.stringify(target.layers));
  }, [history, updateIndex]);

  const jumpToState = useCallback((targetIdx: number): PhotoshopLayer[] | null => {
    const idx = historyIndexRef.current;
    if (targetIdx < 0 || targetIdx >= history.length) return null;
    if (targetIdx === idx) return null;
    const target = history[targetIdx];
    if (!target) return null;
    updateIndex(targetIdx);
    return JSON.parse(JSON.stringify(target.layers));
  }, [history, updateIndex]);

  const getHistoryList = useCallback((): HistoryStateInfo[] => {
    return history.map((snap, i) => ({
      index: i,
      label: snap.label,
      timestamp: snap.timestamp,
      thumbnail: createThumbnailFromLayers(snap.layers),
    }));
  }, [history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
    historyIndexRef.current = -1;
  }, []);

  return {
    history,
    historyIndex,
    pushSnapshot,
    undo,
    redo,
    jumpToState,
    getHistoryList,
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < history.length - 1,
    clearHistory,
  };
}
