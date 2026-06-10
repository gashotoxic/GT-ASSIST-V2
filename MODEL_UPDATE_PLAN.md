# GT-ASSIST-V2 Model Update Plan

> **Branch:** `feature/model-update-v2`
> **Objective:** Replace broken Chutes models with working ones, update all API endpoints, add new models.

## Summary of Changes

### What's Broken (verified against live Chutes API)
- 8 out of 16 LLM models return 404
- 5 out of 7 image endpoints return 404/503
- Old video endpoints likely broken
- Old TTS endpoint (`chutes-kokoro.chutes.ai`) replaced by `vonkaiser-audiodojo.chutes.ai`
- Prompt enhancer uses non-existent model `NousResearch/DeepHermes-3-Mistral-24B-Preview`

### What's New (from CHUTES MODEL.md on Google Drive)
- Nemotron-3-Nano-Omni-30B-TEE (multimodal, main chat model)
- google/gemma-4-31B-turbo-TEE (vision)
- Qwen/Qwen3.6-27B-TEE (vision)
- moonshotai/Kimi-K2.6-TEE (vision)
- zai-org/GLM-5.1-TEE
- Qwen/Qwen3-32B-TEE (prompt enhancer replacement)
- ImageClassic bundle (flux, dreamshaper, ilustmix, juggernaut)
- vonkaiser endpoints for all media
- Audio megachute (TTS + STT + audio tools)

---

## Phase 1: LLM Models (types.ts + chutes.ts)

### Task 1.1: Update AVAILABLE_MODELS in types.ts

**File:** `types.ts` — replace the `AVAILABLE_MODELS` array

New model list (order = display order in picker):

```typescript
export const AVAILABLE_MODELS: AvailableModel[] = [
  { id: "Nemotron-3-Nano-Omni-30B-TEE", name: "🧠👁️ Nemotron 3 Omni (30B)", shortName: "Nemotron 3", supportsVision: true },
  { id: "deepseek-ai/DeepSeek-V3.2-TEE", name: "🧠 DeepSeek V3.2", shortName: "DeepSeek V3.2" },
  { id: "moonshotai/Kimi-K2.5-TEE", name: "🧠👁️ Kimi K2.5", shortName: "Kimi K2.5", supportsVision: true },
  { id: "moonshotai/Kimi-K2.6-TEE", name: "🧠👁️ Kimi K2.6", shortName: "Kimi K2.6", supportsVision: true, badge: "NEW" },
  { id: "google/gemma-4-31B-turbo-TEE", name: "🧠👁️ Gemma 4 (31B)", shortName: "Gemma 4", supportsVision: true, badge: "NEW" },
  { id: "Qwen/Qwen3.6-27B-TEE", name: "🧠👁️ Qwen 3.6 (27B)", shortName: "Qwen 3.6", supportsVision: true, badge: "NEW" },
  { id: "Qwen/Qwen3.5-397B-A17B-TEE", name: "🧠👁️ Qwen 3.5 (397B)", shortName: "Qwen 3.5", supportsVision: true },
  { id: "Qwen/Qwen3-32B-TEE", name: "🧠 Qwen 3 (32B)", shortName: "Qwen 3 32B" },
  { id: "zai-org/GLM-5-TEE", name: "🧠 GLM 5", shortName: "GLM 5" },
  { id: "zai-org/GLM-5.1-TEE", name: "🧠 GLM 5.1", shortName: "GLM 5.1", badge: "NEW" },
];
```

### Task 1.2: Update BRAND_VISION_MODEL_IDS in types.ts

```typescript
export const BRAND_VISION_MODEL_IDS = [
  "Nemotron-3-Nano-Omni-30B-TEE",
  "moonshotai/Kimi-K2.5-TEE",
  "moonshotai/Kimi-K2.6-TEE",
  "google/gemma-4-31B-turbo-TEE",
  "Qwen/Qwen3.6-27B-TEE",
  "Qwen/Qwen3.5-397B-A17B-TEE",
] as const;
```

### Task 1.3: Update BRAND_STUDIO_MODEL_ID in types.ts

```typescript
export const BRAND_STUDIO_MODEL_ID = 'Nemotron-3-Nano-Omni-30B-TEE';
```

### Task 1.4: Update prompt enhancer model in chutes.ts

**File:** `services/chutes.ts` — line ~85 in `enhancePrompt()` method

Change:
```typescript
const stream = this.streamChat(messages, systemPrompt, 'NousResearch/DeepHermes-3-Mistral-24B-Preview');
```
To:
```typescript
const stream = this.streamChat(messages, systemPrompt, 'Qwen/Qwen3-32B-TEE');
```

