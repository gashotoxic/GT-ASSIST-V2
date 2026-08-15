import React from 'react';
import { LayerEffects, DEFAULT_LAYER_EFFECTS } from '../../types/photoshop';

interface LayerEffectsPanelProps {
  effects: LayerEffects;
  onChange: (effects: LayerEffects) => void;
}

export const LayerEffectsPanel: React.FC<LayerEffectsPanelProps> = ({ effects, onChange }) => {
  const update = (patch: Partial<LayerEffects>) => {
    onChange({ ...effects, ...patch });
  };

  const ds = effects.dropShadow || DEFAULT_LAYER_EFFECTS.dropShadow!;
  const st = effects.stroke || DEFAULT_LAYER_EFFECTS.stroke!;
  const og = effects.outerGlow || DEFAULT_LAYER_EFFECTS.outerGlow!;

  return (
    <div className="space-y-2 px-3 py-2 border-b border-slate-700/50">
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Layer Effects</div>

      {/* Drop Shadow */}
      <div className="space-y-1">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={ds.enabled}
            onChange={(e) => update({ dropShadow: { ...ds, enabled: e.target.checked } })}
            className="w-3 h-3 accent-primary"
          />
          <span className="text-[11px] text-slate-300">Drop Shadow</span>
        </label>
        {ds.enabled && (
          <div className="ml-4 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-10">X</span>
              <input
                type="range" min="-50" max="50" value={ds.offsetX}
                onChange={(e) => update({ dropShadow: { ...ds, offsetX: Number(e.target.value) } })}
                className="flex-1 h-1 accent-primary"
              />
              <span className="text-[10px] text-slate-500 w-6 text-right">{ds.offsetX}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-10">Y</span>
              <input
                type="range" min="-50" max="50" value={ds.offsetY}
                onChange={(e) => update({ dropShadow: { ...ds, offsetY: Number(e.target.value) } })}
                className="flex-1 h-1 accent-primary"
              />
              <span className="text-[10px] text-slate-500 w-6 text-right">{ds.offsetY}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-10">Blur</span>
              <input
                type="range" min="0" max="100" value={ds.blur}
                onChange={(e) => update({ dropShadow: { ...ds, blur: Number(e.target.value) } })}
                className="flex-1 h-1 accent-primary"
              />
              <span className="text-[10px] text-slate-500 w-6 text-right">{ds.blur}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-10">Opacity</span>
              <input
                type="range" min="0" max="100" value={Math.round(ds.opacity * 100)}
                onChange={(e) => update({ dropShadow: { ...ds, opacity: Number(e.target.value) / 100 } })}
                className="flex-1 h-1 accent-primary"
              />
              <span className="text-[10px] text-slate-500 w-6 text-right">{Math.round(ds.opacity * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-10">Color</span>
              <input
                type="color" value={ds.color}
                onChange={(e) => update({ dropShadow: { ...ds, color: e.target.value } })}
                className="w-6 h-5 rounded border border-slate-700 bg-transparent cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Stroke */}
      <div className="space-y-1">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={st.enabled}
            onChange={(e) => update({ stroke: { ...st, enabled: e.target.checked } })}
            className="w-3 h-3 accent-primary"
          />
          <span className="text-[11px] text-slate-300">Stroke</span>
        </label>
        {st.enabled && (
          <div className="ml-4 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-10">Size</span>
              <input
                type="range" min="1" max="20" value={st.size}
                onChange={(e) => update({ stroke: { ...st, size: Number(e.target.value) } })}
                className="flex-1 h-1 accent-primary"
              />
              <span className="text-[10px] text-slate-500 w-6 text-right">{st.size}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-10">Color</span>
              <input
                type="color" value={st.color}
                onChange={(e) => update({ stroke: { ...st, color: e.target.value } })}
                className="w-6 h-5 rounded border border-slate-700 bg-transparent cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-10">Pos</span>
              <select
                value={st.position}
                onChange={(e) => update({ stroke: { ...st, position: e.target.value as 'outside' | 'center' } })}
                className="flex-1 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 px-1.5 py-0.5"
              >
                <option value="outside">Outside</option>
                <option value="center">Center</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Outer Glow */}
      <div className="space-y-1">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={og.enabled}
            onChange={(e) => update({ outerGlow: { ...og, enabled: e.target.checked } })}
            className="w-3 h-3 accent-primary"
          />
          <span className="text-[11px] text-slate-300">Outer Glow</span>
        </label>
        {og.enabled && (
          <div className="ml-4 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-10">Blur</span>
              <input
                type="range" min="1" max="100" value={og.blur}
                onChange={(e) => update({ outerGlow: { ...og, blur: Number(e.target.value) } })}
                className="flex-1 h-1 accent-primary"
              />
              <span className="text-[10px] text-slate-500 w-6 text-right">{og.blur}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-10">Opacity</span>
              <input
                type="range" min="0" max="100" value={Math.round(og.opacity * 100)}
                onChange={(e) => update({ outerGlow: { ...og, opacity: Number(e.target.value) / 100 } })}
                className="flex-1 h-1 accent-primary"
              />
              <span className="text-[10px] text-slate-500 w-6 text-right">{Math.round(og.opacity * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-10">Color</span>
              <input
                type="color" value={og.color}
                onChange={(e) => update({ outerGlow: { ...og, color: e.target.value } })}
                className="w-6 h-5 rounded border border-slate-700 bg-transparent cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
