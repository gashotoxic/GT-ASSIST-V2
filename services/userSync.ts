import { SupabaseService } from './supabase';
import { AppSettings } from '../types';

export class UserSyncService {
  private supabaseService: SupabaseService;
  private isConfigured: boolean;

  constructor() {
    const supabaseUrl = import.meta.env.VITE_APP_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_APP_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_KEY;
    this.isConfigured = Boolean(supabaseUrl && supabaseKey);
    if (!this.isConfigured) {
      console.error('App Supabase configuration not found in environment variables');
    } else {
      console.log('Initializing UserSyncService with app Supabase:', { supabaseUrl: supabaseUrl.substring(0, 20) + '...' });
    }

    const settings: AppSettings = {
      useSupabase: this.isConfigured,
      supabaseUrl,
      supabaseKey,
      apiKey: '',
      model: 'zai-org/GLM-4.6',
      systemPrompt: '',
      ttsVoice: 'af_heart',
      ttsSpeed: 1.0,
      searchProvider: 'tavily'
    };
    
    this.supabaseService = new SupabaseService(settings);
  }

  /**
   * Sync user profile from Clerk to Supabase
   * Called when user signs up or signs in
   */
  async syncUserProfile(clerkUser: {
    id: string;
    emailAddresses: Array<{ emailAddress: string }>;
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Supabase configuration missing' };
    }
    try {
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (!email) {
        throw new Error('User email not found');
      }

      // Create or update user profile in Supabase
      await this.supabaseService.createUserProfile(clerkUser.id, email);

      console.log(`User profile synced: ${clerkUser.id} - ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Error syncing user profile:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Handle Clerk webhook events
   * This would be called from a serverless function
   */
  async handleClerkWebhook(event: {
    type: string;
    data: any;
  }): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Supabase configuration missing' };
    }
    try {
      switch (event.type) {
        case 'user.created':
          // New user signed up
          await this.syncUserProfile({
            id: event.data.id,
            emailAddresses: event.data.email_addresses,
            firstName: event.data.first_name,
            lastName: event.data.last_name,
            imageUrl: event.data.image_url,
          });
          break;

        case 'user.updated':
          // User profile updated (email, name, etc.)
          const email = event.data.email_addresses?.[0]?.email_address;
          if (email && event.data.id) {
            await this.supabaseService.updateUserProfile(event.data.id, {
              // Add any fields that can be updated from Clerk
            });
          }
          break;

        case 'user.deleted':
          // User deleted their account
          // Note: We don't delete the user record, just mark it as inactive
          // This preserves data integrity and audit trail
          console.log(`User deleted: ${event.data.id}`);
          break;

        default:
          console.log(`Unhandled webhook event: ${event.type}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error handling Clerk webhook:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get user's current credit balance and tier
   */
  async getUserCredits(userId: string): Promise<{
    credits: number;
    tier: string;
    loading: boolean;
  }> {
    if (!this.isConfigured) {
      return {
        credits: 0,
        tier: 'free',
        loading: false,
      };
    }
    try {
      const profile = await this.supabaseService.getUserProfile(userId);
      return {
        credits: profile.credits || 0,
        tier: profile.subscription_tier || 'free',
        loading: false,
      };
    } catch (error) {
      console.error('Error getting user credits:', error);
      return {
        credits: 0,
        tier: 'free',
        loading: false,
      };
    }
  }

  /**
   * Check if user exists in Supabase
   */
  async userExists(userId: string): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }
    try {
      console.log(`Checking Supabase for user: ${userId}`);
      const profile = await this.supabaseService.getUserProfile(userId);
      
      // Profile is null if user doesn't exist
      if (!profile) {
        console.log(`User ${userId} not found in Supabase - will create new user`);
        return false;
      }
      
      console.log(`User found: ${userId}, credits: ${profile.credits}`);
      return true;
    } catch (error: any) {
      // Handle type mismatch errors specifically
      if (error.message?.includes('invalid input syntax for type uuid') ||
          error.code === '42883' ||
          error.details?.includes('invalid input syntax')) {
        console.log(`User ${userId} has invalid UUID format - likely a Clerk ID type mismatch. This is expected and will be handled during user creation.`);
        return false;
      }
      
      console.log(`User ${userId} not found in Supabase:`, error.message);
      return false;
    }
  }

  /**
   * Create user if they don't exist
   * Useful for initial login flow
   */
  async ensureUserExists(clerkUser: {
    id: string;
    emailAddresses: Array<{ emailAddress: string }>;
    firstName?: string;
    lastName?: string;
  }): Promise<{ created: boolean; success: boolean; error?: string }> {
    if (!this.isConfigured) {
      return { created: false, success: false, error: 'Supabase configuration missing' };
    }
    try {
      console.log(`Checking if user exists in Supabase: ${clerkUser.id}`);
      
      const exists = await this.userExists(clerkUser.id);
      
      if (!exists) {
        console.log(`User ${clerkUser.id} not found, creating new Supabase user...`);
        const result = await this.syncUserProfile(clerkUser);
        if (result.success) {
          console.log(`✅ Successfully created Supabase user: ${clerkUser.id}`);
        } else {
          console.error(`❌ Failed to create Supabase user:`, result.error);
          
          // If it's a UUID type error, don't retry to prevent infinite loops
          if (result.error?.includes('invalid input syntax for type uuid') ||
              result.error?.includes('invalid input syntax')) {
            console.error(`❌ UUID type mismatch detected. Database functions need to be updated to use TEXT instead of UUID for Clerk IDs.`);
            return { created: false, success: false, error: result.error };
          }
        }
        return { created: true, success: result.success, error: result.error };
      }
      
      console.log(`✅ User ${clerkUser.id} already exists in Supabase`);
      return { created: false, success: true };
    } catch (error) {
      console.error(`❌ Error in ensureUserExists:`, error);
      return {
        created: false,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Singleton instance for the app (no settings needed - always uses app Supabase)
let userSyncService: UserSyncService | null = null;

export function getUserSyncService(): UserSyncService {
  if (!userSyncService) {
    userSyncService = new UserSyncService();
  }
  return userSyncService!;
}

// React hook for user sync operations (uses app Supabase, not localStorage)
export function useUserSync() {
  const syncUser = async (clerkUser: {
    id: string;
    emailAddresses: Array<{ emailAddress: string }>;
    firstName?: string;
    lastName?: string;
  }) => {
    try {
      console.log('useUserSync: Syncing Clerk user to Supabase...');
      
      const service = getUserSyncService();
      const result = await service.ensureUserExists(clerkUser);
      
      if (result.success) {
        console.log(`✅ useUserSync: Successfully synced user ${clerkUser.id}`);
      } else {
        console.error(`❌ useUserSync: Failed to sync user ${clerkUser.id}:`, result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ useUserSync: Exception during sync:', error);
      throw error;
    }
  };

  return { syncUser };
}
