import React, { useState } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { ChevronDown, User, LogOut, Settings, Coins, CreditCard } from 'lucide-react';
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
        className="rounded-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-white/40 dark:hover:bg-slate-700/40 transition-all border-white/20"
      >
        {user.imageUrl ? (
          <img
            src={user.imageUrl}
            alt="Profile"
            className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/20"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20">
            {getInitials()}
          </div>
        )}

        <div className={`hidden sm:block px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest ${getTierColor(subscriptionTier)} shadow-sm`}>
          {getTierLabel(subscriptionTier)}
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
      </Button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-72 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-2xl shadow-black/10 dark:shadow-black/30 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2">
            <div className="p-4 border-b border-gray-200/50 dark:border-white/10">
              <div className="flex items-center gap-3">
                {user.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-semibold text-primary">
                    {getInitials()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {user.fullName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {user.primaryEmailAddress?.emailAddress}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getTierColor(subscriptionTier)}`}>
                      {getTierLabel(subscriptionTier)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Credits Section */}
            <div className="p-4 border-b border-gray-200/50 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Credits</span>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {subscriptionTier === 'pro' ? 'Unlimited' : credits}
                </span>
              </div>
              {subscriptionTier !== 'free' && subscriptionTier !== 'pro' && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Daily credits reset at midnight
                </div>
              )}
            </div>

            <div className="py-2">
              <button
                onClick={() => {
                  const event = new CustomEvent('open-account-settings');
                  window.dispatchEvent(event);
                  setShowDropdown(false);
                }}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary/10 hover:text-primary transition-all group"
              >
                <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                Profile Settings
              </button>

              <button
                onClick={() => {
                  const event = new CustomEvent('open-view', { detail: 'pricing' });
                  window.dispatchEvent(event);
                  setShowDropdown(false);
                }}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary/10 hover:text-primary transition-all"
              >
                <CreditCard className="w-4 h-4" />
                Billing & Credits
              </button>

              <div className="h-px bg-gray-100 dark:bg-white/5 my-1" />

              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-sm font-bold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};