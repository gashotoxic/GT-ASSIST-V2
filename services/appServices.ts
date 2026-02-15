import { AppSettings } from '../types';
import { ChutesService } from './chutes';
import { SupabaseService } from './supabase';

export type AppServices = {
  supabaseService: SupabaseService;
  chutesService: ChutesService;
  effectiveSettings: AppSettings;
};

const supabaseCache = new Map<string, SupabaseService>();
const chutesCache = new Map<string, ChutesService>();

export const getEffectiveSettings = (settings: AppSettings, isSignedIn: boolean): AppSettings => {
  if (!isSignedIn) return settings;
  const supabaseUrl = import.meta.env.VITE_APP_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_APP_SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) return settings;
  return {
    ...settings,
    useSupabase: true,
    supabaseUrl,
    supabaseKey,
  };
};

export const getAppSupabaseService = (settings: AppSettings, isSignedIn: boolean): SupabaseService => {
  const effective = getEffectiveSettings(settings, isSignedIn);
  const supabaseUrl = effective.supabaseUrl;
  const supabaseKey = effective.supabaseKey;
  if (isSignedIn && effective.useSupabase && supabaseUrl && supabaseKey) {
    const cacheKey = `${supabaseUrl}::${supabaseKey}`;
    const existing = supabaseCache.get(cacheKey);
    if (existing) return existing;
    const created = new SupabaseService(effective);
    supabaseCache.set(cacheKey, created);
    return created;
  }
  return new SupabaseService(effective);
};

export const getAppChutesService = (settings: AppSettings): ChutesService => {
  const key = settings.apiKey || 'internal';
  const existing = chutesCache.get(key);
  if (existing) return existing;
  const created = new ChutesService(key);
  chutesCache.set(key, created);
  return created;
};

export const getAppServices = (settings: AppSettings, isSignedIn: boolean): AppServices => {
  const effectiveSettings = getEffectiveSettings(settings, isSignedIn);
  return {
    effectiveSettings,
    supabaseService: getAppSupabaseService(settings, isSignedIn),
    chutesService: getAppChutesService(effectiveSettings),
  };
};

