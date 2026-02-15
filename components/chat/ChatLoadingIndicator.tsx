import React from 'react';
import { BrainCircuit, StopCircle } from 'lucide-react';

type ChatLoadingIndicatorProps = {
  isLoading: boolean;
  loadingStatus: string | null;
  onStop: () => void;
};

export const ChatLoadingIndicator: React.FC<ChatLoadingIndicatorProps> = ({ isLoading, loadingStatus, onStop }) => {
  if (!isLoading) return null;

  return (
    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 pl-2">
      <div className="w-8 h-8 rounded-full bg-white/50 dark:bg-slate-800/50 flex items-center justify-center border border-white/20 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/20 animate-pulse"></div>
        <BrainCircuit className="w-4 h-4 text-primary relative z-10 animate-bounce transition-all duration-1000" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="bg-gradient-to-r from-white/40 to-white/60 dark:from-slate-800/40 dark:to-slate-900/40 px-4 py-2 rounded-2xl rounded-bl-sm backdrop-blur-md border border-white/30 dark:border-white/5 flex items-center shadow-sm">
          <div className="flex items-end gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.4s]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.2s]"></span>
          </div>
        </div>
        {loadingStatus && (
          <div className="pl-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 truncate">
            {loadingStatus}
          </div>
        )}
        <button
          onClick={onStop}
          className="text-[10px] font-semibold text-red-400 hover:text-red-500 flex items-center gap-1 pl-1 transition-colors uppercase tracking-wider"
        >
          <StopCircle className="w-2.5 h-2.5" /> Cancel Generation
        </button>
      </div>
    </div>
  );
};
