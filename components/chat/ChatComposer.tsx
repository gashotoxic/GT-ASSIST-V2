import React, { useState } from 'react';
import { Cpu, Database, FileText, Globe, Lock, Mic, Plus, Send, Square, X } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { AppSettings, BRAND_STUDIO_MODEL_ID, FileAttachment, getModelInfo } from '../../types';
import { Button } from '../UI';
import { CreditAwareButton } from '../CreditAwareButton';
import { ChatQuickToolsMenu } from './ChatQuickToolsMenu';
import { CameraCaptureModal } from './CameraCaptureModal';

type SubscriptionTier = 'free' | 'basic' | 'plus' | 'pro';
type ChatMode = 'chat' | 'brand';

type ChatComposerProps = {
  settings: AppSettings;
  isAuthenticated: boolean;
  userId?: string | null;
  subscriptionTier: SubscriptionTier;
  chatMode: ChatMode;
  brandToolsEnabled: boolean;
  onToggleBrandTools: () => void;
  canSearch: boolean;
  isSearchEnabled: boolean;
  onToggleSearch: () => void;
  isKnowledgeEnabled: boolean;
  onToggleKnowledge: () => void;
  onOpenKnowledgeModal: () => void;
  isHoverPointer: boolean;
  isQuickToolsOpen: boolean;
  setIsQuickToolsOpen: (open: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachment: FileAttachment | null;
  onSetAttachment: (attachment: FileAttachment) => void;
  onClearAttachment: () => void;
  inputValue: string;
  setInputValue: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  isLoading: boolean;
  canAfford: (action: string, model: string) => boolean;
  onSend: (text: string) => void;
  onRequestAuth: () => void;
  isRecording: boolean;
  onVoiceInput: () => void;
};

export const ChatComposer: React.FC<ChatComposerProps> = ({
  settings,
  isAuthenticated,
  userId,
  subscriptionTier,
  chatMode,
  brandToolsEnabled,
  onToggleBrandTools,
  canSearch,
  isSearchEnabled,
  onToggleSearch,
  isKnowledgeEnabled,
  onToggleKnowledge,
  onOpenKnowledgeModal,
  isHoverPointer,
  isQuickToolsOpen,
  setIsQuickToolsOpen,
  fileInputRef,
  onFileSelect,
  attachment,
  onSetAttachment,
  onClearAttachment,
  inputValue,
  setInputValue,
  textareaRef,
  isLoading,
  canAfford,
  onSend,
  onRequestAuth,
  isRecording,
  onVoiceInput,
}) => {
  const brandChatModelId = settings.brandModel || BRAND_STUDIO_MODEL_ID;
  const modelToCharge = chatMode === 'brand' ? brandChatModelId : settings.model;
  const canUseCamera =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!getModelInfo(modelToCharge)?.supportsVision;
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  return (
    <div className="p-2 sm:p-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-t border-white/50 dark:border-white/5 z-20">
      <div className="max-w-4xl mx-auto flex flex-col gap-3">
        <CameraCaptureModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={({ dataUrl, mimeType, name }) => {
            onSetAttachment({
              type: 'image',
              name,
              data: dataUrl,
              mimeType,
            });
          }}
        />

        {attachment && (
          <div className="flex items-center gap-3 p-2 bg-white/50 dark:bg-slate-800/50 rounded-lg w-fit border border-primary/20 animate-in slide-in-from-bottom-2">
            <div className="w-10 h-10 rounded bg-gray-100 dark:bg-black/20 flex items-center justify-center overflow-hidden">
              {attachment.type === 'image' ? (
                <img src={attachment.data} alt="preview" className="w-full h-full object-cover" />
              ) : attachment.type === 'video' ? (
                <video src={attachment.data} className="w-full h-full object-cover" muted />
              ) : attachment.type === 'audio' ? (
                <div className="flex items-center justify-center w-full h-full"><Mic className="w-5 h-5 text-blue-500" /></div>
              ) : (
                <FileText className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium truncate max-w-[150px] text-gray-700 dark:text-gray-300">{attachment.name}</span>
              <span className="text-[10px] text-gray-500 uppercase">{attachment.type}</span>
            </div>
            <button onClick={onClearAttachment} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="relative flex items-end gap-1 sm:gap-2 bg-white/80 dark:bg-slate-950/50 p-1.5 sm:p-2 rounded-[1.5rem] border border-gray-200/50 dark:border-white/10 shadow-lg focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={onFileSelect}
            accept="image/*, video/*, audio/*, .txt, .md, .json, .js, .ts, .csv"
          />

          <div className="relative shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full h-8 w-8 sm:h-10 sm:w-10 shrink-0 transition-all duration-300 ${isQuickToolsOpen
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : 'text-gray-500 hover:text-primary hover:bg-primary/5 dark:hover:bg-white/5'
                }`}
              onClick={() => setIsQuickToolsOpen(!isQuickToolsOpen)}
              title={isQuickToolsOpen ? 'Hide tools' : 'Show tools'}
            >
              <Plus className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${isQuickToolsOpen ? 'rotate-45' : ''}`} />
            </Button>

            <ChatQuickToolsMenu
              isOpen={isQuickToolsOpen}
              onClose={() => setIsQuickToolsOpen(false)}
              isHoverPointer={isHoverPointer}
              fileInputRef={fileInputRef}
              canUseCamera={canUseCamera}
              onOpenCamera={() => setIsCameraOpen(true)}
              canSearch={canSearch}
              isSearchEnabled={isSearchEnabled}
              onToggleSearch={onToggleSearch}
              isAuthenticated={isAuthenticated}
              userId={userId}
              subscriptionTier={subscriptionTier}
              isKnowledgeEnabled={isKnowledgeEnabled}
              onToggleKnowledge={onToggleKnowledge}
              onOpenKnowledgeModal={onOpenKnowledgeModal}
              chatMode={chatMode}
              brandToolsEnabled={brandToolsEnabled}
              onToggleBrandTools={onToggleBrandTools}
              onRequestAuth={onRequestAuth}
            />
          </div>

          {chatMode === 'brand' && !isQuickToolsOpen && brandToolsEnabled && (
            <Tooltip.Provider>
              <Tooltip.Root delayDuration={0}>
                <Tooltip.Trigger asChild>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isAuthenticated) {
                          onRequestAuth();
                          return;
                        }
                        if (subscriptionTier !== 'plus' && subscriptionTier !== 'pro') {
                          window.location.href = '/#pricing';
                          return;
                        }
                        onToggleBrandTools();
                      }}
                      className={`rounded-full h-8 w-8 sm:h-10 sm:w-10 shrink-0 transition-all duration-300 flex items-center justify-center relative ${brandToolsEnabled
                        ? 'bg-primary/10 text-primary hover:bg-primary/20'
                        : (subscriptionTier !== 'plus' && subscriptionTier !== 'pro')
                          ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                          : 'text-gray-500 hover:text-primary hover:bg-primary/5 dark:hover:bg-white/5'
                        }`}
                    >
                      <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
                      {(subscriptionTier !== 'plus' && subscriptionTier !== 'pro') && (
                        <div className="absolute -top-1 -right-1 flex h-3 w-3 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900 z-10">
                          <Lock className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="z-50 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-slate-800 rounded-lg shadow-xl animate-in fade-in zoom-in-95 border border-white/10"
                    sideOffset={5}
                  >
                    {subscriptionTier !== 'plus' && subscriptionTier !== 'pro'
                      ? 'Upgrade to Plus to unlock Brand Tools (Generate/Edit)'
                      : brandToolsEnabled
                        ? (subscriptionTier === 'pro' ? 'Tools ON: unlimited' : 'Tools ON: 1 credit per run')
                        : 'Enable Brand Tools (Generate/Edit)'}
                    <Tooltip.Arrow className="fill-slate-900 dark:fill-slate-800" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          )}

          {canSearch && !isQuickToolsOpen && isSearchEnabled && (
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full h-8 w-8 sm:h-10 sm:w-10 shrink-0 transition-all duration-300 ${isSearchEnabled
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : 'text-gray-500 hover:text-primary hover:bg-primary/5 dark:hover:bg-white/5'
                }`}
              onClick={onToggleSearch}
              title={isSearchEnabled ? "Web Search Enabled" : "Enable Web Search"}
            >
              <Globe className={`w-4 h-4 sm:w-5 sm:h-5 ${isSearchEnabled ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`} />
            </Button>
          )}

          {isAuthenticated && userId && !isQuickToolsOpen && isKnowledgeEnabled && (
            <Tooltip.Provider>
              <Tooltip.Root delayDuration={0}>
                <Tooltip.Trigger asChild>
                  <div className="relative group/kb">
                    <button
                      type="button"
                      onClick={() => {
                        if (subscriptionTier === 'free') return;
                        onToggleKnowledge();
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (subscriptionTier === 'free') return;
                        onOpenKnowledgeModal();
                      }}
                      className={`rounded-full h-8 w-8 sm:h-10 sm:w-10 shrink-0 transition-all duration-300 flex items-center justify-center relative ${isKnowledgeEnabled
                        ? 'bg-violet-500/10 text-violet-500 hover:bg-violet-500/20'
                        : subscriptionTier === 'free'
                          ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                          : 'text-gray-500 hover:text-violet-500 hover:bg-violet-500/5 dark:hover:bg-white/5'
                        }`}
                    >
                      <Database className={`w-4 h-4 sm:w-5 sm:h-5 ${isKnowledgeEnabled ? 'text-violet-500' : ''}`} />
                      {subscriptionTier === 'free' && (
                        <div className="absolute -top-1 -right-1 flex h-3 w-3 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900 z-10">
                          <Lock className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="z-50 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-slate-800 rounded-lg shadow-xl animate-in fade-in zoom-in-95 border border-white/10"
                    sideOffset={5}
                  >
                    {subscriptionTier === 'free'
                      ? "Upgrade to Basic+ to unlock Knowledge Base"
                      : isKnowledgeEnabled
                        ? "Disable Knowledge Base"
                        : "Enable Knowledge Base (Right-click to manage)"}
                    <Tooltip.Arrow className="fill-slate-900 dark:fill-slate-800" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          )}

          <textarea
            id="tour-chat-input"
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (isAuthenticated) {
                  if (canAfford('chat', modelToCharge)) {
                    onSend(inputValue);
                  } else {
                    alert('Insufficient credits. Please add more credits to continue.');
                  }
                } else {
                  onRequestAuth();
                }
              }
            }}
            placeholder={chatMode === 'brand' ? 'Describe your brand, upload an image, or ask for an ad prompt…' : 'Message GT...'}
            className="flex-1 min-w-[60px] bg-transparent border-none focus:ring-0 resize-none max-h-32 py-2.5 px-1 sm:px-2 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 text-sm sm:text-base scrollbar-hide focus:outline-none"
            rows={1}
            onPaste={async (e) => {
              const items = e.clipboardData?.items;
              if (!items) return;
              for (const item of items) {
                const isMedia = item.type.startsWith('image/') || item.type.startsWith('video/') || item.type.startsWith('audio/');
                if (isMedia) {
                  e.preventDefault();
                  const file = item.getAsFile();
                  if (!file) continue;
                  const maxSize = item.type.startsWith('image/') ? 5 * 1024 * 1024 : 20 * 1024 * 1024;
                  if (file.size > maxSize) { alert(`File too large (max ${item.type.startsWith('image/') ? '5MB' : '20MB'})`); return; }
                  const reader = new FileReader();
                  reader.onload = () => {
                    const attachmentType = item.type.startsWith('video/') ? 'video' : item.type.startsWith('audio/') ? 'audio' : 'image';
                    onSetAttachment({ type: attachmentType, name: file.name || `pasted-${attachmentType}.${item.type.split('/')[1]}`, data: reader.result as string, mimeType: item.type });
                  };
                  reader.readAsDataURL(file);
                  return;
                }
              }
            }}
            onDrop={async (e) => {
              const file = e.dataTransfer?.files?.[0];
              if (!file) return;
              const isMedia = file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/');
              if (!isMedia) return;
              e.preventDefault();
              const maxSize = file.type.startsWith('image/') ? 5 * 1024 * 1024 : 20 * 1024 * 1024;
              if (file.size > maxSize) { alert(`File too large (max ${file.type.startsWith('image/') ? '5MB' : '20MB'})`); return; }
              const reader = new FileReader();
              reader.onload = () => {
                const attachmentType = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image';
                onSetAttachment({ type: attachmentType, name: file.name, data: reader.result as string, mimeType: file.type });
              };
              reader.readAsDataURL(file);
            }}
            onDragOver={(e) => e.preventDefault()}
          />

          <div className="flex items-center gap-0.5 sm:gap-1 pb-0.5">
            <Button
              variant={isRecording ? "destructive" : "ghost"}
              size="icon"
              onClick={() => isAuthenticated ? onVoiceInput() : onRequestAuth()}
              disabled={!isAuthenticated}
              className={`rounded-full h-8 w-8 sm:h-9 sm:w-9 transition-all ${isRecording ? 'animate-pulse' : 'text-gray-500 hover:text-primary disabled:opacity-50'}`}
              title={isAuthenticated ? "Voice Input" : "Sign in to use voice input"}
            >
              {isRecording ? <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
            </Button>

            <CreditAwareButton
              action="chat"
              model={modelToCharge}
              onClick={() => onSend(inputValue)}
              onRequestAuth={onRequestAuth}
              disabled={isLoading || (!inputValue.trim() && !attachment)}
              size="icon"
              className="rounded-full h-8 w-8 sm:h-9 sm:w-9 shadow-md shadow-primary/20"
            >
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
            </CreditAwareButton>
          </div>
        </div>

        <div className="text-center hidden sm:block">
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            AI can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
};
