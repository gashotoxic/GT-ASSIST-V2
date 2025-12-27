import { createContext, useContext, useEffect, useState } from 'react';
import { SupabaseService } from '../services/supabase';
import { useAuthContext } from './AuthContext';
import { DEFAULT_CREDITS, getCreditCost, CREDIT_COSTS } from '../services/creditCosts';

interface CreditContextType {
  credits: number;
  subscriptionTier: 'free' | 'basic' | 'plus' | 'pro';
  loading: boolean;
  canAfford: (action: string, model: string) => boolean;
  refetch: () => Promise<void>;
}

export const CreditContext = createContext<CreditContextType>({
  credits: 0,
  subscriptionTier: 'free',
  loading: true,
  canAfford: () => false,
  refetch: async () => {},
});

export function CreditProvider({ children }: { children: React.ReactNode }) {
  const { userId, isSignedIn } = useAuthContext();
  const [credits, setCredits] = useState(0);
  const [tier, setTier] = useState<'free' | 'basic' | 'plus' | 'pro'>('free');
  const [loading, setLoading] = useState(true);
  const [supabaseService, setSupabaseService] = useState<SupabaseService | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Initialize Supabase service
  useEffect(() => {
    if (isSignedIn) {
      const supabaseUrl = import.meta.env.VITE_APP_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_APP_SUPABASE_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const settings = {
          useSupabase: true,
          supabaseUrl,
          supabaseKey,
          apiKey: '',
          model: 'zai-org/GLM-4.6',
          systemPrompt: '',
          ttsVoice: 'af_heart',
          ttsSpeed: 1.0,
          searchProvider: 'tavily' as const
        };
        setSupabaseService(new SupabaseService(settings));
      } else {
        console.error('App Supabase configuration missing');
        setSyncError('Supabase not configured - please contact support');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [isSignedIn]);

  const fetchCredits = async () => {
    if (!isSignedIn || !userId) {
      setCredits(0);
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
        setTier((profile.subscription_tier as 'free' | 'basic' | 'plus' | 'pro') || 'free');
        setSyncError(null);
      } else {
        // User profile not found - this means user sync failed
        console.error('User profile not found in Supabase - sync may have failed');
        setSyncError('User not found in database - please sign out and sign in again');
        setCredits(0);
        setTier('free');
      }
    } catch (error: any) {
      console.error('Failed to fetch credits from Supabase:', error);
      setSyncError(error.message || 'Failed to load credits');
      setCredits(0);
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
    const channel = supabaseService.subscribeToCredits(userId, (newCredits) => {
      console.log('Real-time credit update:', newCredits);
      setCredits(newCredits);
    });

    return () => {
      if (channel && supabaseService) {
        supabaseService.removeChannel(channel);
      }
    };
  }, [userId, supabaseService, isSignedIn]);
const canAfford = (action: string, model: string) => {
  if (tier === 'pro') return true; // Unlimited

  const cost = getCreditCost(action as keyof typeof CREDIT_COSTS, model);
  return credits >= cost;
};

  return (
    <CreditContext.Provider
      value={{
        credits,
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
