import { useCallback, useState } from 'react';
import { PhotoshopLayer, BlendMode, LayerType, LayerEffects, DEFAULT_LAYER_EFFECTS } from '../types/photoshop';

let layerCounter = 0;
function nextId(): string { return `layer-${++layerCounter}-${Date.now()}`; }

function cloneLayer(source: PhotoshopLayer, overrides?: Partial<PhotoshopLayer>): PhotoshopLayer {
  return {
    ...source,
    ...overrides,
    id: overrides?.id || nextId(),
    text: source.text ? { ...source.text } : undefined,
    shape: source.shape ? { ...source.shape, polygonPoints: source.shape.polygonPoints ? [...source.shape.polygonPoints] : undefined } : undefined,
    selectionMask: source.selectionMask,
    effects: source.effects ? { ...source.effects } : undefined,
    children: source.children ? [...source.children] : undefined,
    maskDataUrl: source.maskDataUrl,
  };
}

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
      // Also remove from any parent group's children
      const cleaned = next.map(l => {
        if (l.children && l.children.includes(layerId)) {
          return { ...l, children: l.children.filter(cid => cid !== layerId) };
        }
        return l;
      });
      // Read active layer ID from prev state to avoid stale closure
      const currentActive = activeLayerId;
      if (currentActive === layerId) {
        const newIdx = Math.min(idx, cleaned.length - 1);
        setTimeout(() => setActiveLayerId(cleaned[newIdx]?.id || null), 0);
      }
      return cleaned;
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
      const dup = cloneLayer(source, { name: `${source.name} (copy)` });
      return [...prev, dup];
    });
  }, []);

  const mergeVisible = useCallback(() => {
    // Placeholder — Phase 0
  }, []);

  const loadLayers = useCallback((newLayers: PhotoshopLayer[]) => {
    setLayers(newLayers);
    setActiveLayerId(newLayers[newLayers.length - 1]?.id || null);
  }, []);

  const clearLayers = useCallback(() => {
    setLayers([]);
    setActiveLayerId(null);
  }, []);

  // --- Phase 3: Groups ---

  const addGroup = useCallback(() => {
    const groupId = nextId();
    const group: PhotoshopLayer = {
      id: groupId,
      name: `Group ${layerCounter}`,
      type: 'image',
      layerType: 'group',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      dataUrl: '',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      children: [],
      collapsed: false,
    };
    setLayers(prev => [...prev, group]);
    setActiveLayerId(groupId);
    return group;
  }, []);

  const addToGroup = useCallback((layerId: string, groupId: string) => {
    setLayers(prev => {
      const layer = prev.find(l => l.id === layerId);
      const group = prev.find(l => l.id === groupId);
      if (!layer || !group || group.layerType !== 'group') return prev;
      // Remove from old parent if any
      let next = prev.map(l => {
        if (l.children && l.children.includes(layerId)) {
          return { ...l, children: l.children.filter(cid => cid !== layerId) };
        }
        return l;
      });
      // Add to new group
      next = next.map(l => {
        if (l.id === groupId) {
          const children = l.children || [];
          if (!children.includes(layerId)) {
            return { ...l, children: [...children, layerId] };
          }
        }
        return l;
      });
      // Mark the layer with parentId
      next = next.map(l => l.id === layerId ? { ...l, parentId: groupId } : l);
      return next;
    });
  }, []);

  const removeFromGroup = useCallback((layerId: string) => {
    setLayers(prev => {
      let next = prev.map(l => {
        if (l.children && l.children.includes(layerId)) {
          return { ...l, children: l.children.filter(cid => cid !== layerId) };
        }
        return l;
      });
      next = next.map(l => l.id === layerId ? { ...l, parentId: undefined } : l);
      return next;
    });
  }, []);

  const setGroupCollapsed = useCallback((groupId: string, collapsed: boolean) => {
    updateLayer(groupId, { collapsed });
  }, [updateLayer]);

  // --- Phase 3: Layer Effects ---

  const setLayerEffects = useCallback((layerId: string, effects: LayerEffects) => {
    updateLayer(layerId, { effects });
  }, [updateLayer]);

  // --- Phase 3: Masking ---

  const addLayerMask = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    // Create white mask (fully visible) matching layer dimensions
    const w = Math.max(1, layer.width);
    const h = Math.max(1, layer.height);
    const cvs = document.createElement('canvas');
    cvs.width = w;
    cvs.height = h;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    updateLayer(layerId, { maskDataUrl: cvs.toDataURL() });
  }, [layers, updateLayer]);

  const removeLayerMask = useCallback((layerId: string) => {
    updateLayer(layerId, { maskDataUrl: undefined });
  }, [updateLayer]);

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
    // Phase 3: Groups
    addGroup,
    addToGroup,
    removeFromGroup,
    setGroupCollapsed,
    // Phase 3: Effects
    setLayerEffects,
    // Phase 3: Masks
    addLayerMask,
    removeLayerMask,
  };
}
