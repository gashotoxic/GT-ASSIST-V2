import React, { useCallback } from 'react';
import { ShapeSettings, DEFAULT_SHAPE_SETTINGS } from '../../../types/photoshop';

interface ShapeToolProps {
  settings: ShapeSettings;
  color: { hex: string };
  onChange: (settings: ShapeSettings) => void;
}

const SHAPES: { id: ShapeSettings['type']; label: string }[] = [
  { id: 'rectangle', label: 'Rect' },
  { id: 'ellipse', label: 'Oval' },
  { id: 'line', label: 'Line' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'polygon', label: 'Poly' },
  { id: 'star', label: 'Star' },
];

export const ShapeTool: React.FC<ShapeToolProps> = ({ settings, color, onChange }) => {
  const set = useCallback((patch: Partial<ShapeSettings>) => {
    onChange({ ...settings, ...patch });
  }, [settings, onChange]);

  return (
    <div className="p-2 space-y-2">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Shape</div>
      {/* Type picker */}
      <div className="flex flex-wrap gap-1">
        {SHAPES.map(s => (
          <button key={s.id} onClick={() => set({ type: s.id })}
            className={`text-[10px] px-2 py-1 rounded ${
              settings.type === s.id ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            } transition-colors`}
          >{s.label}</button>
        ))}
      </div>
      {/* Sides (polygon/star) */}
      {(settings.type === 'polygon' || settings.type === 'star') && (
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-slate-500">Sides: {settings.sides}</span>
          <input type="range" min={3} max={12} value={settings.sides}
            onChange={e => set({ sides: Number(e.target.value) })}
            className="flex-1 h-1 accent-primary" />
        </div>
      )}
      {/* Star inner ratio */}
      {settings.type === 'star' && (
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-slate-500">Ratio: {settings.starRatio.toFixed(2)}</span>
          <input type="range" min={0.1} max={0.9} step={0.05} value={settings.starRatio}
            onChange={e => set({ starRatio: Number(e.target.value) })}
            className="flex-1 h-1 accent-primary" />
        </div>
      )}
      {/* Fill */}
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={settings.fill} onChange={e => set({ fill: e.target.checked })} className="accent-primary w-3 h-3" />
        <span className="text-[11px] text-slate-400">Fill</span>
        <span className="w-4 h-4 rounded border border-slate-600 ml-auto" style={{ backgroundColor: settings.fillColor }} />
        <button onClick={() => set({ fillColor: color.hex })} className="text-[9px] text-slate-600 hover:text-slate-400">↻</button>
      </div>
      {/* Stroke */}
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={settings.stroke} onChange={e => set({ stroke: e.target.checked })} className="accent-primary w-3 h-3" />
        <span className="text-[11px] text-slate-400">Stroke</span>
        <span className="w-4 h-4 rounded border border-slate-600 ml-auto" style={{ backgroundColor: settings.strokeColor }} />
        <button onClick={() => set({ strokeColor: color.hex })} className="text-[9px] text-slate-600 hover:text-slate-400">↻</button>
      </div>
      {settings.stroke && (
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-slate-500">Width: {settings.strokeWidth}px</span>
          <input type="range" min={1} max={20} value={settings.strokeWidth}
            onChange={e => set({ strokeWidth: Number(e.target.value) })}
            className="flex-1 h-1 accent-primary" />
        </div>
      )}
      <p className="text-[9px] text-slate-600 pt-1">Click and drag on canvas. Hold Shift for aspect.</p>
    </div>
  );
};
