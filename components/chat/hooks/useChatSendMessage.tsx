import { useCallback } from 'react';
import { AppSettings, BRAND_STUDIO_MODEL_ID, DEFAULT_SYSTEM_PROMPT, Message, MediaItem, NORMAL_CHAT_APP_FEATURES_CONTEXT, BASE_SYSTEM_CONTEXT, RESPONSE_FORMAT_CONTEXT } from '../../../types';
import { createBrandStudioToolRuntime } from '../../../services/brandStudioToolRuntime';
import { KnowledgeBaseService } from '../../../services/knowledgeBase';
import { getCreditCost } from '../../../services/creditCosts';
import { ChutesService } from '../../../services/chutes';
import { SupabaseService } from '../../../services/supabase';
import { FileAttachment } from '../../../types';

type SubscriptionTier = 'free' | 'basic' | 'plus' | 'pro';

export const useChatSendMessage = ({
  settings,
  sessionId,
  isAuthenticated,
  userId,
  chatMode,
  brandToolsEnabled,
  subscriptionTier,
  isSearchEnabled,
  isKnowledgeEnabled,
  brandPromptText,
  knowledgeService,
  getToken,
  chutesService,
  supabaseService,
  refetchCredits,
  abortControllerRef,
  messages,
  setMessages,
  attachment,
  clearAttachment,
  setInputValue,
  setIsQuickToolsOpen,
  setIsLoading,
  setLoadingStatus,
}: {
  settings: AppSettings;
  sessionId: string;
  isAuthenticated: boolean;
  userId?: string | null;
  chatMode: 'chat' | 'brand';
  brandToolsEnabled: boolean;
  subscriptionTier: SubscriptionTier;
  isSearchEnabled: boolean;
  isKnowledgeEnabled: boolean;
  brandPromptText: string;
  knowledgeService: KnowledgeBaseService;
  getToken: () => Promise<string | null>;
  chutesService: ChutesService;
  supabaseService: SupabaseService;
  refetchCredits: () => void;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  attachment: FileAttachment | null;
  clearAttachment: () => void;
  setInputValue: (v: string) => void;
  setIsQuickToolsOpen: (v: boolean) => void;
  setIsLoading: (v: boolean) => void;
  setLoadingStatus: (v: string | null) => void;
}) => {
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setLoadingStatus(null);
    }
  }, [abortControllerRef, setIsLoading, setLoadingStatus]);

  const handleSendMessage = useCallback(async (
    textInput: string,
    forcedAttachment?: FileAttachment | null,
    historyOverride?: Message[]
  ) => {
    const activeAttachment = forcedAttachment !== undefined ? forcedAttachment : attachment;

    if (!textInput.trim() && !activeAttachment) return;
    setIsQuickToolsOpen(false);

    const brandChatModelId = settings.brandModel || BRAND_STUDIO_MODEL_ID;
    const activeModel = chatMode === 'brand' ? brandChatModelId : settings.model;
    const cost = getCreditCost('chat', activeModel);

    if (isAuthenticated && userId) {
      try {
        await supabaseService.useCredits(userId, cost, 'chat', activeModel, sessionId);
        refetchCredits();
      } catch (error: any) {
        alert('Insufficient credits. Please add more credits to continue.');
        return;
      }
    } else {
      const guestCredits = parseInt(localStorage.getItem('chutes_guest_credits') || '10');
      if (guestCredits < cost) {
        alert('You\'ve used your free guest credits. Sign in to get 10 free credits and continue using the assistant.');
        return;
      }
      localStorage.setItem('chutes_guest_credits', (guestCredits - cost).toString());
    }

    let userContent: any = textInput;

    if (activeAttachment) {
      if (activeAttachment.type === 'image') {
        userContent = [
          { type: 'text', text: textInput || "Describe this image." },
          { type: 'image_url', image_url: { url: activeAttachment.data } }
        ];
      } else {
        userContent = `${textInput}\n\n[Attached File: ${activeAttachment.name}]\n\`\`\`\n${activeAttachment.data}\n\`\`\``;
      }
    }

    const userMsg: Message = {
      role: 'user',
      content: userContent,
      id: Date.now().toString(),
      timestamp: Date.now(),
      model: activeModel
    };

    const currentHistory = historyOverride || messages;

    setMessages([...currentHistory, userMsg]);
    setInputValue('');
    if (forcedAttachment === undefined) clearAttachment();
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    if (isAuthenticated && userId) {
      try {
        const dbId = await supabaseService.saveMessage(userMsg, sessionId, userId);
        if (dbId) {
          setMessages(prev => prev.map(m => (m.id === userMsg.id ? { ...m, id: dbId } : m)));
        }
      } catch {
        void 0;
      }
    }

    try {
      let assistantMsg: Message = {
        role: 'assistant',
        content: '',
        thinking: undefined,
        id: (Date.now() + 1).toString(),
        timestamp: Date.now() + 1,
        model: activeModel
      };
      setMessages(prev => [...prev, assistantMsg]);

      let fullResponse = '';
      let fullThinking = '';

      const searchConfig = {
        enabled: isSearchEnabled,
        apiKey: settings.searchProvider === 'brave'
          ? (settings.braveApiKey || import.meta.env.VITE_BRAVE_API_KEY || '')
          : (settings.tavilyApiKey || import.meta.env.VITE_TAVILY_API_KEY || ''),
        provider: settings.searchProvider
      };

      const baseStats = `Current Date: ${new Date().toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}`;

      const searchContext = isSearchEnabled
        ? "You have access to a web search tool. Use it if the user asks about current events, news, or requires real-time information. You should proactively search if the answer requires external knowledge."
        : "";

      const userPrompt = settings.systemPrompt || DEFAULT_SYSTEM_PROMPT;

      const brandToolsAllowed =
        chatMode === 'brand' &&
        brandToolsEnabled &&
        (subscriptionTier === 'plus' || subscriptionTier === 'pro') &&
        Boolean(isAuthenticated && userId);

      const brandWrapper = `MODE: BRAND_STUDIO\nTOOLS_ENABLED: ${brandToolsAllowed ? 'true' : 'false'}\n\nIf TOOLS_ENABLED is true, you may call:\n- generate_image({prompt, aspectRatio?}) to generate a marketing image now.\n- edit_image({prompt, image_b64, aspectRatio?}) to edit an uploaded image now.\nOnly call tools when the user explicitly asks to generate/edit now. If TOOLS_ENABLED is false, provide prompts and step-by-step UI instructions only.`;

      let finalSystemPrompt =
        chatMode === 'brand'
          ? `${brandWrapper}\n\n${BASE_SYSTEM_CONTEXT}\n${searchContext}\n${baseStats}\n\n${brandPromptText || ''}`
          : `${BASE_SYSTEM_CONTEXT}\n${searchContext}\n${baseStats}\n\n${NORMAL_CHAT_APP_FEATURES_CONTEXT}`;

      if (isKnowledgeEnabled && isAuthenticated && userId) {
        try {
          setLoadingStatus('Searching knowledge base...');
          const userQuery = typeof userContent === 'string' ? userContent : textInput;
          const token = await getToken();
          const relevantChunks = await knowledgeService.searchKnowledge(userQuery, userId, token || '', 5, 0.6);

          if (relevantChunks.length > 0) {
            const ragContext = knowledgeService.buildRAGContext(relevantChunks);
            finalSystemPrompt += `\n\nKNOWLEDGE BASE CONTEXT:\n${ragContext}`;
            setLoadingStatus(`Found ${relevantChunks.length} relevant documents`);
          }
        } catch (e) {
          void e;
        }
      }

      finalSystemPrompt += `\n\nUser Instructions:\n${userPrompt}`;
      finalSystemPrompt += `\n\n${RESPONSE_FORMAT_CONTEXT}`;

      const toolRuntime = brandToolsAllowed
        ? createBrandStudioToolRuntime({
          chutesService,
          supabaseService,
          subscriptionTier,
          userId,
          sessionId
        })
        : null;

      const stream = chutesService.streamChat(
        [...currentHistory, userMsg],
        finalSystemPrompt,
        activeModel,
        searchConfig,
        toolRuntime ? { executeTool: toolRuntime.executeTool } : null,
        null,
        (status) => setLoadingStatus(status),
        abortControllerRef.current.signal
      );

      for await (const chunk of stream) {
        if (chunk.type === 'thinking') {
          fullThinking += chunk.text;
          setMessages(prev =>
            prev.map(msg => msg.id === assistantMsg.id ? { ...msg, thinking: fullThinking } : msg)
          );
        } else if (chunk.type === 'content') {
          fullResponse += chunk.text;
          setMessages(prev =>
            prev.map(msg => msg.id === assistantMsg.id ? { ...msg, content: fullResponse } : msg)
          );
        } else if (chunk.type === 'sources') {
          setMessages(prev =>
            prev.map(msg => msg.id === assistantMsg.id ? { ...msg, sources: chunk.sources } : msg)
          );
        } else if (chunk.type === 'tool_result') {
          const result: any = (chunk as any).result;
          if (result?.type === 'image') {
            const media: MediaItem = {
              id: result.mediaItemId || `${Date.now()}`,
              type: 'image',
              url: result.url,
              prompt: result.prompt || '',
              createdAt: Date.now(),
              sessionId
            };
            setMessages(prev =>
              prev.map(msg => msg.id === assistantMsg.id ? { ...msg, media: [...(msg.media || []), media] } : msg)
            );
          } else if (result?.type === 'error') {
            fullResponse += `\n\n${result.message}`;
            setMessages(prev =>
              prev.map(msg => msg.id === assistantMsg.id ? { ...msg, content: fullResponse } : msg)
            );
          }
        } else if (chunk.type === 'done') {
          setIsLoading(false);
          setLoadingStatus(null);
          abortControllerRef.current = null;
          break;
        }
      }

      assistantMsg.content = fullResponse;
      assistantMsg.thinking = fullThinking || undefined;

      if (isAuthenticated && userId) {
        try {
          const dbId = await supabaseService.saveMessage(assistantMsg, sessionId, userId);
          if (dbId) {
            setMessages(prev => prev.map(m => (m.id === assistantMsg.id ? { ...m, id: dbId } : m)));
          }
        } catch {
          void 0;
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessages(prev => prev.map(msg => {
          if (msg.role === 'assistant' && msg.id === (Date.now() + 1).toString()) {
            return { ...msg, content: (msg.content as any) + ' [Stopped]' };
          }
          return msg;
        }));
      } else {
        const errorMsg: Message = { role: 'system', content: `Error: ${(error as Error).message}` };
        setMessages(prev => [...prev, errorMsg]);
        // Refund credits on error (not on user abort)
        if (isAuthenticated && userId) {
          try {
            await supabaseService.addCredits(userId, cost, 'refund');
            refetchCredits();
          } catch {
            void 0;
          }
        } else {
          const guestCredits = parseInt(localStorage.getItem('chutes_guest_credits') || '10');
          localStorage.setItem('chutes_guest_credits', String(guestCredits + cost));
        }
      }
    } finally {
      setIsLoading(false);
      setLoadingStatus(null);
      abortControllerRef.current = null;
    }
  }, [
    attachment,
    brandPromptText,
    brandToolsEnabled,
    chatMode,
    chutesService,
    clearAttachment,
    getToken,
    isAuthenticated,
    isKnowledgeEnabled,
    isSearchEnabled,
    knowledgeService,
    messages,
    refetchCredits,
    sessionId,
    setInputValue,
    setIsLoading,
    setIsQuickToolsOpen,
    setLoadingStatus,
    setMessages,
    settings,
    subscriptionTier,
    supabaseService,
    userId,
    abortControllerRef,
  ]);

  return { handleSendMessage, handleStop };
};
