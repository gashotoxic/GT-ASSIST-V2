import React, { useCallback, useState } from 'react';

type SelectionMode = 'rectangle' | 'ellipse' | 'lasso';

interface SelectToolProps {
  onSelect: (type: SelectionMode) => void;
}

export const SelectTool: React.FC<SelectToolProps> = ({ onSelect }) => {
  const [mode, setMode] = useState<SelectionMode>('rectangle');

  const handleModeChange = useCallback((m: SelectionMode) => {
    setMode(m);
    onSelect(m);
  }, [onSelect]);

  return (
    <div className="p-2 space-y-2">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Selection</div>
      <div className="flex gap-1">
        {(['rectangle', 'ellipse', 'lasso'] as const).map(m => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`flex-1 text-[10px] px-2 py-1.5 rounded capitalize ${
              mode === m
                ? 'bg-primary/20 text-primary'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            } transition-colors`}
          >
            {m === 'rectangle' ? '◻ Rect' : m === 'ellipse' ? '◯ Ellipse' : '✎ Lasso'}
          </button>
        ))}
      </div>
      <p className="text-[9px] text-slate-600">Click and drag on canvas to create selection. Use Ctrl+D to deselect.</p>
    </div>
  );
};