---

## Phase 2: Image Models (types.ts + chutes.ts)

### Task 2.1: Update AVAILABLE_IMAGE_MODELS in types.ts

```typescript
export const AVAILABLE_IMAGE_MODELS = [
  { id: "qwen-image-2512", name: "Qwen Image 2512", url: "https://vonkaiser-qwen-image-2512.chutes.ai/generate" },
  { id: "z-image-turbo", name: "Z-Image Turbo", url: "https://vonkaiser-z-image-turbo.chutes.ai/generate", maxLength: 450 },
  { id: "flux", name: "FLUX.1 Schnell", url: "https://vonkaiser-imageclassic.chutes.ai/generate" },
  { id: "dreamshaper", name: "Dreamshaper XL", url: "https://vonkaiser-imageclassic.chutes.ai/generate" },
  { id: "ilustmix", name: "iLustMix v80", url: "https://vonkaiser-imageclassic.chutes.ai/generate" },
  { id: "juggernaut", name: "Juggernaut XL Ragnarok", url: "https://vonkaiser-imageclassic.chutes.ai/generate" },
];
```

### Task 2.2: Update image generation payload logic in chutes.ts

**File:** `services/chutes.ts` — `generateImage()` method

The ImageClassic models (flux, dreamshaper, ilustmix, juggernaut) use a unified endpoint with a `model` field. Update the model-specific logic:

```typescript
// In generateImage():
if (request.modelId === 'qwen-image-2512') {
  body = {
    model: "Qwen-Image-2512",
    prompt: request.prompt,
    negative_prompt: "blur, distortion, low quality",
    guidance_scale: 7.5,
    width,
    height,
    num_inference_steps: 50
  };
} else if (request.modelId === 'z-image-turbo') {
  // Z-Image Turbo does NOT accept width/height
  body = {
    prompt: request.prompt
  };
} else if (['flux', 'dreamshaper', 'ilustmix', 'juggernaut'].includes(request.modelId || '')) {
  // ImageClassic bundle — unified endpoint with model field
  body = {
    model: request.modelId,
    prompt: request.prompt,
    width,
    height,
    seed: null,
    num_inference_steps: request.modelId === 'flux' ? 4 : 25
  };
  if (request.modelId !== 'flux') {
    body.negative_prompt = "blur, distortion, low quality, ugly, deformed";
    body.guidance_scale = request.modelId === 'dreamshaper' ? 7.5 : 7.5;
  }
}
```

---

## Phase 3: Edit Models (types.ts + chutes.ts)

### Task 3.1: Update AVAILABLE_EDIT_MODELS in types.ts

```typescript
export const AVAILABLE_EDIT_MODELS = [
  { id: "qwen-image-edit", name: "Qwen Magic Edit", url: "https://vonkaiser-qwen-image-edit-2511.chutes.ai/generate" }
];
```

### Task 3.2: Update editImage() in chutes.ts if needed

Verify the payload format matches the new endpoint. Current payload should work as-is.

---

## Phase 4: Video Models (types.ts + chutes.ts)

### Task 4.1: Update AVAILABLE_VIDEO_MODELS in types.ts

```typescript
export const AVAILABLE_VIDEO_MODELS = [
  { id: "wan-2.2-i2v", name: "Wan 2.2 I2V (Fast)", url: "https://vonkaiser-turbowani2v.chutes.ai/generate", type: 'i2v' },
  { id: "wan-2.1-t2v", name: "Wan 2.1 T2V (14B)", url: "https://chutes-wan2-1-14b.chutes.ai/text2video", type: 't2v' },
  { id: "ltx-2-i2v", name: "LTX-2 (I2V)", url: "https://chutes-ltx-2.chutes.ai/generate", type: 'i2v' },
  { id: "ltx-2-t2v", name: "LTX-2 (T2V)", url: "https://chutes-ltx-2.chutes.ai/generate", type: 't2v' }
];
```

Note: Wan 2.2 I2V endpoint changed to vonkaiser. LTX-2 and Wan 2.1 T2V endpoints need testing — keep as-is until confirmed broken.

---

## Phase 5: Audio/TTS (chutes.ts)

### Task 5.1: Update TTS endpoint in chutes.ts

**File:** `services/chutes.ts` — update the `BASE_TTS_URL` constant

Change:
```typescript
const BASE_TTS_URL = 'https://chutes-kokoro.chutes.ai/speak';
```
To:
```typescript
const BASE_TTS_URL = 'https://vonkaiser-audiodojo.chutes.ai/speak';
```

### Task 5.2: Update STT endpoint in chutes.ts

