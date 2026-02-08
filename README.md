# GT Assistant

A next-generation AI Assistant platform featuring real-time Chat, Voice, Image Generation, Magic Editing, and Video Animation. Optimized for the Kenyan market with **Paystack (KES)** integration.

## 🚀 Key Features

*   **Multi-Model Chat**: DeepSeek R1 (Thinking), GLM-4, Qwen VL, and more.
*   **Conversation Intelligence**: Message editing, retrying, and branching.
*   **Media Studio**:
    *   **Generator**: High-quality images (Hunyuan, Flux).
    *   **Magic Editor**: Edit images with simple text commands.
    *   **Animator**: Wan 2.2 Image-to-Video, Text-to-Video, and Lip Sync.
*   **Monetization**: Tiered subscriptions and credit packs via Paystack.
*   **Cloud Sync**: Persist your history and media via Supabase.
*   **Voice Engine**: STT (Whisper) and TTS (Kokoro) with 28 premium voices.

## 📊 Status: Phase 3 Started

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

1.  **Clone** and `npm install`.
2.  Configure `.env.local` using `.env.example`.
3.  Deploy **Supabase Edge Functions** for Paystack webhooks.
4.  Run `npm run dev`.

Detailed guide: [docs/SETUP.md](docs/SETUP.md)

## 📚 Resources

*   [🎯 Status Report](IMPLEMENTATION_STATUS.md)
*   [🏗️ Tech Context](PROJECT_CONTEXT.md)
*   [💳 Paystack Guide](docs/PAYSTACK_SETUP_GUIDE.md)
*   [🗄️ Database Architecture](docs/DATABASE.md)

---
**Powered by Chutes.ai** | Built with React 19 & Tailwind CSS
