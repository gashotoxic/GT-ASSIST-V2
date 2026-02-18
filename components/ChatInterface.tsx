
import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Square, X, FileText, Globe, Check, Copy } from 'lucide-react';
import { Button } from './UI';
import { Message, AppSettings, FileAttachment, ChatSession, AVAILABLE_MODELS } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { KnowledgeBaseService } from '../services/knowledgeBase';
import { KnowledgeBaseModal } from './KnowledgeBaseModal';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { CreditAwareButton } from './CreditAwareButton';
import { useCredits } from '../context/CreditContext';
import { useAuthContext } from '../context/AuthContext';
import { useServices } from '../context/ServicesContext';
import { ChatLoadingIndicator } from './chat/ChatLoadingIndicator';
import { ChatComposer } from './chat/ChatComposer';
import { MessageList } from './chat/MessageList';
import { useChatSessionPrefs } from './chat/hooks/useChatSessionPrefs';
import { useChatMessageStore } from './chat/hooks/useChatMessageStore';
import { useChatSendMessage } from './chat/hooks/useChatSendMessage';
import * as Tooltip from '@radix-ui/react-tooltip';
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

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const ChatInterface: React.FC<ChatInterfaceProps> = ({ settings, sessionId, onSessionUpdate, onSwitchSession, onNewSession, isAuthenticated, onRequestAuth, userId }) => {
  const { subscriptionTier } = useCredits();
  const { getToken } = useAuthContext();
  const { supabaseService, chutesService } = useServices();
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
  const didInitSessionCleanupRef = useRef(false);
  const lastDraftSessionIdRef = useRef<string | null>(null);
  const skipNextDraftSaveRef = useRef(false);
  const inputValueRef = useRef('');

  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  const { canAfford, refetch } = useCredits();

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


  useChatSessionPrefs({
    sessionId,
    chatMode,
    setChatMode,
    brandToolsEnabled,
    setBrandToolsEnabled,
  });

  const setSessionPrefs = (sid: string, prefs: { chatMode: 'chat' | 'brand'; brandToolsEnabled: boolean }) => {
    localStorage.setItem(`chutes_chat_prefs_${sid}`, JSON.stringify(prefs));
  };

  const getDraftKey = (sid: string, uid?: string | null) => `chutes_chat_draft_${uid || 'guest'}_${sid}`;

  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  useEffect(() => {
    const prevSessionId = lastDraftSessionIdRef.current;
    lastDraftSessionIdRef.current = sessionId;

    if (prevSessionId !== sessionId) {
      const primary = localStorage.getItem(getDraftKey(sessionId, userId));
      const fallback = userId ? localStorage.getItem(getDraftKey(sessionId, null)) : null;
      const draft = primary || fallback || '';
      skipNextDraftSaveRef.current = true;
      setInputValue(draft);
      return;
    }

    if (userId) {
      const primary = localStorage.getItem(getDraftKey(sessionId, userId));
      const guest = localStorage.getItem(getDraftKey(sessionId, null));
      if (!primary && guest && inputValueRef.current) {
        localStorage.setItem(getDraftKey(sessionId, userId), inputValueRef.current);
      }
    }
  }, [sessionId, userId]);

  useEffect(() => {
    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false;
      return;
    }
    const key = getDraftKey(sessionId, userId);
    if (inputValue) {
      localStorage.setItem(key, inputValue);
    } else {
      localStorage.removeItem(key);
    }
  }, [sessionId, userId, inputValue]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check if search is actually available based on keys
  const canSearch = (settings.searchProvider === 'tavily' && !!(settings.tavilyApiKey || import.meta.env.VITE_TAVILY_API_KEY)) ||
    (settings.searchProvider === 'brave' && !!(settings.braveApiKey || import.meta.env.VITE_BRAVE_API_KEY));
  const isHoverPointer = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Cleanup effect when sessionId changes (Stop generation/audio)
  useEffect(() => {
    if (!didInitSessionCleanupRef.current) {
      didInitSessionCleanupRef.current = true;
      return;
    }
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
    setAttachment(null);
  }, [sessionId]);

  useChatMessageStore({
    sessionId,
    isAuthenticated,
    userId,
    supabaseService,
    messages,
    setMessages,
    onSessionUpdate,
  });

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

  const { handleSendMessage, handleStop } = useChatSendMessage({
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
    refetchCredits: refetch,
    abortControllerRef,
    messages,
    setMessages,
    attachment,
    clearAttachment,
    setInputValue,
    setIsQuickToolsOpen,
    setIsLoading,
    setLoadingStatus,
  });

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

  const handleDelete = async (msg: Message, index: number) => {
    const confirmed = confirm('Delete this message?');
    if (!confirmed) return;
    const prev = messages;
    const next = prev.filter((_, i) => i !== index);
    setMessages(next);

    if (isAuthenticated && userId && msg.id) {
      try {
        const ok = await supabaseService.deleteMessage(msg.id, sessionId, userId);
        if (!ok) {
          setMessages(prev); // revert
          alert('Failed to delete message from server.');
        }
      } catch {
        setMessages(prev);
        alert('Failed to delete message from server.');
      }
    }
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
    const renderMarkdown = (text: string) => (
      <div className="prose dark:prose-invert prose-sm w-full max-w-full min-w-0 break-words [overflow-wrap:anywhere] leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            pre: ({ node, ...props }) => {
              const [isCopied, setIsCopied] = React.useState(false);
              const hljs = (window as any)?.hljs;

              const codeElement = (node as any)?.children?.find?.((c: any) => c?.tagName === 'code') ?? (node as any)?.children?.[0];
              const classList = codeElement?.properties?.className;
              const className = Array.isArray(classList) ? classList.join(' ') : (classList || '');
              const language = /language-([A-Za-z0-9_-]+)/.exec(className)?.[1];

              const codeText =
                (codeElement?.children?.[0]?.value as string | undefined)
                ?? extractNodeText((props as any).children);

              let highlighted = escapeHtml(codeText);
              if (hljs) {
                try {
                  highlighted = language
                    ? hljs.highlight(codeText, { language, ignoreIllegals: true }).value
                    : hljs.highlightAuto(codeText).value;
                } catch (e) {
                  void e;
                  highlighted = escapeHtml(codeText);
                }
              }

              const copy = async () => {
                const normalized = codeText.replace(/\n$/, '');
                try {
                  if (navigator?.clipboard?.writeText) {
                    await navigator.clipboard.writeText(normalized);
                  } else {
                    const textarea = document.createElement('textarea');
                    textarea.value = normalized;
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
                } catch (e) {
                  void e;
                  setIsCopied(false);
                }
              };

              return (
                <div
                  className="not-prose relative my-3 group w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x"
                  style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
                >
                  <button
                    type="button"
                    onClick={copy}
                    className="absolute top-2.5 right-2.5 z-10 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    title={isCopied ? 'Copied' : 'Copy'}
                  >
                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <pre
                    className="min-w-max box-border bg-[#0d1117] text-slate-100 p-4 rounded-xl text-sm font-mono border border-white/10 shadow-inner whitespace-pre"
                  >
                    <code
                      className={language ? `hljs language-${language}` : 'hljs'}
                      dangerouslySetInnerHTML={{ __html: highlighted }}
                    />
                  </pre>
                </div>
              );
            },
            table: ({ node, ...props }) => (
              <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-white/10">
                <table className="w-full border-collapse text-sm" {...props} />
              </div>
            ),
            thead: ({ node, ...props }) => <thead className="bg-gray-50 dark:bg-white/5" {...props} />,
            th: ({ node, ...props }) => <th className="p-2 text-left font-bold border-b border-gray-200 dark:border-white/10" {...props} />,
            td: ({ node, ...props }) => <td className="p-2 border-b border-gray-100 dark:border-white/5 last:border-0" {...props} />,
            a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" {...props} />,
            code: ({ node, className, children, ...props }: any) => {
              const match = /language-([A-Za-z0-9_-]+)/.exec(className || '');
              const isInline = !match && !String(children).includes('\n');
              if (!isInline) return <code className={className} {...props}>{children}</code>;
              return (
                <code className="font-mono text-[0.85em] text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words [overflow-wrap:anywhere]" {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    );

    if (typeof content === 'string') {
      const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      return renderMarkdown(cleanContent || content);
    }

    if (Array.isArray(content)) {
      return content.map((part: any, i: number) => {
        if (part.type === 'text') return <span key={i} className="block">{renderMarkdown(part.text)}</span>;
        if (part.type === 'image_url') {
          return (
            <div key={i} className="my-2 rounded-lg overflow-hidden border border-white/20 shadow-lg">
              <img src={part.image_url.url} alt="User upload" className="max-w-full h-auto max-h-64 object-contain" />
            </div>
          );
        }
        return null;
      });
    }
    return '';
  };

  return (
    <div key={sessionId} className="flex flex-col h-full w-full max-w-5xl mx-auto relative glass-card md:rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-300 animate-in fade-in border border-white/40 dark:border-white/10 min-h-0">
      <audio ref={audioRef} className="hidden" />

      <MessageList
        sessionId={sessionId}
        messages={messages}
        chatMode={chatMode}
        setChatMode={setChatMode}
        settings={settings}
        messagesEndRef={messagesEndRef}
        isLoading={isLoading}
        copiedId={copiedId}
        generatingAudioId={generatingAudioId}
        playingMessageId={playingMessageId}
        isPlayingAudio={isPlayingAudio}
        currentTime={currentTime}
        duration={duration}
        formatTime={formatTime}
        onSeek={handleSeek}
        onReplay={handleReplay}
        onRetry={handleRetry}
        onBranch={handleBranch}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCopy={handleCopy}
        renderMessageContent={renderMessageContent}
        formatModelName={formatModelName}
      />

      <ChatLoadingIndicator isLoading={isLoading} loadingStatus={loadingStatus} onStop={handleStop} />

      <ChatComposer
        settings={settings}
        isAuthenticated={isAuthenticated}
        userId={userId}
        subscriptionTier={subscriptionTier}
        chatMode={chatMode}
        brandToolsEnabled={brandToolsEnabled}
        onToggleBrandTools={() => setBrandToolsEnabled(v => !v)}
        canSearch={canSearch}
        isSearchEnabled={isSearchEnabled}
        onToggleSearch={() => setIsSearchEnabled(v => !v)}
        isKnowledgeEnabled={isKnowledgeEnabled}
        onToggleKnowledge={() => setIsKnowledgeEnabled(v => !v)}
        onOpenKnowledgeModal={() => setShowKnowledgeModal(true)}
        isHoverPointer={isHoverPointer}
        isQuickToolsOpen={isQuickToolsOpen}
        setIsQuickToolsOpen={setIsQuickToolsOpen}
        fileInputRef={fileInputRef}
        onFileSelect={handleFileSelect}
        attachment={attachment}
        onSetAttachment={(next) => setAttachment(next)}
        onClearAttachment={clearAttachment}
        inputValue={inputValue}
        setInputValue={setInputValue}
        textareaRef={textareaRef}
        isLoading={isLoading}
        canAfford={canAfford}
        onSend={(text) => handleSendMessage(text)}
        onRequestAuth={onRequestAuth}
        isRecording={isRecording}
        onVoiceInput={handleVoiceInput}
      />


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