Change:
```typescript
const BASE_STT_URL = 'https://chutes-whisper-large-v3.chutes.ai/transcribe';
```
To:
```typescript
const BASE_STT_URL = 'https://vonkaiser-audiodojo.chutes.ai/stt/whisper';
```

---

## Phase 6: Brand Studio Tool Runtime (brandStudioToolRuntime.ts)

### Task 6.1: Update hardcoded model references

**File:** `services/brandStudioToolRuntime.ts`

Update the image model fallback:
```typescript
// Change:
const model = AVAILABLE_IMAGE_MODELS.find(m => m.id === 'z-image-turbo') || AVAILABLE_IMAGE_MODELS[0];
// To:
const model = AVAILABLE_IMAGE_MODELS.find(m => m.id === 'qwen-image-2512') || AVAILABLE_IMAGE_MODELS[0];
```

Update the edit model fallback:
```typescript
// Change:
const model = AVAILABLE_EDIT_MODELS.find(m => m.id === 'qwen-image-edit') || AVAILABLE_EDIT_MODELS[0];
// (This should still work since qwen-image-edit is kept)
```

---

## Phase 7: Build & Verify

### Task 7.1: Install dependencies and build
```bash
cd /tmp/gt-assist-v2
npm install
npm run build
```

### Task 7.2: Fix any TypeScript errors
Address any type errors from removed/renamed models.

### Task 7.3: Commit all changes
```bash
git add -A
git commit -m "feat: update Chutes models — replace broken endpoints, add new models

- Replace 8 broken LLM models with 10 working ones
- Nemotron-3-Omni as default chat model (multimodal)
- Vision-tagged: Kimi K2.5/K2.6, Gemma 4, Qwen 3.6, Qwen 3.5
- Update image endpoints to vonkaiser-* (Qwen Image 2512, Z-Image Turbo, ImageClassic bundle)
- Update edit endpoint to vonkaiser-qwen-image-edit-2511
- Update video endpoint to vonkaiser-turbowani2v
- Update TTS/STT endpoints to vonkaiser-audiodojo
- Replace prompt enhancer model with Qwen3-32B-TEE
- Add ImageClassic models: FLUX, Dreamshaper XL, iLustMix, Juggernaut XL"
```

---

## Model Reference (Verified Working)

### LLMs (chat/completions endpoint)
| Model | Status | Vision | Notes |
|-------|--------|--------|-------|
| Nemotron-3-Nano-Omni-30B-TEE | ✅ | Yes | Main chat model, thinking model |
| deepseek-ai/DeepSeek-V3.2-TEE | ✅ | No | Fast, reliable |
| moonshotai/Kimi-K2.5-TEE | ✅ | Yes | |
| moonshotai/Kimi-K2.6-TEE | ✅ | Yes | NEW |
| google/gemma-4-31B-turbo-TEE | ✅ | Yes | NEW |
| Qwen/Qwen3.6-27B-TEE | ✅ | Yes | NEW, thinking model |
| Qwen/Qwen3.5-397B-A17B-TEE | ✅ | Yes | |
| Qwen/Qwen3-32B-TEE | ✅ | No | Prompt enhancer |
| zai-org/GLM-5-TEE | ✅ | No | |
| zai-org/GLM-5.1-TEE | ✅ | No | NEW |

### Image Models
| Model | Endpoint | Status |
|-------|----------|--------|
| Qwen Image 2512 | vonkaiser-qwen-image-2512.chutes.ai | ✅ |
| Z-Image Turbo | vonkaiser-z-image-turbo.chutes.ai | ✅ |
| FLUX.1 Schnell | vonkaiser-imageclassic.chutes.ai (model: flux) | ✅ |
| Dreamshaper XL | vonkaiser-imageclassic.chutes.ai (model: dreamshaper) | ✅ |
| iLustMix v80 | vonkaiser-imageclassic.chutes.ai (model: ilustmix) | ✅ |
| Juggernaut XL | vonkaiser-imageclassic.chutes.ai (model: juggernaut) | ✅ |

### Edit Models
| Model | Endpoint | Status |
|-------|----------|--------|
| Qwen Magic Edit | vonkaiser-qwen-image-edit-2511.chutes.ai | ✅ |

### Video Models
| Model | Endpoint | Status |
|-------|----------|--------|
| Wan 2.2 I2V | vonkaiser-turbowani2v.chutes.ai | ✅ |

### Audio
| Service | Endpoint | Status |
|---------|----------|--------|
| TTS (Kokoro) | vonkaiser-audiodojo.chutes.ai/speak | ⚠️ 500 in test |
| STT (Whisper) | vonkaiser-audiodojo.chutes.ai/stt/whisper | Untested |
