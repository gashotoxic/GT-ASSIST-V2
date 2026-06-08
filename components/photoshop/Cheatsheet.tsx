import React from 'react';

interface CheatsheetProps {
  onClose: () => void;
}

const SECTIONS = [
  {
    title: 'Tools & Shortcuts',
    items: [
      { key: 'V', desc: 'Move tool — drag layers on canvas' },
      { key: 'H', desc: 'Pan tool — scroll the canvas view' },
      { key: 'M', desc: 'Select tool — rectangle/ellipse/lasso' },
      { key: 'C', desc: 'Crop tool — aspect ratio presets' },
      { key: 'R', desc: 'Resize tool — resize canvas & scale layers' },
      { key: 'T', desc: 'Text tool — font, size, style, alignment' },
      { key: 'B', desc: 'Brush tool — paint on active layer' },
      { key: 'E', desc: 'Eraser tool — erase from active layer' },
      { key: 'G', desc: 'Fill tool — fill active layer with color' },
      { key: 'U', desc: 'Shape tool — rect, oval, line, arrow, polygon, star' },
      { key: 'Y', desc: 'Gradient tool — linear, radial, conic' },
      { key: 'I', desc: 'Eyedropper tool — pick color from canvas' },
    ],
  },
  {
    title: 'General Shortcuts',
    items: [
      { key: 'Ctrl+Z', desc: 'Undo last action' },
      { key: 'Ctrl+Shift+Z', desc: 'Redo last undo' },
      { key: 'Ctrl+0', desc: 'Zoom to 100%' },
      { key: '+ / -', desc: 'Zoom in / Zoom out' },
      { key: 'Ctrl+Scroll', desc: 'Zoom with mouse wheel' },
    ],
  },
  {
    title: 'Tips',
    items: [
      { key: 'Layers', desc: 'Use the Layers panel to reorder, hide, lock, or adjust opacity/blend mode of each layer' },
      { key: 'History', desc: 'Undo/Redo buttons in the status bar — up to 50 steps of history are stored' },
      { key: 'Export', desc: 'Use Export button in the menu bar or quick-export PNG/JPEG/WebP from the status bar' },
      { key: 'Zoom', desc: 'Use the zoom slider or Ctrl+Scroll to zoom. Click "Fit" to auto-fit the canvas.' },
      { key: 'Grid', desc: 'Toggle the grid overlay with the ⊞ button in the status bar — helps with alignment' },
      { key: 'Open Image', desc: 'Drag an image from Image/Edit tabs, or use the "Open" button to load from file' },
    ],
  },
];

export const Cheatsheet: React.FC<CheatsheetProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-[480px] max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-200">Photoshop Corner — Cheatsheet</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none">&times;</button>
        </div>

        {SECTIONS.map(section => (
          <div key={section.title} className="mb-4">
            <h3 className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{section.title}</h3>
            <div className="space-y-1">
              {section.items.map(item => (
                <div key={item.key} className="flex items-start gap-3 bg-slate-800/50 rounded-lg px-2.5 py-1.5">
                  <kbd className="shrink-0 text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 min-w-[60px] text-center">
                    {item.key}
                  </kbd>
                  <span className="text-[11px] text-slate-300 leading-tight">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-2 pt-3 border-t border-slate-700/50 text-[9px] text-slate-600 text-center">
          Press <kbd className="text-primary text-[10px]">?</kbd> anytime to open this cheatsheet
        </div>
      </div>
    </div>
  );
};
