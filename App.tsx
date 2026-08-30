import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Send, PanelLeftClose, Plus, MessageSquare, Image as ImageIcon, LayoutGrid, X, LogOut, User, Settings, Monitor, Smartphone, Search, Check, Sparkles, Bot, LifeBuoy, Sliders, CreditCard } from 'lucide-react';
import { OnboardingTour } from './components/OnboardingTour';
import { AuthModal } from './components/AuthModal';
import { Sidebar } from './components/Sidebar';
import { Button } from './components/UI';
import { LogoModelPicker } from './components/LogoModelPicker';
import { AppHeader } from './components/AppHeader';
import { AppRoutes } from './components/AppRoutes';
import { AppSettings, BRAND_STUDIO_MODEL_ID, DEFAULT_SYSTEM_PROMPT, ChatSession, getModelInfo, getModelShortName } from './types';
import { useAuthContext } from './context/AuthContext';
import { useCredits } from './context/CreditContext';
import { summarizePrompt } from './utils/stringUtils';
import { ServicesProvider } from './context/ServicesContext';
import { getAppServices } from './services/appServices';

const AccountSettingsModal = React.lazy(() => import('./components/AccountSettingsModal').then((m) => ({ default: m.AccountSettingsModal })));

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: 'internal', // Use internal default key
  model: 'Nemotron-3-Nano-Omni-30B-TEE',
  brandModel: 'Nemotron-3-Nano-Omni-30B-TEE',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  ttsVoice: 'af_heart',
  ttsSpeed: 1.0,
  useSupabase: false,
  searchProvider: 'tavily',
  welcomeView: 'chat',
};

const App: React.FC = () => {
  const { isSignedIn, isLoaded, userId, getToken } = useAuthContext();
  const { credits, dailyCredits, subscriptionTier } = useCredits();

  const [supabaseAuthToken, setSupabaseAuthToken] = useState<string | null>(null);
  const [supabaseAuthError, setSupabaseAuthError] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: number | null = null;

    const decodeJwtExpMs = (jwt: string): number | null => {
      const parts = jwt.split('.');
      if (parts.length < 2) return null;
      try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
        const json = atob(padded);
        const payload = JSON.parse(json) as { exp?: number };
        if (typeof payload.exp !== 'number') return null;
        return payload.exp * 1000;
      } catch {
        return null;
      }
    };

    const clearTimer = () => {
      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
        refreshTimer = null;
      }
    };

    const scheduleRefresh = (jwt: string) => {
      const expMs = decodeJwtExpMs(jwt);
      if (!expMs) return;
      const now = Date.now();
      const refreshInMs = Math.max(5_000, expMs - now - 30_000);
      clearTimer();
      refreshTimer = window.setTimeout(() => {
        void fetchAndSetToken();
      }, refreshInMs);
    };

    const fetchAndSetToken = async () => {
      if (!isSignedIn) {
        if (!cancelled) setSupabaseAuthToken(null);
        if (!cancelled) setSupabaseAuthError(null);
        clearTimer();
        return;
      }

      try {
        let token: string | null = null;
        try {
          token = (await getToken({ template: 'supabase' })) || null;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!cancelled) setSupabaseAuthError(msg);
          token = null;
        }

        if (!token) {
          token = (await getToken()) || null;
        }

        if (!cancelled) setSupabaseAuthToken(token);
        if (!cancelled) setSupabaseAuthError(null);
        if (token) scheduleRefresh(token);
      } catch {
        if (!cancelled) setSupabaseAuthToken(null);
        if (!cancelled) setSupabaseAuthError('Failed to obtain auth token');
        clearTimer();
      }
    };

    const run = async () => {
      await fetchAndSetToken();
    };

    void run();
    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [isSignedIn, getToken]);

  const isSupabaseAuthed = Boolean(isSignedIn && supabaseAuthToken);
  const services = useMemo(
    () => getAppServices(settings, isSupabaseAuthed, userId, supabaseAuthToken),
    [settings, isSupabaseAuthed, userId, supabaseAuthToken]
  );
  const supabaseService = services.supabaseService;

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
    const handleOpenView = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) setCurrentView(detail as 'chat' | 'media' | 'pricing');
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

  const updateSessionPreview = useCallback((id: string, preview: string) => {
    const timestamp = Date.now();
    const shortTitle = summarizePrompt(preview);

    setSessions(prevSessions => {
      const existing = prevSessions.find(s => s.id === id);
      if (!existing) return prevSessions;

      const nextTitle = (existing.title && existing.title !== 'New Conversation') ? existing.title : (shortTitle || 'Conversation');
      if (existing.preview === preview && existing.title === nextTitle) return prevSessions;

      const updatedSession: ChatSession = {
        ...existing,
        title: nextTitle,
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
  }, [isSignedIn, supabaseService, userId]);

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
  const headerActiveModelSupportsVision = Boolean(getModelInfo(headerActiveModelId)?.supportsVision);

  return (
    <ServicesProvider services={services}>
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

        <AppHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(v => !v)}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenModelPicker={openModelPicker}
          activeModelLabel={headerActiveModelShortName || headerActiveModelId}
          activeModelSupportsVision={headerActiveModelSupportsVision}
          currentView={currentView}
          setCurrentView={setCurrentView}
          navItems={navItems}
          isSignedIn={Boolean(isSignedIn)}
          credits={credits}
          dailyCredits={dailyCredits || 0}
          subscriptionTier={subscriptionTier}
          onOpenAuth={() => {
            setAuthMode('signin');
            setShowAuthModal(true);
          }}
          theme={theme}
          toggleTheme={toggleTheme}
        />

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

        <AppRoutes
          currentView={currentView}
          settings={settings}
          currentSessionId={currentSessionId}
          updateSessionPreview={updateSessionPreview}
          setCurrentSessionId={setCurrentSessionId}
          setSessions={setSessions}
          isSignedIn={Boolean(isSignedIn)}
          userId={userId}
          setAuthMode={setAuthMode}
          setShowAuthModal={setShowAuthModal}
          setActiveMediaTab={setActiveMediaTab}
          setCurrentView={setCurrentView}
        />

        {/* Mobile Navigation Moved to Top Header - No Bottom Nav Needed */}
      </div>

      {/* Account Settings Modal */}
      {isAccountSettingsOpen && (
        <React.Suspense fallback={null}>
          <AccountSettingsModal
            isOpen={isAccountSettingsOpen}
            onClose={() => setIsAccountSettingsOpen(false)}
            settings={settings}
            onSave={setSettings}
          />
        </React.Suspense>
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
    </ServicesProvider>
  );
};

export default App;
