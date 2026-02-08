## Codebase Structure (What Matters For This Feature)
- **Entrypoints**: the SPA mounts from [index.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/index.tsx) into [App.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/App.tsx).
- **Media Section**: `App` renders the Media view via [MediaStudio.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/MediaStudio.tsx).
- **Animator (“Animation”) Area**: it’s the `activeTab === 'video'` UI inside `MediaStudio` (currently supports **Image-to-Video** and **Text-to-Video**).
- **Inference Calls**: centralized in [services/chutes.ts](file:///f:/vibe_coding/GT-ASSIST-V2/services/chutes.ts) using `fetchWithRetry(...)` and `Authorization: Bearer <token>`.
- **Persistence**: generated media is added to gallery via `addToHistory(...)` in `MediaStudio`, and uploaded to Supabase storage + `media_history` table via [supabase.ts](file:///f:/vibe_coding/GT-ASSIST-V2/services/supabase.ts).
- **Credits**: affordability and costs are computed via [creditCosts.ts](file:///f:/vibe_coding/GT-ASSIST-V2/services/creditCosts.ts) and `canAfford(...)` in [CreditContext.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/context/CreditContext.tsx).

## MuseTalk (Mustalk) Parameters (Online Research Summary)
MuseTalk’s open-source project and docs indicate these commonly-tuned inference controls:
- **fps**: 25fps is the “works best” baseline; the Gradio demo uses 25fps (matches training).
- **batch_size**: used to trade speed/VRAM (larger batch can OOM).
- **parsing_mode**: used for blending, commonly referenced as `jaw` vs `raw` to adjust how the face region is composited.
- **extra_margin**: adjusts jaw movement/crop margin and affects mouth opening / blending.
- **left_cheek_width / right_cheek_width**: adjust blending width on cheeks (especially relevant in `jaw` mode).
- **bbox_shift** (important in MuseTalk generally): shifts the detected face box for better alignment; mentioned as a key tuning param in docs/scripts.

**What we can pass in this app (based on the Chutes schema you provided):**
- ✅ fps, batch_size, audio_input, video_input, extra_margin, parsing_mode, left_cheek_width, right_cheek_width.
- ❌ bbox_shift and other MuseTalk CLI flags are not present in the provided schema; unless Chutes adds them to the API, the UI cannot forward them.

## API Contract (Chutes MuseTalk)
- Endpoint (per your curl): `POST https://chutes-musetalk.chutes.ai/generate`
- Headers:
  - `Authorization: Bearer $CHUTES_API_TOKEN`
  - `Content-Type: application/json`
- Body (per curl example):
  - `{ "fps": 25, "batch_size": 8, "audio_input": "...", "video_input": "...", "extra_margin": 10, "parsing_mode": "jaw", "left_cheek_width": 90, "right_cheek_width": 90 }`
- Output: `video/mp4` (binary blob)

**Important detail:** several existing docs in this repo show a mismatch where the “schema” wants `input_args`, but the working curl requests use a flat JSON body. The current code in [chutes.ts](file:///f:/vibe_coding/GT-ASSIST-V2/services/chutes.ts) follows the curl style (flat body). For MuseTalk, we’ll do the same, but implement a fallback:
1) try the flat body (curl style)
2) if the API returns a schema error, retry with `{ input_args: { ... } }`

## UI/UX Design (Where and How It Appears)
Add a **Lip Sync** section under Media → **Animator** (video tab):
- In [MediaStudio.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/MediaStudio.tsx), extend the current mode selector to a 3-way toggle:
  - Image-to-Video
  - Text-to-Video
  - **Lip Sync (MuseTalk / Mustalk)**
- Reuse the existing preview column and “generation overlay” for output video.
- Keep the “Animate Video” button for i2v/t2v; add a separate “Generate Lip Sync” button for MuseTalk.

### Inputs in the Lip Sync panel
- **Video Input** (required)
  - Option A: upload a video file (mp4/webm/mov) → read as DataURL → strip the `data:*;base64,` prefix before sending.
  - Option B: paste an HTTPS URL.
  - Option C: “Use current preview video” (if `generatedVideoUrl` exists) → convert URL to base64 via existing `convertUrlToBase64(...)`.
  - Option D (nice-to-have): pick from Gallery (video items) and auto-fill.
- **Audio Input** (required)
  - upload audio file (mp3/wav/m4a/ogg) → DataURL → strip prefix
  - or paste an HTTPS URL

### Advanced settings (directly derived from the schema)
- fps: slider/input (1–60, default 25)
- batch_size: slider/input (1–32, default 8)
- extra_margin: slider/input (0–50, default 10)
- parsing_mode: select (`jaw`, `raw`) (default `jaw`)
- left_cheek_width: slider/input (0–200, default 90)
- right_cheek_width: slider/input (0–200, default 90)

## Implementation Steps (Code-Level)
### 1) Add types + model metadata
- Update [types.ts](file:///f:/vibe_coding/GT-ASSIST-V2/types.ts)
  - Add `MuseTalkInput` / `MuseTalkLipSyncRequest` TypeScript interfaces matching the schema fields.
  - Add `AVAILABLE_LIPSYNC_MODELS` (or a single constant) e.g. `{ id: 'musetalk', name: 'MuseTalk Lip Sync', url: 'https://chutes-musetalk.chutes.ai/generate' }`.

### 2) Add Chutes service method
- Update [services/chutes.ts](file:///f:/vibe_coding/GT-ASSIST-V2/services/chutes.ts)
  - Add `async generateLipSync(request: MuseTalkLipSyncRequest, signal?: AbortSignal): Promise<Blob>`.
  - Clean `audio_input` / `video_input` when they’re DataURLs (`split('base64,')[1]`).
  - `fetchWithRetry(MUSETALK_URL, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload), signal })`.
  - If non-OK, read `text()` and throw a helpful error (`MuseTalk Error: <status> - <text>`).
  - Implement flat-body first; on recognizable schema error, retry with `{ input_args: payload }`.

### 3) Add credits support
- Update [services/creditCosts.ts](file:///f:/vibe_coding/GT-ASSIST-V2/services/creditCosts.ts)
  - Add `musetalk: 1` under `video` so `canAfford('video','musetalk')` works.

### 4) Implement the Lip Sync UI under Animator
- Update [components/MediaStudio.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/MediaStudio.tsx)
  - Add state for the new panel:
    - `videoTool: 'animate' | 'lipsync'` (recommended) to avoid widening existing `videoMode` logic.
    - `lipsyncVideoInput`, `lipsyncAudioInput` (string)
    - `lipsyncFps`, `lipsyncBatchSize`, `lipsyncExtraMargin`, `lipsyncParsingMode`, `lipsyncLeftCheekWidth`, `lipsyncRightCheekWidth`
  - Add handler `handleLipSyncGeneration()` that:
    - validates both inputs
    - calls `deductCredits('video')` but uses model id `musetalk` for `canAfford` gating
    - uses `startGeneration('video')` (so Cancel works and overlay shows)
    - calls `chutesService.generateLipSync(...)`
    - stores output with `addToHistory(blob, 'video', 'LipSync (MuseTalk): ...')`
    - sets `generatedVideoUrl`/`generatedVideoItem` for preview

### 5) Keep file sizes manageable (≤500 LOC rule)
`MediaStudio.tsx` is already far above 500 lines. To comply with your workspace rule for new work, implement the Lip Sync UI by extracting the video-tab UI into smaller components:
- Create `components/media/VideoAnimatorPanel.tsx` (existing i2v/t2v controls)
- Create `components/media/LipSyncPanel.tsx` (new MuseTalk controls)
- Keep `MediaStudio.tsx` as the orchestrator (state + handlers + preview/gallery)

## Edge Cases / Constraints
- **Large videos via base64** can exceed browser memory and request limits; the UI should encourage short clips and/or HTTPS URLs.
- **parsing_mode behavior**: cheek widths + extra_margin are most relevant in `jaw` mode; `raw` may behave differently.
- **Missing bbox_shift**: MuseTalk tuning often uses bbox_shift, but we can’t expose it unless Chutes adds it to the API schema.

## Verification (How We’ll Prove It Works)
- Run `npm run lint` and `npm run build`.
- Manual smoke test in `npm run dev`:
  - Upload a short face video + audio, generate lipsync, verify preview plays.
  - Verify Cancel stops the request (AbortController) and UI unblocks.
  - Verify result appears in Gallery and can be opened in lightbox.
  - Verify authenticated users get the asset persisted to Supabase.

## Project Hygiene
- Update [TASK.md](file:///f:/vibe_coding/GT-ASSIST-V2/TASK.md) with a new 2026-01-18 item: “Add MuseTalk (Mustalk) lipsync section under Media → Animator”. Mark completed after implementation.
- If we add any new env usage or endpoints, update [README.md](file:///f:/vibe_coding/GT-ASSIST-V2/README.md) accordingly.

If you confirm this plan, I’ll implement it end-to-end (service + UI + credits), then run lint/build and provide a quick manual test checklist for you.