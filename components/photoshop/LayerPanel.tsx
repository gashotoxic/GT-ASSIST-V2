import React from 'react';
import { PhotoshopLayer, BLEND_MODE_LABELS, BlendMode } from '../../types/photoshop';

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
}) => {
  const sortedLayers = [...layers].reverse(); // Top layer first

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIdx = Number(e.dataTransfer.getData('text/plain'));
    if (fromIdx !== toIndex) onReorder(fromIdx, toIndex);
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
        {sortedLayers.map((layer, revIdx) => {
          const actualIdx = layers.length - 1 - revIdx;
          const isActive = layer.id === activeLayerId;
          return (
            <div
              key={layer.id}
              draggable
              onDragStart={(e) => handleDragStart(e, actualIdx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, actualIdx)}
              onClick={() => onSelectLayer(layer.id)}
              className={`
                group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors
                ${isActive
                  ? 'bg-primary/15 ring-1 ring-primary/30'
                  : 'hover:bg-slate-800/40'
                }
                ${layer.locked ? 'opacity-50' : ''}
              `}
            >
              {/* Visibility toggle */}
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

              {/* Layer thumbnail */}
              <div className="w-8 h-8 rounded border border-slate-700/50 overflow-hidden bg-slate-900 shrink-0 flex items-center justify-center">
                {layer.dataUrl ? (
                  <img src={layer.dataUrl} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-[8px] text-slate-600 uppercase">{layer.type[0]}</span>
                )}
              </div>

              {/* Layer name + type */}
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-slate-300 truncate">{layer.name}</div>
                <div className="text-[10px] text-slate-500">{layer.type} &middot; {Math.round(layer.opacity * 100)}%</div>
              </div>

              {/* Lock toggle */}
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
            </div>
          );
        })}
      </div>

      {/* Layer controls footer */}
      <div className="border-t border-slate-700/50 p-2 space-y-2">
        {activeLayerId && (
          <>
            {/* Opacity */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-12 shrink-0">Opacity</span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round((layers.find(l => l.id === activeLayerId)?.opacity ?? 1) * 100)}
                onChange={(e) => onChangeOpacity(activeLayerId, Number(e.target.value) / 100)}
                className="flex-1 h-1 accent-primary"
              />
              <span className="text-[10px] text-slate-500 w-8 text-right">
                {Math.round((layers.find(l => l.id === activeLayerId)?.opacity ?? 1) * 100)}%
              </span>
            </div>
            {/* Blend mode */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-12 shrink-0">Blend</span>
              <select
                value={layers.find(l => l.id === activeLayerId)?.blendMode || 'normal'}
                onChange={(e) => onChangeBlendMode(activeLayerId, e.target.value as BlendMode)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-300 px-1.5 py-1 outline-none focus:ring-1 focus:ring-primary/50"
              >
                {Object.entries(BLEND_MODE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </>
        )}
        {/* Action buttons */}
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
      </div>
    </div>
  );
};
