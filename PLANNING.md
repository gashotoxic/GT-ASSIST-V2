# Next Phase Roadmap (GT Assistant)

This document translates the “next phase” strategy into an implementation backlog: epics → tasks → acceptance criteria. It is designed to be iterated as the app evolves.

## Product Goals
- Stability: fewer regressions while shipping fast.
- Consistency: unify auth/storage/credits behavior across Chat/Media/Settings.
- Scale: add models/tools/features without turning core components into bottlenecks.
- Polish: responsive UI that works at 320–1200px widths.

## Current Architecture Snapshot
- Auth: Clerk, user row sync into Supabase `users` (id = Clerk user id).
- Persistence: guest localStorage, signed-in Supabase tables (`chat_sessions`, `messages`, `media_history`).
- Credits: two-pool (daily + permanent) with atomic RPC (`deduct_user_credits`).
- Billing: Paystack checkout + Supabase edge webhook.
- AI: Chutes streaming chat + media generation + web search grounding + KB (RAG).

## Tracks (Workstreams)
- Track A (Recommended): Platform hardening + performance.
- Track B: Security/data consistency (Supabase auth/RLS, webhook/billing audit).
- Track C: Product expansion (Brand Profile, templates, Knowledge Base UX).

## Track A — Platform Hardening + Performance

### Epic A1: Decompose large components (“god components”)
**Scope**
- Split: App shell, Chat, Media into focused modules.

**Tasks**
- A1.1 Split [App.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/App.tsx) into:
  - `AppShell` (theme, layout)
  - `AppHeader`
  - `AppRoutes` (chat/media/pricing)
  - `SettingsController` (settings persistence + modals)
- A1.2 Split [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx) into:
  - `MessageList`
  - `MessageRow` (render + actions)
  - `Composer` (textarea + send + attachments)
  - `QuickToolsMenu`
  - `ChatPersistence` (load/save + session prefs)
  - `ChatOrchestrator` (streaming + abort + status)
- A1.3 Split [MediaStudio.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/MediaStudio.tsx) into:
  - `MediaTabs`
  - `ImagePanel`
  - `EditPanel`
  - `VideoPanel`
  - `GalleryPanel`
  - `MediaPersistence` (save/load)

**Acceptance Criteria**
- The top-level files drop below ~300 lines each (excluding static strings).
- No behavior regressions: chat streaming, credits deduction, gallery persistence still work.
- No circular dependencies introduced.

### Epic A2: Centralize services (Supabase/Chutes/Search) + unify lifetime
**Scope**
- Create a single “services layer” in React context (or hooks) to prevent duplicate instantiation.

**Tasks**
- A2.1 Add `ServicesProvider` to provide:
  - `supabaseService` (configured consistently for auth vs guest)
  - `chutesService`
  - optional `searchAgent`/`knowledgeBaseService`
- A2.2 Replace ad-hoc instantiation in:
  - [App.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/App.tsx)
  - [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx)
  - [CreditContext.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/context/CreditContext.tsx)

**Acceptance Criteria**
- Only one SupabaseService instance per user session.
- Realtime subscription cleanup is deterministic (no double channels).

### Epic A3: Route-based code splitting
**Scope**
- Reduce initial bundle and improve first render time.

**Tasks**
- A3.1 Convert heavy views to lazy loaded:
  - `MediaStudio`
  - `PricingPage`
  - `AccountSettingsModal` (only load when opened)
- A3.2 Split markdown rendering and other heavyweight modules where possible.

**Acceptance Criteria**
- Production build still passes.
- First load JS size reduced (compare before/after build output).
- No flicker/blank screens (use fallback skeletons).

### Epic A4: UI responsiveness hardening (device matrix)
**Scope**
- Make the layout stable at problematic widths (320/360/390/412/768/1024).

**Tasks**
- A4.1 Define “layout primitives” and re-use them:
  - 3-column mobile header grid
  - consistent sidebar breakpoint rules
  - dropdown behaviors (hover vs touch)
- A4.2 Add a small “responsive checklist” and enforce it when changing header/sidebar/settings.

**Acceptance Criteria**
- No overlaps for navbar controls at 320–412 widths.
- Sidebar behavior consistent at ≥768 widths.

## Track B — Security + Data Consistency

### Epic B1: Decide and enforce Supabase auth model
**Options**
- Option 1: Anon key + strict `user_id` filtering in queries + strict RLS policies.
- Option 2: Clerk JWT interop → Supabase client uses JWT for RLS enforcement.

**Tasks**
- B1.1 Audit all Supabase operations for:
  - table access
  - where user isolation is enforced
  - any reliance on client-provided `userId`
- B1.2 Implement the chosen model consistently across:
  - sessions/messages/media
  - knowledge base endpoints
  - credits RPC calls

**Acceptance Criteria**
- A signed-in user cannot read/write another user’s rows even if tampering with the client.
- Guest mode still works (localStorage only).

### Epic B2: Billing and credits auditability
**Tasks**
- B2.1 Add a “purchase ledger” table to record Paystack events → credits added.
- B2.2 Make webhook idempotent (event dedupe).
- B2.3 Add admin diagnostics view (optional) for credit history.

**Acceptance Criteria**
- Replayed webhooks do not double-credit.
- Credits can be reconciled from ledger.

## Track C — Product Expansion

### Epic C1: Model management becomes first-class
**Tasks**
- C1.1 Add favorites/pins and recent models list.
- C1.2 Add capability tags (Vision/Text/Tools) and filter UI.
- C1.3 Add per-mode defaults and explainability (Chat vs Brand).

**Acceptance Criteria**
- Users can pin a model and see it at the top in both mobile + desktop pickers.
- Brand mode always shows only vision-capable models.

### Epic C2: Brand Profile (structured)
**Tasks**
- C2.1 Create “Brand Profile” schema (tone, product, audience, do/don’t).
- C2.2 Add UI editor and attach profile to Brand mode prompts.
- C2.3 Add templates library (ad copy, captions, hooks).

**Acceptance Criteria**
- Brand mode produces consistent outputs across sessions with the same profile.

### Epic C3: Knowledge Base UX polish
**Tasks**
- C3.1 Better ingestion UI: doc status, chunk preview, re-index.
- C3.2 Add citations display in assistant answers when KB is used.

**Acceptance Criteria**
- Users can see which KB docs were used for a response.

## QA / Release Checklist
- Run `npm run lint` and `npm run build`.
- Device widths: 320, 360, 390, 412, 768, 1024, 1440.
- Auth tiers: free, basic, plus, pro.
- Critical paths:
  - Sign-in → sessions load from Supabase.
  - Send chat message → streaming works → credits deducted.
  - Media generate → saved to media history → gallery loads.
  - Paystack test purchase → credits/tier update → realtime reflects.

