import React, { useCallback, useEffect, useRef, useState } from 'react';

interface TextInputDialogProps {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  color: string;
  textAlign: string;
  onConfirm: (text: string) => void;
  onClose: () => void;
}

export const TextInputDialog: React.FC<TextInputDialogProps> = ({
  fontFamily, fontSize, fontWeight, fontStyle, color, textAlign,
  onConfirm, onClose,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim()) onConfirm(text); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onConfirm, text]);

  const handleApply = useCallback(() => { if (text.trim()) onConfirm(text); }, [text, onConfirm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Add Text</h3>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type your text here..."
          rows={4}
          className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none resize-y focus:ring-1 focus:ring-primary/50 placeholder-slate-500"
        />
        {/* Live preview */}
        <div className="mt-3 mb-4">
          <div className="text-[10px] text-slate-500 mb-1">Preview</div>
          <div className="bg-slate-950 border border-slate-700 rounded p-3 min-h-[32px] flex items-center justify-center overflow-hidden">
            {text ? (
              <span style={{
                fontFamily, fontSize: `${Math.min(fontSize, 24)}px`,
                fontWeight, fontStyle, color,
                textAlign: textAlign as 'left' | 'center' | 'right',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }} className="w-full">{text}</span>
            ) : (
              <span className="text-[11px] text-slate-600">Preview will appear here</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-[11px] rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
          <button onClick={handleApply} className="px-3 py-1.5 text-[11px] rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors font-medium">Apply</button>
        </div>
      </div>
    </div>
  );
};
