# GT Assistant

A next-generation AI Assistant platform featuring real-time Chat, Voice, Image Generation, Magic Editing, and Video Animation. Optimized for the Kenyan market with **Paystack (KES)** integration.

## 🚀 Key Features

*   **Multi-Model Chat**: DeepSeek R1 (Thinking), GLM-4, Qwen VL, and more.
*   **Conversation Intelligence**: Message editing, retrying, and branching.
*   **Media Studio**:
    *   **Generator**: High-quality images (Hunyuan, Flux).
    *   **Magic Editor**: Edit images with simple text commands.
    *   **Animator**: LTX 2.5 (i2v/t2v) + Wan Video, and Lip Sync (MuseTalk).
*   **Monetization**: Tiered subscriptions and credit packs via Paystack.
*   **Cloud Sync**: Persist your history and media via Supabase.
*   **Voice Engine**: STT (Whisper) and TTS (Kokoro) with 28 premium voices.

## 🏗 Architecture (5-minute read)

One credit balance powers every mode — chat, image generation and editing, video animation,
speech-to-text, and text-to-speech. This is how the whole thing fits together.

**The big picture** — a React SPA (Vite) talks to three kinds of backends: Vercel functions
that proxy model calls, Clerk for identity, and Supabase (Postgres + Storage) for state.
Payments run through Paystack in KES.

```
Browser (React SPA)                Vercel functions               Providers
┌──────────────────────┐  HTTPS   ┌──────────────────────┐       ┌─────────────────┐
│ chat / media studio /│ ───────► │ /api/chutes          │ ────► │ Chutes: LLM,    │
│ Photoshop Corner     │  (SSE    │ /api/search          │       │ image, video,   │
│                      │  stream) │ keys + guards live   │ ◄──── │ audio models    │
│                      │ ◄─────── │ here                 │       └─────────────────┘
└──────────┬───────────┘          └──────────────────────┘
           │                               │
           ▼                               ▼
┌──────────────────────┐          ┌──────────────────────┐
│ Clerk (sign-in)      │          │ Paystack (KES        │
│ Supabase (Postgres,  │          │ checkout, confirmed  │
│ media storage, RLS)  │          │ by the customer)     │
└──────────────────────┘          └──────────────────────┘
```

**Request flow (chat and media):**

1. The SPA posts the request to a same-origin serverless route (`api/chutes.ts`).
2. The route injects the provider key from server-side environment variables — the key never
   reaches the browser — and forwards to the model gateway over an HTTPS-443 host allowlist.
   Upstream redirects are never followed, so the injected Authorization header cannot leave
   the allowlist.
3. The response streams straight back (SSE included); binary media passes through untouched.
4. Transient provider errors (429/503) are retried with exponential backoff + jitter
   (`services/retryFetch.ts`) before the user ever sees a failure.
5. Every api route carries a browser-Origin allowlist and per-IP rate limiting.

**Modes and model lanes:**

- **Chat** — fast lanes (Nemotron 3, DeepSeek V4-Flash, Qwen3.6-27B) for everyday work and
  reasoning lanes (Kimi K3, GLM-5.2, Qwen3-235B-Thinking) for hard problems, plus vision
  models for Brand mode.
- **Media Studio** — image generation + text-guided editing, image→video animation (LTX 2.5),
  speech-to-text (Whisper) and text-to-speech (Kokoro).
- **Photoshop Corner** — a full canvas editor that runs client-side. Manual editing is the
  primary path and works offline; AI tools are optional add-ons.

**State and memory** — Supabase Postgres (row-level security) persists conversations —
including message edits, retries and full branch history — generated media, the knowledge
base, and the per-user credit ledger. Any device resumes exactly where the last one stopped.

**Credits and payments** — every action is priced in credits (`services/creditCosts.ts`): a
free daily allowance plus paid packs and subscriptions via Paystack in KES. A purchase lands
in the ledger only after Paystack confirms it server-side (webhook) — spending always has a
human confirming the checkout.

**Security model:**

- Provider keys live only in server-side env (`CHUTES_API_KEY`); nothing secret ships in the
  client bundle.
- `npm run build` finishes with `scripts/scan-dist-secrets.mjs`, which fails the build if any
  key shape reaches `dist/` — a reintroduced client secret cannot ship silently.
- Auth via Clerk; Supabase tables enforce RLS; the api proxy is not an open relay (host
  allowlist, no redirect following, Origin + per-IP rate guards).

**Repo map**

| Path | What lives there |
|---|---|
| `api/` | Vercel functions — the server-side model/search proxy |
| `services/` | Provider clients, credit costs, retry/backoff, knowledge base, sync |
| `context/` | React contexts — auth, credits, app services |
| `components/` | chat, Media Studio, Photoshop Corner, shared UI |
| `database/` | SQL migrations + schema docs (RLS, credits, storage) |
| `lib/` | Paystack integration |
| `scripts/` | Build-time secret scan, API smoke tests |

Deeper docs: [`docs/SETUP.md`](docs/SETUP.md), [`docs/DATABASE.md`](docs/DATABASE.md),
[`docs/PAYSTACK_SETUP_GUIDE.md`](docs/PAYSTACK_SETUP_GUIDE.md).

## 📊 Status: Phase 3 In Progress (see ROADMAP.md / PROGRESS_REPORT.md)

**Major additions since v2:** Photoshop Corner full canvas editor (5-phase upgrade: selections, layers w/ effects/groups/masks, clone/heal/retouch, rulers/guides/snapping, export presets) + LTX 2.5 video (LTX 2.3 removed) + SEO (sitemap/robots/llms.txt).

**Phase 1 (Monetization & Foundation): ✅ 100% COMPLETE**
*   Clerk Auth 
*   Supabase Cloud Persistence
*   Paystack Payment Gateway (Live)
*   Unified Credit System

**Phase 2 (Experience Enhancements): ✅ 100% COMPLETE**
*   Message Actions (Edit/Retry)
*   Conversation Branching
*   Gallery Polish & Multi-select

**Phase 3 (Advanced Intelligence): 🔄 IN PROGRESS**
*   Advanced Knowledge Grounding
*   Media Studio Intelligence

## 🛠️ Setup

1.  **Clone** and `bun install`.
2.  Configure `.env.local` using `.env.example`.
3.  Deploy **Supabase Edge Functions** for Paystack webhooks.
4.  Run `bun run dev`.

Detailed guide: [docs/SETUP.md](docs/SETUP.md)

## 📚 Resources

*   [🎯 Status Report](IMPLEMENTATION_STATUS.md)
*   [🏗️ Tech Context](PROJECT_CONTEXT.md)
*   [💳 Paystack Guide](docs/PAYSTACK_SETUP_GUIDE.md)
*   [🗄️ Database Architecture](docs/DATABASE.md)

---
**Powered by Chutes.ai** | Built with React 19 & Tailwind CSS
