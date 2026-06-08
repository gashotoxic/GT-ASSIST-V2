import React, { useCallback, useState } from 'react';

interface CropToolProps {
  canvasWidth: number;
  canvasHeight: number;
  onApplyCrop: (x: number, y: number, w: number, h: number) => void;
  onCancel: () => void;
}

const ASPECT_PRESETS = [
  { label: 'Freeform', ratio: 0 },
  { label: '1:1', ratio: 1 },
  { label: '16:9', ratio: 16 / 9 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '3:2', ratio: 3 / 2 },
  { label: '9:16', ratio: 9 / 16 },
  { label: '1200:630', ratio: 1200 / 630 },
] as const;

export const CropTool: React.FC<CropToolProps> = ({ canvasWidth, canvasHeight, onApplyCrop, onCancel }) => {
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [cropLeft, setCropLeft] = useState(0);
  const [cropTop, setCropTop] = useState(0);
  const [cropWidth, setCropWidth] = useState(canvasWidth);
  const [cropHeight, setCropHeight] = useState(canvasHeight);

  // When preset changes, recalculate crop dimensions from center
  const handleSelectPreset = useCallback((ratio: number) => {
    setSelectedPreset(ratio);
    if (ratio === 0) {
      // Freeform — reset to full canvas
      setCropLeft(0);
      setCropTop(0);
      setCropWidth(canvasWidth);
      setCropHeight(canvasHeight);
    } else {
      // Fit the ratio within canvas bounds, centered
      let w: number, h: number;
      if (ratio >= 1) {
        w = Math.min(canvasWidth, canvasHeight * ratio);
        h = w / ratio;
      } else {
        h = Math.min(canvasHeight, canvasWidth / ratio);
        w = h * ratio;
      }
      const x = Math.round((canvasWidth - w) / 2);
      const y = Math.round((canvasHeight - h) / 2);
      setCropLeft(x);
      setCropTop(y);
      setCropWidth(Math.round(w));
      setCropHeight(Math.round(h));
    }
  }, [canvasWidth, canvasHeight]);

  const handleApply = useCallback(() => {
    if (cropWidth <= 0 || cropHeight <= 0) return;
    onApplyCrop(cropLeft, cropTop, cropWidth, cropHeight);
  }, [cropLeft, cropTop, cropWidth, cropHeight, onApplyCrop]);

  return (
    <div className="p-2 space-y-2">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Crop</div>

      {/* Aspect ratio presets */}
      <div className="flex flex-wrap gap-1">
        {ASPECT_PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => handleSelectPreset(p.ratio)}
            className={`text-[10px] px-2 py-1 rounded ${
              selectedPreset === p.ratio
                ? 'bg-primary/20 text-primary'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            } transition-colors`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Crop dimensions */}
      <div className="flex gap-2">
        <label className="flex-1 flex flex-col gap-0.5">
          <span className="text-[9px] text-slate-600 uppercase">Left</span>
          <input type="number" value={cropLeft} onChange={e => setCropLeft(Math.max(0, Number(e.target.value)))}
            className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-200 outline-none" />
        </label>
        <label className="flex-1 flex flex-col gap-0.5">
          <span className="text-[9px] text-slate-600 uppercase">Top</span>
          <input type="number" value={cropTop} onChange={e => setCropTop(Math.max(0, Number(e.target.value)))}
            className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-200 outline-none" />
        </label>
        <label className="flex-1 flex flex-col gap-0.5">
          <span className="text-[9px] text-slate-600 uppercase">Width</span>
          <input type="number" value={cropWidth} onChange={e => setCropWidth(Math.max(1, Number(e.target.value)))}
            className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-200 outline-none" />
        </label>
        <label className="flex-1 flex flex-col gap-0.5">
          <span className="text-[9px] text-slate-600 uppercase">Height</span>
          <input type="number" value={cropHeight} onChange={e => setCropHeight(Math.max(1, Number(e.target.value)))}
            className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-200 outline-none" />
        </label>
      </div>

      {/* Crop overlay indicator */}
      <div className="text-[10px] text-slate-600">
        {cropWidth} × {cropHeight} px ({cropLeft}, {cropTop})
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-1 text-[10px] rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
          Reset
        </button>
        <button onClick={handleApply} className="flex-1 py-1 text-[10px] rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
          Apply Crop
        </button>
      </div>
    </div>
  );
};
