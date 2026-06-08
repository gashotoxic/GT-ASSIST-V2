# Phase 5: AI Integration — Plan

> **Branch:** continue on `feature/photoshop-v2`
> **API:** Chutes API (vonkaiser endpoints) + LLM (llm.chutes.ai)
> **Goal:** Add AI-powered tools to the Photoshop Corner as an optional feature set

---

## AI Tool Overview

Add an "AI" tool button (shortcut: `K`) to the toolbar. When active, the right panel shows AI tool controls. All AI operations work on the active layer.

### AI Features

| Feature | Chutes Endpoint | Credits | Description |
|---------|----------------|---------|-------------|
| **AI Generate** | vonkaiser-z-image-turbo | 5 | Generate image from text prompt into new layer |
| **AI Edit** | vonkaiser-qwen-image-edit-2511 | 3 | Edit selected area via natural language description |
| **Remove BG** | vonkaiser-imageclassic (rembg model) | 2 | Automatic background removal |
| **AI Upscale** | vonkaiser-imageclassic (upscale model) | 4 | 2x/4x upscale with enhancements |
| **Smart Fill** | vonkaiser-qwen-image-edit-2511 | 3 | Fill selected area with AI-generated content |
| **Style Transfer** | vonkaiser-qwen-image-2512 | 3 | Apply artistic style to image |

---

## Implementation Phases

### Phase 5a: AI Service Layer (2 files)

**`services/aiPhotoService.ts`** — Client-side service that calls Chutes API endpoints:

```typescript
export async function aiGenerateImage(prompt: string, model: string, aspectRatio: string): Promise<string>
export async function aiEditImage(imageDataUrl: string, prompt: string, mask?: string): Promise<string>
export async function aiRemoveBackground(imageDataUrl: string): Promise<string>
export async function aiUpscaleImage(imageDataUrl: string, scale: 2 | 4): Promise<string>
export async function aiSmartFill(imageDataUrl: string, maskDataUrl: string, prompt: string): Promise<string>
export async function aiStyleTransfer(imageDataUrl: string, style: string): Promise<string>
```

**`hooks/useAIService.ts`** — React hook wrapping the service with credit tracking and generation status.

### Phase 5b: AI Panel (2 files)

**`components/photoshop/ai/AIPanel.tsx`** — Main AI control panel for the right sidebar:
- Mode selector (Generate, Edit, Remove BG, Upscale, Smart Fill, Style Transfer)
- Prompt textarea (for Generate, Edit, Smart Fill)
- Model selector (when relevant)
- "Apply" button with credit cost display
- Generation status indicator (loading spinner, progress bar)

**`components/photoshop/ai/ModelSelector.tsx`** — Shared model dropdown showing:
- Image models: vonkaiser-z-image-turbo, vonkaiser-qwen-image-2512, etc.
- Thinking models badge for models needing max_tokens >= 500

### Phase 5c: Wire into PhotoshopEditor

Changes to `PhotoshopEditor.tsx`:
1. Add AI tool button (`'ai'`) to TOOLS array, shortcut `K`, icon `⚡`
2. Add `aiPanelMode` state, prompt state
3. Add `handleAIAction` callback that calls the service and updates layer
4. Wire AIPanel in right sidebar when `activeTool === 'ai'`
5. Add AI keyboard shortcut integration

### Phase 5d: Integration with existing Chutes service

The existing `services/chutes.ts` already has image generation and editing. The AI photo service should:
1. Reuse existing `chutesService` from the app context
2. Add new methods for the Photoshop-specific features
3. Handle loading states, error handling, credit deduction

---

## Auth & Credits Flow

### Gating Architecture

Every AI operation follows this flow:

```
User clicks AI feature
    ↓
Is user authenticated? ──No──→ Show auth modal (onRequestAuth())
    ↓ Yes
Does user have credits? ──No──→ Show "Out of credits" → upsell
    ↓ Yes
Deduct credits via supabaseService.deductCredits(userId, amount, 'photoshop_ai', model)
    ↓ Success
Call Chutes API endpoint
    ↓ Success
Update layer with result
    ↓
Push snapshot to undo history
```

### Props Needed on PhotoshopEditor

```typescript
interface PhotoshopEditorProps {
  initialImageUrl?: string | null;
  onExport?: (blob: Blob) => void;
  onClose?: () => void;
  // Auth & credits (passed from parent MediaStudio)
  isAuthenticated?: boolean;
  onRequestAuth?: () => void;
  userId?: string | null;
  supabaseService?: any; // For credit deduction
  chutesService?: any;   // For API calls
  deductCredits?: (type: string, model?: string) => Promise<boolean>;
}
```

### Credit Cost Configuration

Add to `services/creditCosts.ts`:

```typescript
photoshop_ai: {
  generate: 5,
  edit: 3,
  remove_bg: 2,
  upscale_2x: 3,
  upscale_4x: 4,
  smart_fill: 3,
  style_transfer: 3,
  default: 3
}
```

---

## Technical Details

### Prompt Generation
- **Remove BG**: No prompt needed — uses dedicated endpoint
- **AI Upscale**: No prompt needed — auto-upscales
- **Style Transfer**: User selects from presets (oil painting, watercolor, sketch, anime, cinematic, cyberpunk)
- **Smart Fill**: User draws selection on canvas, describes what to generate there

### Mask Handling for Smart Fill / AI Edit
- Create a mask canvas from the user's selection rectangle
- Convert to base64 dataUrl
- Send as mask parameter to the edit endpoint
- Overlay result on the original layer

### Error Handling
- Credit check before calling API
- Max retries: 2
- Timeout: 60s for generation, 30s for edits
- Show user-friendly error messages from API responses

### Credit Costs
| Operation | Credits |
|-----------|---------|
| Generate | 5 |
| Edit | 3 |
| Remove BG | 2 |
| Upscale (2x) | 3 |
| Upscale (4x) | 4 |
| Smart Fill | 3 |
| Style Transfer | 3 |

---

## Files to Create

| File | Type | Description |
|------|------|-------------|
| `services/aiPhotoService.ts` | Service | API calls to Chutes endpoints |
| `hooks/useAIService.ts` | Hook | React wrapper with credits + state |
| `components/photoshop/ai/AIPanel.tsx` | Component | AI tool panel UI |
| `components/photoshop/ai/ModelSelector.tsx` | Component | Model picker dropdown |

## Files to Modify

| File | Change |
|------|--------|
| `components/photoshop/PhotoshopEditor.tsx` | Add AI tool button, AIPanel render, handleAIAction callback |
| `services/chutes.ts` | Add photo-focused methods (if not already present) |

---

## Verification

1. Click AI tool → panel shows 6 mode options
2. Type prompt → click Generate → image appears as new layer
3. Select Remove BG → click layer → background removed
4. Draw selection → Smart Fill → describe → fill appears
5. Credits deducted correctly, undo works
6. Error messages shown on API failures
