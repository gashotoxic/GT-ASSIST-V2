import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PhotoshopLayer,
  ExportPreset,
  EXPORT_PRESETS,
  ResizeMode,
  RESIZE_MODE_LABELS,
} from '../../../types/photoshop';

interface ExportDialogProps {
  canvasWidth: number;
  canvasHeight: number;
  layers: PhotoshopLayer[];
  onExport: (format: 'png' | 'jpeg' | 'webp', quality: number) => void;
  onExportBlog: (size: 'og-card' | 'blog-inline' | 'original-webp') => void;
  onClose: () => void;
  onExportPreset?: (
    format: 'png' | 'jpeg' | 'webp',
    quality: number,
    preset: ExportPreset,
    resizeMode: ResizeMode,
    bgColor: string,
  ) => void;
  onBatchLayerExport?: (format: 'png' | 'jpeg' | 'webp', quality: number) => void;
  onSendToMedia?: (blob: Blob, name: string) => void;
  onCopyToClipboard?: () => void;
}

const FORMATS: { id: 'png' | 'jpeg' | 'webp'; label: string; mime: string; hasQuality: boolean }[] = [
  { id: 'png', label: 'PNG (Lossless)', mime: 'image/png', hasQuality: false },
  { id: 'jpeg', label: 'JPEG (Smaller)', mime: 'image/jpeg', hasQuality: true },
  { id: 'webp', label: 'WebP (Best)', mime: 'image/webp', hasQuality: true },
];

const CATEGORY_LABELS: Record<string, string> = {
  social: 'Social Media',
  blog: 'Blog / Web',
  print: 'Print',
};

type Tab = 'preset' | 'batch' | 'integration';

