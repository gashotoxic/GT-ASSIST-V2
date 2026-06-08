import React, { useCallback, useEffect, useState } from 'react';

interface ResizeDialogProps {
  width: number;
  height: number;
  onConfirm: (w: number, h: number, label: string) => void;
  onClose: () => void;
}

const PRESETS = [
  { label: 'Custom', w: 0, h: 0 },
  { label: 'OG Card (1200×630)', w: 1200, h: 630 },
  { label: 'Instagram Post (1080×1080)', w: 1080, h: 1080 },
  { label: 'Twitter Card (1200×675)', w: 1200, h: 675 },
  { label: 'Blog Inline (800×600)', w: 800, h: 600 },
  { label: 'Full HD (1920×1080)', w: 1920, h: 1080 },
  { label: 'Square (1024×1024)', w: 1024, h: 1024 },
  { label: 'Story (1080×1920)', w: 1080, h: 1920 },
];

export const ResizeDialog: React.FC<ResizeDialogProps> = ({ width, height, onConfirm, onClose }) => {
  const [w, setW] = useState(width);
  const [h, setH] = useState(height);
  const [lockAspect, setLockAspect] = useState(true);
  const aspectRatio = width / height;

  const handleWidthChange = useCallback((val: number) => {
    setW(val);
    if (lockAspect) setH(Math.round(val / aspectRatio));
  }, [lockAspect, aspectRatio]);

  const handleHeightChange = useCallback((val: number) => {
    setH(val);
    if (lockAspect) setW(Math.round(val * aspectRatio));
  }, [lockAspect, aspectRatio]);

  const handlePreset = useCallback((preset: typeof PRESETS[number]) => {
    if (preset.w === 0) return;
    setW(preset.w);
    setH(preset.h);
    setLockAspect(true);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') onConfirm(w, h, `${w}×${h}`);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onConfirm, w, h]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Resize Canvas</h3>

        {/* Presets */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => handlePreset(p)}
              className={`text-[10px] px-2 py-1 rounded ${
                p.w === w && p.h === h
                  ? 'bg-primary/20 text-primary'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              } transition-colors`}
            >
              {p.label.split('(')[0].trim()}
            </button>
          ))}
        </div>

        {/* Width / Height */}
        <div className="flex gap-3 mb-3">
          <label className="flex-1 flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 uppercase">Width</span>
            <input
              type="number" min={1} max={10000}
              value={w}
              onChange={e => handleWidthChange(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-primary/50"
            />
          </label>
          <label className="flex-1 flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 uppercase">Height</span>
            <input
              type="number" min={1} max={10000}
              value={h}
              onChange={e => handleHeightChange(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-primary/50"
            />
          </label>
        </div>

        {/* Aspect lock */}
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={lockAspect}
            onChange={e => setLockAspect(e.target.checked)}
            className="accent-primary"
          />
          <span className="text-[11px] text-slate-400">Lock aspect ratio</span>
        </label>

        {/* Info */}
        <p className="text-[10px] text-slate-600 mb-3">{w} × {h} px ({Math.round(w * h / 1000000 * 10) / 10} MP)</p>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-1.5 text-[11px] rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
          <button onClick={() => onConfirm(w, h, `${w}×${h}`)} className="flex-1 py-1.5 text-[11px] rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors">Apply</button>
        </div>
      </div>
    </div>
  );
};
