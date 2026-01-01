# GT Assistant - Technical Documentation & Context

## 1. Project Overview
**Application:** GT Assistant  
**Type:** Client-Side Single Page Application (SPA)  
**Core Stack:** React 19, Tailwind CSS, TypeScript.  
**Inference:** Chutes.ai.
**Auth:** Clerk (Authentication & User Management).
**Database/Backend:** Supabase (PostgreSQL, Edge Functions, Storage).
**Payments:** Paystack (KES Monetization).

---

## 2. Core Architecture

### A. State Management & Persistence
The app handles data storage in two distinct levels:
*   **Level 1 (Ephemeral Session):** Temporary in-memory state for non-critical local actions.
*   **Level 2 (Cloud Persistence):** Mandatory Supabase persistence for all chat messages and generated media assets (`media-assets` and `chat-audio` buckets). Guest mode for media has been deprecated for superior security and history cross-sync.

### B. Monetization System (KES Focused)
The app uses a **1-credit unified model** powered by Paystack.
*   **Top-ups**: User can buy credit packs (starter, popular, power).
*   **Subscriptions**: Tiered recurring plans (Basic, Plus, Pro).
*   **Webhook**: A secure HMAC-SHA512 verified Supabase Edge Function processes payments and upgrades users in real-time.

### C. UI/UX Design
*   **Design Language**: Glassmorphism (High blur, transparency, gradients).
*   **Custom UI Layer (`UI.tsx`)**: Optimized for mobile. Includes a custom viewport-aware `Select` component to handle long lists (like models) without screen overflow.
*   **Mobile Ergonomics**: Navigation bar is positioned at `bottom-10` to avoid native system buttons. Tabs and headers are optimized for ultra-narrow screens using adaptive spacing.

---

## 3. Service Layer

### `services/chutes.ts` (AI Inference)
*   **Streaming**: LLM responses via `ReadableStream`.
*   **Prompt Enhancer**: Uses DeepHermes-3 to expand simple prompts.
*   **Adaptive Payloads**: Handles diverse GenAI model requirements automatically.

### `services/supabase.ts` (Persistence)
*   **Credits**: Uses RPC `add_user_credits` for atomic balance updates.
*   **Media**: Automates the upload -> public URL -> DB insertion pipeline. Supports efficient bulk deletion and cloud-synced title editing.

### `services/search.ts` (Grounding)
*   Integrates Tavily and Brave Search (via `corsproxy.io`) for real-time web grounding.

---

## 4. Media Studio Features
*   **Parallel Processing**: Multiple generations can run concurrently.
*   **Generator**: T2I using Hunyuan, Juggernaut, etc.
*   **Magic Editor**: Natural language image editing.
*   **Animator**: Wan 2.2 I2V and Wan 2.1 T2V with "Extend Video" frame-capture technology.
*   **Gallery**: Full history with renaming, multi-select bulk delete, and lightbox support. Mandatory cloud persistence.

---

## 5. Security & Configuration
*   **Auth**: Clerk manages the identity layer. Mandatory for media persistence.
*   **Webhooks**: Verified via `PAYSTACK_SECRET_KEY` in Supabase Secrets.
*   **Storage**: RLS policies allow authenticated uploads to private buckets.

---

**Last Updated**: January 1, 2026
