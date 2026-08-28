import React, { useState, useCallback } from 'react';
import { PhotoshopLayer, BLEND_MODE_LABELS, BlendMode, LayerEffects } from '../../types/photoshop';
import { LayerEffectsPanel } from './LayerEffectsPanel';

interface LayerPanelProps {
  layers: PhotoshopLayer[];
  activeLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onChangeOpacity: (id: string, opacity: number) => void;
  onChangeBlendMode: (id: string, mode: BlendMode) => void;
  onToggleLock: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  // Phase 3: Groups
  onAddGroup: () => void;
  onAddToGroup: (layerId: string, groupId: string) => void;
  onRemoveFromGroup: (layerId: string) => void;
  onToggleGroupCollapsed: (groupId: string) => void;
  // Phase 3: Effects
  onChangeEffects: (layerId: string, effects: LayerEffects) => void;
  // Phase 3: Masks
  onAddMask: (layerId: string) => void;
  onRemoveMask: (layerId: string) => void;
  paintOnMask: boolean;
  onTogglePaintOnMask: () => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  onToggleVisibility,
  onChangeOpacity,
  onChangeBlendMode,
  onToggleLock,
  onDuplicate,
  onRemove,
  onReorder,
  onAddGroup,
  onAddToGroup,
  onRemoveFromGroup,
  onToggleGroupCollapsed,
  onChangeEffects,
  onAddMask,
  onRemoveMask,
  paintOnMask,
  onTogglePaintOnMask,
}) => {
  const [expandedEffects, setExpandedEffects] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  // Get top-level layers (not children of groups)
  const topLevelLayers = layers.filter(l => !l.parentId);
  const sortedLayers = [...topLevelLayers].reverse(); // Top layer first

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.setData('application/x-layer-id', layers[index]?.id || '');
  };

  const handleLayerDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    setDragOverGroupId(null);
    const fromIdx = Number(e.dataTransfer.getData('text/plain'));
    if (!isNaN(fromIdx) && fromIdx !== toIndex) onReorder(fromIdx, toIndex);
  };

  const handleGroupDragOver = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverGroupId(groupId);
  };

  const handleGroupDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverGroupId(null);
  };

  const handleGroupDrop = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverGroupId(null);
    const layerId = e.dataTransfer.getData('application/x-layer-id');
    if (layerId && layerId !== groupId) {
      onAddToGroup(layerId, groupId);
    }
  };

  const handleDragEnd = () => {
    setDragOverGroupId(null);
  };

  const renderLayerRow = (layer: PhotoshopLayer, depth: number = 0) => {
    const isActive = layer.id === activeLayerId;
    const isGroup = layer.layerType === 'group';
    const hasEffectsExpanded = expandedEffects === layer.id;
    const hasEffects = layer.effects && (
      layer.effects.dropShadow?.enabled || layer.effects.stroke?.enabled || layer.effects.outerGlow?.enabled
    );

    return (
      <div key={layer.id} style={{ marginLeft: depth * 12 }}>
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, layers.indexOf(layer))}
          onDragOver={(e) => {
            e.preventDefault();
            if (isGroup) handleGroupDragOver(e, layer.id);
          }}
          onDragLeave={(e) => { if (isGroup) handleGroupDragLeave(e); }}
          onDrop={(e) => {
            if (isGroup) {
              handleGroupDrop(e, layer.id);
            } else {
              handleLayerDrop(e, layers.indexOf(layer));
            }
          }}
          onDragEnd={handleDragEnd}
          onClick={() => onSelectLayer(layer.id)}
          className={`
            group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors
            ${isActive
              ? 'bg-primary/15 ring-1 ring-primary/30'
              : 'hover:bg-slate-800/40'
            }
            ${layer.locked ? 'opacity-50' : ''}
            ${dragOverGroupId === layer.id ? 'ring-2 ring-primary/50 bg-primary/10' : ''}
          `}
        >
          {/* Collapse/expand for groups */}
          {isGroup ? (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleGroupCollapsed(layer.id); }}
              className="w-4 h-4 flex items-center justify-center text-slate-500 hover:text-slate-300 shrink-0"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-3 h-3 transition-transform ${layer.collapsed ? '' : 'rotate-90'}`}>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
              className="w-4 h-4 flex items-center justify-center text-slate-500 hover:text-slate-300 shrink-0"
              title={layer.visible ? 'Hide layer' : 'Show layer'}
            >
              {layer.visible ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>
          )}

          {/* Layer thumbnail */}
          <div className="w-8 h-8 rounded border border-slate-700/50 overflow-hidden bg-slate-900 shrink-0 flex items-center justify-center">
            {isGroup ? (
              <span className="text-sm">📁</span>
            ) : layer.dataUrl ? (
              <img src={layer.dataUrl} alt="" className="w-full h-full object-contain" />
            ) : (
              <span className="text-[8px] text-slate-600 uppercase">{layer.type[0]}</span>
            )}
          </div>

          {/* Layer name + info */}
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-slate-300 truncate">{layer.name}</div>
            <div className="text-[10px] text-slate-500">
              {isGroup ? `${(layer.children || []).length} items` : `${layer.type} · ${Math.round(layer.opacity * 100)}%`}
            </div>
          </div>

          {/* Effect indicators */}
          {!isGroup && hasEffects && (
            <span className="text-[9px] text-primary shrink-0" title="Has effects">fx</span>
          )}

          {/* Mask indicator */}
          {!isGroup && layer.maskDataUrl && (
            <span className="w-4 h-4 flex items-center justify-center text-[8px] text-slate-400 shrink-0" title="Has mask">◻</span>
          )}

          {/* Lock toggle */}
          {!isGroup && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
              className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-opacity shrink-0"
              title={layer.locked ? 'Unlock layer' : 'Lock layer'}
            >
              {layer.locked ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Children of group */}
        {isGroup && !layer.collapsed && (layer.children || []).map(childId => {
          const child = layers.find(l => l.id === childId);
          if (!child) return null;
          return renderLayerRow(child, depth + 1);
        })}

        {/* Expanded effects panel */}
        {hasEffectsExpanded && !isGroup && (
          <LayerEffectsPanel
            effects={layer.effects || {}}
            onChange={(effects) => onChangeEffects(layer.id, effects)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Layers</span>
        <span className="text-[10px] text-slate-500">{layers.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-0.5 p-1.5">
        {sortedLayers.length === 0 && (
          <div className="text-[11px] text-slate-600 text-center py-6">
            No layers. Add an image to begin.
          </div>
        )}
        {sortedLayers.map(layer => renderLayerRow(layer))}
      </div>

      {/* Layer controls footer */}
      <div className="border-t border-slate-700/50 p-2 space-y-2">
        {activeLayerId && (() => {
          const activeLayer = layers.find(l => l.id === activeLayerId);
          if (!activeLayer) return null;
          return (
            <>
              {/* Opacity */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-12 shrink-0">Opacity</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(activeLayer.opacity * 100)}
                  onChange={(e) => onChangeOpacity(activeLayerId, Number(e.target.value) / 100)}
                  className="flex-1 h-1 accent-primary"
                />
                <span className="text-[10px] text-slate-500 w-8 text-right">
                  {Math.round(activeLayer.opacity * 100)}%
                </span>
              </div>
              {/* Blend mode */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-12 shrink-0">Blend</span>
                <select
                  value={activeLayer.blendMode}
                  onChange={(e) => onChangeBlendMode(activeLayerId, e.target.value as BlendMode)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-300 px-1.5 py-1 outline-none focus:ring-1 focus:ring-primary/50"
                >
                  {Object.entries(BLEND_MODE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </>
          );
        })()}
        {/* Action buttons row 1 */}
        <div className="flex gap-1">
          <button
            onClick={() => { if (activeLayerId) onDuplicate(activeLayerId); }}
            disabled={!activeLayerId}
            className="flex-1 text-[10px] py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Duplicate
          </button>
          <button
            onClick={() => { if (activeLayerId) onRemove(activeLayerId); }}
            disabled={!activeLayerId}
            className="flex-1 text-[10px] py-1 rounded bg-red-900/30 hover:bg-red-900/50 text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Delete
          </button>
        </div>
        {/* Action buttons row 2: groups, effects, mask */}
        <div className="flex gap-1">
          <button
            onClick={onAddGroup}
            className="flex-1 text-[10px] py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
            title="Add group folder"
          >
            📁 Group
          </button>
          <button
            onClick={() => {
              if (activeLayerId) {
                setExpandedEffects(prev => prev === activeLayerId ? null : activeLayerId);
              }
            }}
            disabled={!activeLayerId}
            className={`flex-1 text-[10px] py-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
              expandedEffects === activeLayerId ? 'bg-primary/20 text-primary' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
            }`}
            title="Toggle layer effects"
          >
            ✨ Effects
          </button>
          <button
            onClick={() => {
              if (!activeLayerId) return;
              const layer = layers.find(l => l.id === activeLayerId);
              if (!layer) return;
              if (layer.maskDataUrl) {
                onRemoveMask(activeLayerId);
              } else {
                onAddMask(activeLayerId);
              }
            }}
            disabled={!activeLayerId}
            className="flex-1 text-[10px] py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Toggle layer mask"
          >
            ◻ Mask
          </button>
        </div>
        {/* Paint on mask toggle */}
        {activeLayerId && layers.find(l => l.id === activeLayerId)?.maskDataUrl && (
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePaintOnMask}
              className={`flex-1 text-[10px] py-1 rounded transition-colors ${
                paintOnMask ? 'bg-primary/20 text-primary' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
              }`}
              title="Toggle paint on mask mode"
            >
              {paintOnMask ? '🎨 Painting on Mask' : '🖌 Paint on Mask'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
