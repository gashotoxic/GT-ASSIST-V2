import React, { createContext, useContext, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useUserSync } from '../services/userSync';
import { setAuthTokenGetter } from '../services/authToken';

interface AuthContextType {
  userId: string | null;
  user: any;
  isLoaded: boolean;
  isSignedIn: boolean;
  getToken: (options?: Record<string, unknown>) => Promise<string | null>;
}

export const AuthContext = createContext<AuthContextType>({
  userId: null,
  user: null,
  isLoaded: false,
  isSignedIn: false,
  getToken: async () => null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { syncUser } = useUserSync();

  // Register Clerk's session-token getter for the server-side proxy auth
  // (services/authToken.ts sends it as Authorization: Bearer on /api/* calls).
  useEffect(() => {
    setAuthTokenGetter(getToken);
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  // Sync user profile when they sign in/up
  useEffect(() => {
    if (isLoaded && isSignedIn && user && userId) {
      // Sync user profile to Supabase
      const syncUserProfile = async () => {
        try {
          console.log('Syncing Clerk user to Supabase:', { userId, email: user.emailAddresses?.[0]?.emailAddress });

          let token: string | null = null;
          try {
            token = (await getToken({ template: 'supabase' })) || null;
          } catch {
            token = null;
          }
          if (!token) {
            token = (await getToken()) || null;
          }

          const result = await syncUser({
            id: userId,
            emailAddresses: user.emailAddresses || [],
            firstName: user.firstName,
            lastName: user.lastName,
          }, token || null);

          if (result.created) {
            console.log(`✅ New Supabase user created: ${userId} with 10 free credits`);
          } else if (result.success) {
            console.log(`✅ Existing Supabase user synced: ${userId}`);
          } else {
            console.error(`❌ Failed to sync user:`, result.error);
          }

          // Dispatch event to notify CreditContext that user profile is ready
          // This fixes the race condition where credits are fetched before user exists
          if (result.success) {
            console.log('📡 Dispatching user-sync-complete event');
            window.dispatchEvent(new CustomEvent('user-sync-complete'));
          }
        } catch (error) {
          console.error('❌ Failed to sync user profile:', error);
        }
      };

      syncUserProfile();
    }
  }, [isLoaded, isSignedIn, user, userId, syncUser]);

  return (
    <AuthContext.Provider value={{ userId, user, isLoaded, isSignedIn, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
