import React, { useState } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { ChevronDown, User, LogOut, Settings, Coins, CreditCard, X } from 'lucide-react';
import { Button } from './UI';
import { useCredits } from '../context/CreditContext';

export const UserProfile: React.FC = () => {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { credits, subscriptionTier, loading } = useCredits();
  const [showDropdown, setShowDropdown] = useState(false);

  if (!isLoaded || !user || loading) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowDropdown(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getInitials = () => {
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'pro': return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
      case 'plus': return 'bg-gradient-to-r from-purple-400 to-pink-500 text-white';
      case 'basic': return 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white';
      default: return 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'pro': return 'PRO';
      case 'plus': return 'PLUS';
      case 'basic': return 'BASIC';
      default: return 'FREE';
    }
  };

  return (
    <div className="relative">
      <Button
        variant="glass"
        size="sm"
        onClick={() => setShowDropdown(!showDropdown)}
        className="rounded-[1.25rem] px-2 py-1.5 flex items-center gap-2 xs:gap-2.5 hover:bg-white/60 dark:hover:bg-slate-700/60 transition-all duration-300 border-white/20 shadow-sm hover:shadow-md hover:scale-[1.02]"
      >
        {user.imageUrl ? (
          <img
            src={user.imageUrl}
            alt="Profile"
            className="w-7 h-7 xs:w-8 xs:h-8 rounded-full object-cover ring-2 ring-white/50 dark:ring-white/10 shadow-sm"
          />
        ) : (
          <div className="w-7 h-7 xs:w-8 xs:h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
            {getInitials()}
          </div>
        )}

        <div className={`hidden sm:flex items-center justify-center px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase ${getTierColor(subscriptionTier)} shadow-sm ring-1 ring-white/20`}>
          {getTierLabel(subscriptionTier)}
        </div>

        <ChevronDown className={`hidden xs:block w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
      </Button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-14 z-50 w-[min(20rem,calc(100vw-1rem))] rounded-[2rem] bg-white/80 dark:bg-[#0f172a]/90 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] dark:shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-4 origin-top-right ring-1 ring-black/5">
            
            {/* Header with Pattern */}
            <div className="relative p-6 border-b border-gray-100 dark:border-white/5 overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50"></div>
               <button
                 type="button"
                 onClick={() => setShowDropdown(false)}
                 aria-label="Close"
                 className="absolute top-4 right-4 z-10 p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white/70 dark:hover:bg-white/10 transition-colors"
               >
                 <X className="w-4 h-4" />
               </button>
               <div className="relative flex items-center gap-4">
                {user.imageUrl ? (
                  <div className="relative">
                    <img
                      src={user.imageUrl}
                      alt="Profile"
                      className="w-14 h-14 rounded-2xl object-cover shadow-lg ring-4 ring-white dark:ring-white/5"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900"></div>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center font-bold text-white text-xl shadow-lg ring-4 ring-white dark:ring-white/5">
                    {getInitials()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg text-gray-900 dark:text-white truncate tracking-tight">
                    {user.fullName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate font-medium">
                    {user.primaryEmailAddress?.emailAddress}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm ${getTierColor(subscriptionTier)}`}>
                      {getTierLabel(subscriptionTier)} Plan
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Credits Section */}
            <div className="p-5 bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-500 shadow-inner">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">Balance</span>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Available Credits</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    {subscriptionTier === 'pro' ? '∞' : credits}
                  </span>
                </div>
              </div>
              
              {/* Progress Bar (Fake for visual) */}
              <div className="h-1.5 w-full bg-gray-200 dark:bg-white/10 rounded-full mt-3 overflow-hidden">
                 <div className="h-full bg-gradient-to-r from-primary to-primary-dark w-3/4 rounded-full"></div>
              </div>
            </div>

            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  const event = new CustomEvent('open-account-settings');
                  window.dispatchEvent(event);
                  setShowDropdown(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary/5 hover:text-primary rounded-xl transition-all group"
              >
                <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Settings className="w-4 h-4" />
                </div>
                Profile Settings
              </button>

              <button
                onClick={() => {
                  const event = new CustomEvent('open-view', { detail: 'pricing' });
                  window.dispatchEvent(event);
                  setShowDropdown(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary/5 hover:text-primary rounded-xl transition-all group"
              >
                <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <CreditCard className="w-4 h-4" />
                </div>
                Billing & Credits
              </button>

              <div className="h-px bg-gray-100 dark:bg-white/5 my-1 mx-4" />

              <button
                onClick={handleSignOut}
                className="w-full px-4 py-3 flex items-center gap-3.5 text-sm font-bold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all group"
              >
                <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                    <LogOut className="w-4 h-4" />
                </div>
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
