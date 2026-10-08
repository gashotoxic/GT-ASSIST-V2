# DOX -- services

**External API services and business logic**

## Files

- chutes.ts -- Chutes API client (LLM, image gen, image edit, video gen, style transfer, remove bg, upscale, TTS, STT). Video routing: LTX 2.5 (chutesLtx25.ts) + Wan; LTX 2.3 removed 2026-08-29. ALL calls go through the /api/chutes proxy with a Clerk session header — this file never sets an upstream Authorization header or reads secret env vars.
- authToken.ts -- Clerk session-token plumbing: AuthProvider registers getToken(); authHeaders() attaches `Authorization: Bearer <token>` to every /api call. No key material, only short-lived session JWTs.
- searchAgent.ts -- multi-provider web-search orchestration (Tavily/Brave via /api/search proxy)
- search.ts -- legacy SearchService (DEAD CODE, no importers — candidate for deletion)
- retryFetch.ts -- `fetchWithRetry` helper: retries HTTP 429 (503 optional) with exponential backoff + jitter, honors AbortSignal, passes through all other statuses.
- supabase.ts -- Supabase client (user data, credits, billing, analytics)
- aiPhotoService.ts -- AI-powered Photoshop operations with credit deduction
- creditCosts.ts -- Credit cost definitions for all AI features
- brandStudioToolRuntime.ts -- Brand studio tool runtime

## Local Contracts

- Chutes API uses vonkaiser-* endpoints after June 2026 migration
- Credit deduction pattern: deductCredits(userId, action, model_used?) returns boolean
- All AI operations are credit-gated via isAuthenticated + deductCredits
- Video generation (generateVideo) retries Chutes 429 ("Infrastructure at maximum capacity") up to 3 times with ~2s/4s/8s + jitter backoff via fetchWithRetry; other 4xx are never retried
- No VITE_-prefixed secret may be read in services/ — see api/AGENTS.md; client BYOK keys pass to the proxy as userKey
- retryFetch/fetchWithRetry skip retrying proxy-generated errors (X-Proxy-Error: 1) — only upstream passthroughs are retried
