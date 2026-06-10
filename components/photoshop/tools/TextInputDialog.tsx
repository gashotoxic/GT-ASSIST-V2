import React, { useCallback, useEffect, useRef, useState } from 'react';

interface TextInputDialogProps {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textColor: string;
  textAlign: string;
  lineHeight: number;
  existingText?: string;
  onConfirm: (text: string, editLayerId?: string) => void;
  onClose: () => void;
}

export const TextInputDialog: React.FC<TextInputDialogProps> = ({
  fontFamily, fontSize, fontWeight, fontStyle,
  textColor, textAlign, lineHeight,
  existingText = '',
  onConfirm, onClose,
}) => {
  const [text, setText] = useState(existingText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleConfirm = useCallback(() => {
    if (text.trim()) onConfirm(text);
  }, [text, onConfirm]);

  useEffect(() => {
    // Focus and select all text for quick replacement
    if (textareaRef.current) {
      textareaRef.current.focus();
      if (existingText) {
        textareaRef.current.select();
      }
    }
  }, [existingText]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 w-[420px] shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400 uppercase tracking-wider">
            {existingText ? 'Edit Text' : 'Add Text'}
          </span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none">&times;</button>
        </div>

        {/* Preview */}
        <div className="bg-slate-800 rounded p-3 mb-3 min-h-[60px] flex items-center justify-center"
          style={{ fontFamily: `"${fontFamily}", sans-serif`, fontSize: `${fontSize}px`, fontWeight, fontStyle, color: textColor, textAlign: textAlign as any }}>
          {text || <span className="text-slate-600 text-sm">Preview</span>}
        </div>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') onClose(); }}
          placeholder="Type your text here..."
          rows={4}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none resize-none placeholder:text-slate-600"
          autoFocus
        />

        {/* Actions */}
        <div className="flex gap-2 justify-end mt-3">
          <button onClick={onClose}
            className="px-3 py-1.5 text-xs rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleConfirm}
            className="px-3 py-1.5 text-xs rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
            {existingText ? 'Update Text' : 'Add Text'}
          </button>
        </div>

        <div className="text-[10px] text-slate-600 mt-2 text-center">
          {fontFamily} · {fontSize}px · {fontWeight} {fontStyle} · Align: {textAlign} · Line: {lineHeight}
          {existingText ? ' (editing)' : ''}
        </div>
      </div>
    </div>
  );
};