# GT-ASSIST-V2 — Development Roadmap
*Created: June 2026 | Source: GIMA session*

---

## Completed (v2.0)

- [x] Multi-model AI Chat (GLM-4.6, Kimi-K2, DeepSeek-R1)
- [x] Web Search Grounding (Tavily/Brave)
- [x] Knowledge Base RAG (document upload)
- [x] Brand Studio (generate/edit brand images)
- [x] Voice input (Whisper STT)
- [x] Image Generation (Qwen, Flux, Dreamshaper, Juggernaut, Ilustmix)
- [x] Image Editing (Smart, Remove BG, Upscale, Style Transfer)
- [x] Edit Chaining (Edit Again + Undo + Before/After)
- [x] Video Generation (Wan 2.2 I2V/T2V, LTX-2)
- [x] Lip Sync (MuseTalk)
- [x] Frame Capture from Video
- [x] Media Gallery with Lightbox
- [x] Blog Export (WebP at OG/Blog sizes)
- [x] Photoshop Corner (full manual canvas editor)
- [x] Layer System (opacity, blend modes, visibility)
- [x] Brush/Eraser with hardness, opacity, flow
- [x] Shapes & Gradients
- [x] Editable Text Layers
- [x] Adjustments (Brightness/Contrast, HSL, Levels, Blur)
- [x] Filter Gallery (9 presets)
- [x] Crop & Resize
- [x] Export Dialog (PNG/JPEG/WebP)
- [x] AI Panel (Generate, Edit, Remove BG, Upscale, Smart Fill)
- [x] Undo/Redo (50-step snapshot history)
- [x] Keyboard shortcuts with cheatsheet
- [x] Clerk Auth (Google, GitHub, Email)
- [x] Credit system (free daily + subscription)
- [x] Paystack payments (KES)
- [x] Dark/Light theme
- [x] Comprehensive User Manual (PDF at /home/gasho/GT-ASSIST-V2-Manual.pdf)

## Next Up

### 1. Add GLM 5.2 Model
- Add to AVAILABLE_MODELS / model list in types.ts
- Add credit cost entry
- Wire into ChatInterface model selector

### 2. Update LTX Video Model
- New version of LTX (details TBD)
- Update API endpoint if changed
- Update model configuration

### 3. Music/Audio Generation
- New feature module in Media Studio
- Likely via Chutes API (TTS/audio generation)
- New tab or sub-tab in media studio

### 4. Public Documentation Page
- Create a `/docs` route on create.gashotech.com
- Render the user manual content as a styled HTML page
- Source: /home/gasho/GT-ASSIST-V2-Manual.pdf (existing PDF manual)
- Could be static MD→HTML or a proper route in the SPA

## Notes

- PDF created using: markdown → HTML (Python markdown lib) → weasyprint CLI
- Telegram delivery: use MEDIA:/path/to/file.ext format (works via Hermes gateway)
