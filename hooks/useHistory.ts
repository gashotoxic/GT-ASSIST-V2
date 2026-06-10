import { useCallback, useRef, useState } from 'react';
import { HistorySnapshot, PhotoshopLayer } from '../types/photoshop';

const MAX_HISTORY = 50;

let snapCounter = 0;
function nextSnapId(): string { return `snap-${++snapCounter}-${Date.now()}`; }

export function useHistory() {
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  // Use ref to track current index for use inside setState callbacks
  const historyIndexRef = useRef(-1);

  // Sync ref whenever historyIndex changes
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
      // Discard any future history beyond current index (branching)
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

    // Save current state if we're at the tip — push a snapshot silently
    if (idx === history.length - 1) {
      setHistory(prev => {
        if (prev.length === 0) return prev;
        // Overwrite the last entry with current state instead of branching
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
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < history.length - 1,
    clearHistory,
  };
}
