import React, { useCallback, useEffect, useRef } from 'react';
import { GradientSettings, DEFAULT_GRADIENT_SETTINGS } from '../../../types/photoshop';

interface GradientToolProps {
  settings: GradientSettings;
  color: { hex: string };
  onChange: (settings: GradientSettings) => void;
}

export const GradientTool: React.FC<GradientToolProps> = ({ settings, color, onChange }) => {
  const previewRef = useRef<HTMLCanvasElement>(null);

  const set = useCallback((patch: Partial<GradientSettings>) => {
    onChange({ ...settings, ...patch });
  }, [settings, onChange]);

  // Render gradient preview
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    let gradient: CanvasGradient | null = null;
    switch (settings.type) {
      case 'linear': {
        const rad = (settings.angle * Math.PI) / 180;
        const cx = w / 2, cy = h / 2;
        const len = Math.sqrt(w * w + h * h) / 2;
        gradient = ctx.createLinearGradient(
          cx - Math.cos(rad) * len, cy - Math.sin(rad) * len,
          cx + Math.cos(rad) * len, cy + Math.sin(rad) * len
        );
        break;
      }
      case 'radial':
        gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
        break;
      case 'conic':
        gradient = ctx.createConicGradient((settings.angle * Math.PI) / 180, w / 2, h / 2);
        break;
    }

    if (gradient) {
      const stops = settings.repeat ? [...settings.colorStops, ...settings.colorStops.map(s => ({ ...s, offset: s.offset + 1 }))] : settings.colorStops;
      for (const stop of stops) {
        gradient.addColorStop(stop.offset, stop.color);
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }
  }, [settings]);

  const updateStop = useCallback((index: number) => {
    const stops = [...settings.colorStops];
    stops[index] = { ...stops[index], color: color.hex };
    set({ colorStops: stops });
  }, [settings, color, set]);

  const addStop = useCallback(() => {
    if (settings.colorStops.length >= 4) return;
    const stops = [...settings.colorStops];
    const lastOff = stops[stops.length - 1].offset;
    const prevOff = stops[stops.length - 2]?.offset || 0;
    stops.push({ offset: (lastOff + prevOff) / 2, color: color.hex });
    stops.sort((a, b) => a.offset - b.offset);
    set({ colorStops: stops });
  }, [settings, color, set]);

  const removeStop = useCallback((index: number) => {
    if (settings.colorStops.length <= 2) return;
    set({ colorStops: settings.colorStops.filter((_, i) => i !== index) });
  }, [settings, set]);

  return (
    <div className="p-2 space-y-2">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Gradient</div>
      {/* Type */}
      <div className="flex gap-1">
        {(['linear', 'radial', 'conic'] as const).map(t => (
          <button key={t} onClick={() => set({ type: t })}
            className={`flex-1 text-[10px] px-2 py-1 rounded capitalize ${
              settings.type === t ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            } transition-colors`}
          >{t}</button>
        ))}
      </div>
      {/* Preview */}
      <canvas ref={previewRef} width={200} height={20} className="w-full h-5 rounded border border-slate-700" />
      {/* Color stops */}
      <div>
        <div className="text-[10px] text-slate-500 mb-1">Stops</div>
        <div className="flex items-center gap-1 flex-wrap">
          {settings.colorStops.map((stop, i) => (
            <div key={i} className="flex items-center gap-0.5">
              <div className="w-5 h-5 rounded border border-slate-600" style={{ backgroundColor: stop.color }} />
              <button onClick={() => updateStop(i)} className="text-[9px] text-slate-600 hover:text-slate-400">↻</button>
              <span className="text-[9px] text-slate-600 w-5">{Math.round(stop.offset * 100)}%</span>
              {settings.colorStops.length > 2 && (
                <button onClick={() => removeStop(i)} className="text-[9px] text-red-400 hover:text-red-300">×</button>
              )}
            </div>
          ))}
          {settings.colorStops.length < 4 && (
            <button onClick={addStop} className="w-5 h-5 rounded border border-dashed border-slate-500 text-slate-400 text-[11px] leading-none flex items-center justify-center hover:border-slate-300">+</button>
          )}
        </div>
      </div>
      {/* Angle (linear/conic) */}
      {(settings.type === 'linear' || settings.type === 'conic') && (
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-slate-500">Angle: {settings.angle}°</span>
          <input type="range" min={0} max={360} value={settings.angle}
            onChange={e => set({ angle: Number(e.target.value) })}
            className="flex-1 h-1 accent-primary" />
        </div>
      )}
      {/* Repeat */}
      <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer">
        <input type="checkbox" checked={settings.repeat} onChange={e => set({ repeat: e.target.checked })} className="accent-primary w-3 h-3" />
        Repeat
      </label>
      <p className="text-[9px] text-slate-600">Click and drag on canvas to apply gradient.</p>
    </div>
  );
};
