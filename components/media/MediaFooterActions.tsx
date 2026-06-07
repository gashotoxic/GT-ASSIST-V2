import React, { useCallback, useRef, useState } from 'react';
import { ArrowRight, Camera, Download, FileImage, Film, Play, Scissors } from 'lucide-react';
import { Button } from '../UI';
import { downloadAsWebP, BLOG_IMAGE_PRESETS, BlogImageSize } from '../../utils/blogImageExport';

type GenType = 'image' | 'edit' | 'video';

export const MediaFooterActions: React.FC<{
  activeTab: GenType;
  generatedImageUrl: string | null;
  editedImageUrl: string | null;
  generatedVideoUrl: string | null;
  transferToEdit: (imageUrl: string) => void;
  transferToVideo: (imageUrl: string) => void;
  handleCaptureCurrentFrame: () => void;
  handleExtendVideo: () => void;
  handleUsePreviewVideoForLipSync: () => void;
  editHistory?: string[];
  onEditAgain?: () => void;
  onUndo?: () => void;
}> = ({
  activeTab,
  generatedImageUrl,
  editedImageUrl,
  generatedVideoUrl,
  transferToEdit,
  transferToVideo,
  handleCaptureCurrentFrame,
  handleExtendVideo,
  handleUsePreviewVideoForLipSync,
  editHistory = [],
  onEditAgain,
  onUndo,
}) => {
  const [blogExportOpen, setBlogExportOpen] = useState(false);
  const [exporting, setExporting] = useState<BlogImageSize | null>(null);
  const blogExportRef = useRef<HTMLDivElement>(null);

  const imageUrl = activeTab === 'image' ? generatedImageUrl : editedImageUrl;

  const handleBlogExport = useCallback(async (size: BlogImageSize) => {
    if (!imageUrl) return;
    setExporting(size);
    setBlogExportOpen(false);
    try {
      const prefix = activeTab === 'image' ? 'generated' : 'edited';
      await downloadAsWebP(imageUrl, size, `${prefix}-image`);
    } catch (e) {
      console.error('Blog export failed:', e);
    } finally {
      setExporting(null);
    }
  }, [imageUrl, activeTab]);

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!blogExportOpen) return;
    const handler = (e: MouseEvent) => {
      if (blogExportRef.current && !blogExportRef.current.contains(e.target as Node)) {
        setBlogExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [blogExportOpen]);

  return (
    <div className="mt-6 flex flex-col xs:flex-row xs:flex-wrap items-stretch xs:items-center justify-end gap-2 xs:gap-3 pb-8 lg:pb-0">
      {activeTab === 'image' && generatedImageUrl && (
        <>
          <Button variant="glass" onClick={() => transferToEdit(generatedImageUrl)}>
            <Scissors className="w-4 h-4 mr-2 text-purple-500" /> Magic Edit
          </Button>
          <Button variant="glass" onClick={() => transferToVideo(generatedImageUrl)}>
            <Film className="w-4 h-4 mr-2 text-blue-500" /> Animate
          </Button>
          <div className="relative" ref={blogExportRef}>
            <Button
              variant="glass"
              onClick={() => setBlogExportOpen(v => !v)}
              disabled={exporting !== null}
            >
              <FileImage className="w-4 h-4 mr-2 text-emerald-500" />
              {exporting ? 'Exporting...' : 'Export for Blog'}
            </Button>
            {blogExportOpen && (
              <div className="absolute bottom-full mb-2 right-0 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl z-30 overflow-hidden">
                {(Object.entries(BLOG_IMAGE_PRESETS) as [BlogImageSize, typeof BLOG_IMAGE_PRESETS[BlogImageSize]][]).map(([size, preset]) => (
                  <button
                    key={size}
                    onClick={() => handleBlogExport(size)}
                    disabled={exporting !== null}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors disabled:opacity-40 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">{preset.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{preset.desc}</div>
                    </div>
                    {exporting === size && (
                      <div className="w-4 h-4 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin ml-2 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <a className="w-full xs:w-auto" href={generatedImageUrl} download={`generated-image-${Date.now()}.png`}>
            <Button variant="primary"><Download className="w-4 h-4 mr-2" />Download</Button>
          </a>
        </>
      )}

      {activeTab === 'edit' && editedImageUrl && (
        <>
          <Button variant="glass" onClick={onEditAgain}>
            <Scissors className="w-4 h-4 mr-2 text-purple-500" /> Edit Again{editHistory.length > 0 ? ` (${editHistory.length})` : ''}
          </Button>
          {editHistory.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onUndo} className="text-xs text-gray-400">
              <Scissors className="w-3 h-3 mr-1" /> Undo
            </Button>
          )}
          <Button variant="glass" onClick={() => transferToVideo(editedImageUrl)}>
            <Film className="w-4 h-4 mr-2 text-blue-500" /> Animate
          </Button>
          <div className="relative" ref={blogExportRef}>
            <Button
              variant="glass"
              onClick={() => setBlogExportOpen(v => !v)}
              disabled={exporting !== null}
            >
              <FileImage className="w-4 h-4 mr-2 text-emerald-500" />
              {exporting ? 'Exporting...' : 'Export for Blog'}
            </Button>
            {blogExportOpen && (
              <div className="absolute bottom-full mb-2 right-0 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl z-30 overflow-hidden">
                {(Object.entries(BLOG_IMAGE_PRESETS) as [BlogImageSize, typeof BLOG_IMAGE_PRESETS[BlogImageSize]][]).map(([size, preset]) => (
                  <button
                    key={size}
                    onClick={() => handleBlogExport(size)}
                    disabled={exporting !== null}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors disabled:opacity-40 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">{preset.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{preset.desc}</div>
                    </div>
                    {exporting === size && (
                      <div className="w-4 h-4 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin ml-2 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <a className="w-full xs:w-auto" href={editedImageUrl} download={`edited-image-${Date.now()}.png`}>
            <Button variant="primary"><Download className="w-4 h-4 mr-2" />Download</Button>
          </a>
        </>
      )}

      {activeTab === 'video' && generatedVideoUrl && (
        <>
          <Button variant="glass" onClick={handleCaptureCurrentFrame}>
            <Camera className="w-4 h-4 mr-2 text-primary" /> Capture Frame
          </Button>
          <Button variant="glass" onClick={() => handleExtendVideo()}>
            <ArrowRight className="w-4 h-4 mr-2 text-green-500" /> Extend Video (Last Frame)
          </Button>
          <Button variant="glass" onClick={handleUsePreviewVideoForLipSync}>
            <Play className="w-4 h-4 mr-2 text-blue-500" /> Lip Sync
          </Button>
          <a className="w-full xs:w-auto" href={generatedVideoUrl} download={`generated-video-${Date.now()}.mp4`}>
            <Button variant="primary"><Download className="w-4 h-4 mr-2" />Download</Button>
          </a>
        </>
      )}
    </div>
  );
};
