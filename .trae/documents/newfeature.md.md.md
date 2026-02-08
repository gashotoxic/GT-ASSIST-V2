# Brand Studio Mode — Solid Plan + UX/Aesthetics Improvements

## 1) Improvements / Modifications (What We’ll Do Better)
- **Preserve flow**: Brand Studio is just a mode inside the existing Chat UI; no new page, no disruptive layout changes.
- **Prevent accidental credit spend** (Plus users): Tools toggle defaults **OFF** and the system prompt restricts tool usage to explicit user intent (“generate now”, “edit this image”).
- **Keep UI clean**:
  - Mode switch is compact and uses the same glassmorphism styling.
  - Tools toggle is shown **only in Brand Studio**.
  - No extra panels by default; optional chips only on empty-state.
- **Consistent lock UX**: Reuse the same lock badge/tooltip behavior already used by the Knowledge Base toggle.
- **Mobile-first**: Ensure the switch and toggle fit the existing input pill on <450px screens (no wrapping/clipping).

## 2) Decisions (No Ambiguity)
- Brand Studio is available to **all** users.
- Image tools are available to **Plus and Pro only**.
- Tools toggle (Brand Studio only):
  - Free/Basic: disabled + lock badge.
  - Plus/Pro: can turn ON/OFF.
- Web search remains **unchanged** (existing Search toggle/settings).
- Brand Studio model is **Kimi K2.5**: `moonshotai/Kimi-K2.5-TEE` (per updated [chutes_api_reference.md](file:///f:/vibe_coding/GT-ASSIST-V2/chutes_api_reference.md)).
- Credits:
  - Plus: 1 credit per tool run.
  - Pro: unlimited.

## 3) UI (Aesthetic-Safe Spec)
### 3.1 Mode switch placement
- Place the segmented switch inside the existing input pill (same row as Attach/Search/KB) in [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx).
- Styling:
  - Glass background (same as other controls).
  - Two small pill buttons: “Chat” and “Brand”.
  - Active state: subtle primary tint + border.

### 3.2 Tools toggle placement (Brand only)
- Appears only when mode = Brand.
- Uses existing `Button` ghost/icon styling to match Search toggle.
- States:
  - OFF: neutral icon.
  - ON: primary-tinted background.
  - Locked (Free/Basic): dimmed + lock badge.
- Tooltip text:
  - Free/Basic: “Upgrade to Plus to unlock Brand Tools (Generate/Edit)”.
  - Plus: “Tools ON: image generate/edit may use 1 credit per run”.
  - Pro: “Tools ON: unlimited”.

### 3.3 Empty-state (optional, low-noise)
- When messages are empty and mode=Brand:
  - Show 2–3 small suggestion chips (e.g. “Poster prompt”, “WhatsApp flyer”, “5-sec video script”).
  - Chips only appear on empty state so they don’t clutter ongoing chats.

## 4) Prompting
### 4.1 Normal Chat
- Keep existing behavior.
- Add a concise app-howto appendix (no model names): Media usage + MuseTalk + LTX steps.

### 4.2 Brand Studio
- Core prompt comes from [brandPrompt.txt](file:///f:/vibe_coding/GT-ASSIST-V2/brandPrompt.txt).
- Add a strict wrapper header:
  - `MODE: BRAND_STUDIO`
  - `TOOLS_ENABLED: true/false`
  - Tool usage policy:
    - Only call tools when the user explicitly requests generation/editing.
    - If tools are disabled/unavailable, provide prompts + UI steps only.

## 5) Image Tools (Scope)
### Tools
- `generate_image({ prompt, aspectRatio? })` → default `z-image-turbo`.
- `edit_image({ prompt, image_b64, aspectRatio? })` → default `qwen-image-edit`.

### Credits + persistence
- Plus: deduct 1 credit via `SupabaseService.useCredits(...)` before running.
- Pro: bypass.
- Save outputs to Gallery via `SupabaseService.saveMediaItem(...)`.

## 6) Technical Integration (Minimal Risk)
### 6.1 Session-based state
- Persist mode and tools toggle per session:
  - `ChatSession.chatMode?: 'chat'|'brand'`
  - `ChatSession.brandToolsEnabled?: boolean`
- Defaults for new sessions:
  - `chatMode = 'chat'`
  - `brandToolsEnabled = false`

### 6.2 Streaming tool execution
- Keep the existing streaming tool-call mechanism in [services/chutes.ts](file:///f:/vibe_coding/GT-ASSIST-V2/services/chutes.ts).
- Add an injected runtime (no Supabase imports in ChutesService):
  - New file: `services/brandStudioToolRuntime.ts` (≤ 500 LOC).
  - `executeTool(name, args)` handles tier checks, credit deduction, image API calls, and gallery save.

### 6.3 UI display of tool results
- Extend stream output types to include `tool_result` for image tools.
- In ChatInterface, on `tool_result`, attach media to the current assistant message via `Message.media?: MediaItem[]`.
- Render `Message.media` as a clean card above markdown (keeps aesthetics consistent).

## 7) Concrete Code Changes
- [types.ts](file:///f:/vibe_coding/GT-ASSIST-V2/types.ts)
  - Add `ChatSession.chatMode`, `ChatSession.brandToolsEnabled`.
  - Add `Message.media?: MediaItem[]`.
  - Add constant `BRAND_STUDIO_MODEL_ID = 'moonshotai/Kimi-K2.5-TEE'`.
- [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx)
  - Add mode switch + tools toggle.
  - Build system prompt based on mode + tools state.
  - Force model to Kimi K2.5 when in Brand Studio.
  - Handle `tool_result` and render media cards.
- [services/chutes.ts](file:///f:/vibe_coding/GT-ASSIST-V2/services/chutes.ts)
  - Add conditional tool definitions for `generate_image` / `edit_image`.
  - Dispatch to injected runtime and emit `tool_result`.
- Add `services/brandStudioToolRuntime.ts` (new).
- [TASK.md](file:///f:/vibe_coding/GT-ASSIST-V2/TASK.md)
  - Add a new task entry after implementation.

## 8) Manual Verification (Aesthetic + Functional)
- Mobile: input row remains one line, no overlap/clipping.
- Mode switch/toggle look consistent with Search/KB controls.
- Free/Basic cannot enable tools.
- Plus tool usage deducts 1 credit per run.
- Pro unlimited.
- Tool outputs appear as clean cards and are saved to Media  Gallery.
- Normal chat experience is unchanged except additional app-howto knowledge.