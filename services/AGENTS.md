# DOX -- services

**External API services and business logic**

## Files

- chutes.ts -- Chutes API client (LLM, image gen, image edit, video gen, style transfer, remove bg, upscale, TTS, STT)
- supabase.ts -- Supabase client (user data, credits, billing, analytics)
- aiPhotoService.ts -- AI-powered Photoshop operations with credit deduction
- creditCosts.ts -- Credit cost definitions for all AI features
- brandStudioToolRuntime.ts -- Brand studio tool runtime

## Local Contracts

- Chutes API uses vonkaiser-* endpoints after June 2026 migration
- Credit deduction pattern: deductCredits(userId, action, model_used?) returns boolean
- All AI operations are credit-gated via isAuthenticated + deductCredits
