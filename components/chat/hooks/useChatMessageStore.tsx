import { useEffect } from 'react';
import { Message } from '../../../types';
import { SupabaseService } from '../../../services/supabase';

export const useChatMessageStore = ({
  sessionId,
  isAuthenticated,
  userId,
  supabaseService,
  messages,
  setMessages,
  onSessionUpdate,
}: {
  sessionId: string;
  isAuthenticated: boolean;
  userId?: string | null;
  supabaseService: SupabaseService;
  messages: Message[];
  setMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void;
  onSessionUpdate: (id: string, preview: string) => void;
}) => {
  useEffect(() => {
    const loadData = async () => {
      setMessages([]); // Clear previous chat instantly

      if (isAuthenticated && userId) {
        try {
          const loadedMsgs = await supabaseService.loadMessages(sessionId, userId);
          if (loadedMsgs.length > 0) {
            setMessages(loadedMsgs);
          }
        } catch (e) {
          void e;
        }
      } else {
        const stored = localStorage.getItem(`chutes_messages_${sessionId}`);
        if (stored) {
          try {
            setMessages(JSON.parse(stored));
          } catch {
            setMessages([]);
          }
        }
      }
    };
    loadData();
  }, [sessionId, isAuthenticated, userId, supabaseService, setMessages]);

  useEffect(() => {
    if (!isAuthenticated && messages.length > 0) {
      const safeMessages = messages.map(({ audioUrl, ...rest }) => rest);
      localStorage.setItem(`chutes_messages_${sessionId}`, JSON.stringify(safeMessages));
    }

    if (messages.length > 0) {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMsg && typeof lastUserMsg.content === 'string') {
        if (messages.length <= 2) {
          onSessionUpdate(sessionId, lastUserMsg.content);
        }
      }
    }
  }, [messages, sessionId, isAuthenticated, onSessionUpdate]);
};
