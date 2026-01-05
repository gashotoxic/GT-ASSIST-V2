import { createContext, useContext, useEffect, useState } from 'react';
import { SupabaseService } from '../services/supabase';
import { useAuthContext } from './AuthContext';
import { DEFAULT_CREDITS, getCreditCost, CREDIT_COSTS } from '../services/creditCosts';

interface CreditContextType {
  credits: number;
  dailyCredits: number;
  subscriptionTier: 'free' | 'basic' | 'plus' | 'pro';
  loading: boolean;
  canAfford: (action: string, model: string) => boolean;
  refetch: () => Promise<void>;
}

export const CreditContext = createContext<CreditContextType>({
  credits: 0,
  dailyCredits: 0,
  subscriptionTier: 'free',
  loading: true,
  canAfford: () => false,
  refetch: async () => { },
});

export function CreditProvider({ children }: { children: React.ReactNode }) {
  const { userId, isSignedIn } = useAuthContext();
  const [credits, setCredits] = useState(0);
  const [dailyCredits, setDailyCredits] = useState(0);
  const [tier, setTier] = useState<'free' | 'basic' | 'plus' | 'pro'>('free');
  const [loading, setLoading] = useState(true);
  const [supabaseService, setSupabaseService] = useState<SupabaseService | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Initialize Supabase service when user is signed in
  useEffect(() => {
    if (isSignedIn && userId) {
      const supabaseUrl = import.meta.env.VITE_APP_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_APP_SUPABASE_KEY;

      if (supabaseUrl && supabaseKey) {
        const service = new SupabaseService({
          apiKey: 'internal',
          model: '',
          systemPrompt: '',
          ttsVoice: '',
          ttsSpeed: 1,
          useSupabase: true,
          supabaseUrl,
          supabaseKey,
          searchProvider: 'tavily',
        });
        setSupabaseService(service);
      }
    } else {
      setSupabaseService(null);
    }
  }, [isSignedIn, userId]);

  const fetchCredits = async () => {
    if (!isSignedIn || !userId) {
      setCredits(0);
      setDailyCredits(0);
      setTier('free');
      setLoading(false);
      return;
    }

    if (!supabaseService) {
      setSyncError('Supabase service not initialized');
      setLoading(false);
      return;
    }

    try {
      const profile = await supabaseService.getUserProfile(userId);
      if (profile) {
        setCredits(profile.credits || 0);
        setDailyCredits(profile.daily_credits || 0);
        setTier((profile.subscription_tier as 'free' | 'basic' | 'plus' | 'pro') || 'free');
        setSyncError(null);
      } else {
        // User profile not found - this means user sync failed
        console.error('User profile not found in Supabase - sync may have failed');
        setSyncError('User not found in database - please sign out and sign in again');
        setCredits(0);
        setDailyCredits(0);
        setTier('free');
      }
    } catch (error: any) {
      console.error('Failed to fetch credits from Supabase:', error);
      setSyncError(error.message || 'Failed to load credits');
      setCredits(0);
      setDailyCredits(0);
      setTier('free');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSignedIn || !userId || !supabaseService) {
      fetchCredits();
      return;
    }

    fetchCredits();

    // Set up real-time subscription to credit changes
    const channel = supabaseService.subscribeToUserUpdates(userId, {
      onCreditChange: (newCredits) => {
        console.log('Real-time credit update:', newCredits);
        setCredits(newCredits);
      },
      onProfileUpdate: (profile) => {
        if (profile.daily_credits !== undefined) {
          setDailyCredits(profile.daily_credits);
        }
        if (profile.subscription_tier) {
          setTier(profile.subscription_tier as 'free' | 'basic' | 'plus' | 'pro');
        }
        // Also update credits from profile update events (covers INSERT)
        if (profile.credits !== undefined) {
          console.log('Profile update - setting credits:', profile.credits);
          setCredits(profile.credits);
        }
      }
    });

    return () => {
      // Logic for multi-channel unsubscribe in supabaseService
      if (Array.isArray(channel)) {
        channel.forEach(c => supabaseService.removeChannel(c));
      }
    };
  }, [userId, supabaseService, isSignedIn]);

  // Listen for user-sync-complete event from AuthContext
  // This ensures we refetch credits AFTER the user profile is confirmed to exist
  useEffect(() => {
    const handleSyncComplete = () => {
      console.log('📡 Received user-sync-complete event, refetching credits...');
      // Small delay to ensure database consistency
      setTimeout(() => {
        fetchCredits();
      }, 100);
    };

    window.addEventListener('user-sync-complete', handleSyncComplete);
    return () => {
      window.removeEventListener('user-sync-complete', handleSyncComplete);
    };
  }, [supabaseService, userId, isSignedIn]);

  const canAfford = (action: string, model: string) => {
    if (tier === 'pro') return true; // Unlimited

    const cost = getCreditCost(action as keyof typeof CREDIT_COSTS, model);
    return (credits + dailyCredits) >= cost;
  };

  return (
    <CreditContext.Provider
      value={{
        credits,
        dailyCredits,
        subscriptionTier: tier,
        loading,
        canAfford,
        refetch: fetchCredits,
      }}
    >
      {children}
    </CreditContext.Provider>
  );
}

export const useCredits = () => useContext(CreditContext);
