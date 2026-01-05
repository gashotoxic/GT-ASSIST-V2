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
*   **Level 2 (Cloud Persistence):** Mandatory Supabase persistence for all chat messages and generated media assets (`media-assets` and `chat-audio` buckets).
*   **Sync Logic**: LocalStorage is strictly cleared on user change to prevent session leakage.

### B. Monetization System (KES Focused)
The app uses a **Unified Credit Model** powered by Paystack.
*   **Two-Pool System**: Users have `daily_credits` (reset daily) and `credits` (permanent).
*   **Smart Deduction**: The system automatically uses daily credits *first*, then permanent credits.
*   **Pro Tier**: Pro users have a "bypass" flag, effectively giving them unlimited usage (displayed as `∞`).
*   **Webhooks**: A secure HMAC-SHA512 verified Supabase Edge Function (`paystack-webhook`) handles:
    *   `charge.success`: Top-ups (add permanent credits).
    *   `subscription.create`: Assigns tier and daily allowance.
    *   `subscription.disable`: Expires subscription (reverts to free, resets credits).

### C. UI/UX Design
*   **Design Language**: Glassmorphism (High blur, transparency, gradients).
*   **Mobile Ergonomics**: Navigation bar is positioned at `bottom-10`. Tabs and headers are optimized for ultra-narrow screens.
*   **Real-Time Updates**: Header credit balance updates instantly via Supabase Realtime subscription.

---

## 3. Service Layer

### `services/chutes.ts` (AI Inference)
*   **Streaming**: LLM responses via `ReadableStream`.
*   **Adaptive Payloads**: Handles diverse GenAI model requirements (InternVL3, Qwen2.5, Flux, etc.).

### `services/supabase.ts` (Persistence)
*   **Credits**: Uses RPC `deduct_user_credits` for atomic, JIT (Just-In-Time) balanced deduction.
*   **Real-time**: Subscribes to `users` table for instant credit/tier updates.
*   **Media**: Automates the upload -> public URL -> DB insertion pipeline.

### `services/searchAgent.ts` (Intelligent Web Grounding)
*   **Query Analysis**: Classifies queries as news/research/quick/comprehensive.
*   **Multi-Provider Fallback**: Tavily → Brave with automatic failover.
*   **Result Synthesis**: Creates context with numbered `[1][2]` inline citations.
*   **Source Extraction**: Clean metadata with favicons for SearchResultsCard UI.

### `services/knowledgeBase.ts` (RAG)
*   **Document Ingestion**: Reads, chunks, embeds, and stores documents.
*   **Chunking**: 500-token chunks with 50-token overlap.
*   **Embedding**: Uses Chutes API (OpenAI-compatible `text-embedding-ada-002`).
*   **Semantic Search**: RPC function `search_knowledge` with cosine similarity (`SECURITY DEFINER` for robust retrieval).
*   **Context Builder**: Formats retrieved chunks as RAG context for LLM.

---

## 4. Chat Experience & Intelligence
*   **Message Actions**: Robust support for Copy, Edit, and Retry.
*   **Conversation Branching**: Users can branch conversations from any message.
*   **Thinking Blocks**: Captures `reasoning_content` field from DeepSeek/GLM/MiniMax models.
*   **Web Grounding**: Toggle button enables intelligent search with inline citations.
*   **Knowledge Base**: Toggle button enables RAG from uploaded documents.

---

## 5. Media Studio Features
*   **Two-Pool Affordability**: Buttons enable/disable based on `canAfford()` check (Daily + Permanent).
*   **Pro Access**: Pro users always have access (bypass logic).
*   **Generator**: T2I and T2V support.
*   **Magic Editor**: Natural language image editing.
*   **Gallery**: Full history with renaming, bulk delete, and lightbox navigation.

---

## 6. Security & Configuration
*   **Auth**: Clerk manages the identity layer.
*   **Webhooks**: Verified via `PAYSTACK_SECRET_KEY`.
*   **Row Level Security (RLS)**: Strict policies for `users`, `chat_sessions`, `media_history`, `knowledge_documents`, and `knowledge_chunks`.

---

**Last Updated**: January 5, 2026
