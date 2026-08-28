import React, { useCallback } from 'react';
import { SelectionState } from '../../../types/photoshop';

type SelectionMode = 'none' | 'rectangle' | 'ellipse' | 'lasso';

interface SelectToolProps {
  selectionType: SelectionMode;
  onSelectionTypeChange: (type: SelectionMode) => void;
  selection: SelectionState;
  onDeselect: () => void;
}

export const SelectTool: React.FC<SelectToolProps> = ({
  selectionType,
  onSelectionTypeChange,
  selection,
  onDeselect,
}) => {
  const hasSelection = selection.rect && selection.type !== 'none';

  const handleModeChange = useCallback((m: SelectionMode) => {
    onSelectionTypeChange(m);
  }, [onSelectionTypeChange]);

  return (
    <div className="p-2 space-y-2">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Selection</div>
      <div className="flex gap-1">
        {(['rectangle', 'ellipse', 'lasso'] as const).map(m => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`flex-1 text-[10px] px-2 py-1.5 rounded capitalize ${
              selectionType === m
                ? 'bg-primary/20 text-primary'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            } transition-colors`}
          >
            {m === 'rectangle' ? '◻ Rect' : m === 'ellipse' ? '◯ Ellipse' : '✎ Lasso'}
          </button>
        ))}
      </div>
      {hasSelection && selection.rect && (
        <div className="space-y-1">
          <div className="text-[9px] text-slate-400">
            {Math.round(selection.rect.width)} × {Math.round(selection.rect.height)} px
          </div>
          <button
            onClick={onDeselect}
            className="w-full text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Deselect (Ctrl+D)
          </button>
        </div>
      )}
      <p className="text-[9px] text-slate-600">Click and drag on canvas to create selection. Use Ctrl+D to deselect.</p>
    </div>
  );
};
