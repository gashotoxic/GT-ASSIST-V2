import React, { useCallback } from 'react';
import { TransformState } from '../../../types/photoshop';

interface TransformToolProps {
  transform: TransformState;
  onChange: (state: TransformState) => void;
  onApply: () => void;
  onCancel: () => void;
  onFlipH: () => void;
  onFlipV: () => void;
  onRotateCW: () => void;
  onRotateCCW: () => void;
}

export const TransformTool: React.FC<TransformToolProps> = ({
  transform,
  onChange,
  onApply,
  onCancel,
  onFlipH,
  onFlipV,
  onRotateCW,
  onRotateCCW,
}) => {
  const set = useCallback((patch: Partial<TransformState>) => {
    onChange({ ...transform, ...patch });
  }, [transform, onChange]);

  return (
    <div className="p-2 space-y-2">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Transform</div>

      {/* Mode toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => set({ mode: 'free', perspective: null })}
          className={`flex-1 text-[10px] px-2 py-1 rounded ${
            transform.mode === 'free'
              ? 'bg-primary/20 text-primary'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          } transition-colors`}
        >
          Free
        </button>
        <button
          onClick={() => {
            const w = transform.width;
            const h = transform.height;
            set({
              mode: 'perspective',
              perspective: {
                tl: { x: transform.x, y: transform.y },
                tr: { x: transform.x + w, y: transform.y },
                br: { x: transform.x + w, y: transform.y + h },
                bl: { x: transform.x, y: transform.y + h },
              },
            });
          }}
          className={`flex-1 text-[10px] px-2 py-1 rounded ${
            transform.mode === 'perspective'
              ? 'bg-primary/20 text-primary'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          } transition-colors`}
        >
          Perspective
        </button>
      </div>

      {/* Numeric inputs */}
      <div className="grid grid-cols-2 gap-1.5">
        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] text-slate-600 uppercase">X</span>
          <input
            type="number"
            value={Math.round(transform.x)}
            onChange={e => set({ x: Number(e.target.value) })}
            className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-200 outline-none focus:border-primary/50"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] text-slate-600 uppercase">Y</span>
          <input
            type="number"
            value={Math.round(transform.y)}
            onChange={e => set({ y: Number(e.target.value) })}
            className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-200 outline-none focus:border-primary/50"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] text-slate-600 uppercase">W</span>
          <input
            type="number"
            value={Math.round(transform.width)}
            onChange={e => set({ width: Math.max(1, Number(e.target.value)) })}
            className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-200 outline-none focus:border-primary/50"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] text-slate-600 uppercase">H</span>
          <input
            type="number"
            value={Math.round(transform.height)}
            onChange={e => set({ height: Math.max(1, Number(e.target.value)) })}
            className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-200 outline-none focus:border-primary/50"
          />
        </label>
      </div>

      {/* Rotation */}
      <div className="flex gap-2 items-center">
        <span className="text-[10px] text-slate-500 w-12">Rotate</span>
        <input
          type="number"
          value={Math.round(transform.rotation)}
          onChange={e => set({ rotation: Number(e.target.value) })}
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-200 outline-none focus:border-primary/50"
        />
        <span className="text-[10px] text-slate-600">°</span>
      </div>

      {/* Scale */}
      <div className="flex gap-2 items-center">
        <span className="text-[10px] text-slate-500 w-12">Scale</span>
        <input
          type="number"
          step="0.1"
          value={transform.scaleX.toFixed(2)}
          onChange={e => set({ scaleX: Number(e.target.value) })}
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-200 outline-none focus:border-primary/50"
        />
        <span className="text-[10px] text-slate-600">×</span>
        <input
          type="number"
          step="0.1"
          value={transform.scaleY.toFixed(2)}
          onChange={e => set({ scaleY: Number(e.target.value) })}
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-200 outline-none focus:border-primary/50"
        />
      </div>

      {/* Skew */}
      <div className="flex gap-2 items-center">
        <span className="text-[10px] text-slate-500 w-12">Skew</span>
        <input
          type="number"
          value={Math.round(transform.skewX)}
          onChange={e => set({ skewX: Number(e.target.value) })}
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-200 outline-none focus:border-primary/50"
        />
        <span className="text-[10px] text-slate-600">°</span>
      </div>

      {/* Flip and Rotate buttons */}
      <div className="flex gap-1">
        <button
          onClick={onFlipH}
          className="flex-1 py-1.5 text-[10px] rounded bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          title="Flip Horizontal"
        >
          ⟷ Flip H
        </button>
        <button
          onClick={onFlipV}
          className="flex-1 py-1.5 text-[10px] rounded bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          title="Flip Vertical"
        >
          ⟶ Flip V
        </button>
      </div>

      <div className="flex gap-1">
        <button
          onClick={onRotateCCW}
          className="flex-1 py-1.5 text-[10px] rounded bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          title="Rotate 90° Counter-clockwise"
        >
          ↺ 90° CCW
        </button>
        <button
          onClick={onRotateCW}
          className="flex-1 py-1.5 text-[10px] rounded bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          title="Rotate 90° Clockwise"
        >
          90° CW ↻
        </button>
      </div>

      {/* Apply / Cancel */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 text-[10px] rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancel (Esc)
        </button>
        <button
          onClick={onApply}
          className="flex-1 py-1.5 text-[10px] rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors font-medium"
        >
          Apply (Enter)
        </button>
      </div>

      <p className="text-[9px] text-slate-600 pt-1">
        Drag handles on canvas. Double-click to apply. Esc to cancel.
      </p>
    </div>
  );
};
