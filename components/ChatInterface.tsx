
import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Square, Loader2, Volume2, Bot, User, StopCircle, Paperclip, X, FileText, Play, Search, Globe, Pause, RotateCcw, BrainCircuit } from 'lucide-react';
import { Button } from './UI';
import { Message, AppSettings, FileAttachment } from '../types';
import { ChutesService } from '../services/chutes';
import { SupabaseService } from '../services/supabase';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { CreditAwareButton } from './CreditAwareButton';
import { useCredits } from '../context/CreditContext';
import { useAuthContext } from '../context/AuthContext';
import { getCreditCost } from '../services/creditCosts';

interface ChatInterfaceProps {
  settings: AppSettings;
  sessionId: string;
  onSessionUpdate: (id: string, preview: string) => void;
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

const ChatInterface: React.FC<ChatInterfaceProps> = ({ settings, sessionId, onSessionUpdate, isAuthenticated, onRequestAuth, userId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);

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

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check if search is actually available based on keys
  const canSearch = (settings.searchProvider === 'tavily' && !!(settings.tavilyApiKey || import.meta.env.VITE_TAVILY_API_KEY)) ||
    (settings.searchProvider === 'brave' && !!(settings.braveApiKey || import.meta.env.VITE_BRAVE_API_KEY));

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

    const cost = getCreditCost('chat', settings.model);

    // For authenticated users, ALWAYS use Supabase (enforced by App.tsx)
    // For guests, use local storage
    if (isAuthenticated && userId) {
      // Supabase mode for authenticated users - NO fallbacks
      try {
        await supabaseService.useCredits(userId, cost, 'chat', settings.model, sessionId);
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

    const userMsg: Message = { role: 'user', content: userContent, id: Date.now().toString() };

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
      let assistantMsg: Message = { role: 'assistant', content: '', id: (Date.now() + 1).toString() };
      setMessages(prev => [...prev, assistantMsg]);

      let fullResponse = '';

      const searchConfig = {
        enabled: isSearchEnabled,
        apiKey: settings.searchProvider === 'brave'
          ? (settings.braveApiKey || import.meta.env.VITE_BRAVE_API_KEY || '')
          : (settings.tavilyApiKey || import.meta.env.VITE_TAVILY_API_KEY || ''),
        provider: settings.searchProvider
      };

      // Stream Chat Response with Tools support
      const stream = chutesService.streamChat(
        [...currentHistory, userMsg],
        settings.systemPrompt,
        settings.model,
        searchConfig,
        (status) => setLoadingStatus(status),
        abortControllerRef.current.signal
      );

      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev =>
          prev.map(msg => msg.id === assistantMsg.id ? { ...msg, content: fullResponse } : msg)
        );
      }

      // Update the message with full content
      assistantMsg.content = fullResponse;

      let dbId: string | null = null;
      if (isAuthenticated && userId) {
        dbId = await supabaseService.saveMessage(assistantMsg, sessionId, userId);
      }

      // Generate Audio automatically (cleaned)
      const ttsText = chutesService.cleanTextForTTS(fullResponse);
      if (ttsText && ttsText.length > 0) {
        const { url, blob } = await generateTTS(ttsText);

        if (url) {
          setMessages(prev =>
            prev.map(msg => msg.id === assistantMsg.id ? { ...msg, audioUrl: url } : msg)
          );

          // Auto play the generated audio
          setPlayingMessageId(assistantMsg.id!);
          playAudio(url);

          // Upload to Supabase for authenticated users
          if (isAuthenticated && userId && dbId && blob) {
            const publicUrl = await supabaseService.uploadAudio(blob, dbId, sessionId);
            if (publicUrl) {
              await supabaseService.updateMessageAudio(dbId, publicUrl);
              // Update state with remote url for persistence
              setMessages(prev =>
                prev.map(msg => msg.id === assistantMsg.id ? { ...msg, audio_url: publicUrl } : msg)
              );
            }
          }
        }
      }

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

  const handleRetry = (index: number, msg: Message) => {
    let text = '';
    let retryAttachment: FileAttachment | null = null;

    if (typeof msg.content === 'string') {
      text = msg.content;
    } else if (Array.isArray(msg.content)) {
      msg.content.forEach(part => {
        if (part.type === 'text') text = part.text || '';
        if (part.type === 'image_url' && part.image_url) {
          retryAttachment = {
            type: 'image',
            name: 'image-retry.png',
            mimeType: 'image/png',
            data: part.image_url.url
          };
        }
      });
    }

    const newHistory = messages.slice(0, index);
    setMessages(newHistory);
    handleSendMessage(text, retryAttachment, newHistory);
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
      const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = thinkRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(
            <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
              {content.substring(lastIndex, match.index)}
            </span>
          );
        }
        parts.push(
          <details key={`think-${match.index}`} className="group mb-2 mt-1 animate-in fade-in zoom-in-95">
            <summary className="cursor-pointer text-xs font-medium text-gray-500 dark:text-gray-400 select-none flex items-center gap-1.5 hover:text-primary transition-colors w-fit p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5">
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>Thought Process</span>
            </summary>
            <div className="pl-3 border-l-2 border-gray-200 dark:border-white/10 mt-2 ml-1">
              <p className="text-sm text-gray-500 dark:text-gray-400 italic font-mono leading-relaxed whitespace-pre-wrap">
                {match[1].trim()}
              </p>
            </div>
          </details>
        );
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < content.length) {
        parts.push(
          <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {content.substring(lastIndex)}
          </span>
        );
      }

