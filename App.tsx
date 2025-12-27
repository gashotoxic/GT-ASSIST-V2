import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Sparkles, AlertCircle, Moon, Sun, MessageSquare, Image as ImageIcon, Menu, Database, Monitor, PanelLeftOpen } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import MediaStudio from './components/MediaStudio';
import SettingsModal from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { UserProfile } from './components/UserProfile';
import { Sidebar } from './components/Sidebar';
import { Button } from './components/UI';
import { AppSettings, DEFAULT_SYSTEM_PROMPT, ChatSession } from './types';
import { SupabaseService } from './services/supabase';
import { useAuthContext } from './context/AuthContext';

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  model: 'zai-org/GLM-4.6',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  ttsVoice: 'af_heart',
  ttsSpeed: 1.0,
  useSupabase: false,
  searchProvider: 'tavily',
};

const App: React.FC = () => {
  const { isSignedIn, isLoaded, userId } = useAuthContext();

  const [showAuthModal, setShowAuthModal] = useState(false);

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('chutes_app_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'media'>('chat');

  // Sidebar State: Initialize based on screen width
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

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
  useEffect(() => {
    const loadSessions = async () => {
      // CLEAR current view while loading to prevent mixing
      setSessions([]);
      let loadedSessions: ChatSession[] = [];

      // For authenticated users: ONLY use Supabase, NO fallbacks
      if (isSignedIn) {
        try {
          const testResult = await supabaseService.getSessions();
          loadedSessions = testResult;
        } catch (error) {
          console.error("Failed to load sessions from Supabase:", error);
          // Even on error, don't fallback to localStorage for auth users
          // Just create a new session
          createNewSessionInternal();
          return;
        }
      } else {
        // Guest users: use localStorage
        const saved = localStorage.getItem('chutes_chat_sessions');
        if (saved) {
          loadedSessions = JSON.parse(saved);
        }
      }

      // If we have sessions, load them. If not, create a default one.
      if (loadedSessions.length > 0) {
        setSessions(loadedSessions);
        // If current session ID isn't in list, select the first one
        const lastId = localStorage.getItem('chutes_current_session_id');
        if (lastId && loadedSessions.find(s => s.id === lastId)) {
          setCurrentSessionId(lastId);
        } else {
          setCurrentSessionId(loadedSessions[0].id);
        }
      } else {
        // No sessions found, create the first one explicitly
        createNewSessionInternal();
      }
    };
    loadSessions();
  }, [supabaseService, isSignedIn]);

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

  // -- PERSIST CURRENT ID --
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('chutes_current_session_id', currentSessionId);
    }
  }, [currentSessionId]);

  // -- HANDLERS --

  const updateSessionPreview = async (id: string, preview: string) => {
    const timestamp = Date.now();
    const sessionToSave = { id, title: preview.slice(0, 30), updatedAt: timestamp, preview } as ChatSession;

    // Functional update to ensure no race conditions
    setSessions(prevSessions => {
      const updatedSessions = prevSessions.map(s =>
        s.id === id ? { ...s, title: s.title === 'New Conversation' ? (preview.slice(0, 30) || 'Conversation') : s.title, preview, updatedAt: timestamp } : s
      );
      updatedSessions.sort((a, b) => b.updatedAt - a.updatedAt);

      // Persist
      if (isSignedIn) {
        // Authenticated: ONLY use Supabase, no fallbacks
        supabaseService.upsertSession(sessionToSave, userId).catch(error => {
          console.error("Failed to update session in Supabase:", error);
        });
      } else {
        // Guest: use localStorage
        localStorage.setItem('chutes_chat_sessions', JSON.stringify(updatedSessions));
      }
      return updatedSessions;
    });

    // Update Supabase separately (outside the functional update)
    if (isSignedIn) {
      try {
        await supabaseService.upsertSession(sessionToSave, userId);
      } catch (error) {
        console.error("Failed to update session in Supabase:", error);
      }
    }
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
    const envKey = (import.meta as any).env?.VITE_CHUTES_API_KEY;
    if (envKey && !settings.apiKey) {
      setSettings(prev => ({ ...prev, apiKey: envKey }));
    } else if (!settings.apiKey) {
      setIsSettingsOpen(true);
    }
  }, []);

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
      {settings.apiKey && (
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          sessions={sessions}
          activeSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
          onRenameSession={handleRenameSession}
        />
      )}

      {/* Main Layout */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10 w-full min-w-0">

        {/* Header - Fixed Height & Non-Shrinking */}
        <header className="flex-none flex items-center justify-between px-3 sm:px-6 py-4 z-20 sticky top-0 gap-2">

          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Menu Trigger */}
            {settings.apiKey && !isSidebarOpen && (
              <Button variant="glass" size="icon" className="lg:hidden shrink-0" onClick={() => setIsSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
            )}

            {/* Desktop Sidebar Toggle (Visible when closed) */}
            {settings.apiKey && !isSidebarOpen && (
              <Button
                variant="glass"
                size="icon"
                className="hidden lg:flex shrink-0"
                onClick={() => setIsSidebarOpen(true)}
                title="Open Sidebar"
              >
                <PanelLeftOpen className="w-5 h-5" />
              </Button>
            )}

            <div className="flex items-center space-x-3 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl px-3 sm:px-4 py-2 rounded-full border border-white/40 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20 shrink-0 min-w-0 max-w-[200px] sm:max-w-none">
              <div className="bg-gradient-to-tr from-primary to-primary-light p-1.5 rounded-full shadow-lg shadow-primary/30 shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="truncate">
                <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white tracking-tight leading-none truncate">
                  GT <span className="text-primary hidden sm:inline">Assistant</span>
                </h1>
              </div>
            </div>

            {/* Data Source Indicator */}
            {settings.apiKey && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[10px] uppercase font-bold tracking-wider text-gray-500 shrink-0">
                {settings.useSupabase ? (
                  <>
                    <Database className="w-3 h-3 text-blue-500" />
                    <span className="text-blue-500">Cloud Sync</span>
                  </>
                ) : (
                  <>
                    <Monitor className="w-3 h-3" />
                    <span>Local Browser</span>
                  </>
                )}
              </div>
            )}
          </div>

          {settings.apiKey && (
            <div className="flex items-center bg-white/20 dark:bg-slate-900/40 backdrop-blur-xl rounded-full p-1 border border-white/30 dark:border-white/5 shadow-inner shrink-0">
              <button
                onClick={() => setCurrentView('chat')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${currentView === 'chat'
                    ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
              >
                <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Chat
              </button>
              <button
                onClick={() => setCurrentView('media')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${currentView === 'media'
                    ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
              >
                <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Media
              </button>
            </div>
          )}

          {/* User Profile or Sign In button */}
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
              className="rounded-full px-4 py-2 font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
            >
              Sign In
            </Button>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="glass"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full w-9 h-9 shadow-lg shadow-black/5 dark:shadow-black/20 hover:shadow-xl transition-shadow border-white/40 dark:border-white/10"
              title="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-yellow-300" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </Button>

            <Button
              variant="glass"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className={`rounded-full shadow-lg shadow-black/5 dark:shadow-black/20 hover:shadow-xl transition-shadow ${!settings.apiKey ? 'animate-pulse ring-2 ring-primary' : ''}`}
            >
              <Settings className="w-4 h-4 sm:mr-2 text-slate-700 dark:text-slate-200" />
              <span className="text-slate-700 dark:text-slate-200 font-medium hidden sm:inline">Settings</span>
            </Button>
          </div>
        </header>

        {/* Main Content Area - Scrollable */}
        <main className="flex-1 w-full overflow-hidden relative z-10 px-0 sm:px-4 pb-0 sm:pb-4 pt-2 flex flex-col items-center min-h-0">
          {!settings.apiKey ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in duration-500 w-full max-w-4xl mx-auto overflow-y-auto">
              <div className="glass-card p-10 rounded-[2rem] w-full flex flex-col items-center border border-white/50 dark:border-white/10 shadow-2xl">
                <div className="bg-primary/10 dark:bg-primary/20 p-5 rounded-full mb-6 ring-1 ring-primary/20 dark:ring-primary/40">
                  <AlertCircle className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Activation Required</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed text-lg">
                  Please enter your <span className="font-semibold text-primary">Chutes API Key</span> to activate the assistant.
                </p>
                <Button
                  size="lg"
                  variant="primary"
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-full max-w-sm rounded-2xl py-6 text-lg shadow-xl shadow-primary/20 hover:shadow-primary/30"
                >
                  Open Settings
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full max-w-[1920px] mx-auto relative">
              <div className={`h-full w-full transition-all duration-500 absolute inset-0 ${currentView === 'chat' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                <ChatInterface
                  key={`${currentSessionId}-${settings.useSupabase ? 'cloud' : 'local'}`}
                  settings={settings}
                  sessionId={currentSessionId}
                  onSessionUpdate={updateSessionPreview}
                  isAuthenticated={isSignedIn}
                  onRequestAuth={() => { setAuthMode('signin'); setShowAuthModal(true); }}
                  userId={isSignedIn ? userId : undefined}
                />
              </div>
              <div className={`h-full w-full transition-all duration-500 absolute inset-0 ${currentView === 'media' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                <MediaStudio
                  settings={settings}
                  isAuthenticated={isSignedIn}
                  onRequestAuth={() => { setAuthMode('signin'); setShowAuthModal(true); }}
                  userId={isSignedIn ? userId : undefined}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
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
    </div>
  );
};

export default App;