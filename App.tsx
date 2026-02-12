import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Send, Menu, PanelLeftOpen, PanelLeftClose, Plus, MessageSquare, ImageIcon, LayoutGrid, X, LogOut, User, Settings, CreditCard, ChevronDown, Monitor, Smartphone, Moon, Sun, Search, Zap, Check, Sparkles, Bot, LifeBuoy, Sliders } from 'lucide-react';
import { OnboardingTour } from './components/OnboardingTour';
import ChatInterface from './components/ChatInterface';
import MediaStudio from './components/MediaStudio';
import { AuthModal } from './components/AuthModal';
import { UserProfile } from './components/UserProfile';
import { Sidebar } from './components/Sidebar';
import { PricingPage } from './components/PricingPage';
import { AccountSettingsModal } from './components/AccountSettingsModal';
import { Button } from './components/UI';
import { LogoModelPicker } from './components/LogoModelPicker';
import { AppSettings, BRAND_STUDIO_MODEL_ID, DEFAULT_SYSTEM_PROMPT, ChatSession, getModelShortName } from './types';
import { SupabaseService } from './services/supabase';
import { useAuthContext } from './context/AuthContext';
import { useCredits } from './context/CreditContext';
import { summarizePrompt } from './utils/stringUtils';

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: 'internal', // Use internal default key
  model: 'moonshotai/Kimi-K2-Thinking-TEE',
  brandModel: 'moonshotai/Kimi-K2.5-TEE',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  ttsVoice: 'af_heart',
  ttsSpeed: 1.0,
  useSupabase: false,
  searchProvider: 'tavily',
  welcomeView: 'chat',
};

