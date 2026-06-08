import React, { useCallback, useEffect, useState } from 'react';

interface ExportDialogProps {
  canvasWidth: number;
  canvasHeight: number;
  onExport: (format: 'png' | 'jpeg' | 'webp', quality: number) => void;
  onExportBlog: (size: 'og-card' | 'blog-inline' | 'original-webp') => void;
  onClose: () => void;
}

const FORMATS: { id: 'png' | 'jpeg' | 'webp'; label: string; mime: string; hasQuality: boolean }[] = [
  { id: 'png', label: 'PNG (Lossless)', mime: 'image/png', hasQuality: false },
  { id: 'jpeg', label: 'JPEG (Smaller)', mime: 'image/jpeg', hasQuality: true },
  { id: 'webp', label: 'WebP (Best)', mime: 'image/webp', hasQuality: true },
];

const BLOG_SIZES = [
  { id: 'og-card' as const, label: 'OG Card (1200×630)', desc: 'Social sharing' },
  { id: 'blog-inline' as const, label: 'Blog Post (800×600)', desc: 'Inline blog image' },
  { id: 'original-webp' as const, label: 'Original as WebP', desc: 'Same size, WebP' },
];

export const ExportDialog: React.FC<ExportDialogProps> = ({ canvasWidth, canvasHeight, onExport, onExportBlog, onClose }) => {
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [quality, setQuality] = useState(90);

  const handleExport = useCallback(() => {
    onExport(format, quality / 100);
  }, [format, quality, onExport]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') handleExport();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, handleExport]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Export Image</h3>
        <p className="text-[10px] text-slate-500 mb-4">{canvasWidth} × {canvasHeight} px</p>

        {/* Format picker */}
        <div className="flex gap-1.5 mb-4">
          {FORMATS.map(f => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={`flex-1 text-[10px] px-2 py-2 rounded ${
                format === f.id
                  ? 'bg-primary/20 text-primary'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              } transition-colors`}
            >
              {f.label.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Quality slider */}
        {(format === 'jpeg' || format === 'webp') && (
          <div className="mb-4">
            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
              <span>Quality</span>
              <span>{quality}%</span>
            </div>
            <input
              type="range" min={10} max={100} value={quality}
              onChange={e => setQuality(Number(e.target.value))}
              className="w-full h-1 accent-primary"
            />
          </div>
        )}

        {/* Blog presets */}
        <div className="border-t border-slate-700/50 pt-3 mb-4">
          <p className="text-[10px] text-slate-500 uppercase mb-2">Blog Export</p>
          <div className="flex flex-col gap-1">
            {BLOG_SIZES.map(s => (
              <button
                key={s.id}
                onClick={() => onExportBlog(s.id)}
                className="text-left px-2 py-2 rounded text-[11px] bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span className="text-slate-300">{s.label}</span>
                <span className="text-[10px] text-slate-600 ml-1">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-1.5 text-[11px] rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
          <button onClick={handleExport} className="flex-1 py-1.5 text-[11px] rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
            Export {format.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
};