export const ExportDialog: React.FC<ExportDialogProps> = ({
  canvasWidth,
  canvasHeight,
  layers,
  onExport,
  onExportBlog,
  onClose,
  onExportPreset,
  onBatchLayerExport,
  onSendToMedia,
  onCopyToClipboard,
}) => {
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [quality, setQuality] = useState(90);
  const [tab, setTab] = useState<Tab>('preset');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [resizeMode, setResizeMode] = useState<ResizeMode>('fit');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [batchExporting, setBatchExporting] = useState(false);
  const [fileSizeEstimate, setFileSizeEstimate] = useState<string | null>(null);
  const [clipboardStatus, setClipboardStatus] = useState<string | null>(null);

  const selectedPreset = useMemo(
    () => EXPORT_PRESETS.find(p => p.id === selectedPresetId) ?? null,
    [selectedPresetId],
  );

  const visibleLayerCount = useMemo(
    () => layers.filter(l => l.visible).length,
    [layers],
  );

  // File size estimation: render composite at target size and measure blob
  const estimateFileSize = useCallback(async () => {
    if (!selectedPreset) {
      setFileSizeEstimate(null);
      return;
    }
    try {
      const { w, h } = computeTargetSize(
        canvasWidth, canvasHeight,
        selectedPreset.width, selectedPreset.height,
        resizeMode,
      );
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = w;
      exportCanvas.height = h;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;

      // Fill background
      if (resizeMode === 'fit') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      }

      const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      const q = format === 'png' ? undefined : quality / 100;

      // Draw composite layers at target size
      await drawComposite(ctx, layers, canvasWidth, canvasHeight, w, h, resizeMode, bgColor);

      const blob = await new Promise<Blob | null>(resolve =>
        exportCanvas.toBlob(resolve, mimeType, q),
      );
      if (blob) {
        setFileSizeEstimate(formatBytes(blob.size));
      }
    } catch {
      setFileSizeEstimate(null);
    }
  }, [selectedPreset, resizeMode, bgColor, format, quality, canvasWidth, canvasHeight, layers]);

  // Re-estimate when relevant params change
  useEffect(() => {
    if (selectedPreset) {
      const timer = setTimeout(estimateFileSize, 300);
      return () => clearTimeout(timer);
    }
    setFileSizeEstimate(null);
  }, [selectedPreset, resizeMode, bgColor, format, quality, estimateFileSize]);

  const handleExportCurrent = useCallback(() => {
    if (selectedPreset && onExportPreset) {
      onExportPreset(format, quality / 100, selectedPreset, resizeMode, bgColor);
    } else {
      onExport(format, quality / 100);
    }
  }, [format, quality, selectedPreset, resizeMode, bgColor, onExport, onExportPreset]);

  const handleBatchExport = useCallback(async () => {
    if (!onBatchLayerExport) return;
    setBatchExporting(true);
    try {
      await onBatchLayerExport(format, quality / 100);
    } finally {
      setBatchExporting(false);
    }
  }, [format, quality, onBatchLayerExport]);

  const handleCopyToClipboard = useCallback(async () => {
    try {
      // Composite all visible layers onto a temp canvas
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvasWidth;
      exportCanvas.height = canvasHeight;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      await drawComposite(ctx, layers, canvasWidth, canvasHeight, canvasWidth, canvasHeight, 'fit', '#ffffff');

      const blob = await new Promise<Blob | null>(resolve =>
        exportCanvas.toBlob(resolve, 'image/png'),
      );
      if (!blob) return;

      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      setClipboardStatus('Copied!');
      setTimeout(() => setClipboardStatus(null), 2000);
    } catch (err) {
      setClipboardStatus('Failed — try HTTPS');
      setTimeout(() => setClipboardStatus(null), 3000);
    }
  }, [canvasWidth, canvasHeight, layers]);

  const handleSendToMedia = useCallback(() => {
    if (!onSendToMedia) return;
    // Composite to blob and send
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasWidth;
    exportCanvas.height = canvasHeight;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    drawComposite(ctx, layers, canvasWidth, canvasHeight, canvasWidth, canvasHeight, 'fit', '#ffffff').then(() => {
      exportCanvas.toBlob((blob) => {
        if (blob) {
          onSendToMedia(blob, `photoshop-export-${Date.now()}.png`);
        }
      }, 'image/png');
    });
  }, [canvasWidth, canvasHeight, layers, onSendToMedia]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') handleExportCurrent();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, handleExportCurrent]);

  const hasPresetQuality = selectedPreset && (selectedPreset.id === 'og-image' || selectedPreset.id === 'featured' || selectedPreset.id === 'thumbnail');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-96 max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Export Image</h3>
        <p className="text-[10px] text-slate-500 mb-3">{canvasWidth} × {canvasHeight} px</p>

        {/* Tab bar */}
        <div className="flex gap-1 mb-4 bg-slate-800/50 rounded p-0.5">
          {([
            { id: 'preset' as Tab, label: 'Presets' },
            { id: 'batch' as Tab, label: 'Batch Layers' },
            { id: 'integration' as Tab, label: 'Integration' },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 text-[10px] px-2 py-1.5 rounded transition-colors ${
                tab === t.id
                  ? 'bg-primary/20 text-primary'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Format picker */}
        <div className="flex gap-1.5 mb-3">
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
          <div className="mb-3">
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

        {/* File size estimate */}
        {fileSizeEstimate && (
          <div className="text-[10px] text-slate-500 mb-3 px-2 py-1 bg-slate-800/50 rounded">
            Estimated size: <span className="text-slate-300">{fileSizeEstimate}</span>
          </div>
        )}

        {/* ===== PRESET TAB ===== */}
        {tab === 'preset' && (
          <>
            {/* Preset selector */}
            <div className="mb-3">
              <p className="text-[10px] text-slate-500 uppercase mb-1.5">Export Preset</p>
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                {(['social', 'blog', 'print'] as const).map(cat => {
                  const presets = EXPORT_PRESETS.filter(p => p.category === cat);
                  return (
                    <div key={cat}>
                      <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">{CATEGORY_LABELS[cat]}</p>
                      <div className="flex flex-wrap gap-1">
                        {presets.map(p => (
                          <button
                            key={p.id}
                            onClick={() => setSelectedPresetId(selectedPresetId === p.id ? null : p.id)}
                            className={`text-[10px] px-2 py-1 rounded transition-colors ${
                              selectedPresetId === p.id
                                ? 'bg-primary/20 text-primary'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resize mode */}
            {selectedPreset && (
              <>
                <div className="mb-3">
                  <p className="text-[10px] text-slate-500 uppercase mb-1.5">Resize Mode</p>
                  <div className="flex gap-1">
                    {(Object.keys(RESIZE_MODE_LABELS) as ResizeMode[]).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setResizeMode(mode)}
                        className={`flex-1 text-[10px] px-2 py-1.5 rounded transition-colors ${
                          resizeMode === mode
                            ? 'bg-primary/20 text-primary'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {RESIZE_MODE_LABELS[mode]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background color for fit mode */}
                {resizeMode === 'fit' && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">Background</span>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={e => setBgColor(e.target.value)}
                      className="w-6 h-6 rounded border border-slate-700 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-500">{bgColor}</span>
                  </div>
                )}

                {/* Target size preview */}
                <div className="text-[10px] text-slate-500 mb-3 px-2 py-1 bg-slate-800/50 rounded">
                  Target: <span className="text-slate-300">{selectedPreset.width} × {selectedPreset.height}</span>
                  {hasPresetQuality && selectedPreset.quality && (
                    <span className="ml-2">Suggested quality: <span className="text-slate-300">{selectedPreset.quality}%</span></span>
                  )}
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-1.5 text-[11px] rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
              <button onClick={handleExportCurrent} className="flex-1 py-1.5 text-[11px] rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
                Export {selectedPreset ? `${selectedPreset.label} ` : ''}{format.toUpperCase()}
              </button>
            </div>
          </>
        )}

        {/* ===== BATCH TAB ===== */}
        {tab === 'batch' && (
          <>
            <div className="mb-3">
              <p className="text-[10px] text-slate-500 mb-1">
                Export each visible layer as a separate {format.toUpperCase()} file.
              </p>
              <p className="text-[10px] text-slate-500">
                <span className="text-slate-300">{visibleLayerCount}</span> visible layers will be exported.
              </p>
            </div>

            <div className="mb-3">
              <p className="text-[10px] text-slate-500 uppercase mb-1.5">Visible Layers</p>
              <div className="flex flex-col gap-1 max-h-32 overflow-y-auto custom-scrollbar">
                {layers.filter(l => l.visible).map(l => (
                  <div key={l.id} className="text-[10px] text-slate-400 px-2 py-1 bg-slate-800/50 rounded flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-slate-700 flex-shrink-0" />
                    <span className="truncate">{l.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-1.5 text-[11px] rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
              <button
                onClick={handleBatchExport}
                disabled={batchExporting || visibleLayerCount === 0}
                className="flex-1 py-1.5 text-[11px] rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-50"
              >
                {batchExporting ? 'Exporting…' : `Export ${visibleLayerCount} Layers`}
              </button>
            </div>
          </>
        )}

        {/* ===== INTEGRATION TAB ===== */}
        {tab === 'integration' && (
          <>
            {/* Send to Media Studio */}
            {onSendToMedia && (
              <div className="mb-3">
                <button
                  onClick={handleSendToMedia}
                  className="w-full text-[11px] px-3 py-2 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-left"
                >
                  <span className="font-medium">Send to Media Studio</span>
                  <span className="block text-[10px] text-primary/60 mt-0.5">Flatten and add to media gallery</span>
                </button>
              </div>
            )}

            {/* Copy to clipboard */}
            <div className="mb-3">
              <button
                onClick={handleCopyToClipboard}
                className="w-full text-[11px] px-3 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-left"
              >
                <span className="font-medium">Copy to Clipboard</span>
                <span className="block text-[10px] text-slate-500 mt-0.5">Copy flattened image as PNG</span>
              </button>
              {clipboardStatus && (
                <p className="text-[10px] text-primary mt-1">{clipboardStatus}</p>
              )}
            </div>

            {/* Blog export */}
            <div className="mb-3">
              <p className="text-[10px] text-slate-500 uppercase mb-1.5">Quick Blog Export</p>
              <div className="flex flex-col gap-1">
                {([
                  { id: 'og-card' as const, label: 'OG Card (1200×630)', desc: 'Social sharing' },
                  { id: 'blog-inline' as const, label: 'Blog Post (800×600)', desc: 'Inline blog image' },
                  { id: 'original-webp' as const, label: 'Original as WebP', desc: 'Same size, WebP' },
                ]).map(s => (
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

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-1.5 text-[11px] rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// --- Utility functions ---

function computeTargetSize(
  srcW: number, srcH: number,
  targetW: number, targetH: number,
  mode: ResizeMode,
): { w: number; h: number } {
  if (mode === 'stretch') return { w: targetW, h: targetH };
  const scale = Math.min(targetW / srcW, targetH / srcH);
  return { w: Math.round(srcW * scale), h: Math.round(srcH * scale) };
}

async function drawComposite(
  ctx: CanvasRenderingContext2D,
  layers: PhotoshopLayer[],
  srcW: number, srcH: number,
  targetW: number, targetH: number,
  mode: ResizeMode,
  bgColor: string,
): Promise<void> {
  const { w, h } = computeTargetSize(srcW, srcH, targetW, targetH, mode);
  const offsetX = mode === 'fill' ? Math.round((targetW - w) / 2) : mode === 'fit' ? Math.round((targetW - w) / 2) : 0;
  const offsetY = mode === 'fill' ? Math.round((targetH - h) / 2) : mode === 'fit' ? Math.round((targetH - h) / 2) : 0;

  if (mode === 'fill') {
    // For fill, clear to bg then draw cropped
    ctx.save();
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.restore();
  }

  const visibleLayers = layers.filter(l => l.visible);
  for (const layer of visibleLayers) {
    ctx.globalAlpha = layer.opacity;
    if (layer.dataUrl) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const lx = layer.x * (w / srcW) + offsetX;
          const ly = layer.y * (h / srcH) + offsetY;
          const lw = layer.width * (w / srcW);
          const lh = layer.height * (h / srcH);
          ctx.drawImage(img, lx, ly, lw, lh);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = layer.dataUrl;
      });
    }
  }
  ctx.globalAlpha = 1;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
