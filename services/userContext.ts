/**
 * App user context — the single place client-side services learn "who is
 * signed in and with what session" for Supabase REST writes.
 *
 * Consumed by services/modelCallLog.ts and services/queryCache.ts, both of
 * which need the user's own session token (RLS insert policy) at call time.
 * Wired from services/appServices.ts on every service resolution, so the
 * token is always the freshest one Clerk has issued.
 */

export type AppUserContext = {
  /** Clerk user id (TEXT in the DB), null when signed out. */
  userId: string | null;
  /** Clerk session token used as the Supabase REST Bearer token. */
  accessToken: string | null;
  supabaseUrl: string;
  supabaseKey: string;
};

let current: AppUserContext | null = null;

export function setAppUserContext(ctx: AppUserContext | null): void {
  current = ctx;
}

export function getAppUserContext(): AppUserContext | null {
  return current;
}

/** True when writes/reads against Supabase REST are possible for a real user. */
export function hasActiveUserContext(): boolean {
  return Boolean(current && current.userId && current.accessToken && current.supabaseUrl && current.supabaseKey);
}
