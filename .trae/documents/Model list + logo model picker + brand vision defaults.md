## What Will Change
- Add `zai-org/GLM-5-TEE` to the chat model list.
- Add a logo-anchored “Model” picker in the top header (mobile + desktop) that shows short names (e.g., GLM 5, Kimi K2.5, DeepSeek V3.2).
- Make Brand mode use a selectable vision-only model list (starting with Kimi K2.5, GLM 4.6V) and default Brand model = Kimi K2.5.
- Keep Chat default model = Kimi K2 Thinking.
- Add `rednote-hilab/dots.ocr` (Dots OCR) to the “brand sections” docs with the provided curl.

## Code Touchpoints
- [types.ts](file:///f:/vibe_coding/GT-ASSIST-V2/types.ts):
  - Append `zai-org/GLM-5-TEE` into `AVAILABLE_MODELS`.
  - Extend `AppSettings` with `brandModel` and set `DEFAULT_SETTINGS.brandModel` to `moonshotai/Kimi-K2.5-TEE`.
  - Add small utilities/metadata for:
    - short display names
    - `supportsVision` (used to filter Brand model list)
    - ordered “Brand vision models” list (Kimi K2.5, GLM 4.6V, then the rest).
- [App.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/App.tsx):
  - Add a clickable affordance on the logo (both mobile + desktop logo instances) to open the model picker.
  - Implement a responsive picker UI:
    - On small screens: bottom-sheet modal (full-width, large tap targets).
    - On desktop: popover-style panel near the logo.
  - The picker shows the active mode (Chat / Brand) and filters models accordingly.
- [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx):
  - Replace fixed `BRAND_STUDIO_MODEL_ID` usage with `settings.brandModel ?? BRAND_STUDIO_MODEL_ID`.
  - Update “Running on …” empty state to reflect the active model (Chat vs Brand) using short names.
  - Add a lightweight event bridge so the header picker can switch Chat/Brand mode for the current session without a big refactor:
    - App dispatches `set-chat-mode` events.
    - ChatInterface listens and updates `chatMode` (still persisted per-session like today).
    - ChatInterface dispatches `chat-mode-changed` so App can keep the picker UI in sync.
- [chutes_api_reference.md](file:///f:/vibe_coding/GT-ASSIST-V2/chutes_api_reference.md):
  - Add a new entry for `rednote-hilab/dots.ocr` with name “Dots OCR” and the provided curl request.

## UX Rules Implemented
- Short names in the picker only (existing settings modal can stay unchanged unless you want it updated too).
- Brand mode model list = vision-only.
- Brand defaults: Kimi K2.5.
- Chat defaults: Kimi K2 Thinking.

## Verification
- Run `npm run lint` and `npm run build`.
- Quick manual check:
  - Open picker from logo on mobile and desktop.
  - Switch Chat ↔ Brand and confirm model list filters correctly.
  - Send a message in Brand mode and confirm the request uses the selected vision model.

## TASK.md Hygiene
- Add a new entry dated 2026-02-12 describing this change and mark it completed once verified.

If you confirm this plan, I’ll implement it end-to-end and verify with lint/build.