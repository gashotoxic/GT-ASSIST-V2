import React from 'react';
import { Camera, Download, Film, Scissors, X } from 'lucide-react';
import { Button } from '../UI';

export const MediaCaptureFrameModal: React.FC<{
  isOpen: boolean;
  capturedFrame: string | null;
  onClose: () => void;
  onDownload: (frameDataUrl: string) => void;
  onEdit: (frameDataUrl: string) => void;
  onAnimate: (frameDataUrl: string) => void;
}> = ({ isOpen, capturedFrame, onClose, onDownload, onEdit, onAnimate }) => {
  if (!isOpen || !capturedFrame) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-white/20 shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Captured Frame
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 p-6 flex items-center justify-center bg-gray-100 dark:bg-black/40 overflow-hidden">
          <img src={capturedFrame} alt="Captured" className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-lg border border-white/10" />
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-500">
            Choose what to do with this frame:
          </div>
          <div className="flex flex-wrap gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => onDownload(capturedFrame)}
            >
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
            <Button
              variant="glass"
              className="text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50"
              onClick={() => onEdit(capturedFrame)}
            >
              <Scissors className="w-4 h-4 mr-2" /> Edit This
            </Button>
            <Button
              variant="primary"
              onClick={() => onAnimate(capturedFrame)}
            >
              <Film className="w-4 h-4 mr-2" /> Animate This
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

