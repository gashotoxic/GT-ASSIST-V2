import React from 'react';
import { Bot } from 'lucide-react';
import { AppSettings, BRAND_STUDIO_MODEL_ID, Message, getModelShortName } from '../../types';
import { MessageRow } from './MessageRow';

type MessageListProps = {
  sessionId: string;
  messages: Message[];
  chatMode: 'chat' | 'brand';
  setChatMode: (mode: 'chat' | 'brand') => void;
  settings: AppSettings;
  messagesEndRef: React.RefObject<HTMLDivElement>;
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

export const MessageList: React.FC<MessageListProps> = ({
  sessionId,
  messages,
  chatMode,
  setChatMode,
  settings,
  messagesEndRef,
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
  return (
    <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-1 xs:p-2 sm:p-6 space-y-3 xs:space-y-4 sm:space-y-8 scroll-smooth custom-scrollbar">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-fade-in pb-20">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-700"></div>
            <div className="relative w-24 h-24 bg-white/30 dark:bg-slate-800/30 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-[2rem] flex items-center justify-center text-primary shadow-[0_15px_35px_rgba(0,0,0,0.1)] group-hover:-translate-y-2 transition-transform duration-500">
              <Bot className="w-12 h-12 text-primary dark:text-primary-light" />
            </div>
          </div>

          <div className="space-y-3 max-w-md px-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 tracking-tight drop-shadow-sm">How can I help?</h2>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white/30 dark:bg-slate-800/30 px-4 py-2 rounded-full w-fit mx-auto border border-white/40 dark:border-white/5 backdrop-blur-md shadow-sm">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#1abc9c]"></span>
              Running on{' '}
              <span className="font-semibold text-primary-dark dark:text-primary-light">
                {getModelShortName(chatMode === 'brand' ? (settings.brandModel || BRAND_STUDIO_MODEL_ID) : settings.model)}
              </span>
            </div>

            <div className="flex justify-center pt-2">
              <div className="rounded-full bg-white/40 dark:bg-white/5 border border-white/30 dark:border-white/10 p-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setChatMode('brand')}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all ${chatMode === 'brand'
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                >
                  Brand
                </button>
                <button
                  type="button"
                  onClick={() => setChatMode('chat')}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all ${chatMode === 'chat'
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                >
                  Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {messages.map((msg, idx) => (
        <MessageRow
          key={`${sessionId}-${idx}`}
          msg={msg}
          idx={idx}
          isLoading={isLoading}
          copiedId={copiedId}
          generatingAudioId={generatingAudioId}
          playingMessageId={playingMessageId}
          isPlayingAudio={isPlayingAudio}
          currentTime={currentTime}
          duration={duration}
          formatTime={formatTime}
          onSeek={onSeek}
          onReplay={onReplay}
          onRetry={onRetry}
          onBranch={onBranch}
          onEdit={onEdit}
          onCopy={onCopy}
          renderMessageContent={renderMessageContent}
          formatModelName={formatModelName}
        />
      ))}

      <div ref={messagesEndRef} />
    </div>
  );
};
