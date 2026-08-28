import React, { useCallback, useRef, useEffect } from 'react';
import { HistoryStateInfo } from '../../../hooks/useHistory';

interface HistoryPanelProps {
  historyList: HistoryStateInfo[];
  currentIndex: number;
  onJump: (index: number) => void;
  onClear: () => void;
  onClose: () => void;
}

/** Format timestamp to short time string */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/** Format relative time from now */
function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 1000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return formatTime(ts);
}

/** History panel showing all undo states with thumbnails */
export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  historyList,
  currentIndex,
  onJump,
  onClear,
  onClose,
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current state when it changes
  useEffect(() => {
    if (!listRef.current) return;
    const currentEl = listRef.current.querySelector(`[data-index="${currentIndex}"]`);
    if (currentEl) {
      currentEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentIndex]);

  const handleClear = useCallback(() => {
    onClear();
  }, [onClear]);

  // Reverse order - newest at top
  const reversed = [...historyList].reverse();

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
        <h3 className="text-xs font-semibold text-slate-200 tracking-wide">History</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClear}
            className="text-[10px] px-1.5 py-0.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Clear all history"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-sm leading-none px-1"
          >
            &times;
          </button>
        </div>
      </div>

      {/* History list */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto custom-scrollbar"
      >
        {historyList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-600">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-[11px]">No history yet</div>
            <div className="text-[10px] text-slate-700 mt-1">Actions will appear here</div>
          </div>
        ) : (
          reversed.map((state) => {
            const isCurrent = state.index === currentIndex;
            const isFuture = state.index > currentIndex;
            return (
              <button
                key={state.index}
                data-index={state.index}
                onClick={() => onJump(state.index)}
                className={`
                  w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors
                  ${isCurrent
                    ? 'bg-primary/15 border-l-2 border-primary'
                    : isFuture
                      ? 'opacity-50 hover:bg-slate-800/50 border-l-2 border-transparent hover:border-slate-600'
                      : 'hover:bg-slate-800/70 border-l-2 border-transparent hover:border-slate-600'
                  }
                `}
                title={`${state.label} - ${formatTime(state.timestamp)} - Click to jump`}
              >
                {/* Thumbnail */}
                <div className="w-8 h-8 rounded border border-slate-700/50 overflow-hidden flex-shrink-0 bg-slate-800">
                  {state.thumbnail ? (
                    <img
                      src={state.thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700 text-[10px]">
                      -
                    </div>
                  )}
                </div>

                {/* Label + time */}
                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] truncate ${isCurrent ? 'text-primary font-medium' : 'text-slate-300'}`}>
                    {state.label}
                  </div>
                  <div className="text-[9px] text-slate-600">
                    {formatRelative(state.timestamp)}
                  </div>
                </div>

                {/* Current indicator */}
                {isCurrent && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-slate-700/50 text-[10px] text-slate-600">
        {historyList.length} state{historyList.length !== 1 ? 's' : ''} · Click to jump
      </div>
    </div>
  );
};