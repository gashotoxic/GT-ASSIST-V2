import React, { useEffect, useRef } from 'react';
import { BrushSettings } from '../../../types/photoshop';

interface StrokeSettingsPanelProps {
  settings: BrushSettings;
  onChange: (settings: BrushSettings) => void;
}

export const StrokeSettingsPanel: React.FC<StrokeSettingsPanelProps> = ({ settings, onChange }) => {
  const previewRef = useRef<HTMLCanvasElement>(null);

  const set = (patch: Partial<BrushSettings>) => onChange({ ...settings, ...patch });

  // Render brush preview
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);
    // Brush circle
    const cx = w / 2, cy = h / 2;
    const radius = Math.min(40, settings.size / 2);
    const gradient = ctx.createRadialGradient(cx, cy, radius * (1 - settings.hardness), cx, cy, radius);
    gradient.addColorStop(0, settings.color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }, [settings]);

  return (
    <div className="p-2 space-y-2 border-t border-slate-700/50">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Stroke</div>
      {/* Preview */}
      <canvas ref={previewRef} width={200} height={50} className="w-full h-[30px] rounded border border-slate-700" />
      {/* Size */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-500"><span>Size</span><span>{settings.size}px</span></div>
        <input type="range" min={1} max={200} value={settings.size} onChange={e => set({ size: Number(e.target.value) })}
          className="w-full h-1 accent-primary" />
      </div>
      {/* Hardness */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-500"><span>Hardness</span><span>{Math.round(settings.hardness * 100)}%</span></div>
        <input type="range" min={0} max={100} value={Math.round(settings.hardness * 100)} onChange={e => set({ hardness: Number(e.target.value) / 100 })}
          className="w-full h-1 accent-primary" />
      </div>
      {/* Opacity */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-500"><span>Opacity</span><span>{Math.round(settings.opacity * 100)}%</span></div>
        <input type="range" min={0} max={100} value={Math.round(settings.opacity * 100)} onChange={e => set({ opacity: Number(e.target.value) / 100 })}
          className="w-full h-1 accent-primary" />
      </div>
      {/* Flow */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-500"><span>Flow</span><span>{Math.round(settings.flow * 100)}%</span></div>
        <input type="range" min={0} max={100} value={Math.round(settings.flow * 100)} onChange={e => set({ flow: Number(e.target.value) / 100 })}
          className="w-full h-1 accent-primary" />
      </div>
      {/* Blend mode */}
      <div>
        <div className="text-[10px] text-slate-500 mb-1">Mode</div>
        <select value={settings.mode} onChange={e => set({ mode: e.target.value as BrushSettings['mode'] })}
          className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[10px] text-slate-200 outline-none">
          <option value="normal">Normal</option>
          <option value="multiply">Multiply</option>
          <option value="screen">Screen</option>
          <option value="overlay">Overlay</option>
        </select>
      </div>
      {/* Size Jitter */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-500"><span>Size Jitter</span><span>{Math.round(settings.sizeJitter * 100)}%</span></div>
        <input type="range" min={0} max={100} value={Math.round(settings.sizeJitter * 100)} onChange={e => set({ sizeJitter: Number(e.target.value) / 100 })}
          className="w-full h-1 accent-primary" />
      </div>
      {/* Opacity Jitter */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-500"><span>Opacity Jitter</span><span>{Math.round(settings.opacityJitter * 100)}%</span></div>
        <input type="range" min={0} max={100} value={Math.round(settings.opacityJitter * 100)} onChange={e => set({ opacityJitter: Number(e.target.value) / 100 })}
          className="w-full h-1 accent-primary" />
      </div>
    </div>
  );
};
