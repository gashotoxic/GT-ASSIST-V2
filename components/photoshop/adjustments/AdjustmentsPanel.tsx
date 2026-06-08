import React, { useState, useCallback } from 'react';

interface AdjustmentsPanelProps {
  onAdjust: (type: string, params: Record<string, number>) => void;
}

interface SectionProps { title: string; open: boolean; onToggle: () => void; children: React.ReactNode; }

function Section({ title, open, onToggle, children }: SectionProps) {
  return (
    <div className="border-b border-slate-700/50 last:border-b-0">
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] text-slate-500 uppercase tracking-wider hover:bg-slate-800/30 transition-colors"
      >
        <span>{title}</span>
        <span className={`text-slate-600 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && <div className="px-3 pb-2 space-y-2">{children}</div>}
    </div>
  );
}

function Slider({ label, min, max, step = 1, value, onChange, unit = '' }:
  { label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{label}</span>
        <span className="font-mono text-slate-300">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 accent-primary" />
    </div>
  );
}

export const AdjustmentsPanel: React.FC<AdjustmentsPanelProps> = ({ onAdjust }) => {
  const [open, setOpen] = useState<Record<string, boolean>>({ bc: true, hsl: false, levels: false, blur: false });
  const [v, setV] = useState({ brightness: 0, contrast: 0, hue: 0, saturation: 0, lightness: 0,
    blackPt: 0, whitePt: 255, gamma: 1.0, blur: 0, sharpen: 0 });

  const toggle = useCallback((k: string) => setOpen(p => ({ ...p, [k]: !p[k] })), []);

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      <Section title="Brightness / Contrast" open={open.bc} onToggle={() => toggle('bc')}>
        <div className="flex gap-3">
          <div className="flex-1"><Slider label="Brightness" min={-100} max={100} value={v.brightness} onChange={val => setV(p => ({ ...p, brightness: val }))} /></div>
          <div className="flex-1"><Slider label="Contrast" min={-100} max={100} value={v.contrast} onChange={val => setV(p => ({ ...p, contrast: val }))} /></div>
        </div>
        <button onClick={() => onAdjust('brightnessContrast', { brightness: v.brightness, contrast: v.contrast })}
          className="w-full py-1 text-[10px] rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors">Apply</button>
      </Section>

      <Section title="HSL" open={open.hsl} onToggle={() => toggle('hsl')}>
        <Slider label="Hue" min={-180} max={180} value={v.hue} onChange={val => setV(p => ({ ...p, hue: val }))} unit="°" />
        <Slider label="Saturation" min={-100} max={100} value={v.saturation} onChange={val => setV(p => ({ ...p, saturation: val }))} unit="%" />
        <Slider label="Lightness" min={-100} max={100} value={v.lightness} onChange={val => setV(p => ({ ...p, lightness: val }))} unit="%" />
        <button onClick={() => onAdjust('hsl', { hue: v.hue, saturation: v.saturation, lightness: v.lightness })}
          className="w-full py-1 text-[10px] rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors">Apply</button>
      </Section>

      <Section title="Levels" open={open.levels} onToggle={() => toggle('levels')}>
        <Slider label="Black Point" min={0} max={255} value={v.blackPt} onChange={val => setV(p => ({ ...p, blackPt: val }))} />
        <Slider label="White Point" min={0} max={255} value={v.whitePt} onChange={val => setV(p => ({ ...p, whitePt: val }))} />
        <Slider label="Gamma" min={0.1} max={10} step={0.1} value={v.gamma} onChange={val => setV(p => ({ ...p, gamma: val }))} />
        <button onClick={() => onAdjust('levels', { blackPoint: v.blackPt, whitePoint: v.whitePt, gamma: v.gamma })}
          className="w-full py-1 text-[10px] rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors">Apply</button>
      </Section>

      <Section title="Blur / Sharpen" open={open.blur} onToggle={() => toggle('blur')}>
        <Slider label="Blur Radius" min={0} max={20} value={v.blur} onChange={val => setV(p => ({ ...p, blur: val }))} unit="px" />
        <button onClick={() => onAdjust('blur', { radius: v.blur })}
          className="w-full py-1 text-[10px] rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors mb-2">Apply Blur</button>
        <Slider label="Sharpen" min={0} max={100} value={v.sharpen} onChange={val => setV(p => ({ ...p, sharpen: val }))} unit="%" />
        <button onClick={() => onAdjust('sharpen', { amount: v.sharpen })}
          className="w-full py-1 text-[10px] rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors">Apply Sharpen</button>
      </Section>
    </div>
  );
};
