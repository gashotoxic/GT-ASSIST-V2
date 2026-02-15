## Current Snapshot (What You Have)
- **Core app**: Single-page shell with views (Chat / Media / Pricing) and a strong, modern UI layer.
- **Auth + identity**: Clerk-based, with Supabase user-row sync.
- **Persistence**: Guests in localStorage; signed-in users in Supabase tables for sessions/messages/media.
- **Credits + billing**: Two-pool credit system with atomic Postgres RPC and Paystack webhook.
- **AI runtime**: Chutes streaming chat + media generation, plus search grounding and Knowledge Base (RAG).

## Goals For “Next Phase”
- **Stability**: reduce regression risk while iterating quickly.
- **Consistency**: unify how auth, storage, and credits work across chat/media/settings.
- **Scale**: make the codebase easier to extend (models, tools, tabs, pricing).
- **Polish**: responsive/UI consistency across devices, especially the “edge” widths.

## Pillars & Detailed Plan

## 1) Platform Hardening (Architecture)
- **Split the “god components”**
  - Break [App.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/App.tsx), [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx), and [MediaStudio.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/MediaStudio.tsx) into smaller feature modules.
  - Target boundaries:
    - Chat: `MessageList`, `Composer`, `QuickToolsMenu`, `ChatHeader/Status`, `ChatPersistence`.
    - Media: `ImagePanel`, `EditPanel`, `VideoPanel`, `GalleryPanel`, `MediaPersistence`.
    - App shell: `Header`, `Sidebar`, `Settings`, `Routing`.
- **Centralize app services**
  - Create a single “service provider” (or hook) that owns `SupabaseService`, `ChutesService`, and shared event wiring.
  - Remove duplicated initialization across App/Chat/Credit contexts.
- **Typed event bus**
  - Replace ad-hoc `window.dispatchEvent` usage with a small typed helper (still using browser events under the hood).

## 2) Security & Data Consistency
- **Verify Supabase auth + RLS model**
  - Decide: either use anon-key with strict `user_id` filtering everywhere (and enforce in SQL/RLS), or use Clerk JWT interop consistently.
  - Audit tables: `users`, `chat_sessions`, `messages`, `media_history`.
- **Harden webhook + billing**
  - Ensure Paystack webhook idempotency and robust event handling.
  - Add “purchase ledger” row(s) so credits can be reconciled and audited.
- **Secrets policy**
  - Ensure no secret keys are ever logged client-side; confirm edge function uses env only.

## 3) Performance & Reliability
- **Code-splitting & lazy loading**
  - Build output warns about large chunks. Convert heavy routes (Media, Pricing, Settings) to `React.lazy()`.
  - Split large dependency areas (markdown renderers, media tooling) so Chat stays fast.
- **UI responsiveness hardening**
  - Introduce a small set of layout primitives:
    - “3-column mobile header grid” (already started)
    - “sidebar breakpoints” standardized (md/desktop)
  - Add a quick “device matrix” checklist (320, 360, 390, 412, 768, 1024).
- **Error boundaries + retry patterns**
  - Add an app-level error boundary for catastrophic failures.
  - Standardize request cancellation (abort controllers) and retry/backoff for network calls.

## 4) Product Expansion (User-Facing Features)
- **Model management as a first-class feature**
  - Favorites/pinning, “recent models”, and capability tags (Vision/Text/Tools).
  - Per-mode defaults (Chat vs Brand) with clear affordances.
- **Brand Studio maturation**
  - Add structured “Brand Profile” (tone, audience, product, constraints) saved to Supabase.
  - Template library for ads/posts, reusable prompt packs.
- **Knowledge Base experience**
  - Better ingestion UX: chunk preview, doc status, re-index button.
  - Add citations UI in chat responses when KB is used.
- **Sharing and portability**
  - Export chat to markdown/pdf; shareable “read-only” links for a session.

## 5) Quality, Testing, and Delivery
- **Introduce automated tests**
  - Start with unit tests for pure logic: credit cost lookup, prompt building, model metadata.
  - Add a small e2e suite for the critical path: sign-in, send message, deduct credits, open media, purchase flow.
- **CI pipeline**
  - Run `lint`, `build`, and tests on PRs.
- **Release checklist**
  - Basic smoke tests per device widths and per tier (free/basic/plus/pro).

## Deliverables (What “Done” Looks Like)
- **Maintainability**: large components reduced; services centralized; fewer regressions.
- **Consistency**: one auth/storage/credits approach across the app.
- **Speed**: smaller initial bundle, faster first render.
- **UX polish**: responsive behavior stable across common mobile widths.
- **Growth-ready**: model/catalog expansion and brand/KB workflows become repeatable.

## Suggested Next Step (Pick One Track To Start)
- **Track A (Recommended)**: Platform Hardening + Performance (component split + lazy routes + service centralization).
- **Track B**: Data/Security audit (RLS/JWT consistency + purchase ledger).
- **Track C**: Product expansion (Brand Profile + Templates + KB polish).

If you tell me which track you want first, I’ll translate it into a concrete implementation backlog (epics → tasks → acceptance criteria) using your current code structure.