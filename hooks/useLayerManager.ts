import { useCallback, useState } from 'react';
import { PhotoshopLayer, BlendMode, LayerType } from '../types/photoshop';

let layerCounter = 0;
function nextId(): string { return `layer-${++layerCounter}-${Date.now()}`; }

function createLayer(
  type: LayerType,
  dataUrl: string,
  width: number,
  height: number,
  overrides?: Partial<PhotoshopLayer>
): PhotoshopLayer {
  return {
    id: nextId(),
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${layerCounter}`,
    type,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal' as BlendMode,
    dataUrl,
    x: 0,
    y: 0,
    width,
    height,
    ...overrides,
  };
}

export function useLayerManager(initialWidth = 1920, initialHeight = 1080) {
  const [layers, setLayers] = useState<PhotoshopLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

  const activeLayer = layers.find(l => l.id === activeLayerId) || null;

  const addLayer = useCallback((type: LayerType, dataUrl: string, width: number, height: number, overrides?: Partial<PhotoshopLayer>) => {
    const layer = createLayer(type, dataUrl, width, height, overrides);
    setLayers(prev => [...prev, layer]);
    setActiveLayerId(layer.id);
    return layer;
  }, []);

  const addImageLayer = useCallback((dataUrl: string, imgWidth: number, imgHeight: number) => {
    return addLayer('image', dataUrl, imgWidth, imgHeight);
  }, [addLayer]);

  const removeLayer = useCallback((layerId: string) => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === layerId);
      const next = prev.filter(l => l.id !== layerId);
      if (activeLayerId === layerId) {
        const newIdx = Math.min(idx, next.length - 1);
        setActiveLayerId(next[newIdx]?.id || null);
      }
      return next;
    });
  }, [activeLayerId]);

  const reorderLayer = useCallback((fromIndex: number, toIndex: number) => {
    setLayers(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const updateLayer = useCallback((layerId: string, patch: Partial<PhotoshopLayer>) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, ...patch } : l));
  }, []);

  const setLayerVisibility = useCallback((layerId: string, visible: boolean) => {
    updateLayer(layerId, { visible });
  }, [updateLayer]);

  const setLayerOpacity = useCallback((layerId: string, opacity: number) => {
    updateLayer(layerId, { opacity: Math.max(0, Math.min(1, opacity)) });
  }, [updateLayer]);

  const setLayerBlendMode = useCallback((layerId: string, blendMode: BlendMode) => {
    updateLayer(layerId, { blendMode });
  }, [updateLayer]);

  const setLayerLocked = useCallback((layerId: string, locked: boolean) => {
    updateLayer(layerId, { locked });
  }, [updateLayer]);

  const duplicateLayer = useCallback((layerId: string) => {
    setLayers(prev => {
      const source = prev.find(l => l.id === layerId);
      if (!source) return prev;
      const dup = { ...source, id: nextId(), name: `${source.name} (copy)` };
      return [...prev, dup];
    });
  }, []);

  const mergeVisible = useCallback(() => {
    // Placeholder — actual merge requires canvas compositing
    // For Phase 0, just returns layers as-is
  }, []);

  const loadLayers = useCallback((newLayers: PhotoshopLayer[]) => {
    setLayers(newLayers);
    setActiveLayerId(newLayers[newLayers.length - 1]?.id || null);
  }, []);

  const clearLayers = useCallback(() => {
    setLayers([]);
    setActiveLayerId(null);
  }, []);

  return {
    layers,
    activeLayer,
    activeLayerId,
    setActiveLayerId,
    addLayer,
    addImageLayer,
    removeLayer,
    reorderLayer,
    updateLayer,
    setLayerVisibility,
    setLayerOpacity,
    setLayerBlendMode,
    setLayerLocked,
    duplicateLayer,
    mergeVisible,
    loadLayers,
    clearLayers,
    setLayers,
  };
}
