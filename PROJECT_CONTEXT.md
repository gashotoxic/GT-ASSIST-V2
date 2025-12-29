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
*   **Level 1 (Guest Mode):** `localStorage` for text, ephemeral Blobs for media.
*   **Level 2 (Cloud Mode):** Full Supabase persistence for messages and media assets (`media-assets` and `chat-audio` buckets).

### B. Monetization System (KES Focused)
The app uses a **1-credit unified model** powered by Paystack.
*   **Top-ups**: User can buy credit packs (starter, popular, power).
*   **Subscriptions**: Tiered recurring plans (Basic, Plus, Pro).
*   **Webhook**: A secure HMAC-SHA512 verified Supabase Edge Function processes payments and upgrades users in real-time.

### C. UI/UX Design
*   **Design Language**: Glassmorphism (High blur, transparency, gradients).
*   **Custom UI Layer (`UI.tsx`)**: Optimized for mobile. Includes a custom viewport-aware `Select` component to handle long lists (like models) without screen overflow.
*   **Mobile Ergonomics**: Navigation bar is positioned at `bottom-10` to avoid native system buttons.

---

## 3. Service Layer

### `services/chutes.ts` (AI Inference)
*   **Streaming**: LLM responses via `ReadableStream`.
*   **Prompt Enhancer**: Uses DeepHermes-3 to expand simple prompts.
*   **Adaptive Payloads**: Handles diverse GenAI model requirements automatically.

### `services/supabase.ts` (Persistence)
*   **Credits**: Uses RPC `add_user_credits` for atomic balance updates.
*   **Media**: Automates the upload -> public URL -> DB insertion pipeline.

### `services/search.ts` (Grounding)
*   Integrates Tavily and Brave Search (via `corsproxy.io`) for real-time web grounding.

---

## 4. Media Studio Features
*   **Parallel Processing**: Multiple generations can run concurrently.
*   **Generator**: T2I using Hunyuan, Juggernaut, etc.
*   **Magic Editor**: Natural language image editing.
*   **Animator**: Wan 2.2 I2V and Wan 2.1 T2V with "Extend Video" frame-capture technology.
*   **Gallery**: Full history with renaming and lightbox support.

---

## 5. Security & Configuration
*   **Auth**: Clerk manages the identity layer.
*   **Webhooks**: Verified via `PAYSTACK_SECRET_KEY` in Supabase Secrets.
*   **Storage**: RLS policies allow authenticated uploads to private buckets.

---

**Last Updated**: December 29, 2025
