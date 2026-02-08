# LTX‑2 (Chutes) Integration Plan — Detailed Implementation Guide

## 0) Brand Studio (Chat) Mode — Added Plan (2026-02-08)

### Goal
Add a Chat-area switch: **Chat** (normal) vs **Brand Studio** (marketing prompt assistant), plus an optional **Tools** toggle that enables **image generation** + **image editing** for **Plus/Pro** users only.

### Key UX
- Mode switch and Tools toggle live inside the existing chat input pill to preserve aesthetics and flow.
- Brand Studio is available to all users, but Tools are locked for Free/Basic.
- Plus: 1 credit per tool run; Pro: unlimited.

### System Prompt
- Brand Studio prompt source: [brandPrompt.txt](file:///f:/vibe_coding/GT-ASSIST-V2/brandPrompt.txt)
- Brand Studio model: `moonshotai/Kimi-K2.5-TEE` (from [chutes_api_reference.md](file:///f:/vibe_coding/GT-ASSIST-V2/chutes_api_reference.md))
- Normal Chat gets an extra “App Features + Steps” appendix (no model names) covering Media, MuseTalk, and LTX usage.

### Tools (Brand Studio only, when enabled)
- `generate_image({ prompt, aspectRatio? })` → default Z-Image Turbo
- `edit_image({ prompt, image_b64, aspectRatio? })` → default Qwen Image Edit

### Implementation Files
- Chat UI + prompt routing: [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx)
- Tool streaming + dispatch: [chutes.ts](file:///f:/vibe_coding/GT-ASSIST-V2/services/chutes.ts)
- Tool runtime (credits + gallery save): [brandStudioToolRuntime.ts](file:///f:/vibe_coding/GT-ASSIST-V2/services/brandStudioToolRuntime.ts)
- Shared types/constants: [types.ts](file:///f:/vibe_coding/GT-ASSIST-V2/types.ts)

## 0) Executive Summary

* Add LTX‑2 as a selectable engine in the existing Media → Animator → Animate workflow.

* Keep the top-level UI simple (existing Image→Video and Text→Video), and expose LTX‑2’s extra capabilities through a collapsible “Advanced (LTX‑2)” panel.

* Implement LTX‑2 request building in a dedicated helper to avoid bloating the already-large MediaStudio and Chutes service.

## 1) Current Codebase Reality (What We’re Building On)

**Animator entry points**

* Media container + generation handlers: [MediaStudio.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/MediaStudio.tsx)

* Animate panel UI (mode toggle + dropdown + prompt): [VideoAnimatorPanel.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/media/VideoAnimatorPanel.tsx)

* Model catalogs: [types.ts](file:///f:/vibe_coding/GT-ASSIST-V2/types.ts)

* Video generation client: [services/chutes.ts](file:///f:/vibe_coding/GT-ASSIST-V2/services/chutes.ts)

**Existing behavior**

* Animate currently supports:

  * `i2v`: requires one uploaded image (stored as data URL)

  * `t2v`: prompt only

* On generate:

  * credits are deducted

  * Chutes returns a blob

  * blob is saved to Media history and optionally persisted to Supabase

## 2) LTX‑2 Research (Open Source + Chutes Provider)

* Open source: Lightricks LTX‑2 supports multiple pipelines (two\_stage, distilled, ic\_lora, keyframe\_interp) and prompt enhancement (<https://github.com/Lightricks/LTX-2>).

* Chutes endpoint provided:

  * URL: `https://chutes-ltx-2.chutes.ai/generate`

  * Output content type: `video/mp4`

  * Input schema: `{ args: GenerationInput }` (required)

## 3) Scope, Non‑Goals, and Design Principles

### In scope

* LTX‑2 selectable in existing Animate model dropdown.

* Basic flows:

  1. Text→Video (prompt only)
  2. Image→Video (prompt + image\_b64)

* “Other capabilities” (without new redundant sections):

  * Pipeline preset selection (Fast/Pro/Transform/Keyframe)

  * Video conditioning via URL (v2v-like) when LTX‑2 is selected

  * Keyframe interpolation via two uploaded images when LTX‑2 is selected

  * Advanced knobs (seed, resolution, fps, frames, strengths, CFG, steps, negative prompt)

  * Optional JSON override passthrough for advanced schema fields (e.g., `loras`, complex `images` arrays)

### Not in scope (initial integration)

* Full LoRA management UI (we’ll support it via JSON override first to keep UI lean).

* Audio generation features (LTX‑2 can be audio-video; Chutes schema here exposes `video/mp4` only).

### Principles (to avoid redundancy)

* Model lists remain single-source: `types.ts` only.

* LTX‑2 request shaping lives in one dedicated builder.

* UI uses progressive disclosure: only LTX‑2 users see LTX‑2 advanced options.

## 4) UX Specification (What Users See)

### 4.1 Base UI (unchanged)

* Mode toggle: Image-to-Video / Text-to-Video.

* Model dropdown: includes Wan options + new LTX‑2 option for that mode.

* Prompt textarea.

* Animate button.

### 4.2 When LTX‑2 is selected

Show a collapsible panel under the prompt:

* Header: “Advanced (LTX‑2)” with expand/collapse chevron.

* Default state: collapsed.

Inside the collapsible:

**A) Preset dropdown**

* Fast (recommended for speed) → `pipeline=distilled`

* Pro (recommended for quality) → `pipeline=two_stage`

* Transform (Image/Video conditioning) → `pipeline=ic_lora`

* Keyframe Interpolation → `pipeline=keyframe_interp`

**B) Conditioning selector**

* Auto (default)

  * If mode=i2v → Image

  * If mode=t2v → None

* None (pure generation)

* Image (use the existing uploaded frame)

* Video URL (shows URL input + gallery picker)

* Keyframes (shows two image uploaders)

**C) Inputs**

* Video URL input:

  * small URL field

  * button: “Pick from Gallery” → opens existing media picker filtered to videos

* Keyframes input:

  * “Start keyframe” upload

  * “End keyframe” upload

**D) Advanced knobs (compact grid)**

* Width, Height (snap to multiples of 32)

* Frame Rate

* Num Frames (snap to 8k+1)

* Seed (optional)

* Image Strength

* Video Strength

* CFG Guidance Scale

* Num Inference Steps

* Negative Prompt

* Toggle: Enhance Prompt

**E) JSON override (optional, power users)**

* Textarea “Extra LTX‑2 args (JSON)”

* Merge strategy: parsed JSON shallow-merges into the `GenerationInput` produced from UI controls.

### 4.3 Validation UX

* Inline warnings (small text under inputs) instead of alerts where possible:

  * Missing URL when conditioning=Video URL

  * Missing start/end when conditioning=Keyframes

  * Width/height adjustment message when snapped

## 5) API Payload Mapping (Exact Strategy)

### 5.1 Normalization helpers (prevents common failures)

* `width` and `height`: clamp to \[128..1920] and snap to a multiple of 32.

* `num_frames`: clamp to \[1..481] and snap to `8k+1` (e.g., 121, 241, 481).

### 5.2 Data URL cleanup

* For `image_b64` we must strip `data:*;base64,` prefix.

### 5.3 Concrete request bodies

**Text→Video (LTX‑2)**

```json
{ "args": { "prompt": "...", "seed": 42, "width": 768, "height": 512, "frame_rate": 25, "num_frames": 121, "pipeline": "distilled", "enhance_prompt": false, "negative_prompt": "..." } }
```

**Image→Video (LTX‑2)**

```json
{ "args": { "prompt": "...", "image_b64": "<base64>", "image_strength": 1, "image_frame_index": 0, "frame_rate": 25, "num_frames": 121 } }
```

**Video-conditioned (LTX‑2)**

```json
{ "args": { "prompt": "...", "video_url": "https://...mp4", "video_strength": 1, "frame_rate": 25, "num_frames": 121 } }
```

**Keyframe interpolation (LTX‑2)**

```json
{ "args": { "prompt": "...", "pipeline": "keyframe_interp", "num_frames": 121, "images": [ { "image_b64": "<start>", "frame_index": 0 }, { "image_b64": "<end>", "frame_index": 120 } ] } }
```

### 5.4 Wrapper retry strategy (robust to provider variations)

Implement a small internal retry:

1. try `{ args: generationInput }` (per schema)
2. if non-OK and error suggests wrapper mismatch or status in {400,404,422}, retry `{ input_args: generationInput }`
3. if still failing, surface the server error text to UI

## 6) Step-by-Step Implementation Checklist (Files + Changes)

### Step 1 — Add model IDs (dropdown integration)

**Edit**: [types.ts](file:///f:/vibe_coding/GT-ASSIST-V2/types.ts)

* Add:

  * `{ id: 'ltx-2-i2v', name: 'LTX‑2 (I2V)', url: 'https://chutes-ltx-2.chutes.ai/generate', type: 'i2v' }`

  * `{ id: 'ltx-2-t2v', name: 'LTX‑2 (T2V)', url: 'https://chutes-ltx-2.chutes.ai/generate', type: 't2v' }`

### Step 2 — Add LTX‑2 settings type/state (minimal, contained)

**Edit**: [types.ts](file:///f:/vibe_coding/GT-ASSIST-V2/types.ts) (or a new small type file)

* Add a `Ltx2AdvancedSettings` interface.

**Edit**: [MediaStudio.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/MediaStudio.tsx)

* Add state: `ltx2Settings`.

* Add state: `ltx2VideoUrl` (if conditioning=Video URL).

* Add state: `ltx2KeyframeStart`, `ltx2KeyframeEnd`.

* Pass these props into `VideoAnimatorPanel`.

### Step 3 — Implement friendly UI component(s)

**Add new file**: `components/media/Ltx2AdvancedOptions.tsx` (≤500 LOC)

* Props:

  * `isOpen`, `setIsOpen`

  * `videoMode: 'i2v'|'t2v'`

  * `settings`, `setSettings`

  * `videoUrl`, `setVideoUrl`

  * `keyframeStart`, `setKeyframeStart`

  * `keyframeEnd`, `setKeyframeEnd`

  * `onPickVideoFromGallery`

* Use existing `Button`, `Select`, `Textarea`, `Label` from `components/UI`.

**Edit**: [VideoAnimatorPanel.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/media/VideoAnimatorPanel.tsx)

* Detect `isLtx2Selected = selectedVideoModel.startsWith('ltx-2')`.

* Render `Ltx2AdvancedOptions` only when `isLtx2Selected`.

* Keep existing IDs (`tour-*`) intact.

### Step 4 — Build LTX‑2 args cleanly (no bloat)

**Add new file**: `services/chutesLtx2.ts` (≤500 LOC)

* Export:

  * `isLtx2Model(modelId?: string): boolean`

  * `buildLtx2GenerationInput({...}): GenerationInput`

  * `wrapLtx2Args(generationInput): { args: ... }`

  * `normalizeWidthHeight`, `normalizeNumFrames`

  * `stripDataUrlPrefix`

### Step 5 — Integrate into Chutes service

**Edit**: [services/chutes.ts](file:///f:/vibe_coding/GT-ASSIST-V2/services/chutes.ts)

* Extend `generateVideo`:

  * If LTX‑2 model:

    * call `buildLtx2GenerationInput` using prompt + any conditioning + advanced settings

    * send with wrapper + retry strategy

  * Else keep existing Wan behavior unchanged

### Step 6 — MediaStudio generation wiring

**Edit**: [MediaStudio.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/MediaStudio.tsx)

* In `handleVideoGeneration`:

  * Look up selected model.

  * If LTX‑2:

    * Provide the chosen conditioning data:

      * image source from existing `sourceImage`

      * video URL from LTX‑2 state

      * keyframes from LTX‑2 state

    * Pass `ltx2Settings` down via the request object.

  * Otherwise: keep current behavior.

### Step 7 — Credits mapping

**Edit**: [services/creditCosts.ts](file:///f:/vibe_coding/GT-ASSIST-V2/services/creditCosts.ts)

* Add costs for:

  * `ltx-2-i2v`

  * `ltx-2-t2v`
    (If we add a separate “Transform” entry later, add it there too.)

### Step 8 — Task log hygiene

**Edit**: [TASK.md](file:///f:/vibe_coding/GT-ASSIST-V2/TASK.md)

* Add a new task under today’s date describing this integration.

* Mark it completed after manual verification.

## 7) Redundancy Control / Maintainability Strategy

* Do NOT create a new Media tab or a new “LTX‑2” section.

* Do NOT duplicate dropdown logic: only add to `AVAILABLE_VIDEO_MODELS`.

* Keep model-specific payload logic out of MediaStudio; only pass structured settings.

* Keep new files small (≤500 LOC) and focused.

## 8) Manual Verification Checklist (Implementation Acceptance)

* LTX‑2 appears in both I2V and T2V dropdown lists.

* Collapsible “Advanced (LTX‑2)” only appears when LTX‑2 selected.

* T2V + Fast preset returns playable mp4.

* I2V + uploaded frame returns playable mp4.

* Conditioning=Video URL works with a gallery video selection.

* Keyframe preset works with 2 images.

* Credits gating works for LTX‑2 (button disables when insufficient credits).

* Errors from the endpoint show a clear message in the existing generation status UI.

## 9) Rollback Plan (If Provider Schema Differs)

* If `{ args: ... }` fails consistently:

  * Switch to `{ input_args: ... }` as primary.

  * Keep both attempts until endpoint stabilizes.

* If `video_url` conditioning fails due to provider restrictions:

  * Disable “Video URL” option in UI behind a feature flag constant, leaving I2V/T2V functional.

***

## Deliverable

* This plan is saved as `newfeature.md`.
