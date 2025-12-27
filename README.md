
# GT Assistant

A next-generation, browser-based AI Assistant featuring real-time Chat, Voice (TTS/STT), Image Generation, Image Editing (Magic Edit), and Video Animation. Built with React 19, TypeScript, and powered by **Chutes.ai**.

![App Screenshot](https://via.placeholder.com/1200x600?text=GT+Assistant+Preview)

## 🌟 Features

*   **Multi-Model Chat:** Switch between GLM-4, DeepSeek V3, DeepSeek R1 (Thinking), and Qwen VL.
*   **Voice Interaction:** Real-time Speech-to-Text (Whisper) and Text-to-Speech (Kokoro) with caching.
*   **Media Studio:**
    *   **Generator:** Text-to-Image using Hunyuan and Qwen.
    *   **Magic Edit:** Edit images using natural language (Qwen Magic Edit).
    *   **Animator:** Turn images into videos (Wan 2.1 I2V) and extend them.
    *   **Magic Enhancer:** Auto-improve prompts with AI.
    *   **Gallery:** Auto-save generations to session or cloud.
*   **Dual-Mode Persistence:**
    *   **Level 1 (Guest):** LocalStorage & In-Memory Blobs.
    *   **Level 2 (Cloud):** Sync history and media to Supabase.
*   **Web Search:** Grounding via Tavily or Brave Search.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following:

1.  **Node.js** (v18 or higher)
2.  **GitHub Account**
3.  **Vercel Account**
4.  **Chutes.ai API Key** (Required for all AI inference)
5.  **Supabase Account** (Optional, for Cloud Sync)

---

## 📊 Implementation Status

[📋 View Current Status → IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)

> **Current Phase**: Week 4 (Paystack Integration)
> **Status**: ✅ Completed
> **Last Completed**: Week 4 (Payments & Webhooks)

## 🗄️ Setup & Configuration

[🔧 Complete Setup Guide → docs/SETUP.md](docs/SETUP.md)

Includes:
- Environment variables and API keys
- Supabase database configuration
- Clerk authentication setup
- Paystack payment integration
- Local development and deployment

## 🛠️ Development

### Quick Start
```bash
npm install
npm run dev
```

Access at `http://localhost:5173`

### Prerequisites
- Node.js v18+
- Chutes.ai API Key
- Clerk Account (for auth)
- Supabase Account (optional, for cloud sync)

---

## 📚 Documentation

- [🏗️ Implementation Roadmap](react_implementation_plan.md) - Master timeline and weekly plans
- [🗄️ Database Schema](docs/DATABASE.md) - Complete database structure
- [🏛️ System Architecture](docs/ARCHITECTURE.md) - High-level design
- [💳 Credit System](docs/CREDIT_COSTS.md) - Pricing and subscription models
- [📝 Technical Notes](docs/phases/) - Weekly implementation details

---

## 🧠 Architecture Notes

*   **Brave Search Proxy:** The app uses `corsproxy.io` in `services/search.ts` to bypass CORS restrictions when using Brave Search directly from the browser.
*   **Video Extension:** The "Extend Video" feature works by extracting the last frame of a generated video into a `<canvas>`, converting it to Base64, and feeding it back into the Wan 2.1 I2V model.
*   **Magic Enhancer:** Uses the configured LLM to expand and refine short prompts into detailed artistic descriptions.
*   **CORS:** If you host this on Vercel, ensure your Supabase project settings (Authentication > URL Configuration) allow your Vercel domain if you enable strict Auth later.
