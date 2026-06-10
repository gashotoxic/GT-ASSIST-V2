import React from 'react';
import { BrushSettings } from '../../../types/photoshop';

interface BrushToolProps {
  brushSettings: BrushSettings;
  activeMode: 'brush' | 'eraser' | 'fill';
  onModeChange: (mode: 'brush' | 'eraser' | 'fill') => void;
  onFillLayer: () => void;
}

const modes: { id: 'brush' | 'eraser' | 'fill'; label: string }[] = [
  { id: 'brush', label: 'Brush' },
  { id: 'eraser', label: 'Eraser' },
  { id: 'fill', label: 'Fill' },
];

export const BrushTool: React.FC<BrushToolProps> = ({ brushSettings, activeMode, onModeChange, onFillLayer }) => {
  return (
    <div className="p-2 space-y-2">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Paint</div>
      <div className="flex gap-1">
        {modes.map(m => (
          <button key={m.id} onClick={() => onModeChange(m.id)}
            className={`flex-1 text-[10px] px-2 py-1 rounded ${
              activeMode === m.id ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            } transition-colors`}
          >{m.label}</button>
        ))}
      </div>
      {activeMode === 'fill' ? (
        <button onClick={onFillLayer}
          className="w-full text-[10px] py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
        >Fill Layer</button>
      ) : (
        <p className="text-[9px] text-slate-600">Click and drag on canvas to paint. Size: {brushSettings.size}px · Opacity: {Math.round(brushSettings.opacity * 100)}%</p>
      )}
    </div>
  );
};
