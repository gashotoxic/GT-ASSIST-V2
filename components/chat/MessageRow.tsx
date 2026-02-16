import React from 'react';
import { Bot, BrainCircuit, Camera, Check, Copy, Cpu, Edit3, GitBranch, Loader2, Pause, Play, RotateCcw, Search, User, Volume2 } from 'lucide-react';
import { Message, MediaItem, getModelInfo } from '../../types';
import { SearchResultsCard } from '../SearchResultsCard';

type MessageRowProps = {
  msg: Message;
  idx: number;
  isLoading: boolean;
  copiedId: string | null;
  generatingAudioId: string | null;
  playingMessageId: string | null;
  isPlayingAudio: boolean;
  currentTime: number;
  duration: number;
  formatTime: (seconds: number) => string;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReplay: (msg: Message) => void;
  onRetry: (idx: number, msg: Message) => void;
  onBranch: (idx: number) => void;
  onEdit: (msg: Message, idx: number) => void;
  onCopy: (text: string, id: string) => void;
  renderMessageContent: (content: any) => React.ReactNode;
  formatModelName: (modelId: string) => string;
};

export const MessageRow: React.FC<MessageRowProps> = ({
  msg,
  idx,
  isLoading,
  copiedId,
  generatingAudioId,
  playingMessageId,
  isPlayingAudio,
  currentTime,
  duration,
  formatTime,
  onSeek,
  onReplay,
  onRetry,
  onBranch,
  onEdit,
  onCopy,
  renderMessageContent,
  formatModelName,
}) => {
  if (msg.role === 'tool') return null;
  if (!msg.content && msg.role === 'assistant') return null;

  return (
    <div
      className={`flex w-full items-end gap-1 xs:gap-2 min-w-0 group animate-in slide-in-from-bottom-4 duration-500 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {(msg.role !== 'assistant' || msg.content !== '') ? (
        <div className={`shrink-0 w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 duration-300 ${msg.role === 'user'
          ? 'bg-gradient-to-br from-primary to-primary-dark text-white border border-primary-light/30'
          : msg.role === 'system'
            ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300'
            : 'bg-white/50 dark:bg-slate-800/40 text-primary dark:text-primary-light border border-white/50 dark:border-white/10 backdrop-blur-md'
          }`}
        >
          {msg.role === 'user' ? <User className="w-3.5 h-3.5 xs:w-4 xs:h-4" /> : <Bot className="w-3.5 h-3.5 xs:w-4 xs:h-4" />}
        </div>
      ) : null}

      {msg.content && (
        <div className={`flex flex-col gap-1 flex-1 min-w-0 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
          <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`relative px-3 py-2 sm:px-5 sm:py-3 rounded-[1.5rem] text-sm leading-relaxed break-words [overflow-wrap:anywhere] shadow-sm transition-all duration-300 hover:shadow-md ${msg.role === 'user'
                ? 'bg-gradient-to-tr from-primary to-emerald-600 text-white rounded-br-sm shadow-primary/20 max-w-[calc(100vw-4.75rem)] xs:max-w-[calc(100vw-5.25rem)] sm:max-w-[75%] w-fit min-w-[72px] xs:min-w-[100px]'
                : msg.role === 'system'
                  ? 'bg-rose-50/60 dark:bg-rose-900/20 text-rose-600 dark:text-rose-200 border border-rose-100 dark:border-rose-900/30 backdrop-blur-md w-full'
                  : 'bg-white/40 dark:bg-[#0f172a]/40 text-slate-800 dark:text-slate-100 rounded-bl-sm backdrop-blur-2xl border border-white/60 dark:border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)] max-w-[calc(100vw-4.75rem)] xs:max-w-[calc(100vw-5.25rem)] sm:max-w-[75%] w-fit min-w-[72px] xs:min-w-[100px]'
                }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {msg.thinking && (
                    <details className="group animate-in fade-in zoom-in-95">
                      <summary className="cursor-pointer text-xs font-medium text-gray-500 dark:text-gray-400 select-none flex items-center gap-1.5 hover:text-primary transition-colors w-fit p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5">
                        <BrainCircuit className="w-3.5 h-3.5" />
                        <span>Thought Process</span>
                      </summary>
                      <div className="pl-3 border-l-2 border-gray-200 dark:border-white/10 mt-2 ml-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic font-mono leading-relaxed whitespace-pre-wrap">
                          {msg.thinking}
                        </p>
                      </div>
                    </details>
                  )}

                  {msg.sources && msg.sources.length > 0 && (
                    <details className="group animate-in fade-in zoom-in-95">
                      <summary className="cursor-pointer text-xs font-medium text-gray-500 dark:text-gray-400 select-none flex items-center gap-1.5 hover:text-blue-500 transition-colors w-fit p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5">
                        <Search className="w-3.5 h-3.5" />
                        <span>{msg.sources.length} Sources</span>
                      </summary>
                      <div className="mt-2 w-full max-w-md">
                        <SearchResultsCard sources={msg.sources} isCollapsible={false} />
                      </div>
                    </details>
                  )}
                </div>
              )}

              {(msg.media as MediaItem[] | undefined)?.length ? (
                <div className="mb-3 space-y-2">
                  {(msg.media as MediaItem[]).map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl overflow-hidden border border-white/40 dark:border-white/10 bg-white/30 dark:bg-slate-900/30 backdrop-blur-md shadow-sm"
                    >
                      <div className="w-full bg-black/5 dark:bg-black/20">
                        {m.type === 'image' && (
                          <img src={m.url} alt="Generated" className="w-full max-h-72 object-contain" />
                        )}
                      </div>
                      <div className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                        <div className="font-semibold text-gray-700 dark:text-gray-200">Saved to Media Gallery</div>
                        <div className="mt-1 opacity-80 line-clamp-2">{m.prompt}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {renderMessageContent(msg.content)}

              {msg.role === 'assistant' && (
                <div className={`mt-3 pt-3 border-t border-gray-200/40 dark:border-white/5 transition-all duration-300 ${playingMessageId === msg.id ? 'block' : 'hidden'}`}>
                  <div className="flex items-center gap-3 select-none">
                    <button
                      onClick={() => onReplay(msg)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                    >
                      {isPlayingAudio ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                    </button>

                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentTime}
                        onChange={onSeek}
                        className="w-full h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full appearance-none cursor-pointer accent-primary hover:accent-primary-dark"
                      />
                    </div>

                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400 min-w-[36px]">
                      {formatTime(currentTime)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {!isLoading && (
              <div className={`flex items-center gap-1 transition-opacity duration-300 opacity-0 group-hover:opacity-100 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <button
                  onClick={() => onRetry(idx, msg)}
                  className="p-2 rounded-full text-gray-400 hover:text-primary hover:bg-white/60 dark:hover:bg-white/10 transition-all"
                  title="Regenerate/Retry"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onBranch(idx)}
                  className="p-2 rounded-full text-gray-400 hover:text-primary hover:bg-white/60 dark:hover:bg-white/10 transition-all"
                  title="Branch from here"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                </button>

                {msg.role === 'user' && (
                  <button
                    onClick={() => onEdit(msg, idx)}
                    className="p-2 rounded-full text-gray-400 hover:text-primary hover:bg-white/60 dark:hover:bg-white/10 transition-all"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => onCopy(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content), msg.id || idx.toString())}
                  className="p-2 rounded-full text-gray-400 hover:text-primary hover:bg-white/60 dark:hover:bg-white/10 transition-all"
                  title="Copy"
                >
                  {copiedId === (msg.id || idx.toString()) ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {msg.role === 'assistant' && (
                  <button
                    onClick={() => onReplay(msg)}
                    className={`p-2 rounded-full transition-all ${generatingAudioId === msg.id ? 'text-primary' : 'text-gray-400 hover:text-primary hover:bg-white/60 dark:hover:bg-white/10'}`}
                    title="Read aloud"
                    disabled={generatingAudioId === msg.id}
                  >
                    {generatingAudioId === msg.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                {msg.role === 'assistant' && msg.model && (
                  <div id="tour-model-selector" className="ml-1 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/5 text-[10px] font-medium text-gray-500 dark:text-gray-400 select-none cursor-default">
                    {getModelInfo(msg.model)?.supportsVision ? <Camera className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}
                    <span>{formatModelName(msg.model)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
