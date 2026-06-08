import React from 'react';
import { FONT_FAMILIES } from '../../../types/photoshop';

interface TextToolProps {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'light' | 'regular' | 'bold' | 'black';
  fontStyle: 'normal' | 'italic';
  color: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  bgColor?: string;
  onChange: (patch: Partial<{
    fontFamily: string; fontSize: number; fontWeight: string;
    fontStyle: string; color: string; textAlign: string;
    lineHeight: number; bgColor?: string;
  }>) => void;
  onAddText: () => void;
}

export const TextTool: React.FC<TextToolProps> = ({
  fontFamily, fontSize, fontWeight, fontStyle, color,
  textAlign, lineHeight, bgColor, onChange, onAddText,
}) => {
  const isBold = fontWeight === 'bold' || fontWeight === 'black';
  const isItalic = fontStyle === 'italic';

  return (
    <div className="p-2 space-y-2">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Text</div>

      {/* Font family */}
      <div>
        <div className="text-[10px] text-slate-500 mb-0.5">Font</div>
        <select value={fontFamily} onChange={e => onChange({ fontFamily: e.target.value })}
          className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-200 outline-none">
          {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Font size */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-500"><span>Size</span><span>{fontSize}px</span></div>
        <input type="range" min={8} max={200} value={fontSize} onChange={e => onChange({ fontSize: Number(e.target.value) })}
          className="w-full h-1 accent-primary" />
      </div>

      {/* Bold / Italic */}
      <div className="flex gap-1">
        <button onClick={() => onChange({ fontWeight: isBold ? 'regular' : 'bold' })}
          className={`flex-1 text-[11px] py-1 rounded font-bold ${
            isBold ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          } transition-colors`}>B</button>
        <button onClick={() => onChange({ fontStyle: isItalic ? 'normal' : 'italic' })}
          className={`flex-1 text-[11px] py-1 rounded italic ${
            isItalic ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          } transition-colors`}>I</button>
      </div>

      {/* Color */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-500">Color</span>
        <div className="w-5 h-5 rounded border border-slate-600" style={{ backgroundColor: color }} />
        <span className="text-[9px] text-slate-600 font-mono">{color}</span>
        <span className="text-[9px] text-slate-600 ml-auto">(from picker)</span>
      </div>

      {/* Text alignment */}
      <div className="flex gap-1">
        {(['left', 'center', 'right'] as const).map(a => (
          <button key={a} onClick={() => onChange({ textAlign: a })}
            className={`flex-1 text-[10px] py-1 rounded capitalize ${
              textAlign === a ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            } transition-colors`}
          >{a === 'left' ? '◀' : a === 'center' ? '↔' : '▶'}</button>
        ))}
      </div>

      {/* Line height */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-500">Line</span>
        <input type="number" min={0.5} max={3} step={0.1} value={lineHeight}
          onChange={e => onChange({ lineHeight: Math.min(3, Math.max(0.5, Number(e.target.value))) })}
          className="w-14 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-200 outline-none" />
      </div>

      {/* Background toggle */}
      <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer">
        <input type="checkbox" checked={!!bgColor} onChange={e => onChange({ bgColor: e.target.checked ? '#000000' : undefined })}
          className="accent-primary w-3 h-3" />
        Background
        {bgColor && <span className="w-3 h-3 rounded border border-slate-600" style={{ backgroundColor: bgColor }} />}
      </label>

      {/* Add Text button */}
      <button onClick={onAddText}
        className="w-full text-[11px] py-1.5 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors font-medium mt-1">
        + Add Text
      </button>
    </div>
  );
};
