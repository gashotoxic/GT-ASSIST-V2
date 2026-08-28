import React from 'react';
import { RetouchSettings, RetouchMode } from '../../../types/photoshop';

interface RetouchToolProps {
  settings: RetouchSettings;
  onChange: (settings: RetouchSettings) => void;
}

const modes: { id: RetouchMode; label: string; desc: string }[] = [
  { id: 'blur', label: 'Blur', desc: 'Smooth out details' },
  { id: 'sharpen', label: 'Sharpen', desc: 'Enhance edges' },
  { id: 'smudge', label: 'Smudge', desc: 'Push pixels forward' },
];

export const RetouchTool: React.FC<RetouchToolProps> = ({ settings, onChange }) => {
  return (
    <div className="p-2 space-y-2">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Retouch</div>

      {/* Mode picker */}
      <div className="flex gap-1">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => onChange({ ...settings, mode: m.id })}
            className={`flex-1 text-[10px] px-1 py-1.5 rounded transition-colors ${
              settings.mode === m.id
                ? 'bg-primary/20 text-primary'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={m.desc}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Strength slider */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>Strength</span>
          <span>{settings.strength}%</span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          value={settings.strength}
          onChange={e => onChange({ ...settings, strength: Number(e.target.value) })}
          className="w-full h-1 accent-primary"
        />
      </div>

      {/* Info */}
      <p className="text-[9px] text-slate-600">
        {settings.mode === 'blur' && 'Smooths pixels under the brush. Uses box blur kernel.'}
        {settings.mode === 'sharpen' && 'Enhances edges using unsharp mask kernel.'}
        {settings.mode === 'smudge' && 'Pushes pixels along the drag direction with opacity falloff.'}
      </p>
    </div>
  );
};
