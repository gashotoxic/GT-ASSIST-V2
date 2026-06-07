import React from 'react';
import { Camera, Film, Image, Maximize2, Scissors, Sparkles } from 'lucide-react';
import { Button } from '../UI';
import { MediaItem } from '../../types';

type GenType = 'image' | 'edit' | 'video';

type GenerationState = {
  isGenerating: boolean;
  progress: number;
  error: string | null;
};

export const MediaPreviewContent: React.FC<{
  activeTab: GenType;
  genStatus: Record<GenType, GenerationState>;
  generatedImageUrl: string | null;
  generatedImageItem: MediaItem | null;
  editedImageUrl: string | null;
  editedImageItem: MediaItem | null;
  generatedVideoUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  onOpenItem: (item: MediaItem) => void;
  toggleFullscreen: () => void;
  handleCaptureCurrentFrame: () => void;
  showBeforeAfter?: boolean;
  sourceImageUrl?: string | null;
}> = ({
  activeTab,
  genStatus,
  generatedImageUrl,
  generatedImageItem,
  editedImageUrl,
  editedImageItem,
  generatedVideoUrl,
  videoRef,
  onOpenItem,
  toggleFullscreen,
  handleCaptureCurrentFrame,
  showBeforeAfter = false,
  sourceImageUrl,
}) => {
  return (
    <>
      {genStatus[activeTab]?.isGenerating && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl transition-all duration-500">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-4 bg-primary/10 rounded-full animate-pulse">
                <Sparkles className="w-8 h-8 text-primary shadow-glow" />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent animate-pulse">
              {activeTab === 'image' ? 'Dreaming up visuals...' : activeTab === 'edit' ? 'Applying magic...' : 'Rendering cinematic frames...'}
            </span>
            <div className="flex gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-primary/40 animate-[bounce_1s_infinite_0ms]"></span>
              <span className="w-2 h-2 rounded-full bg-primary/40 animate-[bounce_1s_infinite_200ms]"></span>
              <span className="w-2 h-2 rounded-full bg-primary/40 animate-[bounce_1s_infinite_400ms]"></span>
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-4 tracking-wide uppercase">AI is processing your request</span>
          </div>
        </div>
      )}

      {activeTab === 'image' && generatedImageUrl ? (
        <button
          type="button"
          onClick={() => generatedImageItem && onOpenItem(generatedImageItem)}
          className="w-full sm:h-full flex items-start sm:items-center justify-center"
        >
          <img
            src={generatedImageUrl}
            alt="Generated"
            className="w-full h-auto sm:w-auto sm:max-w-full sm:max-h-full object-contain shadow-2xl rounded-lg cursor-zoom-in"
          />
        </button>
      ) : activeTab === 'edit' && editedImageUrl ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
          {showBeforeAfter && sourceImageUrl && (
            <div className="flex items-center gap-4 mb-2">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <div className="w-3 h-3 rounded-full bg-blue-400" />
                <span>Before</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span>After</span>
              </div>
            </div>
          )}
          <div className={`flex ${showBeforeAfter && sourceImageUrl ? 'gap-3 w-full' : ''} items-center justify-center`}>
            {showBeforeAfter && sourceImageUrl && (
              <div className="w-1/2 flex flex-col items-center">
                <span className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">Before</span>
                <img
                  src={sourceImageUrl}
                  alt="Before"
                  className="w-full h-auto max-h-[30vh] object-contain rounded-lg border border-blue-300/30 opacity-80"
                />
              </div>
            )}
            <div className={showBeforeAfter && sourceImageUrl ? 'w-1/2' : ''}>
              {showBeforeAfter && sourceImageUrl && (
                <span className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide text-center block">After</span>
              )}
              <button
                type="button"
                onClick={() => editedImageItem && onOpenItem(editedImageItem)}
                className="w-full flex items-start sm:items-center justify-center"
              >
                <img
                  src={editedImageUrl}
                  alt="Edited"
                  className={`${showBeforeAfter && sourceImageUrl ? 'w-full h-auto max-h-[30vh]' : 'w-full h-auto sm:w-auto sm:max-w-full sm:max-h-full'} object-contain shadow-2xl rounded-lg cursor-zoom-in`}
                />
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'video' && generatedVideoUrl ? (
        <div className="relative w-full h-full flex items-center justify-center bg-black/40 rounded-lg overflow-hidden group/video">
          <video
            ref={videoRef}
            src={generatedVideoUrl}
            controls
            playsInline
            crossOrigin="anonymous"
            className="w-full h-full object-contain"
          />
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 opacity-0 group-hover/video:opacity-100 transition-opacity">
            <Button variant="glass" size="icon" onClick={toggleFullscreen} title="Fullscreen">
              <Maximize2 className="w-5 h-5 text-white" />
            </Button>
            <Button variant="glass" size="icon" onClick={handleCaptureCurrentFrame} title="Capture Current Frame">
              <Camera className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-400 dark:text-gray-600 p-8 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-white/30 dark:bg-slate-800/30 flex items-center justify-center mb-6 shadow-sm border border-white/20 dark:border-white/5">
            {activeTab === 'image' && <Image className="w-10 h-10 opacity-50" />}
            {activeTab === 'edit' && <Scissors className="w-10 h-10 opacity-50" />}
            {activeTab === 'video' && <Film className="w-10 h-10 opacity-50" />}
          </div>
          <p className="text-lg font-medium opacity-70">
            {activeTab === 'edit' ? "Edited result appears here" : activeTab === 'video' ? "Video result appears here" : "Generated result appears here"}
          </p>
        </div>
      )}
    </>
  );
};
