import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Message, AppSettings, ChatSession, MediaItem } from '../types';

export class SupabaseService {
  private client: SupabaseClient | null = null;
  private sessionId: string;
  private supabaseUrl: string | null = null;
  private supabaseKey: string | null = null;
  private authToken: string | null = null;
  private instanceId: string;

  constructor(settings: AppSettings, authToken?: string | null) {
    let storedSessionId = localStorage.getItem('chutes_session_id');
    if (!storedSessionId) {
      storedSessionId = crypto.randomUUID();
      localStorage.setItem('chutes_session_id', storedSessionId);
    }
    this.sessionId = storedSessionId;
    this.instanceId = crypto.randomUUID();

    this.authToken = authToken || null;

    if (settings.useSupabase) {
      this.supabaseUrl = settings.supabaseUrl || import.meta.env.VITE_APP_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
      this.supabaseKey = settings.supabaseKey || import.meta.env.VITE_APP_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_KEY;
      this.refreshClient();
    }
  }

  public setAuthToken(token?: string | null) {
    const next = token || null;
    if (this.authToken === next) return;
    this.authToken = next;
    this.refreshClient();
  }

  private refreshClient() {
    if (!this.supabaseUrl || !this.supabaseKey) return;

    const headers: Record<string, string> = {};
    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    this.client = createClient(this.supabaseUrl, this.supabaseKey, {
      global: Object.keys(headers).length ? { headers } : undefined,
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        storageKey: `gt-assistant-sb-${this.sessionId}-${this.instanceId}`,
      },
    });
  }

  // --- Session Management ---

  async getSessions(userId?: string): Promise<ChatSession[]> {
    if (!this.client) return [];

    try {
      let query = this.client
        .from('chat_sessions')
        .select('*')
        .order('updated_at', { ascending: false });

      // Filter by user_id if provided
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase Get Sessions Error:', error);
        return [];
      }

      return data.map((row: any) => ({
        id: row.id,
        title: row.title || 'New Conversation',
        preview: row.preview || '',
        updatedAt: new Date(row.updated_at).getTime(),
        isBranch: row.is_branch,
        model: row.model
      }));
    } catch (err) {
      console.error('Error fetching sessions:', err);
      return [];
    }
  }

  async upsertSession(session: ChatSession, userId?: string): Promise<void> {
    if (!this.client) return;

    try {
      const payload: any = {
        id: session.id,
        title: session.title,
        preview: session.preview,
        updated_at: new Date(session.updatedAt).toISOString(),
        is_branch: session.isBranch || false,
        model: session.model || null
      };

      // Add user_id if authenticated
      if (userId) {
        payload.user_id = userId;
      }

      const { error } = await this.client
        .from('chat_sessions')
        .upsert(payload, { onConflict: 'id' });

      if (error) console.error('Supabase Upsert Session Error:', error);
    } catch (err) {
      console.error('Error upserting session:', err);
    }
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    if (!this.client) return;

    try {
      const { error } = await this.client
        .from('chat_sessions')
        .update({ title: title })
        .eq('id', sessionId);

      if (error) console.error('Supabase Update Title Error:', error);
    } catch (err) {
      console.error('Error updating session title:', err);
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.from('messages').delete().eq('session_id', sessionId);
      await this.client.from('media_history').delete().eq('session_id', sessionId); // Also clear media

      const { error } = await this.client
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      return !error;
    } catch (err) {
      console.error('Error deleting session:', err);
      return false;
    }
  }

  // --- Message Management ---

  async loadMessages(targetSessionId?: string, userId?: string): Promise<Message[]> {
    if (!this.client) return [];
    const sid = targetSessionId || this.sessionId;

    try {
      let query = this.client
        .from('messages')
        .select('*')
        .eq('session_id', sid);

      // Add user_id filter if authenticated
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase Load Error:', JSON.stringify(error, null, 2));
        return [];
      }

      return data.map((row: any) => {
        let content = row.content;
        if (typeof content === 'string' && (content.startsWith('[') || content.startsWith('{'))) {
          try {
            content = JSON.parse(content);
          } catch (e) { /* ignore */ }
        }

        return {
          id: row.id.toString(),
          role: row.role,
          content: content,
          timestamp: new Date(row.created_at).getTime(),
          model: row.model,
          audio_url: row.audio_url,
          audioUrl: row.audio_url
        };
      });
    } catch (err) {
      console.error("Unexpected error loading messages:", err);
      return [];
    }
  }

  async deleteMessage(messageId: string, sessionId: string, userId?: string): Promise<boolean> {
    if (!this.client || !messageId) return false;
    try {
      let query = this.client
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('session_id', sessionId);
      if (userId) {
        query = query.eq('user_id', userId);
      }
      const { error } = await query;
      if (error) {
        console.error('Supabase Delete Message Error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error deleting message:', err);
      return false;
    }
  }

  async saveMessage(message: Message, targetSessionId?: string, userId?: string): Promise<string | null> {
    if (!this.client) return null;

    const sid = targetSessionId || this.sessionId;
    const { audioUrl, ...msgToSave } = message;

    const payload: any = {
      session_id: sid,
      role: msgToSave.role,
      content: msgToSave.content,
      model: msgToSave.model || null,
      audio_url: msgToSave.audio_url || null,
      created_at: new Date().toISOString(),
    };

    // Add user_id if authenticated
    if (userId) {
      payload.user_id = userId;
    }

    try {
      const { data, error } = await this.client
        .from('messages')
        .insert(payload)
        .select('id')
        .single();

      if (error) {
        console.error('Supabase Save Error:', error);
        return null;
      }
      return data?.id?.toString() || null;
    } catch (err) {
      console.error("Unexpected error saving message:", err);
      return null;
    }
  }

  async uploadAudio(blob: Blob, messageId: string, targetSessionId?: string): Promise<string | null> {
    if (!this.client) return null;
    const sid = targetSessionId || this.sessionId;

    try {
      const fileName = `${sid}/${messageId}.wav`;
      const { error } = await this.client.storage
        .from('chat-audio')
        .upload(fileName, blob, {
          contentType: 'audio/wav',
          upsert: true
        });

      if (error) {
        console.error('Supabase Upload Error:', error);
        return null;
      }

      const { data: { publicUrl } } = this.client.storage
        .from('chat-audio')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (e) {
      console.error("Exception uploading audio", e);
      return null;
    }
  }

  async updateMessageAudio(dbId: string, audioUrl: string) {
    if (!this.client) return;
    const { error } = await this.client
      .from('messages')
      .update({ audio_url: audioUrl })
      .eq('id', dbId);
    if (error) console.error('Supabase Update Error', error);
  }

  async updateMessage(message: Message, sessionId: string): Promise<boolean> {
    if (!this.client || !message.id) return false;

    try {
      const { error } = await this.client
        .from('messages')
        .update({ content: message.content })
        .eq('id', message.id)
        .eq('session_id', sessionId);

      if (error) {
        console.error('Supabase Update Message Error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error updating message:', err);
      return false;
    }
  }

  // Deletes all messages in a session created AFTER a specific timestamp
  // Used for "Retry" or "Edit" where future context becomes invalid
  async deleteMessagesAfter(sessionId: string, timestamp: number): Promise<boolean> {
    if (!this.client) return false;

    try {
      const { error } = await this.client
        .from('messages')
        .delete()
        .eq('session_id', sessionId)
        .gt('created_at', new Date(timestamp).toISOString());

      if (error) {
        console.error('Supabase Delete Future Messages Error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error deleting future messages:', err);
      return false;
    }
  }

  // --- Media Gallery Management ---

  async saveMediaItem(item: MediaItem, blob: Blob, sessionId: string, userId?: string): Promise<void> {
    if (!this.client) return;

    try {
      // 1. Upload Blob
      const ext = item.type === 'video' ? 'mp4' : 'png';
      const contentType = item.type === 'video' ? 'video/mp4' : 'image/png';
      const fileName = userId ? `${userId}/${sessionId}/${item.id}.${ext}` : `${sessionId}/${item.id}.${ext}`;

      const { error: uploadError } = await this.client.storage
        .from('media-assets')
        .upload(fileName, blob, { contentType, upsert: true });

      if (uploadError) {
        console.error('Supabase Media Upload Error:', uploadError);
        return; // Don't save record if upload fails
      }

      const { data: { publicUrl } } = this.client.storage
        .from('media-assets')
        .getPublicUrl(fileName);

      // 2. Save Record
      const record: any = {
        id: item.id,
        session_id: sessionId,
        type: item.type,
        title: item.title,
        url: publicUrl,
        prompt: item.prompt,
        created_at: new Date(item.createdAt).toISOString()
      };

      // Add user_id if authenticated
      if (userId) {
        record.user_id = userId;
      }

      const { error: dbError } = await this.client
        .from('media_history')
        .insert(record);

      if (dbError) console.error('Supabase Media DB Error:', dbError);
    } catch (e) {
      console.error("Error saving media item:", e);
    }
  }

  async updateMediaItemTitle(id: string, title: string): Promise<void> {
    if (!this.client) return;
    try {
      const { error } = await this.client
        .from('media_history')
        .update({ title })
        .eq('id', id);
      if (error) console.error('Supabase Update Media Title Error:', error);
    } catch (e) {
      console.error("Error updating media title", e);
    }
  }

  async getMediaHistory(sessionId: string): Promise<MediaItem[]> {
    if (!this.client) return [];

    try {
      const { data, error } = await this.client
        .from('media_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase Fetch Media Error:', error);
        return [];
      }

      return data.map((row: any) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        url: row.url,
        prompt: row.prompt,
        createdAt: new Date(row.created_at).getTime(),
        sessionId: row.session_id
      }));
    } catch (e) {
      console.error("Error getting media history", e);
      return [];
    }
  }

  // Get ALL media for a user across all sessions (for gallery sync after login)
  async getMediaHistoryByUser(userId: string): Promise<MediaItem[]> {
    if (!this.client) return [];

    try {
      console.log('[Supabase] Fetching all media for user:', userId);
      const { data, error } = await this.client
        .from('media_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase Fetch User Media Error:', error);
        return [];
      }

      console.log('[Supabase] Found', data?.length || 0, 'media items for user');
      return (data || []).map((row: any) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        url: row.url,
        prompt: row.prompt,
        createdAt: new Date(row.created_at).getTime(),
        sessionId: row.session_id
      }));
    } catch (e) {
      console.error("Error getting user media history", e);
      return [];
    }
  }

  async deleteMediaItem(item: MediaItem, sessionId: string, userId?: string): Promise<void> {
    if (!this.client) return;
    try {
      // 1. Delete from Storage
      const ext = item.type === 'video' ? 'mp4' : 'png';
      const sid = item.sessionId || sessionId;
      const fileName = userId ? `${userId}/${sid}/${item.id}.${ext}` : `${sid}/${item.id}.${ext}`;
      await this.client.storage.from('media-assets').remove([fileName]);

      // 2. Delete from DB
      await this.client.from('media_history').delete().eq('id', item.id);
    } catch (e) {
      console.error("Error deleting media", e);
    }
  }

  async deleteMediaItems(items: MediaItem[], userId: string): Promise<void> {
    if (!this.client) return;
    try {
      // 1. Storage removal
      const paths = items.map(item => {
        const ext = item.type === 'video' ? 'mp4' : 'png';
        const sid = item.sessionId;
        if (!sid) return null;
        return `${userId}/${sid}/${item.id}.${ext}`;
      }).filter(Boolean) as string[];

      if (paths.length > 0) {
        await this.client.storage.from('media-assets').remove(paths);
      }

      // 2. DB removal
      const ids = items.map(i => i.id);
      await this.client.from('media_history').delete().in('id', ids);
    } catch (e) {
      console.error("Bulk delete failure", e);
    }
  }

  // --- User Management & Credit System ---

  async getUserProfile(userId: string): Promise<any> {
    if (!this.client) throw new Error('Supabase client not initialized');

    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', userId);

    if (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }

    const profile = data && data.length > 0 ? data[0] : null;
    if (profile) {
      console.log(`User profile loaded: ${userId}, credits: ${profile.credits}, tier: ${profile.subscription_tier}`);
    } else {
      console.warn(`User profile not found for: ${userId}`);
    }

    return profile;
  }

  subscribeToCredits(userId: string, callback: (credits: number) => void) {
    if (!this.client) throw new Error('Supabase client not initialized');

    return this.client
      .channel(`users_${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`,
      }, (payload) => {
        console.log('Real-time credit update received:', payload.new.credits);
        callback(payload.new.credits);
      })
      .subscribe();
  }

  async removeChannel(channel: any): Promise<void> {
    if (!this.client) return;
    await this.client.removeChannel(channel);
  }

  async deductCredits(userId: string, amount: number, action: string, model_used?: string): Promise<{ success: boolean; new_balance: number; message: string }> {
    if (!this.client) throw new Error('Supabase client not initialized');

    try {
      const params: any = {
        p_user_id: userId,
        p_amount: amount,
        p_action: action,
      };

      // Only add optional parameters if provided
      if (model_used) {
        params.p_model_used = model_used;
      }

      const { data, error } = await this.client.rpc('deduct_user_credits', params);

      if (error) {
        console.error('RPC Error in deductCredits:', error);
        throw error;
      }

      // The function returns a table, handle both array and object formats
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      } else if (data && typeof data === 'object') {
        return data as { success: boolean; new_balance: number; message: string };
      }

      return { success: false, new_balance: 0, message: 'Unknown error' };
    } catch (error) {
      console.error('Error deducting credits:', error);
      throw error;
    }
  }

  async addUserCredits(userId: string, amount: number, purchaseId?: string): Promise<void> {
    if (!this.client) throw new Error('Supabase client not initialized');

    const { error } = await this.client
      .from('users')
      .update({
        credits: amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    // Log the transaction
    await this.client
      .from('credits_log')
      .insert({
        user_id: userId,
        amount: amount,
        action: 'purchase',
        remaining_balance: amount,
        metadata: purchaseId ? { purchase_id: purchaseId } : {}
      });
  }

  async createSubscription(userId: string, subscriptionData: any): Promise<void> {
    if (!this.client) throw new Error('Supabase client not initialized');

    const { error } = await this.client
      .from('subscriptions')
      .insert({
        user_id: userId,
        paystack_subscription_code: subscriptionData.stripe_subscription_id || subscriptionData.paystack_subscription_code, // Support both for transition
        tier: subscriptionData.tier,
        status: subscriptionData.status,
        price_amount: subscriptionData.price_amount,
        currency: subscriptionData.currency || 'kes',
        interval: subscriptionData.interval,
        current_period_start: subscriptionData.current_period_start,
        current_period_end: subscriptionData.current_period_end,
        cancel_at_period_end: subscriptionData.cancel_at_period_end || false,
      });

    if (error) throw error;
  }

  async getUserSubscription(userId: string): Promise<any> {
    if (!this.client) throw new Error('Supabase client not initialized');

    const { data, error } = await this.client
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('current_period_end', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  }
  // --- Enhanced User Management & Credit System ---

  async createUserProfile(userId: string, email: string): Promise<boolean> {
    if (!this.client) throw new Error('Supabase client not initialized');

    try {
      const { data, error } = await this.client.rpc('sync_user_profile', {
        p_user_id: userId,
        p_email: email,
      });

      if (error) throw error;
      return Boolean(data);
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, updates: Partial<{
    credits: number;
    subscription_tier: 'free' | 'basic' | 'plus' | 'pro';
    daily_credits: number;
  }>): Promise<void> {
    if (!this.client) throw new Error('Supabase client not initialized');

    const { error } = await this.client
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
  }

  async getUserCreditsHistory(userId: string, limit: number = 50): Promise<any[]> {
    if (!this.client) throw new Error('Supabase client not initialized');

    const { data, error } = await this.client
      .from('credits_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async checkCreditAvailability(userId: string, amount: number): Promise<boolean> {
    if (!this.client) {
      console.error('Supabase client not initialized for credit check');
      throw new Error('Supabase client not initialized - please refresh the page');
    }

    try {
      console.log(`Checking credit availability for user ${userId}, amount: ${amount}`);
      const { data: profile } = await this.getUserProfile(userId);
      console.log('Profile fetched:', profile);

      if (!profile) {
        console.warn('User profile not found in database - user may need to be synced');
        return false; // User not found - they need to sign in again to sync
      }

      console.log(`Checking credits: user ${userId} has ${profile.credits} credits, needs ${amount}, tier: ${profile.subscription_tier}`);

      // Pro users have unlimited credits
      if (profile.subscription_tier === 'pro') {
        console.log('Pro user - unlimited credits');
        return true;
      }

      const hasEnough = profile.credits >= amount;
      console.log(`Credit check result: ${hasEnough} (${profile.credits} >= ${amount})`);
      return hasEnough;
    } catch (error) {
      console.error('Error checking credit availability:', error);
      throw error; // Re-throw to show proper error to user
    }
  }

  async useCredits(userId: string, amount: number, action: string, model_used?: string, session_id?: string): Promise<{ success: boolean; new_balance: number; message: string }> {
    if (!this.client) throw new Error('Supabase client not initialized - please refresh the page');

    console.log(`Deducting ${amount} credits for user ${userId}, action: ${action}`);

    try {
      const params: any = {
        p_user_id: userId,
        p_amount: amount,
        p_action: action,
        p_model_used: model_used,
      };

      // Only add session_id if it's a valid UUID
      if (session_id) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(session_id)) {
          params.p_session_id = session_id;
        }
      }

      const { data, error } = await this.client.rpc('deduct_user_credits', params);

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      console.log(`Credit deduction result:`, data);

      // Check if credit deduction was successful
      if (data && data.success === false) {
        console.warn(`Insufficient credits: ${data.message}`);
        throw new Error(data.message || 'Insufficient credits');
      }

      console.log(`Credits deducted successfully. New balance: ${data?.new_balance}`);
      return data || { success: true, new_balance: 0, message: 'Credits deducted successfully' };
    } catch (error) {
      console.error('Error using credits:', error);
      throw error;
    }
  }

  async purchaseCredits(userId: string, amount: number, purchaseId?: string): Promise<boolean> {
    if (!this.client) throw new Error('Supabase client not initialized');

    try {
      const params: any = {
        p_user_id: userId,
        p_amount: amount,
      };

      // Only add optional parameters if provided
      if (purchaseId) {
        params.p_purchase_id = purchaseId;
      }

      const { data, error } = await this.client.rpc('add_user_credits', params);

      if (error) {
        console.error('RPC Error in purchaseCredits:', error);
        throw error;
      }

      // The function returns boolean directly
      return data === true;
    } catch (error) {
      console.error('Error purchasing credits:', error);
      throw error;
    }
  }

  async refundCredits(userId: string, amount: number): Promise<void> {
    if (!this.client) return;
    try {
      // Add credits back by calling deduct with negative amount
      // or directly updating the user's credits
      const { data: user, error: fetchError } = await this.client
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();
      
      if (fetchError || !user) {
        console.error('Could not fetch user for credit refund:', fetchError);
        return;
      }
      
      const { error: updateError } = await this.client
        .from('users')
        .update({ credits: (user.credits || 0) + amount })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Credit refund failed:', updateError);
      } else {
        console.log(`Refunded ${amount} credits to user ${userId}`);
      }
    } catch (err) {
      console.error('Credit refund error:', err);
    }
  }


  async addCredits(userId: string, amount: number, action: string = 'refund', purchaseId?: string): Promise<boolean> {
    if (!this.client) throw new Error('Supabase client not initialized');
    try {
      const params: any = {
        p_user_id: userId,
        p_amount: amount,
        p_action: action,
      };
      if (purchaseId) params.p_purchase_id = purchaseId;
      const { data, error } = await this.client.rpc('add_user_credits', params);
      if (error) {
        console.error('RPC Error in addCredits:', error);
        throw error;
      }
      return data === true;
    } catch (error) {
      console.error('Error adding credits:', error);
      throw error;
    }
  }

  async getUserApiKeys(userId: string): Promise<any[]> {
    if (!this.client) throw new Error('Supabase client not initialized');

    const { data, error } = await this.client
      .from('user_api_keys')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async addUserApiKey(userId: string, service: string, keyName: string, encryptedKey: string): Promise<void> {
    if (!this.client) throw new Error('Supabase client not initialized');

    const { error } = await this.client
      .from('user_api_keys')
      .insert({
        user_id: userId,
        service,
        key_name: keyName,
        encrypted_key: encryptedKey,
      });

    if (error) throw error;
  }

  async deleteUserApiKey(keyId: string, userId: string): Promise<void> {
    if (!this.client) throw new Error('Supabase client not initialized');

    const { error } = await this.client
      .from('user_api_keys')
      .update({ is_active: false })
      .eq('id', keyId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async updateUserApiKeyUsage(keyId: string): Promise<void> {
    if (!this.client) throw new Error('Supabase client not initialized');

    // First get current count, then update
    const { data: current } = await this.client
      .from('user_api_keys')
      .select('usage_count')
      .eq('id', keyId)
      .single();

    const newCount = (current?.usage_count || 0) + 1;

    const { error } = await this.client
      .from('user_api_keys')
      .update({
        usage_count: newCount,
        last_used_at: new Date().toISOString()
      })
      .eq('id', keyId);

    if (error) throw error;
  }

  // --- Subscription Management ---

  async updateSubscription(userId: string, subscriptionData: {
    stripe_subscription_id: string;
    tier: 'basic' | 'plus' | 'pro';
    status: 'active' | 'canceled' | 'past_due' | 'trialing';
    price_amount: number;
    currency?: string;
    interval: 'monthly' | 'yearly';
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end?: boolean;
  }): Promise<void> {
    if (!this.client) throw new Error('Supabase client not initialized');

    // First, update user's subscription tier
    await this.updateUserProfile(userId, { subscription_tier: subscriptionData.tier });

    // Then update or create subscription record
    const { error } = await this.client
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_subscription_id: subscriptionData.stripe_subscription_id,
        tier: subscriptionData.tier,
        status: subscriptionData.status,
        price_amount: subscriptionData.price_amount,
        currency: subscriptionData.currency || 'kes',
        interval: subscriptionData.interval,
        current_period_start: subscriptionData.current_period_start,
        current_period_end: subscriptionData.current_period_end,
        cancel_at_period_end: subscriptionData.cancel_at_period_end || false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'stripe_subscription_id' });

    if (error) throw error;
  }

  async cancelSubscription(userId: string): Promise<void> {
    if (!this.client) throw new Error('Supabase client not initialized');

    // Update subscription status
    const { error } = await this.client
      .from('subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;

    // Reset user to free tier at end of period
    // This will be handled by webhook when subscription actually expires
  }

  // --- Analytics and Reporting ---

  async getUserStats(userId: string): Promise<{
    totalMessages: number;
    totalImages: number;
    totalVideos: number;
    totalEdits: number;
    creditsUsed: number;
    creditsRemaining: number;
    subscriptionTier: string;
  }> {
    if (!this.client) throw new Error('Supabase client not initialized');

    try {
      // Get user profile
      const { data: profile } = await this.getUserProfile(userId);

      // Get usage stats from credits log
      const { data: usage } = await this.client
        .from('credits_log')
        .select('action, amount')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      const stats = {
        totalMessages: 0,
        totalImages: 0,
        totalVideos: 0,
        totalEdits: 0,
        creditsUsed: 0,
        creditsRemaining: profile?.credits || 0,
        subscriptionTier: profile?.subscription_tier || 'free',
      };

      usage?.forEach(log => {
        if (log.amount < 0) { // Usage (negative amount)
          stats.creditsUsed += Math.abs(log.amount);
          switch (log.action) {
            case 'chat':
              stats.totalMessages++;
              break;
            case 'image':
              stats.totalImages++;
              break;
            case 'video':
              stats.totalVideos++;
              break;
            case 'edit':
              stats.totalEdits++;
              break;
          }
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  // --- Real-time subscription improvements ---

  subscribeToUserUpdates(userId: string, callbacks: {
    onProfileUpdate?: (profile: any) => void;
    onCreditChange?: (credits: number) => void;
    onSubscriptionChange?: (subscription: any) => void;
  }) {
    if (!this.client) throw new Error('Supabase client not initialized');

    const channels = [];

    // Subscribe to profile changes
    if (callbacks.onProfileUpdate || callbacks.onCreditChange) {
      const profileChannel = this.client
        .channel(`public:users:id=${userId}`)
        .on('postgres_changes', {
          event: '*', // Listen to INSERT and UPDATE
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        }, (payload: any) => {
          if (callbacks.onProfileUpdate) {
            callbacks.onProfileUpdate(payload.new);
          }
          if (callbacks.onCreditChange) {
            callbacks.onCreditChange(payload.new?.credits || 0);
          }
        })
        .subscribe();
      channels.push(profileChannel);
    }

    // Subscribe to subscription changes
    if (callbacks.onSubscriptionChange) {
      const subscriptionChannel = this.client
        .channel(`public:subscriptions:user_id=${userId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${userId}`,
        }, (payload) => {
          callbacks.onSubscriptionChange(payload.new);
        })
        .subscribe();
      channels.push(subscriptionChannel);
    }

    return channels;
  }
}
