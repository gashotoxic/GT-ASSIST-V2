# DOX -- services

**External API services and business logic**

## Files

- chutes.ts -- Chutes API client (LLM, image gen, image edit, video gen, style transfer, remove bg, upscale, TTS, STT). Video routing: LTX 2.5 (chutesLtx25.ts) + Wan; LTX 2.3 removed 2026-08-29.
- retryFetch.ts -- `fetchWithRetry` helper: retries HTTP 429 (503 optional) with exponential backoff + jitter, honors AbortSignal, passes through all other statuses.
- supabase.ts -- Supabase client (user data, credits, billing, analytics)
- aiPhotoService.ts -- AI-powered Photoshop operations with credit deduction
- creditCosts.ts -- Credit cost definitions for all AI features
- brandStudioToolRuntime.ts -- Brand studio tool runtime
- search.ts -- Tavily/Brave web search via the /api/search proxy (API key injected server-side, never in the browser)
- toolOutputValidation.ts -- Runtime schema validation of external tool outputs (tier1: toolOutputsValidated): Tavily/Brave search, SearchContext, knowledge rows, embeddings, Brand Studio tool results

## Local Contracts

- Chutes API uses vonkaiser-* endpoints after June 2026 migration
- Credit deduction pattern: deductCredits(userId, action, model_used?) returns boolean
- All AI operations are credit-gated via isAuthenticated + deductCredits
- Video generation (generateVideo) retries Chutes 429 ("Infrastructure at maximum capacity") up to 3 times with ~2s/4s/8s + jitter backoff via fetchWithRetry; other 4xx are never retried
- ValidationResult<T> is { ok: true; value; dropped } | { ok: false; errors } — narrow the failure branch with `ok === false`, never `!ok`: strictNullChecks is off in tsconfig, so `!ok` does not narrow the union (see formatErrors). Every ValidationResult call site in services/ uses this idiom; an eslint `no-restricted-syntax` rule (eslint.config.js, services/**) fails lint on `!<validated|validatedEmbedding|validatedRows|check>.ok`. The guard is name-based — a renamed variable or `!x?.ok` escapes it, so keep the names or extend the selector list
