# GT Assistant

A next-generation AI Assistant platform featuring real-time Chat, Voice, Image Generation, Magic Editing, and Video Animation. Optimized for the Kenyan market with **Paystack (KES)** integration.

## 🚀 Key Features

*   **Multi-Model Chat**: DeepSeek R1 (Thinking), GLM-4, Qwen VL, and more.
*   **Media Studio**:
    *   **Generator**: High-quality images (Hunyuan, Flux).
    *   **Magic Editor**: Edit images with simple text commands.
    *   **Animator**: Wan 2.2 Image-to-Video and Text-to-Video.
*   **Monetization**: Tiered subscriptions and credit packs via Paystack.
*   **Cloud Sync**: Persist your history and media via Supabase.
*   **Voice Engine**: STT (Whisper) and TTS (Kokoro) with 28 premium voices.

## 📊 Status: Phase 2 Started

**Phase 1 (Monetization & Foundation): ✅ 100% COMPLETE**
*   Clerk Auth 
*   Supabase Cloud Persistence
*   Paystack Payment Gateway (Live)
*   Unified Credit System

**Phase 2 (Experience Enhancements): 🔄 IN PROGRESS**
*   Message Actions (Copy/Delete)
*   Advanced Knowledge Grounding

## 🛠️ Setup

1.  **Clone** and `npm install`.
2.  Configure `.env.local` using `.env.example`.
3.  Deploy **Supabase Edge Functions** for Paystack webhooks.
4.  Run `npm run dev`.

Detailed guide: [docs/SETUP.md](docs/SETUP.md)

## 📚 Resources

*   [🏗️ Master Plan](react_implementation_plan.md)
*   [🎯 Status Report](IMPLEMENTATION_STATUS.md)
*   [💳 Paystack Guide](docs/PAYSTACK_SETUP_GUIDE.md)
*   [🗄️ Database Architecture](docs/DATABASE.md)

---
**Powered by Chutes.ai** | Built with React 19 & Tailwind CSS
