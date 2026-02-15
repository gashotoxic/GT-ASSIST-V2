import React from 'react';
import { Film, Play } from 'lucide-react';

export const MediaVideoToolToggle: React.FC<{
  videoTool: 'animate' | 'lipsync';
  setVideoTool: (v: 'animate' | 'lipsync') => void;
}> = ({ videoTool, setVideoTool }) => {
  return (
    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl border border-gray-200 dark:border-white/10">
      <button
        onClick={() => setVideoTool('animate')}
        className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${videoTool === 'animate' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
      >
        <Film className="w-4 h-4" /> Animate
      </button>
      <button
        onClick={() => setVideoTool('lipsync')}
        className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${videoTool === 'lipsync' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
      >
        <Play className="w-4 h-4" /> Lip Sync
      </button>
    </div>
  );
};

