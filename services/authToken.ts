/**
 * Clerk session token plumbing for server-side proxy auth.
 *
 * The /api/chutes and /api/search proxies require a genuine Clerk session JWT
 * (verified server-side against Clerk's JWKS via node:crypto). The browser gets
 * short-lived session tokens from Clerk (`getToken()`), so this module holds the
 * token getter registered by AuthProvider and exposes header helpers used by
 * every client call into the proxies.
 *
 * Contract:
 * - `setAuthTokenGetter` is called once from AuthProvider with Clerk's getToken.
 * - `authHeaders()` returns `{ Authorization: 'Bearer <token>' }` when signed
 *   in, or `{}` when signed out (the proxy then answers 401 "Authentication
 *   required"; the surfaced error tells the user to sign in — there is no
 *   dedicated sign-in modal on this path).
 * - No key material is ever stored here — only short-lived session JWTs.
 */

type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

export const setAuthTokenGetter = (getter: TokenGetter | null): void => {
  tokenGetter = getter;
};

export const getAuthToken = async (): Promise<string | null> => {
  if (!tokenGetter) return null;
  try {
    return (await tokenGetter()) || null;
  } catch {
    return null;
  }
};

/** Headers to attach to every /api/chutes and /api/search call. */
export const authHeaders = async (): Promise<Record<string, string>> => {
  const token = await getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};
