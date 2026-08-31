# GT-ASSIST-V2: Model Update History — GLM + LTX

> **Status note (2026-08-30):** This plan is now **historical**. GLM 5.2 was added and the LTX line moved past v2.3 — **LTX 2.3 has been removed entirely**, superseded by LTX 2.5 (the current, sole LTX model). See the LTX 2.5 section below and `services/chutesLtx25.ts`.

---

## Part 1: GLM 5.2 — ✅ DONE
- Added `zai-org/GLM-5.2-TEE` to `AVAILABLE_MODELS`, credit cost in `creditCosts.ts`
- Live in production as "GLM 5.2"

---

## Part 2: LTX Line — LTX 2.3 plan SUPERSEDED by LTX 2.5

### Historical: the old LTX 2.3 plan
Originally this doc specified an LTX **2.3** update (`services/chutesLtx2.ts`). The code was shipped, but LTX 2.3 was **deprecated and fully removed** on 2026-08-29 (PR #7) once LTX 2.5 proved stable. Do not resurrect LTX 2.3.

### CURRENT: LTX 2.5 (the live model)
- **Endpoint:** POST `https://vonkaiser-ltx-25-video.chutes.ai/generate`
- **Models:** `ltx-25-i2v`, `ltx-25-t2v` (in `AVAILABLE_VIDEO_MODELS`)
- **Service:** `services/chutesLtx25.ts` — `isLtx25Model()`, `buildLtx25GenerationInput()`
- **UI:** `components/media/Ltx25AdvancedOptions.tsx`
- **Key API differences vs LTX 2.3:**
  - NO `negative_prompt`, `guidance_scale`, `num_inference_steps` (distilled 8+3 step pipeline)
  - Uses `stage_1_sigmas` (8) + `stage_2_sigmas` (3) — must be strictly decreasing, end at 0
  - Width snapped to multiples of 32 (not 64)
  - Max 3840x2160; ~20s @1080p, 13s @1440p, 6s @4K
  - `auto_duration` + `generated_keyframes` (int|null) supported
  - **Runtime gotchas:** omit null fields; `generated_keyframes` is int not bool; sigma arrays strictly decreasing

### What was REMOVED with LTX 2.3 (PR #7)
- `services/chutesLtx2.ts` (deleted)
- `components/media/Ltx23AdvancedOptions.tsx` (deleted)
- `ltx-23-i2v` / `ltx-23-t2v` model entries + credit costs
- `ltx2Params` in `VideoGenRequest`, LTX 2.3 routing in `generateVideo`
- `Ltx23AdvancedSettings` interface

---

## Part 3: Verification (current)
1. `npm run build` — 0 errors
2. `npx tsc --noEmit` — 0 errors
3. Test LTX 2.5 i2v/t2v generation in Media Studio Animator
