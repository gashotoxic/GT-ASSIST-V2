
import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Square, Loader2, Volume2, Bot, User, StopCircle, Paperclip, X, FileText, Play, Search, Globe, Pause, RotateCcw, BrainCircuit, Edit3, Cpu, Copy, GitBranch, Check, Database, Lock, Plus } from 'lucide-react';
import { Button } from './UI';
import { Message, AppSettings, FileAttachment, ChatSession, AVAILABLE_MODELS, BASE_SYSTEM_CONTEXT, DEFAULT_SYSTEM_PROMPT, BRAND_STUDIO_MODEL_ID, NORMAL_CHAT_APP_FEATURES_CONTEXT, MediaItem, getModelShortName } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChutesService } from '../services/chutes';
import { SupabaseService } from '../services/supabase';
import { createBrandStudioToolRuntime } from '../services/brandStudioToolRuntime';
import { KnowledgeBaseService } from '../services/knowledgeBase';
import { KnowledgeBaseModal } from './KnowledgeBaseModal';
import { SearchResultsCard } from './SearchResultsCard';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { CreditAwareButton } from './CreditAwareButton';
import { useCredits } from '../context/CreditContext';
import { useAuthContext } from '../context/AuthContext';
import * as Tooltip from '@radix-ui/react-tooltip';
import { getCreditCost } from '../services/creditCosts';
import { EditMessageModal } from './EditMessageModal';
import { BranchModelModal } from './BranchModelModal';

