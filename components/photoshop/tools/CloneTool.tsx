import React from 'react';
import { CloneSettings } from '../../../types/photoshop';

interface CloneToolProps {
  settings: CloneSettings;
  onChange: (settings: CloneSettings) => void;
}

export const CloneTool: React.FC<CloneToolProps> = ({ settings, onChange }) => {
  return (
    <div className="p-2 space-y-2">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Clone / Heal</div>

      {/* Mode toggle */}
      <div className="flex gap-1">
        {(['clone', 'heal'] as const).map(m => (
          <button
            key={m}
            onClick={() => onChange({ ...settings, mode: m })}
            className={`flex-1 text-[10px] px-2 py-1 rounded transition-colors ${
              settings.mode === m
                ? 'bg-primary/20 text-primary'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {m === 'clone' ? 'Clone' : 'Heal'}
          </button>
        ))}
      </div>

      {/* Source point indicator */}
      <div className="text-[9px] text-slate-500 space-y-1">
        {settings.sourceX !== null && settings.sourceY !== null ? (
          <p>
            Source: ({Math.round(settings.sourceX)}, {Math.round(settings.sourceY)})
          </p>
        ) : (
          <p className="text-yellow-500/70">Hold Alt + click to set source point</p>
        )}
      </div>

      {/* Instructions */}
      <div className="text-[9px] text-slate-600 space-y-0.5">
        <p>1. Hold Alt + click to set sample source</p>
        <p>2. Click and drag to paint</p>
        <p>{settings.mode === 'clone' ? 'Clone: copies source pixels directly' : 'Heal: blends source with destination'}</p>
      </div>
    </div>
  );
};
