import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, Check, Download, Film, Maximize2, Pencil, Play, Scissors, Trash2, X } from 'lucide-react';
import { Button } from '../UI';
import { MediaItem } from '../../types';

const lightboxZoomStep = 0.25;
const clampLightboxZoom = (value: number) => Math.min(4, Math.max(1, value));

export const MediaLightbox: React.FC<{
  selectedMediaItem: MediaItem;
  lightboxItems: MediaItem[];
  onClose: () => void;
  onSelectItem: (item: MediaItem) => void;
  onUpdateTitle: (itemId: string, newTitle: string) => Promise<void> | void;
  onDelete: (item: MediaItem) => void;
  onTransferToEdit: (url: string) => void;
  onTransferToVideo: (url: string) => void;
  onTransferToLipSyncFromVideo: (url: string) => Promise<void> | void;
  onExtendVideoFromUrl: (url: string) => void;
  onCapturedFrame: (dataUrl: string) => void;
  extractFrameFromVideo: (videoUrl: string, timestamp?: number) => Promise<string>;
}> = ({
  selectedMediaItem,
  lightboxItems,
  onClose,
  onSelectItem,
  onUpdateTitle,
  onDelete,
  onTransferToEdit,
  onTransferToVideo,
  onTransferToLipSyncFromVideo,
  onExtendVideoFromUrl,
  onCapturedFrame,
  extractFrameFromVideo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lightboxVideoRef = useRef<HTMLVideoElement>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [lightboxFitMode, setLightboxFitMode] = useState<'fit' | 'width'>('fit');
  const [lightboxZoom, setLightboxZoom] = useState(1);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 640px)');
    const apply = () => setIsSmallScreen(mediaQuery.matches);
    apply();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', apply);
      return () => mediaQuery.removeEventListener('change', apply);
    }

    mediaQuery.addListener(apply);
    return () => mediaQuery.removeListener(apply);
  }, []);

  useEffect(() => {
    if (selectedMediaItem.type !== 'image') return;
    setLightboxZoom(1);
    setLightboxFitMode(isSmallScreen ? 'width' : 'fit');
  }, [selectedMediaItem.id, selectedMediaItem.type, isSmallScreen]);

  useEffect(() => {
    setIsEditingTitle(false);
    setEditTitleValue('');
  }, [selectedMediaItem.id]);

  const toggleLightboxFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen().catch((e) => void e);
    }
  };

  const captureFrameFromVideoElement = (video: HTMLVideoElement): string => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error("Failed to create canvas context");
    }
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/png');
  };

  const handleCaptureLightboxFrame = async () => {
    const video = lightboxVideoRef.current;
    if (!video) return;

    try {
      const dataUrl = captureFrameFromVideoElement(video);
      onCapturedFrame(dataUrl);
    } catch (e) {
      try {
        const dataUrl = await extractFrameFromVideo(video.currentSrc || video.src, video.currentTime);
        onCapturedFrame(dataUrl);
      } catch (err) {
        void e;
        void err;
      }
    }
  };

  const handleSubmitTitle = async () => {
    const newTitle = editTitleValue.trim();
    if (!newTitle) {
      setIsEditingTitle(false);
      return;
    }
    if (newTitle === selectedMediaItem.title) {
      setIsEditingTitle(false);
      return;
    }
    await onUpdateTitle(selectedMediaItem.id, newTitle);
    setIsEditingTitle(false);
  };

  const currentIdx = lightboxItems.findIndex(i => i.id === selectedMediaItem.id);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < lightboxItems.length - 1;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in">
      <div ref={containerRef} className="relative w-full h-full flex flex-col">
        <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent z-10 shrink-0">
          <div className="flex items-center gap-3">
            {isEditingTitle ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSubmitTitle();
                }}
                className="flex items-center gap-2"
              >
                <input
                  autoFocus
                  className="bg-white/10 text-white rounded px-2 py-1 text-base border border-white/30 focus:outline-none focus:border-primary min-w-[200px]"
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  onBlur={() => void handleSubmitTitle()}
                />
                <Button type="submit" size="icon" className="h-8 w-8 rounded-full bg-primary/20 hover:bg-primary/40 text-primary border-none">
                  <Check className="w-4 h-4" />
                </Button>
              </form>
            ) : (
              <h3 className="text-white font-medium text-lg flex items-center gap-3">
                {selectedMediaItem.title || selectedMediaItem.prompt}
                <button
                  onClick={() => {
                    setIsEditingTitle(true);
                    setEditTitleValue(selectedMediaItem.title || selectedMediaItem.prompt);
                  }}
                  className="p-1.5 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </h3>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedMediaItem.type === 'image' && (
              <div className="flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-2 py-1">
                <button
                  type="button"
                  onClick={() => {
                    setLightboxFitMode('width');
                    setLightboxZoom((z) => clampLightboxZoom(z - lightboxZoomStep));
                  }}
                  disabled={lightboxZoom <= 1}
                  className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10 text-white text-sm font-semibold transition-colors"
                  title="Zoom out"
                >
                  -
                </button>
                <div className="min-w-[64px] text-center text-white/90 text-xs font-semibold tabular-nums">
                  {Math.round(lightboxZoom * 100)}%
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLightboxFitMode('width');
                    setLightboxZoom((z) => clampLightboxZoom(z + lightboxZoomStep));
                  }}
                  disabled={lightboxZoom >= 4}
                  className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10 text-white text-sm font-semibold transition-colors"
                  title="Zoom in"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLightboxZoom(1);
                    setLightboxFitMode(isSmallScreen ? 'width' : 'fit');
                  }}
                  className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                  title="Reset zoom"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLightboxZoom(1);
                    setLightboxFitMode((mode) => (mode === 'fit' ? 'width' : 'fit'));
                  }}
                  className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                  title={lightboxFitMode === 'fit' ? 'Fit to width' : 'Fit to screen'}
                >
                  {lightboxFitMode === 'fit' ? 'Fit' : 'Width'}
                </button>
              </div>
            )}
            <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 relative w-full overflow-hidden group/lightbox">
          {hasPrev && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (currentIdx > 0) onSelectItem(lightboxItems[currentIdx - 1]);
              }}
              className="absolute left-4 z-20 p-3 rounded-full bg-black/50 text-white hover:bg-white/20 hover:scale-110 transition-all opacity-0 group-hover/lightbox:opacity-100"
              title="Previous"
            >
              <ArrowRight className="w-6 h-6 rotate-180" />
            </button>
          )}

          {hasNext && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (currentIdx < lightboxItems.length - 1) onSelectItem(lightboxItems[currentIdx + 1]);
              }}
              className="absolute right-4 z-20 p-3 rounded-full bg-black/50 text-white hover:bg-white/20 hover:scale-110 transition-all opacity-0 group-hover/lightbox:opacity-100"
              title="Next"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          )}

          {selectedMediaItem.type === 'video' ? (
            <div className="absolute inset-0 p-4 flex items-center justify-center">
              <video
                ref={lightboxVideoRef}
                src={selectedMediaItem.url}
                controls
                autoPlay
                loop
                playsInline
                crossOrigin="anonymous"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            </div>
          ) : (
            <div
              className="absolute inset-0 p-4 overflow-auto overscroll-contain custom-scrollbar"
              onWheel={(e) => {
                if (!(e.ctrlKey || e.metaKey)) return;
                e.preventDefault();
                setLightboxFitMode('width');
                const direction = e.deltaY < 0 ? 1 : -1;
                setLightboxZoom((z) => clampLightboxZoom(z + direction * lightboxZoomStep));
              }}
            >
              <div className={lightboxFitMode === 'fit' ? 'w-full h-full flex items-center justify-center' : 'w-full flex justify-center'}>
                <img
                  src={selectedMediaItem.url}
                  alt={selectedMediaItem.title}
                  onDoubleClick={() => {
                    if (lightboxFitMode === 'fit') {
                      setLightboxFitMode('width');
                      setLightboxZoom(2);
                      return;
                    }
                    setLightboxZoom(1);
                    setLightboxFitMode(isSmallScreen ? 'width' : 'fit');
                  }}
                  className={lightboxFitMode === 'fit' ? 'max-w-full max-h-full object-contain rounded-lg shadow-2xl' : 'h-auto max-w-none object-contain rounded-lg shadow-2xl'}
                  style={lightboxFitMode === 'width' ? { width: `${Math.round(lightboxZoom * 100)}%` } : undefined}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 flex justify-center gap-4 bg-gradient-to-t from-black/80 to-transparent z-10 shrink-0">
          <Button variant="glass" className="text-white border-white/20 hover:bg-white/10" onClick={toggleLightboxFullscreen}>
            <Maximize2 className="w-4 h-4 mr-2" /> Fullscreen
          </Button>

          <Button
            variant="glass"
            className="text-white border-white/20 hover:bg-white/10"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                const response = await fetch(selectedMediaItem.url);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `${selectedMediaItem.title || 'download'}.${selectedMediaItem.type === 'video' ? 'mp4' : 'png'}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
              } catch (err) {
                void err;
                window.open(selectedMediaItem.url, '_blank');
              }
            }}
          >
            <Download className="w-4 h-4 mr-2" /> Download
          </Button>

          {selectedMediaItem.type === 'image' && (
            <>
              <Button variant="glass" className="text-purple-300 border-purple-500/30 hover:bg-purple-500/20" onClick={() => onTransferToEdit(selectedMediaItem.url)}>
                <Scissors className="w-4 h-4 mr-2" /> Edit
              </Button>
              <Button variant="glass" className="text-blue-300 border-blue-500/30 hover:bg-blue-500/20" onClick={() => onTransferToVideo(selectedMediaItem.url)}>
                <Film className="w-4 h-4 mr-2" /> Animate
              </Button>
            </>
          )}

          {selectedMediaItem.type === 'video' && (
            <>
              <Button variant="glass" className="text-white border-white/20 hover:bg-white/10" onClick={() => void handleCaptureLightboxFrame()}>
                <Camera className="w-4 h-4 mr-2" /> Capture Frame
              </Button>
              <Button
                variant="glass"
                className="text-blue-300 border-blue-500/30 hover:bg-blue-500/20"
                onClick={() => {
                  const url = selectedMediaItem.url;
                  onClose();
                  void onTransferToLipSyncFromVideo(url);
                }}
              >
                <Play className="w-4 h-4 mr-2" /> Lip Sync
              </Button>
              <Button variant="glass" className="text-green-300 border-green-500/30 hover:bg-green-500/20" onClick={() => {
                const url = selectedMediaItem.url;
                onClose();
                onExtendVideoFromUrl(url);
              }}>
                <ArrowRight className="w-4 h-4 mr-2" /> Extend
              </Button>
            </>
          )}

          <div className="w-px h-10 bg-white/10 mx-2"></div>

          <Button variant="destructive" className="bg-red-500/20 hover:bg-red-500/40 text-red-200 border-red-500/30" onClick={() => onDelete(selectedMediaItem)}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

