# GT Assistant - Technical Documentation & Context

## 1. Project Overview
**Application:** GT Assistant  
**Type:** Client-Side Single Page Application (SPA)  
**Core Stack:** React 19, Tailwind CSS, TypeScript.  
**Primary Backend:** Chutes.ai (Inference), Supabase (Optional Persistence).  
**Design System:** "Glassmorphism" (Translucent UI, blur effects, gradients).

**Philosophy:**
This application runs **entirely in the browser**. It does not have a Node.js backend server of its own. It communicates directly with AI APIs using client-side keys. It supports a "Dual-Mode" persistence strategy (Local vs. Cloud).

---

## 2. Core Architecture

### A. State Management & Persistence (The "Levels" Strategy)
The app handles data storage in two distinct levels to support both privacy-focused guest users and power users.

*   **Level 1 (Local / Guest Mode):**
    *   **Storage:** `localStorage`.
    *   **Media:** Audio/Images are stored as ephemeral `Blob` URLs in memory.
    *   **Behavior:** If the browser refreshes, text history persists (via LS), but generated audio/images are lost (since Blobs are session-specific).
    *   **Keys:** `chutes_chat_sessions`, `chutes_messages_{id}`.

*   **Level 2 (Cloud / Sync Mode):**
    *   **Storage:** Supabase PostgreSQL (`chat_sessions`, `messages`, `media_history`).
    *   **Media:**
        *   TTS Audio -> `chat-audio` bucket.
        *   GenAI Images/Videos -> `media-assets` bucket.
    *   **Behavior:** Full history and media persist across devices and refreshes.
    *   **Logic:** The app checks for Supabase credentials in `AppSettings`. If present, it prioritizes DB calls over LocalStorage. The `media_history` table includes a `title` column to store user-defined names for gallery items.

### B. Navigation & Layout
*   **Routing:** State-based view switching (`currentView`: `'chat' | 'media'`).
*   **Viewport Handling:** Uses `h-[100dvh]` (Dynamic Viewport Height) to ensure correct rendering on mobile browsers with collapsible address bars.
*   **Sidebar:**
    *   **Mobile:** Fixed overlay with backdrop blur.
    *   **Desktop:** Collapsible panel using CSS `width` transition (not transform) to allow main content reflow.

---

## 3. Service Layer (The "Brain")

### `services/chutes.ts` (AI Inference)
Handles communication with Chutes.ai.
*   **Streaming:** Uses `fetch` with `ReadableStream` for LLM responses.
*   **Prompt Enhancement:** Uses `NousResearch/DeepHermes-3-Mistral-24B-Preview` to rewrite simple user prompts into detailed artistic descriptions.
*   **Tool Calling:** Intercepts `tool_calls`, executes `SearchService`, and recursively calls the LLM.
*   **TTS (Kokoro):** Sanitizes text (removes Markdown/Thinking tags) before generation.
*   **Media Generation:**
    *   **Parallelization:** Image, Edit, and Video generation requests run independently.
    *   **AbortSignal:** All methods accept signals for user cancellation.
    *   **Adaptive Payloads:** The service constructs different JSON payloads based on the selected model's requirements (e.g., `hidream` needs `resolution`, while `juggernaut-xl` needs `width`/`height` and a `model` field).
    *   **Custom Model Strategy:** For user-provided URLs, it sends a "Smart Payload" containing a superset of common parameters (`width`, `height`, `resolution`, `guidance_scale`) to maximize compatibility with unknown API schemas.

### `services/search.ts` (Grounding)
*   **Tavily:** Direct API call.
*   **Brave Search:** Uses `corsproxy.io` to route requests, bypassing browser CORS restrictions.

### `services/supabase.ts` (Persistence)
*   **Media Management:**
    *   `saveMediaItem`: Uploads Blob to Storage -> Gets Public URL -> Inserts DB Row.
    *   `updateMediaItemTitle`: Updates the `title` of a media item in the database.
    *   `deleteSession`: Cascades deletes to messages and media history.
    *   `deleteMediaItem`: Removes the file from the Storage bucket AND the row from the DB.