const App: React.FC = () => {
  const { isSignedIn, isLoaded, userId } = useAuthContext();
  const { credits, dailyCredits, subscriptionTier } = useCredits();

  const [showAuthModal, setShowAuthModal] = useState(false);

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('chutes_app_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'media' | 'pricing'>('chat');
  const [activeMediaTab, setActiveMediaTab] = useState<string>('image');

  // Sidebar State: Initialize closed by default
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [headerChatMode, setHeaderChatMode] = useState<'chat' | 'brand'>('chat');
  const [modelPickerAnchorRect, setModelPickerAnchorRect] = useState<DOMRect | null>(null);
  const [modelPickerAnchorEl, setModelPickerAnchorEl] = useState<HTMLElement | null>(null);
  const modelPickerAnchorElRef = useRef<HTMLElement | null>(null);

  // Create Supabase Instance - ALWAYS use app's database for authenticated users
  const supabaseService = useMemo(() => {
    // For authenticated users, ALWAYS enforce Supabase with app's database
    if (isSignedIn) {
      const supabaseUrl = import.meta.env.VITE_APP_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_APP_SUPABASE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.error('App Supabase configuration missing for authenticated user');
        return new SupabaseService(settings);
      }

      // Create settings with Supabase always enabled for authenticated users
      // IGNORE any user-configured Supabase - use app's database only
      const enhancedSettings = {
        ...settings,
        useSupabase: true,
        supabaseUrl: supabaseUrl,
        supabaseKey: supabaseKey,
      };

      return new SupabaseService(enhancedSettings);
    }

    // Guest users - use whatever is configured in settings
    return new SupabaseService(settings);
  }, [settings, isSignedIn]);

  // -- INIT / LOAD SESSIONS --
  // Clear stale session IDs when user changes to prevent cross-user leakage
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  useEffect(() => {
    if (userId !== lastUserId) {
      // User changed - clear any cached session to prevent cross-user leakage
      localStorage.removeItem('chutes_current_session_id');
      setCurrentSessionId('');
      setSessions([]);
      setLastUserId(userId || null);
    }
  }, [userId]);

  const getSessionPrefsKey = (sid: string) => `chutes_chat_prefs_${sid}`;

  useEffect(() => {
    if (!currentSessionId) return;
    const raw = localStorage.getItem(getSessionPrefsKey(currentSessionId));
    if (!raw) {
      setHeaderChatMode('chat');
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setHeaderChatMode(parsed?.chatMode === 'brand' ? 'brand' : 'chat');
    } catch {
      setHeaderChatMode('chat');
    }
  }, [currentSessionId]);

  useEffect(() => {
    const onChatModeChanged = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as { sessionId?: string; chatMode?: string } | undefined;
      if (!detail?.sessionId || detail.sessionId !== currentSessionId) return;
      setHeaderChatMode(detail.chatMode === 'brand' ? 'brand' : 'chat');
    };
    window.addEventListener('chat-mode-changed', onChatModeChanged);
    return () => window.removeEventListener('chat-mode-changed', onChatModeChanged);
  }, [currentSessionId]);

  const handleChatModeChange = (mode: 'chat' | 'brand') => {
    setHeaderChatMode(mode);
    if (!currentSessionId) return;
    window.dispatchEvent(new CustomEvent('set-chat-mode', { detail: { sessionId: currentSessionId, chatMode: mode } }));
  };

  const openModelPicker = (el: HTMLElement) => {
    modelPickerAnchorElRef.current = el;
    setModelPickerAnchorEl(el);
    setModelPickerAnchorRect(el.getBoundingClientRect());
    setIsModelPickerOpen(true);
  };

  useEffect(() => {
    if (!isModelPickerOpen) return;
    const update = () => {
      const el = modelPickerAnchorElRef.current;
      if (!el) return;
      setModelPickerAnchorRect(el.getBoundingClientRect());
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isModelPickerOpen]);

  useEffect(() => {
    const loadSessions = async () => {
      // CLEAR current view while loading to prevent mixing
      setSessions([]);
      let loadedSessions: ChatSession[] = [];

      // For authenticated users: ONLY use Supabase, NO fallbacks
      if (isSignedIn && userId) {
        try {
          const testResult = await supabaseService.getSessions(userId);
          loadedSessions = testResult;
        } catch (error) {
          console.error("Failed to load sessions from Supabase:", error);
          // Even on error, don't fallback to localStorage for auth users
          // Just create a new session
          createNewSessionInternal();
          return;
        }
      } else if (!isSignedIn) {
        // Guest users: use localStorage
        const saved = localStorage.getItem('chutes_chat_sessions');
        if (saved) {
          loadedSessions = JSON.parse(saved);
        }
      }

      // If we have sessions, load them. If not, create a default one.
      if (loadedSessions.length > 0) {
        setSessions(loadedSessions);
        // Select the first one (don't trust localStorage for authenticated users)
        setCurrentSessionId(loadedSessions[0].id);
      } else if (isSignedIn || !isSignedIn) {
        // No sessions found, create the first one explicitly
        createNewSessionInternal();
      }
    };
    loadSessions();
  }, [supabaseService, isSignedIn, userId]);

  // Helper to create session without triggering sidebar logic
  const createNewSessionInternal = () => {
    const newId = crypto.randomUUID();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Conversation',
      updatedAt: Date.now(),
      preview: ''
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);

    // Save based on authentication status
    if (isSignedIn) {
      // Authenticated: ONLY use Supabase, no fallbacks
      if (userId && supabaseService) {
        supabaseService.upsertSession(newSession, userId).catch(error => {
          console.error("Failed to save session to Supabase:", error);
          // Don't fallback to localStorage for auth users
        });
      }
    } else {
      // Guest: use localStorage
      const currentStored = JSON.parse(localStorage.getItem('chutes_chat_sessions') || '[]');
      localStorage.setItem('chutes_chat_sessions', JSON.stringify([newSession, ...currentStored]));
    }
    return newId;
  };

  // -- PERSIST CURRENT ID & Handle Session Model --
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('chutes_current_session_id', currentSessionId);

      // Auto-switch model if the session has a specific model preference
      const session = sessions.find(s => s.id === currentSessionId);
      if (session?.model && session.model !== settings.model) {
        setSettings(prev => ({ ...prev, model: session.model! }));
      }
    }
    // Event listener for Account Settings
    const handleOpenAccountSettings = () => setIsAccountSettingsOpen(true);
    const handleOpenView = (e: any) => {
      if (e.detail) setCurrentView(e.detail);
    };

    window.addEventListener('open-account-settings', handleOpenAccountSettings);
    window.addEventListener('open-view', handleOpenView);

    // Close sidebar event for tour
    const handleCloseSidebar = () => setIsSidebarOpen(false);
    window.addEventListener('close-sidebar', handleCloseSidebar);

    return () => {
      window.removeEventListener('open-account-settings', handleOpenAccountSettings);
      window.removeEventListener('open-view', handleOpenView);
      window.removeEventListener('close-sidebar', handleCloseSidebar);
    };
  }, [currentSessionId, sessions]);

  // -- HANDLERS --

  const updateSessionPreview = async (id: string, preview: string) => {
    const timestamp = Date.now();
    const shortTitle = summarizePrompt(preview);

    setSessions(prevSessions => {
      const existing = prevSessions.find(s => s.id === id);
      if (!existing) return prevSessions;

      const updatedSession: ChatSession = {
        ...existing,
        title: (existing.title && existing.title !== 'New Conversation') ? existing.title : (shortTitle || 'Conversation'),
        preview,
        updatedAt: timestamp,
      };

      // Persist immediately using the latest metadata-rich object
      if (isSignedIn) {
        supabaseService.upsertSession(updatedSession, userId).catch(error => {
          console.error("Failed to update session in Supabase:", error);
        });
      } else {
        const updatedList = prevSessions.map(s => s.id === id ? updatedSession : s);
        localStorage.setItem('chutes_chat_sessions', JSON.stringify(updatedList));
      }

      const finalList = prevSessions.map(s => s.id === id ? updatedSession : s);
      finalList.sort((a, b) => b.updatedAt - a.updatedAt);
      return finalList;
    });
  };

  const handleRenameSession = async (id: string, newTitle: string) => {
    const updatedSessions = sessions.map(s =>
      s.id === id ? { ...s, title: newTitle } : s
    );
    setSessions(updatedSessions);

    if (isSignedIn) {
      // Authenticated: ONLY use Supabase
      try {
        await supabaseService.updateSessionTitle(id, newTitle);
      } catch (error) {
        console.error("Failed to rename session in Supabase:", error);
      }
    } else {
      // Guest: use localStorage
      localStorage.setItem('chutes_chat_sessions', JSON.stringify(updatedSessions));
    }
  };

  const handleNewChat = () => {
    createNewSessionInternal();
    setCurrentView('chat');
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirm('Are you sure you want to delete this chat?')) {
      const newSessions = sessions.filter(s => s.id !== id);

      let nextId = currentSessionId;
      if (currentSessionId === id) {
        if (newSessions.length > 0) {
          nextId = newSessions[0].id;
        } else {
          nextId = '';
        }
      }

      setSessions(newSessions);
      if (nextId) setCurrentSessionId(nextId);

      if (isSignedIn) {
        // Authenticated: ONLY use Supabase
        try {
          await supabaseService.deleteSession(id);
        } catch (error) {
          console.error("Failed to delete session from Supabase:", error);
        }
      } else {
        // Guest: use localStorage
        localStorage.setItem('chutes_chat_sessions', JSON.stringify(newSessions));
        localStorage.removeItem(`chutes_messages_${id}`);
      }

      if (newSessions.length === 0) {
        createNewSessionInternal();
      }
    }
  };

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('chutes_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem('chutes_app_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('chutes_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    if (!settings.apiKey || settings.apiKey === '') {
      setSettings(prev => ({ ...prev, apiKey: 'internal' }));
    }
  }, []);

  const navItems = [
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
    { id: 'media' as const, label: 'Media', icon: ImageIcon },
    { id: 'pricing' as const, label: 'Pricing', icon: CreditCard },
  ];

  const headerActiveModelId = headerChatMode === 'brand'
    ? (settings.brandModel || BRAND_STUDIO_MODEL_ID)
    : settings.model;
  const headerActiveModelShortName = getModelShortName(headerActiveModelId);

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden font-sans selection:bg-primary/30 text-slate-900 dark:text-slate-100 transition-colors duration-500">

      {/* Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute dark:hidden top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob"></div>
        <div className="absolute dark:hidden top-0 right-1/4 w-96 h-96 bg-purple-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute hidden dark:block top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full filter blur-[100px] opacity-40 animate-blob"></div>
        <div className="absolute hidden dark:block top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-[100px] opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-white/10 dark:from-slate-950/80 dark:to-slate-900/60 backdrop-blur-[1px]"></div>
      </div>

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpen={() => setIsSidebarOpen(true)}
        sessions={sessions}
        activeSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        theme={theme}
        toggleTheme={toggleTheme}
        onOpenSettings={() => setIsAccountSettingsOpen(true)}
      />

      {/* Main Layout */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10 w-full min-w-0">

        {/* Header - Mobile Optimized with Navigation */}
        <header className="flex-none flex flex-wrap sm:flex-nowrap items-center justify-between px-2 sm:px-6 py-3 sm:py-4 z-20 gap-x-2 gap-y-2 border-b border-white/10 dark:border-white/5 bg-white/20 dark:bg-slate-900/40 backdrop-blur-xl">

          <div className="md:hidden w-full grid grid-cols-[auto,1fr,auto] items-center gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                id="tour-sidebar-toggle"
                onClick={() => setIsSidebarOpen(v => !v)}
                className="h-9 w-9 rounded-xl border border-white/30 dark:border-white/10 bg-white/20 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10 transition-colors flex items-center justify-center shrink-0"
                title={isSidebarOpen ? 'Close chats' : 'Open chats'}
              >
                <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>

              <button
                type="button"
                onClick={(e) => openModelPicker(e.currentTarget)}
                className="h-9 px-2 rounded-xl bg-white/20 dark:bg-white/5 border border-white/30 dark:border-white/10 hover:bg-white/40 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 text-[11px] font-black text-slate-700 dark:text-slate-100 max-w-[120px] min-[360px]:max-w-[140px] min-[420px]:max-w-[170px]"
                title="Change model"
              >
                <span className="truncate">{headerActiveModelShortName || headerActiveModelId}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>
            </div>

            <div className="min-w-0 overflow-hidden">
              <div className="flex justify-center">
                <div className="flex items-center gap-1 bg-black/5 dark:bg-white/10 p-1 rounded-2xl border border-white/10 shadow-inner max-w-full overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setCurrentView('chat')}
                  className={`flex items-center gap-2 px-3 min-[360px]:px-3.5 min-[420px]:px-4 py-1.5 min-[420px]:py-2 rounded-xl text-[11px] min-[420px]:text-xs font-semibold transition-all duration-300 whitespace-nowrap ${currentView === 'chat'
                    ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  title="Chat"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="max-[360px]:hidden">Chat</span>
                </button>
                <button
                  id="tour-media-nav"
                  onClick={() => setCurrentView('media')}
                  className={`flex items-center gap-2 px-3 min-[360px]:px-3.5 min-[420px]:px-4 py-1.5 min-[420px]:py-2 rounded-xl text-[11px] min-[420px]:text-xs font-semibold transition-all duration-300 whitespace-nowrap ${currentView === 'media'
                    ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  title="Media"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="max-[360px]:hidden">Media</span>
                </button>
              </div>
            </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isSignedIn ? (
                <>
                  <button
                    onClick={() => setCurrentView('pricing')}
                    className="h-9 px-2 max-[360px]:px-2 min-[420px]:px-2.5 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors flex items-center gap-1.5 text-[11px] min-[420px]:text-xs font-bold text-primary whitespace-nowrap"
                    title="Credits"
                  >
                    <Zap className="w-4 h-4" />
                    <span className="text-[11px] font-black max-[360px]:hidden">
                      {subscriptionTier === 'pro' ? '∞' : (credits + (dailyCredits || 0))}
                    </span>
                  </button>
                  <div className="shrink-0">
                    <UserProfile trigger="dots" />
                  </div>
                </>
              ) : (
                <>
                  <button
                    id="tour-pricing-nav-mobile"
                    onClick={() => setCurrentView('pricing')}
                    className={`h-9 w-9 rounded-xl border border-white/30 dark:border-white/10 bg-white/20 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10 transition-colors flex items-center justify-center ${currentView === 'pricing' ? 'text-primary' : 'text-slate-600 dark:text-slate-300'}`}
                    title="Pricing"
                  >
                    <CreditCard className="w-4 h-4" />
                  </button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setAuthMode('signin');
                      setShowAuthModal(true);
                    }}
                    className="rounded-full px-3 max-[400px]:px-2 py-1.5 text-xs font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                  >
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="hidden md:flex w-full items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {!isSidebarOpen && (
                <Button
                  variant="glass"
                  size="icon"
                  className="hidden lg:flex shrink-0 h-9 w-9"
                  onClick={() => setIsSidebarOpen(true)}
                  title="Open Sidebar"
                >
                  <PanelLeftOpen className="w-5 h-5" />
                </Button>
              )}

              <div className="hidden md:flex items-center gap-2 px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 shadow-lg">
                <button
                  type="button"
                  onClick={(e) => openModelPicker(e.currentTarget)}
                  className="flex items-center gap-1 h-9 px-2.5 rounded-xl bg-white/20 dark:bg-white/5 border border-white/30 dark:border-white/10 hover:bg-white/40 dark:hover:bg-white/10 transition-colors text-xs font-black text-slate-700 dark:text-slate-100 max-w-[220px]"
                  title="Change model"
                >
                  <span className="truncate">{headerActiveModelShortName || headerActiveModelId}</span>
                  <ChevronDown className="w-4 h-4 opacity-70" />
                </button>
              </div>
            </div>

            <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center bg-black/5 dark:bg-white/10 p-1 rounded-2xl border border-white/10 shadow-inner">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${currentView === item.id
                    ? 'bg-white dark:bg-slate-800 text-primary shadow-sm scale-105'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="inline">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
              {isSignedIn && (
                <div
                  onClick={() => setCurrentView('pricing')}
                  className="flex items-center gap-1 px-1.5 xs:px-2 sm:px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 cursor-pointer transition-colors whitespace-nowrap"
                  title={subscriptionTier === 'pro' ? 'Pro Plan - Unlimited' : 'Total Credits (Daily + Permanent)'}
                >
                  <Zap className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-primary" />
                  <span id="tour-credit-balance" className="text-[11px] xs:text-xs sm:text-sm font-bold text-primary">
                    {subscriptionTier === 'pro' ? '∞' : (credits + (dailyCredits || 0))}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                {isSignedIn ? (
                  <UserProfile />
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setAuthMode('signin');
                      setShowAuthModal(true);
                    }}
                    className="rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                  >
                    Sign In
                  </Button>
                )}

                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    variant="glass"
                    size="icon"
                    onClick={toggleTheme}
                    className="rounded-full w-9 h-9 border-white/40 dark:border-white/10"
                    title="Toggle Theme"
                  >
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 text-yellow-300" />
                    ) : (
                      <Moon className="w-4 h-4 text-slate-600" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <LogoModelPicker
          isOpen={isModelPickerOpen}
          onClose={() => setIsModelPickerOpen(false)}
          chatMode={headerChatMode}
          onChatModeChange={handleChatModeChange}
          settings={settings}
          onUpdateSettings={(patch) => setSettings(prev => ({ ...prev, ...patch }))}
          anchorRect={modelPickerAnchorRect}
          anchorEl={modelPickerAnchorEl}
        />

        {/* Main Content Area - Scrollable Container */}
        <main className="flex-1 w-full overflow-hidden relative z-10 px-2 sm:px-4 pb-0 md:pb-4 pt-4 sm:pt-6 flex flex-col items-center min-h-0">
          <div className="w-full flex-1 min-h-0 max-w-[1920px] mx-auto relative flex flex-col">
            {currentView === 'chat' && (
              <div className="w-full flex-1 min-h-0 transition-all duration-500 animate-in fade-in zoom-in-95 flex flex-col">
                <ChatInterface
                  key={`${currentSessionId}-${settings.useSupabase ? 'cloud' : 'local'}`}
                  settings={settings}
                  sessionId={currentSessionId}
                  onSessionUpdate={updateSessionPreview}
                  onSwitchSession={setCurrentSessionId}
                  onNewSession={(s) => setSessions(prev => [s, ...prev])}
                  isAuthenticated={isSignedIn}
                  onRequestAuth={() => { setAuthMode('signin'); setShowAuthModal(true); }}
                  userId={isSignedIn ? userId : undefined}
                />
              </div>
            )}
            {currentView === 'media' && (
              <div className="w-full flex-1 min-h-0 transition-all duration-500 animate-in fade-in zoom-in-95 flex flex-col">
                <MediaStudio
                  settings={settings}
                  isAuthenticated={isSignedIn}
                  onRequestAuth={() => { setAuthMode('signin'); setShowAuthModal(true); }}
                  userId={isSignedIn ? userId : undefined}
                  onTabChange={setActiveMediaTab}
                />
              </div>
            )}
            {currentView === 'pricing' && (
              <div className="w-full flex-1 min-h-0 transition-all duration-500 animate-in fade-in zoom-in-95">
                <PricingPage onBack={() => setCurrentView('chat')} />
              </div>
            )}
          </div>
        </main>

        {/* Mobile Navigation Moved to Top Header - No Bottom Nav Needed */}
      </div>

      {/* Account Settings Modal */}
      {isAccountSettingsOpen && (
        <AccountSettingsModal
          isOpen={isAccountSettingsOpen}
          onClose={() => setIsAccountSettingsOpen(false)}
          settings={settings}
          onSave={setSettings}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        mode={authMode}
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onModeChange={setAuthMode}
      />

      {/* Onboarding Tour */}
      <OnboardingTour
        currentView={currentView}
        setCurrentView={setCurrentView}
        openSidebar={() => setIsSidebarOpen(true)}
        theme={theme}
        isSignedIn={isSignedIn}
        activeMediaTab={activeMediaTab}
      />
    </div>
  );
};

export default App;
