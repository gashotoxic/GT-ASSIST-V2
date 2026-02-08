## Root Cause (Why you’re seeing 400 Invalid input parameters)
- The LTX‑2 endpoint behavior appears to match your curl example (flat JSON body), but the app is currently sending wrapped payloads (e.g. `{ args: {...} }`). That mismatch typically produces “Invalid input parameters”.

## Changes to Make (After you approve)

## 1) Fix LTX‑2 request body + robust wrapper fallback
- Update [chutes.ts](file:///f:/vibe_coding/GT-ASSIST-V2/services/chutes.ts) so LTX‑2 requests try payloads in this order:
  - First: send raw `GenerationInput` (flat body like your curl)
  - If non‑OK and status in {400,404,422} or error text hints wrapper mismatch: retry `{ args: GenerationInput }`
  - If still non‑OK: retry `{ input_args: GenerationInput }`
  - If still failing: surface the final error text

## 2) Make defaults match your curl + schema before user edits
- Update [chutesLtx2.ts](file:///f:/vibe_coding/GT-ASSIST-V2/services/chutesLtx2.ts) to build a `GenerationInput` that matches your provided defaults:
  - Always include defaults: `width=768`, `height=512`, `frame_rate=25`, `image_strength=1`, `video_strength=1`, `cfg_guidance_scale=3`, `num_inference_steps=40`, `negative_prompt=<schema default>`, `image_frame_index=0`
  - For “Fast/Distilled” preset: set `distilled=true` and omit `pipeline` (matches curl style)
  - For other presets: set `pipeline` to one of `two_stage | ic_lora | keyframe_interp` and set `distilled=false`
  - Ensure nullable fields exist as `null` when unused: `image_url`, `video_url`, `image_b64`, `video_b64`

## 3) Set LTX‑2 as default for Text‑to‑Video
- Update [MediaStudio.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/MediaStudio.tsx) so when the user switches to `t2v` mode, the default model becomes `ltx-2-t2v` (if available), otherwise fall back to the first compatible model.

## 4) Prevent invalid requests from UI (optional but recommended)
- Update [VideoAnimatorPanel.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/media/VideoAnimatorPanel.tsx) so the Animate button disables when LTX‑2 is selected and:
  - `conditioning=video_url` but URL is empty
  - `conditioning=keyframes` or `pipeline=keyframe_interp` but start/end keyframes are missing

## 5) Make the LTX‑2 advanced section scrollable on mobile
- Update [Ltx2AdvancedOptions.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/media/Ltx2AdvancedOptions.tsx):
  - Wrap the expanded panel content in a container with a mobile-friendly max height and vertical scrolling (e.g. `max-h-[60vh] overflow-y-auto overscroll-contain`, with `sm:max-h-none`)
  - This keeps the controls usable on small screens without pushing the Generate button off-screen.

## Verification
- Run `npm run lint` and `npm run build` to ensure no regressions.
- Manual test (with your Chutes key):
  - T2V with LTX‑2 default (no conditioning)
  - I2V with an uploaded frame
  - Conditioning=Video URL with a valid mp4 link
  - Keyframes preset with 2 images

If you approve this plan, I’ll implement these changes and re-test the flows end-to-end.