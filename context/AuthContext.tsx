import React, { createContext, useContext, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useUserSync } from '../services/userSync';

interface AuthContextType {
  userId: string | null;
  user: any;
  isLoaded: boolean;
  isSignedIn: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  userId: null,
  user: null,
  isLoaded: false,
  isSignedIn: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { syncUser } = useUserSync();

  // Sync user profile when they sign in/up
  useEffect(() => {
    if (isLoaded && isSignedIn && user && userId) {
      // Sync user profile to Supabase
      const syncUserProfile = async () => {
        try {
          console.log('Syncing Clerk user to Supabase:', { userId, email: user.emailAddresses?.[0]?.emailAddress });
          
          const result = await syncUser({
            id: userId,
            emailAddresses: user.emailAddresses || [],
            firstName: user.firstName,
            lastName: user.lastName,
          });
          
          if (result.created) {
            console.log(`✅ New Supabase user created: ${userId} with 10 free credits`);
          } else if (result.success) {
            console.log(`✅ Existing Supabase user synced: ${userId}`);
          } else {
            console.error(`❌ Failed to sync user:`, result.error);
          }
        } catch (error) {
          console.error('❌ Failed to sync user profile:', error);
        }
      };

      syncUserProfile();
    }
  }, [isLoaded, isSignedIn, user, userId, syncUser]);

  return (
    <AuthContext.Provider value={{ userId, user, isLoaded, isSignedIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);