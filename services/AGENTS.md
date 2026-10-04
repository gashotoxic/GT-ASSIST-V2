# DOX -- services

**External API services and business logic**

## Files

- chutes.ts -- Chutes API client (LLM, image gen, image edit, video gen, style transfer, remove bg, upscale, TTS, STT). Video routing: LTX 2.5 (chutesLtx25.ts) + Wan; LTX 2.3 removed 2026-08-29.
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
