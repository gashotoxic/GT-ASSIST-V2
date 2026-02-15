import React from 'react';
import { CreditCard, Menu, MessageSquare, Image as ImageIcon, PanelLeftOpen, Coins, ChevronDown, Moon, Sun } from 'lucide-react';
import { Button } from './UI';
import { UserProfile } from './UserProfile';

type ViewId = 'chat' | 'media' | 'pricing';

export type NavItem = {
  id: ViewId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type AppHeaderProps = {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenSidebar: () => void;
  onOpenModelPicker: (el: HTMLElement) => void;
  activeModelLabel: string;
  currentView: ViewId;
  setCurrentView: (view: ViewId) => void;
  navItems: NavItem[];
  isSignedIn: boolean;
  credits: number;
  dailyCredits: number;
  subscriptionTier: 'free' | 'basic' | 'plus' | 'pro';
  onOpenAuth: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  isSidebarOpen,
  onToggleSidebar,
  onOpenSidebar,
  onOpenModelPicker,
  activeModelLabel,
  currentView,
  setCurrentView,
  navItems,
  isSignedIn,
  credits,
  dailyCredits,
  subscriptionTier,
  onOpenAuth,
  theme,
  toggleTheme,
}) => {
  return (
    <header className="flex-none flex flex-wrap sm:flex-nowrap items-center justify-between px-2 sm:px-6 py-3 sm:py-4 z-20 gap-x-2 gap-y-2 border-b border-white/10 dark:border-white/5 bg-white/20 dark:bg-slate-900/40 backdrop-blur-xl">
      <div className="md:hidden w-full grid grid-cols-[minmax(0,auto)_1fr_auto] items-center gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            id="tour-sidebar-toggle"
            onClick={onToggleSidebar}
            className="h-9 w-9 rounded-xl border border-white/30 dark:border-white/10 bg-white/20 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10 transition-colors flex items-center justify-center shrink-0"
            title={isSidebarOpen ? 'Close chats' : 'Open chats'}
          >
            <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>

          <button
            type="button"
            onClick={(e) => onOpenModelPicker(e.currentTarget)}
            className="h-9 px-1.5 rounded-xl bg-white/20 dark:bg-white/5 border border-white/30 dark:border-white/10 hover:bg-white/40 dark:hover:bg-white/10 transition-colors flex items-center gap-1 text-[11px] font-black text-slate-700 dark:text-slate-100 min-w-0 w-[76px] min-[360px]:w-[88px] min-[420px]:w-[104px]"
            title="Change model"
          >
            <span className="truncate">{activeModelLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>
        </div>

        <div className="min-w-0 overflow-hidden">
          <div className="flex justify-center">
            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/10 p-1 rounded-2xl border border-white/10 shadow-inner max-w-full overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setCurrentView('chat')}
                className={`flex items-center gap-1.5 px-2.5 min-[360px]:px-3 min-[420px]:px-3.5 py-1.5 min-[420px]:py-2 rounded-xl text-[11px] min-[420px]:text-xs font-semibold transition-all duration-300 whitespace-nowrap ${currentView === 'chat'
                  ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                title="Chat"
              >
                <MessageSquare className="w-3.5 h-3.5 min-[420px]:w-4 min-[420px]:h-4" />
                <span className="max-[360px]:hidden">Chat</span>
              </button>
              <button
                id="tour-media-nav"
                onClick={() => setCurrentView('media')}
                className={`flex items-center gap-1.5 px-2.5 min-[360px]:px-3 min-[420px]:px-3.5 py-1.5 min-[420px]:py-2 rounded-xl text-[11px] min-[420px]:text-xs font-semibold transition-all duration-300 whitespace-nowrap ${currentView === 'media'
                  ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                title="Media"
              >
                <ImageIcon className="w-3.5 h-3.5 min-[420px]:w-4 min-[420px]:h-4" />
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
                <Coins className="w-4 h-4" />
                <span className="text-[11px] font-black max-[420px]:hidden">
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
                onClick={onOpenAuth}
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
              className="hidden md:flex shrink-0 h-9 w-9"
              onClick={onOpenSidebar}
              title="Open Sidebar"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </Button>
          )}

          <div className="hidden md:flex items-center gap-2 px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 shadow-lg">
            <button
              type="button"
              onClick={(e) => onOpenModelPicker(e.currentTarget)}
              className="flex items-center gap-1 h-9 px-2.5 rounded-xl bg-white/20 dark:bg-white/5 border border-white/30 dark:border-white/10 hover:bg-white/40 dark:hover:bg-white/10 transition-colors text-xs font-black text-slate-700 dark:text-slate-100 max-w-[220px]"
              title="Change model"
            >
              <span className="truncate">{activeModelLabel}</span>
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
              <Coins className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-primary" />
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
                onClick={onOpenAuth}
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
  );
};