interface ChatInterfaceProps {
  settings: AppSettings;
  sessionId: string;
  onSessionUpdate: (id: string, preview: string) => void;
  onSwitchSession: (id: string) => void;
  onNewSession: (session: ChatSession) => void;
  isAuthenticated: boolean;
  onRequestAuth: () => void;
  userId?: string | null;
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatModelName = (modelId: string) => {
  if (!modelId) return "";

  // 1. Try lookup in models list
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  let name = model ? model.name : (modelId.split('/').pop() || modelId);

  // 2. Remove emojis
  name = name.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();

  // 3. Strip common technical suffixes like TEE
  name = name.replace(/-TEE$/i, '').replace(/ TEE$/i, '').replace(/-Speciale$/i, '').replace(/-Flash$/i, '').replace(/-Thinking$/i, '');

  return name.trim();
};

const extractNodeText = (node: React.ReactNode): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractNodeText).join('');
  if (React.isValidElement(node)) return extractNodeText((node.props as any).children);
  return '';
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ settings, sessionId, onSessionUpdate, onSwitchSession, onNewSession, isAuthenticated, onRequestAuth, userId }) => {
  const { subscriptionTier } = useCredits();
  const { getToken } = useAuthContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);
  const [isSearchEnabled, setIsSearchEnabled] = useState(true);
  const [isKnowledgeEnabled, setIsKnowledgeEnabled] = useState(false);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{ message: Message; index: number } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [branchingIndex, setBranchingIndex] = useState<number | null>(null);
  const [chatMode, setChatMode] = useState<'chat' | 'brand'>('chat');
  const [brandToolsEnabled, setBrandToolsEnabled] = useState(false);
  const [isQuickToolsOpen, setIsQuickToolsOpen] = useState(false);
  const [brandPromptText, setBrandPromptText] = useState('');

  // Audio State
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Abort Controller for stopping generation
  const abortControllerRef = useRef<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  const { canAfford, refetch } = useCredits();

  const chutesService = new ChutesService(settings.apiKey);

  useEffect(() => {
    const url = new URL('../brandPrompt.txt', import.meta.url);
    fetch(url)
      .then(r => r.text())
      .then(setBrandPromptText)
      .catch(() => setBrandPromptText(''));
  }, []);

  useEffect(() => {
    if (!isQuickToolsOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsQuickToolsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isQuickToolsOpen]);

  // Knowledge Base service
  const knowledgeService = React.useMemo(
    () => new KnowledgeBaseService(settings),
    [settings]
  );

  // For authenticated users, ALWAYS use app's Supabase database (environment variables)
  // This ensures messages sync to Supabase, not localStorage
  const supabaseService = React.useMemo(() => {
    if (isAuthenticated) {
      const supabaseUrl = import.meta.env.VITE_APP_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_APP_SUPABASE_KEY;

      if (supabaseUrl && supabaseKey) {
        return new SupabaseService({
          ...settings,
          useSupabase: true,
          supabaseUrl,
          supabaseKey,
        });
      }
    }
    return new SupabaseService(settings);
  }, [settings, isAuthenticated]);

  const getSessionPrefsKey = (sid: string) => `chutes_chat_prefs_${sid}`;
  const setSessionPrefs = (sid: string, prefs: { chatMode: 'chat' | 'brand'; brandToolsEnabled: boolean }) => {
    localStorage.setItem(getSessionPrefsKey(sid), JSON.stringify(prefs));
  };

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
  }, [sessionId]);

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
  }, [sessionId]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('chat-mode-changed', { detail: { sessionId, chatMode } }));
  }, [sessionId, chatMode]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check if search is actually available based on keys
  const canSearch = (settings.searchProvider === 'tavily' && !!(settings.tavilyApiKey || import.meta.env.VITE_TAVILY_API_KEY)) ||
    (settings.searchProvider === 'brave' && !!(settings.braveApiKey || import.meta.env.VITE_BRAVE_API_KEY));
  const isHoverPointer = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Cleanup effect when sessionId changes (Stop generation/audio)
  useEffect(() => {
    // 1. Abort generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // 2. Stop Audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlayingAudio(false);
    setPlayingMessageId(null);
    setIsLoading(false);
    setLoadingStatus(null);
    setInputValue('');
    setAttachment(null);
  }, [sessionId]);

  // Load messages whenever sessionId changes
  useEffect(() => {
    const loadData = async () => {
      setMessages([]); // Clear previous chat instantly

      // For authenticated users: ONLY use Supabase, no fallbacks
      if (isAuthenticated && userId) {
        console.log('[ChatInterface] Loading messages from Supabase for user:', userId, 'session:', sessionId);
        try {
          const loadedMsgs = await supabaseService.loadMessages(sessionId, userId);
          console.log('[ChatInterface] Loaded', loadedMsgs.length, 'messages from Supabase');
          if (loadedMsgs.length > 0) {
            setMessages(loadedMsgs);
          }
        } catch (error) {
          console.error("[ChatInterface] Failed to load messages from Supabase:", error);
          // Don't fallback to localStorage for auth users
        }
      } else {
        console.log('[ChatInterface] Guest mode - loading from localStorage');
        // Guest users: use localStorage
        const stored = localStorage.getItem(`chutes_messages_${sessionId}`);
        if (stored) {
          setMessages(JSON.parse(stored));
        }
      }
    };
    loadData();
  }, [sessionId, isAuthenticated, userId, supabaseService]);

  // Save messages locally whenever they change (only for guests)
  useEffect(() => {
    // Only save to localStorage for guest users (not authenticated)
    if (!isAuthenticated && messages.length > 0) {
      // NOTE: We strip audioUrl blobs before saving to LS to avoid quota issues
      const safeMessages = messages.map(({ audioUrl, ...rest }) => rest);
      localStorage.setItem(`chutes_messages_${sessionId}`, JSON.stringify(safeMessages));
    }

    // Update sidebar title if it's the first user message
    if (messages.length > 0) {
      // Use slice/reverse to find last user message
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMsg && typeof lastUserMsg.content === 'string') {
        // We only update the preview occasionally or on first message to avoid spamming
        if (messages.length <= 2) {
          onSessionUpdate(sessionId, lastUserMsg.content);
        }
      }
    }
  }, [messages, sessionId, isAuthenticated]);

  // Audio Event Listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      setIsPlayingAudio(false);
      setPlayingMessageId(null);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, attachment, loadingStatus]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '28px'; // reset to min-height to calculate scrollHeight correctly
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 128)}px`; // Max height 128px
    }
  }, [inputValue]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Please select a file under 5MB.");
      return;
    }

    const reader = new FileReader();

    if (file.type.startsWith('image/')) {
      reader.onload = () => {
        setAttachment({
          type: 'image',
          name: file.name,
          data: reader.result as string,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('text/') || file.name.match(/\.(txt|md|json|js|ts|csv)$/)) {
      reader.onload = () => {
        setAttachment({
          type: 'text',
          name: file.name,
          data: reader.result as string,
          mimeType: 'text/plain'
        });
      };
      reader.readAsText(file);
    } else {
      alert("Unsupported file type. Please upload images or text files.");
    }
  };

  const clearAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setLoadingStatus(null);
    }
  };

  const handleSendMessage = async (
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

    // For authenticated users, ALWAYS use Supabase (enforced by App.tsx)
    // For guests, use local storage
    if (isAuthenticated && userId) {
      // Supabase mode for authenticated users - NO fallbacks
      try {
        await supabaseService.useCredits(userId, cost, 'chat', activeModel, sessionId);
        // Refresh credits after deduction
        refetch();
      } catch (error: any) {
        console.error('Credit deduction failed:', error);
        alert('Insufficient credits. Please add more credits to continue.');
        return;
      }
    } else {
      // Guest mode - use local credits
      const guestCredits = parseInt(localStorage.getItem('chutes_guest_credits') || '10');
      if (guestCredits < cost) {
        alert('You\'ve used your free guest credits. Sign in to get 10 free credits and continue using the assistant.');
        return;
      }
      // Deduct from guest storage
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
      model: activeModel // Track user intent model
    };

    // Determine the history context to use
    const currentHistory = historyOverride || messages;

    // Optimistic UI update
    setMessages([...currentHistory, userMsg]);
    setInputValue('');
    if (forcedAttachment === undefined) clearAttachment(); // Only clear if using state attachment
    setIsLoading(true);

    // Setup AbortController
    abortControllerRef.current = new AbortController();

    // Save user message to Supabase for authenticated users
    if (isAuthenticated && userId) {
      supabaseService.saveMessage(userMsg, sessionId, userId);
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

      // SYSTEM PROMPT CONSTRUCTION
      const baseStats = `Current Date: ${new Date().toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}`;

      // Dynamic Search Context
      const searchContext = isSearchEnabled
        ? "You have access to a web search tool. Use it if the user asks about current events, news, or requires real-time information. You should proactively search if the answer requires external knowledge."
        : "";

      const userPrompt = settings.systemPrompt || DEFAULT_SYSTEM_PROMPT;

      // Combine: Base -> Search -> Stats -> RAG (if any) -> User
      // We prepend the RAG context to the user instructions if it exists
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
        } catch (err) {
          console.warn('Knowledge base search failed:', err);
        }
      }

      // Add User Instructions last
      finalSystemPrompt += `\n\nUser Instructions:\n${userPrompt}`;

      const toolRuntime = brandToolsAllowed
        ? createBrandStudioToolRuntime({
          chutesService,
          supabaseService,
          subscriptionTier,
          userId,
          sessionId
        })
        : null;

      // Stream Chat Response with Tools support
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
          // Store sources in the message
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
        }
      }

      // Update the message with full content and thinking
      assistantMsg.content = fullResponse;
      assistantMsg.thinking = fullThinking || undefined;

      let dbId: string | null = null;
      if (isAuthenticated && userId) {
        dbId = await supabaseService.saveMessage(assistantMsg, sessionId, userId);
      }

      // Automatic TTS disabled as per user request. 
      // User must manually click the audio icon to read aloud.


    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Manually stopped
        setMessages(prev => prev.map(msg => {
          if (msg.role === 'assistant' && msg.id === (Date.now() + 1).toString()) {
            return { ...msg, content: msg.content + ' [Stopped]' };
          }
          return msg;
        }));
      } else {
        console.error(error);
        const errorMsg: Message = { role: 'system', content: `Error: ${(error as Error).message}` };
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
      setLoadingStatus(null);
      abortControllerRef.current = null;
    }
  };

  const handleRetry = async (index: number, msg: Message) => {
    // If retrying a USER message: We resend that message content. History is everything BEFORE this message.
    // If retrying an ASSISTANT message: We resend the LAST USER message (index-1). History is everything BEFORE the user message.

    let text = '';
    let retryAttachment: FileAttachment | null = null;
    let targetIndex = index;

    if (msg.role === 'assistant') {
      // Retry the assistant response = re-run the user prompt before it
      targetIndex = index - 1;
      if (targetIndex < 0) return; // Should not happen
      const userMsg = messages[targetIndex];
      // Type safe extraction
      if (typeof userMsg.content === 'string') {
        text = userMsg.content;
      } else if (Array.isArray(userMsg.content)) {
        userMsg.content.forEach(part => {
          if (part.type === 'text') text += (part.text || '');
          if (part.type === 'image_url' && part.image_url) {
            retryAttachment = { type: 'image', name: 'retry.png', data: part.image_url.url, mimeType: 'image/png' };
          }
        });
      }
    } else {
      // Retrying the user's own message
      if (typeof msg.content === 'string') {
        text = msg.content;
      } else if (Array.isArray(msg.content)) {
        msg.content.forEach(part => {
          if (part.type === 'text') text += (part.text || '');
          if (part.type === 'image_url' && part.image_url) {
            retryAttachment = { type: 'image', name: 'retry.png', data: part.image_url.url, mimeType: 'image/png' };
          }
        });
      }
    }

    // Slice history to keep everything BEFORE the target message (user message being retried)
    const newHistory = messages.slice(0, targetIndex);
    setMessages(newHistory);

    // Sync deletion with Supabase
    // We want to delete the target message and everything after it
    // The timestamp of the message at targetIndex is the cutoff
    const cutoffMsg = messages[targetIndex];
    if (isAuthenticated && userId) {
      const cutoffTime = cutoffMsg?.timestamp || Date.now();
      // AWAIT here to ensure database is in expected state before handleSendMessage re-saves
      await supabaseService.deleteMessagesAfter(sessionId, cutoffTime - 1);
    }

    handleSendMessage(text, retryAttachment, newHistory);
  };

  const handleEdit = (msg: Message, index: number) => {
    setEditingMessage({ message: msg, index });
  };

  const handleSaveEdit = async (newContent: string) => {
    if (!editingMessage) return;
    const { message, index } = editingMessage;

    // 1. Update the message object locally (just for the re-send logic)
    const updatedMsg = { ...message, content: newContent };

    // 2. Truncate history to BEFORE this message
    const historyBefore = messages.slice(0, index);

    // 3. Update State
    setMessages(historyBefore);

    // 4. Sync Database: Delete this message and all future ones
    if (isAuthenticated && userId && message.timestamp) {
      // We delete from this point forward because we are re-inserting the edited version as a new message 
      // effectively to ensure clean timeline. 
      // Alternatively, update the content and delete only *future* messages.
      // For simplicity and "Resend" logic, deleting forward is safest.
      await supabaseService.deleteMessagesAfter(sessionId, message.timestamp - 1);
    }

    // 5. Trigger Send (this will re-save the user message and generate new response)
    // We treat the edited message as a "new" input for the AI
    handleSendMessage(newContent, null, historyBefore);

    setEditingMessage(null);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBranch = (index: number) => {
    setBranchingIndex(index);
  };

  const confirmBranch = async (selectedModel: string) => {
    if (branchingIndex === null) return;
    const index = branchingIndex;
    setBranchingIndex(null);

    // Branching: Create a new session with messages up to this point
    const branchedHistory = messages.slice(0, index + 1);
    const newSessionId = crypto.randomUUID();

    // Determine title
    const firstUserMsg = branchedHistory.find(m => m.role === 'user');
    const title = typeof firstUserMsg?.content === 'string'
      ? firstUserMsg.content.slice(0, 40).trim() + (firstUserMsg.content.length > 40 ? '...' : '')
      : 'Branched Conversation';

    const newSession: ChatSession = {
      id: newSessionId,
      title,
      preview: title,
      updatedAt: Date.now(),
      isBranch: true,
      model: selectedModel
    };

    if (isAuthenticated && userId) {
      // 1. Create Session in Supabase
      await supabaseService.upsertSession(newSession, userId);

      // 2. Clone messages to new session
      let baseTime = Date.now();
      for (const msg of branchedHistory) {
        baseTime += 10;
        const newMsg = {
          ...msg,
          id: undefined,
          timestamp: baseTime
        };
        await supabaseService.saveMessage(newMsg, newSessionId, userId);
      }
    } else {
      localStorage.setItem(`chutes_messages_${newSessionId}`, JSON.stringify(branchedHistory));
      const currentStored = JSON.parse(localStorage.getItem('chutes_chat_sessions') || '[]');
      localStorage.setItem('chutes_chat_sessions', JSON.stringify([newSession, ...currentStored]));
    }

    setSessionPrefs(newSessionId, { chatMode, brandToolsEnabled });

    // 3. Update App State
    onNewSession(newSession);
    onSwitchSession(newSessionId);
  };

  const generateTTS = async (text: string): Promise<{ url: string | null, blob: Blob | null }> => {
    if (!text) return { url: null, blob: null };
    try {
      const blob = await chutesService.speak({
        text,
        speed: settings.ttsSpeed,
        voice: settings.ttsVoice
      });
      const url = URL.createObjectURL(blob);
      return { url, blob };
    } catch (err) {
      console.error("TTS failed", err);
      return { url: null, blob: null };
    }
  };

  const playAudio = (url: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play().catch(e => console.error("Audio playback error:", e));
      setIsPlayingAudio(true);
    }
  };

  const togglePlayback = (msgId: string, url: string) => {
    if (playingMessageId === msgId) {
      if (isPlayingAudio) {
        audioRef.current?.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current?.play();
        setIsPlayingAudio(true);
      }
    } else {
      setPlayingMessageId(msgId);
      playAudio(url);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleReplay = async (msg: Message) => {
    if (msg.role !== 'assistant') return;

    // STRATEGY: Check Level 2 (Cloud) -> Level 1 (Local/Memory) -> Generate

    // 1. Level 2: Check Remote URL first
    if (msg.audio_url) {
      togglePlayback(msg.id!, msg.audio_url);
      return;
    }

    // 2. Level 1: Check Local Blob URL (Memory Cache)
    if (msg.audioUrl) {
      togglePlayback(msg.id!, msg.audioUrl);
      return;
    }

    // 3. Last Resort: Generate from API
    // If we are here, we don't have audio. We must generate it.
    const textContent = typeof msg.content === 'string' ? msg.content : '';
    const ttsText = chutesService.cleanTextForTTS(textContent as string);
    if (!ttsText) return;

    setGeneratingAudioId(msg.id!);
    const { url, blob } = await generateTTS(ttsText);
    setGeneratingAudioId(null);

    if (url) {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, audioUrl: url } : m));
      setPlayingMessageId(msg.id!);
      playAudio(url);

      // Upload to Supabase for authenticated users
      if (isAuthenticated && userId && blob) {
        const publicUrl = await supabaseService.uploadAudio(blob, msg.id!, sessionId);
        if (publicUrl) {
          await supabaseService.updateMessageAudio(msg.id!, publicUrl);
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, audio_url: publicUrl } : m));
        }
      }
    }
  };

  const handleVoiceInput = async () => {
    if (isRecording) {
      try {
        setIsLoading(true);
        const audioBase64 = await stopRecording();
        const transcription = await chutesService.transcribe({ audio_b64: audioBase64 });

        if (transcription && transcription.trim()) {
          handleSendMessage(transcription);
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("STT failed", err);
        alert("Failed to transcribe audio.");
        setIsLoading(false);
      }
    } else {
      startRecording();
    }
  };

  const renderMessageContent = (content: any) => {
    if (typeof content === 'string') {
      // Clean up thoughts but keep them in UI if desired
      const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      // Return ReactMarkdown component
      return (
        <div className="prose dark:prose-invert prose-sm max-w-none break-words leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              pre: ({ node, ...props }) => {
                const [isCopied, setIsCopied] = React.useState(false);
                const codeText = extractNodeText(props.children).replace(/\n$/, '');

                const copy = async () => {
                  try {
                    if (navigator?.clipboard?.writeText) {
                      await navigator.clipboard.writeText(codeText);
                    } else {
                      const textarea = document.createElement('textarea');
                      textarea.value = codeText;
                      textarea.style.position = 'fixed';
                      textarea.style.left = '-9999px';
                      textarea.style.top = '-9999px';
                      document.body.appendChild(textarea);
                      textarea.focus();
                      textarea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textarea);
                    }
                    setIsCopied(true);
                    window.setTimeout(() => setIsCopied(false), 1200);
                  } catch {
                    setIsCopied(false);
                  }
                };

                return (
                  <div className="not-prose relative my-3 group w-full max-w-full min-w-0 overflow-hidden">
                    <button
                      type="button"
                      onClick={copy}
                      className="absolute top-2.5 right-2.5 z-10 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      title={isCopied ? 'Copied' : 'Copy'}
                    >
                      {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <pre
                      className="w-full max-w-full min-w-0 box-border bg-slate-600 text-slate-100 dark:bg-slate-800 dark:text-slate-100 p-4 rounded-xl overflow-x-auto text-sm font-mono border border-black/10 dark:border-white/10 shadow-inner whitespace-pre-wrap break-words"
                      style={{ WebkitOverflowScrolling: 'touch' }}
                      {...props}
                    />
                  </div>
                );
              },
              // Custom Table styling for overflow handling
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-white/10">
                  <table className="w-full border-collapse text-sm" {...props} />
                </div>
              ),
              thead: ({ node, ...props }) => <thead className="bg-gray-50 dark:bg-white/5" {...props} />,
              th: ({ node, ...props }) => <th className="p-2 text-left font-bold border-b border-gray-200 dark:border-white/10" {...props} />,
              td: ({ node, ...props }) => <td className="p-2 border-b border-gray-100 dark:border-white/5 last:border-0" {...props} />,
              // Links -> new tab
              a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" {...props} />,
              code: ({ node, className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match && !String(children).includes('\n');
                return isInline ? (
                  <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-xs sm:text-sm font-mono text-red-500 dark:text-red-400 break-all" {...props}>
                    {children}
                  </code>
                ) : (
                  <code className={`${className} break-words`} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {cleanContent || content}
          </ReactMarkdown>
        </div>
      );
    }

    if (Array.isArray(content)) {
      return content.map((part: any, i: number) => {
        if (part.type === 'text') return (
          <span key={i} className="block prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
          </span>
        );
        if (part.type === 'image_url') return (
          <div key={i} className="my-2 rounded-lg overflow-hidden border border-white/20 shadow-lg">
            <img src={part.image_url.url} alt="User upload" className="max-w-full h-auto max-h-64 object-contain" />
          </div>
        );
        return null;
      });
    }
    return '';
  };

  // Helper to render tool messages (Search Results)
  const renderToolMessage = (msg: Message) => {
    if (msg.sources && msg.sources.length > 0) {
      return (
        <div className="w-full max-w-2xl mx-auto my-2 animate-in fade-in slide-in-from-top-2">
          <SearchResultsCard
            sources={msg.sources}
            isCollapsible={true}
            defaultExpanded={false}
          />
        </div>
      );
    }
    return null; // Don't render other tool messages or empty ones
  };

  return (
    <div key={sessionId} className="flex flex-col h-full w-full max-w-5xl mx-auto relative glass-card md:rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-300 animate-in fade-in border border-white/40 dark:border-white/10 min-h-0">
      <audio ref={audioRef} className="hidden" />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-1 xs:p-2 sm:p-6 space-y-3 xs:space-y-4 sm:space-y-8 scroll-smooth custom-scrollbar">
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
          <div
            key={idx}
            className={`flex items-end gap-1 xs:gap-2 min-w-0 group animate-in slide-in-from-bottom-4 duration-500 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              } ${msg.role === 'tool' ? 'w-full justify-center' : ''}`}
          >
            {/* Tool Message (Hidden, now rendered in assistant message) */}
            {/* {msg.role === 'tool' && renderToolMessage(msg)} */}

            {/* Regular Avatar (Skip for tools) */}
            {msg.role !== 'tool' && (msg.role !== 'assistant' || msg.content !== '') ? (
              <div className={`shrink-0 w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 duration-300 ${msg.role === 'user'
                ? 'bg-gradient-to-br from-primary to-primary-dark text-white border border-primary-light/30'
                : msg.role === 'system'
                  ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300'
                  : 'bg-white/50 dark:bg-slate-800/40 text-primary dark:text-primary-light border border-white/50 dark:border-white/10 backdrop-blur-md'
                }`}>
                {msg.role === 'user' ? <User className="w-3.5 h-3.5 xs:w-4 xs:h-4" /> : <Bot className="w-3.5 h-3.5 xs:w-4 xs:h-4" />}
              </div>
            ) : null}

            {/* Bubble Container */}
            {msg.role !== 'tool' && msg.content && (
              <div className={`flex flex-col gap-1 min-w-0 max-w-[85%] xs:max-w-[90%] sm:max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`relative px-3 py-2 sm:px-5 sm:py-3 rounded-[1.5rem] text-sm leading-relaxed break-words shadow-sm transition-all duration-300 hover:shadow-md ${msg.role === 'user'
                      ? 'bg-gradient-to-tr from-primary to-emerald-600 text-white rounded-br-sm shadow-primary/20'
                      : msg.role === 'system'
                        ? 'bg-rose-50/60 dark:bg-rose-900/20 text-rose-600 dark:text-rose-200 border border-rose-100 dark:border-rose-900/30 backdrop-blur-md w-full'
                        : 'bg-white/40 dark:bg-[#0f172a]/40 text-slate-800 dark:text-slate-100 rounded-bl-sm backdrop-blur-2xl border border-white/60 dark:border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)] min-w-[72px] xs:min-w-[100px]'
                      }`}
                  >
                    {/* Header: Thinking & Sources */}
                    {msg.role === 'assistant' && (
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {/* Thinking Toggle */}
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

                        {/* Sources Toggle */}
                        {msg.sources && msg.sources.length > 0 && (
                          <details className="group animate-in fade-in zoom-in-95">
                            <summary className="cursor-pointer text-xs font-medium text-gray-500 dark:text-gray-400 select-none flex items-center gap-1.5 hover:text-blue-500 transition-colors w-fit p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5">
                              <Search className="w-3.5 h-3.5" />
                              <span>{msg.sources.length} Sources</span>
                            </summary>
                            <div className="mt-2 w-full max-w-md">
                              <SearchResultsCard
                                sources={msg.sources}
                                isCollapsible={false}
                              />
                            </div>
                          </details>
                        )}
                      </div>
                    )}

                    {msg.media && msg.media.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {msg.media.map((m) => (
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
                    )}

                    {renderMessageContent(msg.content)}

                    {msg.role === 'assistant' && (
                      <div className={`mt-3 pt-3 border-t border-gray-200/40 dark:border-white/5 transition-all duration-300 ${playingMessageId === msg.id ? 'block' : 'hidden'}`}>
                        <div className="flex items-center gap-3 select-none">
                          <button
                            onClick={() => handleReplay(msg)}
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
                              onChange={handleSeek}
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

                  {/* Actions Row (Positioned below the bubble) */}
                  {!isLoading && (
                    <div className={`flex items-center gap-1 transition-opacity duration-300 opacity-0 group-hover:opacity-100 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Regenerate Action (Both) */}
                      <button
                        onClick={() => handleRetry(idx, msg)}
                        className="p-2 rounded-full text-gray-400 hover:text-primary hover:bg-white/60 dark:hover:bg-white/10 transition-all"
                        title="Regenerate/Retry"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      {/* Branch Action (Both) */}
                      <button
                        onClick={() => handleBranch(idx)}
                        className="p-2 rounded-full text-gray-400 hover:text-primary hover:bg-white/60 dark:hover:bg-white/10 transition-all"
                        title="Branch from here"
                      >
                        <GitBranch className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit Action (User Only) */}
                      {msg.role === 'user' && (
                        <button
                          onClick={() => handleEdit(msg, idx)}
                          className="p-2 rounded-full text-gray-400 hover:text-primary hover:bg-white/60 dark:hover:bg-white/10 transition-all"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Copy Action (Both) */}
                      <button
                        onClick={() => handleCopy(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content), msg.id || idx.toString())}
                        className="p-2 rounded-full text-gray-400 hover:text-primary hover:bg-white/60 dark:hover:bg-white/10 transition-all"
                        title="Copy"
                      >
                        {copiedId === (msg.id || idx.toString()) ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {/* Voice Read (Assistant Only) */}
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => handleReplay(msg)}
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
                          <Cpu className="w-3 h-3" />
                          <span>{formatModelName(msg.model)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>


              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 pl-2">
            <div className="w-8 h-8 rounded-full bg-white/50 dark:bg-slate-800/50 flex items-center justify-center border border-white/20 shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-primary/20 animate-pulse"></div>
              <BrainCircuit className="w-4 h-4 text-primary relative z-10 animate-bounce transition-all duration-1000" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="bg-gradient-to-r from-white/40 to-white/60 dark:from-slate-800/40 dark:to-slate-900/40 px-4 py-2 rounded-2xl rounded-bl-sm backdrop-blur-md border border-white/30 dark:border-white/5 flex items-center shadow-sm">
                <div className="flex items-end gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-[bounce_1s_infinite_0ms]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-[bounce_1s_infinite_120ms]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-[bounce_1s_infinite_240ms]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-[bounce_1s_infinite_360ms]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-[bounce_1s_infinite_480ms]"></span>
                </div>
              </div>
              {loadingStatus && (
                <div className="pl-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 truncate">
                  {loadingStatus}
                </div>
              )}
              <button
                onClick={handleStop}
                className="text-[10px] font-semibold text-red-400 hover:text-red-500 flex items-center gap-1 pl-1 transition-colors uppercase tracking-wider"
              >
                <StopCircle className="w-2.5 h-2.5" /> Cancel Generation
              </button>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-2 sm:p-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-t border-white/50 dark:border-white/5 z-20">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          {attachment && (
            <div className="flex items-center gap-3 p-2 bg-white/50 dark:bg-slate-800/50 rounded-lg w-fit border border-primary/20 animate-in slide-in-from-bottom-2">
              <div className="w-10 h-10 rounded bg-gray-100 dark:bg-black/20 flex items-center justify-center overflow-hidden">
                {attachment.type === 'image' ? (
                  <img src={attachment.data} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <FileText className="w-5 h-5 text-gray-500" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium truncate max-w-[150px] text-gray-700 dark:text-gray-300">{attachment.name}</span>
                <span className="text-[10px] text-gray-500 uppercase">{attachment.type}</span>
              </div>
              <button onClick={clearAttachment} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="relative flex items-end gap-1 sm:gap-2 bg-white/80 dark:bg-slate-950/50 p-1.5 sm:p-2 rounded-[1.5rem] border border-gray-200/50 dark:border-white/10 shadow-lg focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*, .txt, .md, .json, .js, .ts, .csv"
            />
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full h-8 w-8 sm:h-10 sm:w-10 shrink-0 transition-all duration-300 ${isQuickToolsOpen
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : 'text-gray-500 hover:text-primary hover:bg-primary/5 dark:hover:bg-white/5'
                }`}
              onClick={() => setIsQuickToolsOpen(v => !v)}
              title={isQuickToolsOpen ? 'Hide tools' : 'Show tools'}
            >
              <Plus className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${isQuickToolsOpen ? 'rotate-45' : ''}`} />
            </Button>

            {isQuickToolsOpen && (
              <>
                {!isHoverPointer && <div className="fixed inset-0 z-40" onClick={() => setIsQuickToolsOpen(false)} />}
                <div
                  onMouseLeave={() => {
                    if (isHoverPointer) setIsQuickToolsOpen(false);
                  }}
                  className="absolute left-0 bottom-[calc(100%+0.5rem)] z-50 w-[min(15.5rem,calc(100vw-1.25rem))] rounded-2xl bg-white/85 dark:bg-[#0f172a]/90 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] dark:shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-2 ring-1 ring-black/5"
                >
                  <div className="p-1.5 flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickToolsOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full px-3 py-2 rounded-xl text-[13px] font-bold text-gray-700 dark:text-gray-200 hover:bg-primary/5 transition-colors flex items-center gap-2"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Attachments</span>
                    </button>

                    {canSearch && (
                      <button
                        type="button"
                        onClick={() => setIsSearchEnabled(v => !v)}
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
                          setIsKnowledgeEnabled(v => !v);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (subscriptionTier === 'free') return;
                          setShowKnowledgeModal(true);
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
                      </button>
                    )}

                    {chatMode === 'brand' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!isAuthenticated) {
                            setIsQuickToolsOpen(false);
                            onRequestAuth();
                            return;
                          }
                          if (subscriptionTier !== 'plus' && subscriptionTier !== 'pro') {
                            setIsQuickToolsOpen(false);
                            window.location.href = '/#pricing';
                            return;
                          }
                          setBrandToolsEnabled(v => !v);
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
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

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
                          setBrandToolsEnabled(!brandToolsEnabled);
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
                onClick={() => setIsSearchEnabled(!isSearchEnabled)}
                title={isSearchEnabled ? "Web Search Enabled" : "Enable Web Search"}
              >
                <Globe className={`w-4 h-4 sm:w-5 sm:h-5 ${isSearchEnabled ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`} />
              </Button>
            )}

            {/* Knowledge Base Toggle - For authenticated users (Paid Tiers Only) */}
            {isAuthenticated && userId && !isQuickToolsOpen && isKnowledgeEnabled && (
              <Tooltip.Provider>
                <Tooltip.Root delayDuration={0}>
                  <Tooltip.Trigger asChild>
                    <div className="relative group/kb">
                      <button
                        type="button"
                        onClick={() => {
                          if (subscriptionTier === 'free') return;
                          setIsKnowledgeEnabled(!isKnowledgeEnabled);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (subscriptionTier === 'free') return;
                          setShowKnowledgeModal(true);
                        }}
                        className={`rounded-full h-8 w-8 sm:h-10 sm:w-10 shrink-0 transition-all duration-300 flex items-center justify-center relative ${isKnowledgeEnabled
                          ? 'bg-violet-500/10 text-violet-500 hover:bg-violet-500/20'
                          : subscriptionTier === 'free'
                            ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                            : 'text-gray-500 hover:text-violet-500 hover:bg-violet-500/5 dark:hover:bg-white/5'
                          }`}
                      >
                        <Database className={`w-4 h-4 sm:w-5 sm:h-5 ${isKnowledgeEnabled ? 'text-violet-500' : ''}`} />

                        {/* Lock Badge for Free Users */}
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
                    const brandChatModelId = settings.brandModel || BRAND_STUDIO_MODEL_ID;
                    const modelToCharge = chatMode === 'brand' ? brandChatModelId : settings.model;
                    if (canAfford('chat', modelToCharge)) {
                      handleSendMessage(inputValue);
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
            />

            <div className="flex items-center gap-0.5 sm:gap-1 pb-0.5">
              <Button
                variant={isRecording ? "destructive" : "ghost"}
                size="icon"
                onClick={() => isAuthenticated ? handleVoiceInput() : onRequestAuth()}
                disabled={!isAuthenticated}
                className={`rounded-full h-8 w-8 sm:h-9 sm:w-9 transition-all ${isRecording ? 'animate-pulse' : 'text-gray-500 hover:text-primary disabled:opacity-50'}`}
                title={isAuthenticated ? "Voice Input" : "Sign in to use voice input"}
              >
                {isRecording ? <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
              </Button>

              <CreditAwareButton
                action="chat"
                model={chatMode === 'brand' ? (settings.brandModel || BRAND_STUDIO_MODEL_ID) : settings.model}
                onClick={() => handleSendMessage(inputValue)}
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


      {
        editingMessage && (
          <EditMessageModal
            message={editingMessage.message}
            isOpen={!!editingMessage}
            onClose={() => setEditingMessage(null)}
            onSave={handleSaveEdit}
          />
        )
      }
      {
        branchingIndex !== null && (
          <BranchModelModal
            isOpen={branchingIndex !== null}
            onClose={() => setBranchingIndex(null)}
            onConfirm={confirmBranch}
            currentModel={settings.model}
          />
        )
      }
      {/* Knowledge Base Modal */}
      {showKnowledgeModal && userId && (
        <KnowledgeBaseModal
          isOpen={showKnowledgeModal}
          onClose={() => setShowKnowledgeModal(false)}
          settings={settings}
          userId={userId}
        />
      )}
    </div >
  );
};

export default ChatInterface;
