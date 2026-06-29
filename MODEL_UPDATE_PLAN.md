# GT-ASSIST-V2: GLM 5.2 + LTX 2.3 Update Plan
**Branch:** feature/model-ltx-update
**Date:** June 24, 2026

---

## Part 1: Add GLM 5.2 to Chat Models

### Files to change:

**1. types.ts — AVAILABLE_MODELS array**
- Add entry: `{ id: "zai-org/GLM-5.2-TEE", name: "GLM 5.2", shortName: "GLM 5.2", badge: "NEW" }`
- Place after GLM 5.1 entry
- Uses same Chutes LLM endpoint

**2. services/creditCosts.ts — chat costs**
- Add: 'zai-org/GLM-5.2-TEE': 1 to the chat section

### Verification:
- Model appears in chat model selector
- Chat sends to https://llm.chutes.ai/v1/chat/completions with model: zai-org/GLM-5.2-TEE
- Credit deduction works

---

## Part 2: Update LTX to v2.3

### API Endpoint
POST https://vonkaiser-ltx-23-video.chutes.ai/generate

### New Request Format vs Old

| Old LTX-2 Field | New LTX 2.3 | Status |
|----------------|-------------|--------|
| distilled | REMOVED | Always FP8 |
| pipeline | REMOVED | Single pipeline |
| conditioning | REMOVED | Auto-detected |
| image_strength | REMOVED | Not supported |
| cfg_guidance_scale 3 | guidance_scale 3.1 | Changed default |
| num_inference_steps | REMOVED | Always 8 |
| enhance_prompt | enhance_prompt | Same |
| frame_rate | fps (8-50) | Renamed |
| N/A | duration (seconds) | NEW |
| N/A | keyframes array | NEW |
| N/A | generate_audio bool | NEW |
| N/A | video_format | NEW |
| N/A | return_json | NEW |
| N/A | seed + use_random_seed | NEW |

### Files to change:

**3. types.ts**
- Update AVAILABLE_VIDEO_MODELS — add LTX 2.3 entries
- Update Ltx2AdvancedSettings interface

**4. services/chutesLtx2.ts — REWRITE**
- Rename isLtx2Model to isLtx23Model
- Rewrite buildLtx2GenerationInput for LTX 2.3 API
- Add frame budget clamp (481 @ 1080p, 241 @ 1440p, 121 @ 4K)

**5. services/chutes.ts — generateVideo method**
- Simplify LTX 2.3 handling (no wrapper retries)
- Remove old LTX-2 retry logic

**6. services/creditCosts.ts**
- Add ltx-23-i2v, ltx-23-t2v costs

**7. Components**
- MediaStudio.tsx — update LTX settings references
- VideoAnimatorPanel.tsx — update controls

---

## Part 3: Verification

1. npm run build — must pass with 0 errors
2. npx tsc --noEmit — must pass
3. Test GLM 5.2 in chat
4. Test LTX 2.3 video gen

---

## Branch Strategy
- Branch: feature/model-ltx-update (created from main)
- Never push to main directly
- PR to main after verification