      return parts.length > 0 ? parts : content;
    }

    if (Array.isArray(content)) {
      return content.map((part: any, i: number) => {
        if (part.type === 'text') return <span key={i}>{part.text}</span>;
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

  return (
    <div key={sessionId} className="flex flex-col h-full w-full max-w-5xl mx-auto relative glass-card md:rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-300 animate-in fade-in border border-white/40 dark:border-white/10">
      <audio ref={audioRef} className="hidden" />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 scroll-smooth custom-scrollbar">
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
                Running on <span className="font-semibold text-primary-dark dark:text-primary-light">{settings.model}</span>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-end gap-3 group animate-in slide-in-from-bottom-4 duration-500 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
          >
            {/* Avatar */}
            {msg.role !== 'assistant' || msg.content !== '' ? (
              <div className={`shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 duration-300 ${msg.role === 'user'
                ? 'bg-gradient-to-br from-primary to-primary-dark text-white border border-primary-light/30'
                : msg.role === 'system'
                  ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300'
                  : 'bg-white/50 dark:bg-slate-800/40 text-primary dark:text-primary-light border border-white/50 dark:border-white/10 backdrop-blur-md'
                }`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
            ) : null}

            {/* Bubble Container */}
            {msg.content && (
              <div className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                <div className="flex items-center gap-2">
                  {msg.role === 'user' && !isLoading && (
                    <button
                      onClick={() => handleRetry(idx, msg)}
                      className={`p-1.5 rounded-full text-gray-400 hover:text-primary hover:bg-white/50 dark:hover:bg-white/10 transition-all ${idx === messages.length - 1 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      title="Reload/Retry this message"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}

                  <div
                    className={`relative px-4 py-3 sm:px-6 sm:py-4 rounded-2xl text-sm sm:text-base leading-relaxed shadow-md ${msg.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-primary-dark text-white rounded-br-sm shadow-primary/20'
                      : msg.role === 'system'
                        ? 'bg-rose-50/60 dark:bg-rose-900/20 text-rose-600 dark:text-rose-200 border border-rose-100 dark:border-rose-900/30 backdrop-blur-md w-full'
                        : 'bg-white/20 dark:bg-slate-800/20 text-slate-800 dark:text-slate-100 rounded-bl-sm backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-[0_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] min-w-[100px]'
                      }`}
                  >
                    {renderMessageContent(msg.content)}

                    {msg.role === 'assistant' && (
                      <div className={`mt-3 pt-3 border-t border-gray-200/40 dark:border-white/5 transition-all duration-300 ${(playingMessageId === msg.id || msg.audio_url || msg.audioUrl) ? 'block' : 'hidden group-hover:block'
                        }`}>
                        {playingMessageId === msg.id ? (
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
                        ) : (
                          <div className="flex justify-end">
                            <Button
                              variant="glass"
                              size="sm"
                              className="h-7 px-3 text-xs rounded-full gap-2 border-white/40 dark:border-white/10 hover:bg-white/40 dark:hover:bg-slate-700/40 shadow-sm"
                              onClick={() => handleReplay(msg)}
                              disabled={generatingAudioId === msg.id}
                            >
                              {generatingAudioId === msg.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Volume2 className="w-3.5 h-3.5" />
                              )}
                              <span>{msg.audioUrl || msg.audio_url ? 'Play' : 'Read'}</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Credit Cost Display for User Messages */}
                {msg.role === 'user' && settings.useSupabase && (
                  <div className="flex justify-end">
                    <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100/50 dark:bg-gray-800/30 rounded-full">
                      {(() => {
                        const costs = { 'zai-org/GLM-4.6': 1, 'moonshotai/Kimi-K2-Thinking': 3, 'deepseek-ai/DeepSeek-R1-0528': 3 };
                        const cost = costs[settings.model as keyof typeof costs] || 1;
                        return `Used ${cost} credit${cost !== 1 ? 's' : ''}`;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 pl-2">
            <div className="w-8 h-8 rounded-full bg-white/50 dark:bg-slate-800/50 flex items-center justify-center border border-white/20 shadow-sm">
              <Bot className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="bg-white/40 dark:bg-slate-800/40 px-4 py-2 rounded-2xl rounded-bl-sm backdrop-blur-md border border-white/30 dark:border-white/5 flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {loadingStatus || 'Thinking...'}
                </span>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              </div>
              <button
                onClick={handleStop}
                className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 pl-1 transition-colors"
              >
                <StopCircle className="w-3 h-3" /> Stop generating
              </button>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 pb-4 sm:p-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-t border-white/50 dark:border-white/5 z-20">
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

          <div className="flex items-end gap-2 bg-white/80 dark:bg-slate-950/50 p-1.5 sm:p-2 rounded-[1.5rem] border border-gray-200/50 dark:border-white/10 shadow-lg focus-within:ring-2 focus-within:ring-primary/20 transition-all">
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
              className="rounded-full h-10 w-10 text-gray-500 hover:text-primary hover:bg-primary/5 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </Button>

            {/* Web Search Toggle - Themed */}
            {canSearch && (
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-full h-10 w-10 shrink-0 transition-all duration-300 ${isSearchEnabled
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'text-gray-500 hover:text-primary hover:bg-primary/5 dark:hover:bg-white/5'
                  }`}
                onClick={() => setIsSearchEnabled(!isSearchEnabled)}
                title={isSearchEnabled ? "Web Search Enabled" : "Enable Web Search"}
              >
                <Globe className={`w-5 h-5 ${isSearchEnabled ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`} />
              </Button>
            )}

            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (isAuthenticated) {
                    if (canAfford('chat', settings.model)) {
                      handleSendMessage(inputValue);
                    } else {
                      alert('Insufficient credits. Please add more credits to continue.');
                    }
                  } else {
                    onRequestAuth();
                  }
                }
              }}
              placeholder="Message GT Assistant..."
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-2.5 px-2 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 text-sm sm:text-base scrollbar-hide focus:outline-none"
              rows={1}
            />

            <div className="flex items-center gap-1 pb-0.5">
              <Button
                variant={isRecording ? "destructive" : "ghost"}
                size="icon"
                onClick={() => isAuthenticated ? handleVoiceInput() : onRequestAuth()}
                disabled={!isAuthenticated}
                className={`rounded-full h-9 w-9 transition-all ${isRecording ? 'animate-pulse' : 'text-gray-500 hover:text-primary disabled:opacity-50'}`}
                title={isAuthenticated ? "Voice Input" : "Sign in to use voice input"}
              >
                {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-5 h-5" />}
              </Button>

              <CreditAwareButton
                action="chat"
                model={settings.model}
                onClick={() => handleSendMessage(inputValue)}
                onRequestAuth={onRequestAuth}
                disabled={isLoading || (!inputValue.trim() && !attachment)}
                size="icon"
                className="rounded-full h-9 w-9 shadow-md shadow-primary/20"
              >
                <Send className="w-4 h-4 ml-0.5" />
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
    </div>
  );
};

export default ChatInterface;