### `services/watermark.ts`
*   **Client-Side Processing:** Uses HTML5 Canvas to draw the generated image blob, overlay text/shadows, and export a new Blob.

---

## 4. Workflows & Logic

### A. Chat Interface
*   **Reasoning Models:** Parses and renders `<think>` tags from DeepSeek R1 models in collapsible details blocks.
*   **Audio Cache:** Checks Supabase URL -> Local Blob URL -> Generates new TTS.

### B. Media Studio (Image/Video)
The media studio uses a **Parallel State Architecture**. You can generate an image, edit another, and render a video simultaneously without UI blocking.

1.  **Generator (Tab 1):**
    *   Text-to-Image using a variety of models (Hunyuan, Qwen, HiDream, Juggernaut XL, Flux Schnell).
    *   **Constraint:** Z-Image Turbo enforces a hard 450-character prompt limit.
    *   Output: Watermarked PNG.

2.  **Magic Editor (Tab 2 - Qwen Edit):**
    *   Input: Base64 Image + Edit Prompt.
    *   **Workflow:** Supports "Quick Actions" (presets) or custom prompts.
    *   **API Quirk:** Strips `data:image/...;base64,` prefix before sending.

3.  **Animator (Tab 3):**
    *   **Mode Switch:** UI toggles between **Image-to-Video (I2V)** and **Text-to-Video (T2V)**.
    *   The model selection dropdown is filtered based on the chosen mode.
    *   **I2V (Wan 2.2):** Input is Base64 Image + Motion Prompt.
    *   **T2V (Wan 2.1):** Input is just a descriptive prompt. The image uploader is hidden.
    *   **Video Extension Workflow:**
        *   User generates a video.
        *   **Frame Capture:** App extracts the *last frame* (or any user-selected frame via the Camera tool) using an off-screen `<canvas>`.
        *   The captured frame becomes the input source for the next video generation segment.

4.  **Gallery (Tab 4):**
    *   **Features:** Filter by type (Image/Video), an immersive **Lightbox** view with fullscreen video/image playback, item renaming, download, delete, and workflow actions (Send to Edit/Animate).
    *   **Sync:** Loads from Supabase if connected, otherwise uses local session state.

---

## 5. UI/UX Details

*   **Responsive Design:** Strict usage of `flex-col` and `overflow-hidden` on the body to prevent scroll chaining.
*   **Loading States:** Scoped to specific tabs. A global spinner does not block the entire UI; only the relevant preview pane shows a loading overlay.
*   **Theme:**
    *   **Light:** `bg-slate-50`, White glass panels.
    *   **Dark:** `bg-slate-950`, Slate glass panels, deep shadows.
*   **Active States:** High-contrast solid primary colors for active chat sessions and toggle buttons (Search).

---

## 6. Configuration

**Required Keys:**
*   `VITE_CHUTES_API_KEY`: Mandatory.

**Optional Keys:**
*   `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY`: Cloud Sync.
*   `VITE_TAVILY_API_KEY` / `VITE_BRAVE_API_KEY`: Web Search.
*   `VITE_PAYSTACK_PUBLIC_KEY`: Paystack Payments.

---

## 7. Model References

*   **Chat:** `zai-org/GLM-4.6`, `deepseek-ai/DeepSeek-V3.2-Speciale`, `deepseek-ai/DeepSeek-R1-0528`, `Qwen/Qwen3-VL-235B-A22B-Thinking`.
*   **Image:**
    *   `hunyuan`
    *   `qwen-image` (Requires specific negative prompt).
    *   `z-image-turbo` (Requires `< 450` chars prompt).
    *   `hidream` (Requires `resolution` string, e.g., "1024x1024").
    *   `juggernaut-xl`, `flux-schnell` (Requires `width`, `height`, and `model` name in payload).
*   **Edit:** `qwen-image-edit`.
*   **Video:**
    *   `wan-2.2-i2v` (Image-to-Video).
    *   `wan-2.1-t2v` (Text-to-Video).
*   **Utility:** `NousResearch/DeepHermes-3-Mistral-24B-Preview` (Used for Prompt Enhancer).
