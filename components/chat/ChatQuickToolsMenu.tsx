import React from 'react';
import { Camera, Cpu, Database, Globe, Lock, Paperclip } from 'lucide-react';

type SubscriptionTier = 'free' | 'basic' | 'plus' | 'pro';
type ChatMode = 'chat' | 'brand';

type ChatQuickToolsMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  isHoverPointer: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  canUseCamera: boolean;
  onOpenCamera: () => void;
  canSearch: boolean;
  isSearchEnabled: boolean;
  onToggleSearch: () => void;
  isAuthenticated: boolean;
  userId?: string | null;
  subscriptionTier: SubscriptionTier;
  isKnowledgeEnabled: boolean;
  onToggleKnowledge: () => void;
  onOpenKnowledgeModal: () => void;
  chatMode: ChatMode;
  brandToolsEnabled: boolean;
  onToggleBrandTools: () => void;
  onRequestAuth: () => void;
};

export const ChatQuickToolsMenu: React.FC<ChatQuickToolsMenuProps> = ({
  isOpen,
  onClose,
  isHoverPointer,
  fileInputRef,
  canUseCamera,
  onOpenCamera,
  canSearch,
  isSearchEnabled,
  onToggleSearch,
  isAuthenticated,
  userId,
  subscriptionTier,
  isKnowledgeEnabled,
  onToggleKnowledge,
  onOpenKnowledgeModal,
  chatMode,
  brandToolsEnabled,
  onToggleBrandTools,
  onRequestAuth,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {!isHoverPointer && <div className="fixed inset-0 z-40" onClick={onClose} />}
      <div
        onMouseLeave={() => {
          if (isHoverPointer) onClose();
        }}
        className="absolute left-0 bottom-[calc(100%+0.5rem)] z-50 w-[min(15.5rem,calc(100vw-1.25rem))] rounded-2xl bg-white/85 dark:bg-[#0f172a]/90 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] dark:shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-2 ring-1 ring-black/5"
      >
        <div className="p-1.5 flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              fileInputRef.current?.click();
            }}
            className="w-full px-3 py-2 rounded-xl text-[13px] font-bold text-gray-700 dark:text-gray-200 hover:bg-primary/5 transition-colors flex items-center gap-2"
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Attachments</span>
          </button>

          {canUseCamera && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCamera();
              }}
              className="w-full px-3 py-2 rounded-xl text-[13px] font-bold text-gray-700 dark:text-gray-200 hover:bg-primary/5 transition-colors flex items-center gap-2"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera</span>
            </button>
          )}

          {canSearch && (
            <button
              type="button"
              onClick={onToggleSearch}
              className={`w-full px-3 py-2 rounded-xl text-[13px] font-bold transition-colors flex items-center gap-2 ${isSearchEnabled
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : 'text-gray-700 dark:text-gray-200 hover:bg-primary/5'
                }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Web Search</span>
            </button>
          )}

          {isAuthenticated && userId && (
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
              className={`w-full px-3 py-2 rounded-xl text-[13px] font-bold transition-colors flex items-center gap-2 ${isKnowledgeEnabled
                ? 'bg-violet-500/10 text-violet-500 hover:bg-violet-500/20'
                : subscriptionTier === 'free'
                  ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-violet-500/5'
                }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Knowledge Base</span>
              {subscriptionTier === 'free' && <Lock className="w-3.5 h-3.5 ml-auto text-amber-500" />}
            </button>
          )}

          {chatMode === 'brand' && (
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  onClose();
                  onRequestAuth();
                  return;
                }
                if (subscriptionTier !== 'plus' && subscriptionTier !== 'pro') {
                  onClose();
                  window.location.href = '/#pricing';
                  return;
                }
                onToggleBrandTools();
              }}
              className={`w-full px-3 py-2 rounded-xl text-[13px] font-bold transition-colors flex items-center gap-2 ${brandToolsEnabled
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : (subscriptionTier !== 'plus' && subscriptionTier !== 'pro')
                  ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-primary/5'
                }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Brand Tools</span>
              {(subscriptionTier !== 'plus' && subscriptionTier !== 'pro') && <Lock className="w-3.5 h-3.5 ml-auto text-amber-500" />}
            </button>
          )}
        </div>
      </div>
    </>
  );
};
