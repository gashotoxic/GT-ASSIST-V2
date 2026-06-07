import React from 'react';
import ChatInterface from './ChatInterface';
import { AppSettings, ChatSession } from '../types';
import { ErrorBoundary } from './ErrorBoundary';

const MediaStudio = React.lazy(() => import('./MediaStudio'));
const PricingPage = React.lazy(() => import('./PricingPage').then((m) => ({ default: m.PricingPage })));

type ViewId = 'chat' | 'media' | 'pricing';

type AppRoutesProps = {
  currentView: ViewId;
  settings: AppSettings;
  currentSessionId: string;
  updateSessionPreview: (id: string, preview: string) => void;
  setCurrentSessionId: (id: string) => void;
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  isSignedIn: boolean;
  userId?: string | null;
  setAuthMode: React.Dispatch<React.SetStateAction<'signin' | 'signup'>>;
  setShowAuthModal: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveMediaTab: React.Dispatch<React.SetStateAction<string>>;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewId>>;
};

export const AppRoutes: React.FC<AppRoutesProps> = ({
  currentView,
  settings,
  currentSessionId,
  updateSessionPreview,
  setCurrentSessionId,
  setSessions,
  isSignedIn,
  userId,
  setAuthMode,
  setShowAuthModal,
  setActiveMediaTab,
  setCurrentView,
}) => {
  const requestAuth = () => {
    setAuthMode('signin');
    setShowAuthModal(true);
  };

  return (
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
              onNewSession={(s) => setSessions((prev) => [s, ...prev])}
              isAuthenticated={isSignedIn}
              onRequestAuth={requestAuth}
              userId={isSignedIn ? userId : undefined}
            />
          </div>
        )}

        {currentView === 'media' && (
          <React.Suspense fallback={<div className="w-full flex-1 min-h-0 flex items-center justify-center text-sm text-slate-500 dark:text-slate-300">Loading…</div>}>
            <div className="w-full flex-1 min-h-0 transition-all duration-500 animate-in fade-in zoom-in-95 flex flex-col">
              <ErrorBoundary>
                <MediaStudio
                  settings={settings}
                  isAuthenticated={isSignedIn}
                  onRequestAuth={requestAuth}
                  userId={isSignedIn ? userId : undefined}
                  onTabChange={setActiveMediaTab}
                />
              </ErrorBoundary>
            </div>
          </React.Suspense>
        )}

        {currentView === 'pricing' && (
          <React.Suspense fallback={<div className="w-full flex-1 min-h-0 flex items-center justify-center text-sm text-slate-500 dark:text-slate-300">Loading…</div>}>
            <div className="w-full flex-1 min-h-0 transition-all duration-500 animate-in fade-in zoom-in-95">
              <PricingPage onBack={() => setCurrentView('chat')} />
            </div>
          </React.Suspense>
        )}
      </div>
    </main>
  );
};
