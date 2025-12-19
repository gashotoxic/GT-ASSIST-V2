import { createContext, useContext, useEffect, useState } from 'react';
import { SupabaseService } from '../services/supabase';
import { useAuthContext } from './AuthContext';

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

  // Initialize Supabase service - always use app's database for authenticated users
  useEffect(() => {
    // For authenticated users, always use Supabase (app's database)
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
        setLoading(false);
      }
    } else {
      // For guests, no credit system (or use minimal local storage if needed)
      setLoading(false);
    }
  }, [isSignedIn]);

  const fetchCredits = async () => {
    if (!isSignedIn || !userId || !supabaseService) {
      // Not authenticated - no credits
      setCredits(0);
      setTier('free');
      setLoading(false);
      return;
    }

    // For authenticated users, ALWAYS use Supabase - no fallbacks
    try {
      const profile = await supabaseService.getUserProfile(userId);
      setCredits(profile.credits);
      setTier(profile.subscription_tier as any);
    } catch (error) {
      console.error('Failed to fetch credits from Supabase:', error);
      // Even on error, don't fallback to localStorage for auth users
      setCredits(0);
      setTier('free');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!isSignedIn || !userId || !supabaseService) {
      fetchCredits();
      return;
    }

    // For authenticated users, use Supabase with real-time subscription
    fetchCredits();

    // Real-time subscription to credit changes
    const channel = supabaseService.subscribeToCredits(userId, (newCredits) => {
      setCredits(newCredits);
    });

    // Proper cleanup
    return () => {
      if (channel && supabaseService) {
        supabaseService.removeChannel(channel);
      }
    };
  }, [userId, supabaseService, isSignedIn]);

  const canAfford = (action: string, model: string) => {
    if (tier === 'pro') return true; // Unlimited
    
    const costs = {
      chat: { 'zai-org/GLM-4.6': 1, 'moonshotai/Kimi-K2-Thinking': 3, 'deepseek-ai/DeepSeek-R1-0528': 3 },
      image: { 'hunyuan': 3, 'qwen-image': 3, 'z-image-turbo': 2, 'hidream': 5 },
      video: { 'wan-2.2-i2v': 10, 'wan-2.1-t2v': 10 },
      edit: { 'qwen-image-edit': 4 },
    };
    
    const cost = costs[action as keyof typeof costs]?.[model as keyof any] || 1;
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