import React from 'react';
import { Film, Play, X } from 'lucide-react';
import { Button } from '../UI';

export function AnimateOptionsModal(props: {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  videoLabel: string;
  lipsyncLabel: string;
  onSelectVideo: () => void;
  onSelectLipSync: () => void;
  onClose: () => void;
}) {
  if (!props.isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-white/30 dark:border-white/10 shadow-2xl overflow-hidden">
        <div className="p-4 flex items-start justify-between gap-3 border-b border-white/20 dark:border-white/10">
          <div className="min-w-0">
            <div className="text-lg font-bold text-gray-900 dark:text-white truncate">{props.title}</div>
            {props.subtitle && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{props.subtitle}</div>}
          </div>
          <Button variant="ghost" size="icon" onClick={props.onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4 space-y-3">
          <Button onClick={props.onSelectVideo} className="w-full h-12 text-base font-semibold rounded-xl">
            <Film className="w-5 h-5 mr-2" /> {props.videoLabel}
          </Button>
          <Button variant="glass" onClick={props.onSelectLipSync} className="w-full h-12 text-base font-semibold rounded-xl">
            <Play className="w-5 h-5 mr-2" /> {props.lipsyncLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

