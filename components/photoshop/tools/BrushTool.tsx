import React, { useState, useEffect } from 'react';
import { BrushSettings, BrushPreset, BUILTIN_PRESETS, loadCustomPresets, saveCustomPresets } from '../../../types/photoshop';

interface BrushToolProps {
  brushSettings: BrushSettings;
  activeMode: 'brush' | 'eraser' | 'fill';
  onModeChange: (mode: 'brush' | 'eraser' | 'fill') => void;
  onFillLayer: () => void;
  onPresetSelect?: (settings: Omit<BrushSettings, 'color'>) => void;
}

const modes: { id: 'brush' | 'eraser' | 'fill'; label: string }[] = [
  { id: 'brush', label: 'Brush' },
  { id: 'eraser', label: 'Eraser' },
  { id: 'fill', label: 'Fill' },
];

export const BrushTool: React.FC<BrushToolProps> = ({ brushSettings, activeMode, onModeChange, onFillLayer, onPresetSelect }) => {
  const [customPresets, setCustomPresets] = useState<BrushPreset[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  useEffect(() => {
    setCustomPresets(loadCustomPresets());
  }, []);

  const allPresets = [...BUILTIN_PRESETS, ...customPresets];

  const handlePresetClick = (preset: BrushPreset) => {
    onPresetSelect?.(preset.settings);
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    const preset: BrushPreset = {
      id: 'custom-' + Date.now(),
      name: newPresetName.trim(),
      isBuiltin: false,
      settings: {
        size: brushSettings.size,
        hardness: brushSettings.hardness,
        opacity: brushSettings.opacity,
        flow: brushSettings.flow,
        spacing: brushSettings.spacing,
        preset: brushSettings.preset,
        mode: brushSettings.mode,
        sizeJitter: brushSettings.sizeJitter,
        opacityJitter: brushSettings.opacityJitter,
      },
    };
    const updated = [...customPresets, preset];
    setCustomPresets(updated);
    saveCustomPresets(updated);
    setNewPresetName('');
    setShowSaveInput(false);
  };

  const handleDeletePreset = (id: string) => {
    const updated = customPresets.filter(p => p.id !== id);
    setCustomPresets(updated);
    saveCustomPresets(updated);
  };

  return (
    <div className="p-2 space-y-2">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Paint</div>
      <div className="flex gap-1">
        {modes.map(m => (
          <button key={m.id} onClick={() => onModeChange(m.id)}
            className={`flex-1 text-[10px] px-2 py-1 rounded ${
              activeMode === m.id ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            } transition-colors`}
          >{m.label}</button>
        ))}
      </div>

      {/* Brush Presets Toggle */}
      <button
        onClick={() => setShowPresets(!showPresets)}
        className="w-full text-[10px] py-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
      >
        {showPresets ? 'Hide Presets' : 'Brush Presets'}
      </button>

      {/* Preset Grid */}
      {showPresets && (
        <div className="space-y-1.5">
          <div className="grid grid-cols-3 gap-1">
            {allPresets.map(preset => (
              <div key={preset.id} className="relative group">
                <button
                  onClick={() => handlePresetClick(preset)}
                  className={`w-full text-[9px] px-1 py-1.5 rounded border transition-colors ${
                    brushSettings.size === preset.settings.size &&
                    brushSettings.hardness === preset.settings.hardness &&
                    brushSettings.preset === preset.settings.preset
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                  }`}
                  title={preset.name}
                >
                  {preset.name.length > 8 ? preset.name.slice(0, 8) + '.' : preset.name}
                </button>
                {!preset.isBuiltin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-600 text-white text-[7px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >x</button>
                )}
              </div>
            ))}
          </div>

          {/* Save current as preset */}
          {showSaveInput ? (
            <div className="flex gap-1">
              <input
                type="text"
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                placeholder="Preset name..."
                className="flex-1 text-[10px] px-1.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 outline-none"
                onKeyDown={e => { if (e.key === 'Enter') handleSavePreset(); if (e.key === 'Escape') setShowSaveInput(false); }}
                autoFocus
              />
              <button onClick={handleSavePreset} className="text-[10px] px-1.5 py-1 rounded bg-primary/20 text-primary">Save</button>
              <button onClick={() => setShowSaveInput(false)} className="text-[10px] px-1.5 py-1 rounded bg-slate-800 text-slate-400">X</button>
            </div>
          ) : (
            <button
              onClick={() => setShowSaveInput(true)}
              className="w-full text-[9px] py-1 rounded border border-dashed border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors"
            >
              + Save Current as Preset
            </button>
          )}
        </div>
      )}

      {activeMode === 'fill' ? (
        <button onClick={onFillLayer}
          className="w-full text-[10px] py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
        >Fill Layer</button>
      ) : (
        <p className="text-[9px] text-slate-600">Click and drag on canvas to paint. Size: {brushSettings.size}px · Opacity: {Math.round(brushSettings.opacity * 100)}%</p>
      )}
    </div>
  );
};
