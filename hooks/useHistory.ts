import { useCallback, useRef, useState } from 'react';
import { HistorySnapshot, PhotoshopLayer } from '../types/photoshop';

const MAX_HISTORY = 50;

let snapCounter = 0;
function nextSnapId(): string { return `snap-${++snapCounter}-${Date.now()}`; }

export function useHistory() {
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isRestoring = useRef(false);

  const pushSnapshot = useCallback((layers: PhotoshopLayer[], label: string) => {
    if (isRestoring.current) return;

    setHistory(prev => {
      // Discard any future history beyond current index (branching)
      const base = prev.slice(0, historyIndex + 1);
      const snap: HistorySnapshot = {
        id: nextSnapId(),
        label,
        timestamp: Date.now(),
        layers: JSON.parse(JSON.stringify(layers)), // deep clone
      };
      const next = [...base, snap];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  const undo = useCallback((currentLayers: PhotoshopLayer[]): PhotoshopLayer[] | null => {
    if (historyIndex < 0) return null;

    // Save current state if we're at the tip
    if (historyIndex === history.length - 1) {
      pushSnapshot(currentLayers, 'auto-save');
    }

    isRestoring.current = true;
    const targetIdx = Math.max(0, historyIndex - 1);
    setHistoryIndex(targetIdx);
    const target = history[targetIdx];
    if (!target) {
      isRestoring.current = false;
      return null;
    }
    isRestoring.current = false;
    return JSON.parse(JSON.stringify(target.layers));
  }, [history, historyIndex, pushSnapshot]);

  const redo = useCallback((): PhotoshopLayer[] | null => {
    if (historyIndex >= history.length - 1) return null;

    isRestoring.current = true;
    const targetIdx = historyIndex + 1;
    setHistoryIndex(targetIdx);
    const target = history[targetIdx];
    if (!target) {
      isRestoring.current = false;
      return null;
    }
    isRestoring.current = false;
    return JSON.parse(JSON.stringify(target.layers));
  }, [history, historyIndex]);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  return {
    history,
    historyIndex,
    pushSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  };
}
