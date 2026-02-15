import { useEffect } from 'react';

export const useChatSessionPrefs = ({
  sessionId,
  chatMode,
  setChatMode,
  brandToolsEnabled,
  setBrandToolsEnabled,
}: {
  sessionId: string;
  chatMode: 'chat' | 'brand';
  setChatMode: (mode: 'chat' | 'brand') => void;
  brandToolsEnabled: boolean;
  setBrandToolsEnabled: (enabled: boolean) => void;
}) => {
  const getSessionPrefsKey = (sid: string) => `chutes_chat_prefs_${sid}`;

  useEffect(() => {
    const raw = localStorage.getItem(getSessionPrefsKey(sessionId));
    if (!raw) {
      setChatMode('chat');
      setBrandToolsEnabled(false);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setChatMode(parsed?.chatMode === 'brand' ? 'brand' : 'chat');
      setBrandToolsEnabled(Boolean(parsed?.brandToolsEnabled));
    } catch {
      setChatMode('chat');
      setBrandToolsEnabled(false);
    }
  }, [sessionId, setBrandToolsEnabled, setChatMode]);

  useEffect(() => {
    localStorage.setItem(getSessionPrefsKey(sessionId), JSON.stringify({ chatMode, brandToolsEnabled }));
  }, [sessionId, chatMode, brandToolsEnabled]);

  useEffect(() => {
    const onSetChatMode = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as { sessionId?: string; chatMode?: string } | undefined;
      if (!detail?.sessionId || detail.sessionId !== sessionId) return;
      setChatMode(detail.chatMode === 'brand' ? 'brand' : 'chat');
    };
    window.addEventListener('set-chat-mode', onSetChatMode);
    return () => window.removeEventListener('set-chat-mode', onSetChatMode);
  }, [sessionId, setChatMode]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('chat-mode-changed', { detail: { sessionId, chatMode } }));
  }, [sessionId, chatMode]);
};

