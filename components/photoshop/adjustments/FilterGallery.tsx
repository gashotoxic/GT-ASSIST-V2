import React, { useState } from 'react';

interface FilterGalleryProps {
  onApplyFilter: (preset: string) => void;
  disabled?: boolean;
}

const FILTERS = [
  { name: 'Normal',    preset: 'normal',    gradient: 'linear-gradient(135deg, #ffffff, #e2e8f0)' },
  { name: 'Grayscale', preset: 'grayscale', gradient: 'linear-gradient(135deg, #94a3b8, #475569)' },
  { name: 'Sepia',     preset: 'sepia',     gradient: 'linear-gradient(135deg, #d6a66d, #8b5e34)' },
  { name: 'Invert',    preset: 'invert',    gradient: 'linear-gradient(135deg, #0f172a, #f8fafc)' },
  { name: 'Vintage',   preset: 'vintage',   gradient: 'linear-gradient(135deg, #f3d5b5, #c9a87b)' },
  { name: 'Cool',      preset: 'cool',      gradient: 'linear-gradient(135deg, #7dd3fc, #1d4ed8)' },
  { name: 'Warm',      preset: 'warm',      gradient: 'linear-gradient(135deg, #fdba74, #dc2626)' },
  { name: 'Dramatic',  preset: 'dramatic',  gradient: 'linear-gradient(135deg, #1e293b, #d946ef)' },
  { name: 'Noir',      preset: 'noir',      gradient: 'linear-gradient(135deg, #0f172a, #334155)' },
];

export const FilterGallery: React.FC<FilterGalleryProps> = ({ onApplyFilter, disabled = false }) => {
  const [selected, setSelected] = useState('normal');

  return (
    <div className="p-2">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Filters</div>
      <div className="grid grid-cols-3 gap-1.5">
        {FILTERS.map(f => {
          const isSelected = selected === f.preset;
          return (
            <button key={f.preset} onClick={() => { if (!disabled) { setSelected(f.preset); onApplyFilter(f.preset); } }}
              disabled={disabled}
              className={`flex flex-col items-center gap-0.5 p-1 rounded-lg border transition-all ${
                disabled ? 'opacity-40 cursor-not-allowed border-slate-700' :
                isSelected ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
              }`}
            >
              <div className="w-full h-[30px] rounded border border-slate-600/50" style={{ background: f.gradient }} />
              <span className="text-[9px] text-slate-300 truncate w-full text-center">{f.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
