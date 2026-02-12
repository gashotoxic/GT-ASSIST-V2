## Requirements Mapped
- Dropdown boxes close when cursor moves away: **header model picker** + **chat “+” tools menu**.
- Better styling: smaller, tighter, not wasting space.
- Replace “Analyzing & Processing…” waiting text with a dotted wave animation.
- Mobile: move logo into the sidebar; put model selection where the logo currently is.
- Reduce oddly large text in touched UI areas.

## Implementation Plan
### 1) Mobile Header: Replace Logo With Model Chip
- Update [App.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/App.tsx) mobile header section (`md:hidden`):
  - Remove the logo mark button from the left cluster.
  - Insert a compact **model dropdown trigger** (chip/button) in that same spot.
  - Keep the sidebar toggle button as-is.
  - Use smaller text sizes on the chip and any nearby labels that feel oversized.

### 2) Sidebar: Add Logo (Mobile-Forward)
- Update [Sidebar.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/Sidebar.tsx):
  - Add the brand mark (`/brand/mark.png`) + app name near the top of the sidebar header.
  - Ensure it is visible in mobile sidebar (and optionally also fine on desktop).
  - Keep sizing compact (avoid taking vertical space from the chat list).

### 3) Header Model Picker: Desktop Dropdown + Mouseleave Close
- Update [LogoModelPicker.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/LogoModelPicker.tsx) to support two behaviors:
  - **Mobile/touch**: keep bottom-sheet.
  - **Desktop/hover pointer**: render a compact dropdown popup (no full-screen overlay).
- Close rules:
  - On desktop/hover: `onMouseLeave` of the dropdown container closes it.
  - Also close on outside click + Escape.
- Styling:
  - Reduce width and padding.
  - Reduce list item padding and secondary text size.

### 4) Chat “+” Quick Tools Menu: Dropdown + Mouseleave Close
- Update the quick-tools block in [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx#L1277-L1383):
  - Wrap the `+` button and dropdown panel in one container.
  - For hover pointers: remove the full-screen overlay and close via `onMouseLeave`.
  - For touch: keep overlay and tap-outside close.
- Styling:
  - Smaller width, tighter padding, smaller text/icons to avoid unnecessary space.

### 5) Loading UI: Dotted Wave
- Update `isLoading` UI in [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx#L1225-L1251):
  - Remove the default “Analyzing & Processing…” fallback.
  - Show a **5-dot wave** using staggered bounce timing (Tailwind’s existing `bounce` animation with per-dot delays).
  - Keep `loadingStatus` only as an optional small caption when it is explicitly set (e.g., Knowledge Base/search statuses).

## Verification
- Run `npm run lint` and `npm run build`.
- Manual UI checks:
  - Desktop: model dropdown closes when cursor leaves; quick-tools dropdown closes when cursor leaves.
  - Mobile: logo appears in sidebar; model selection appears where the mobile header logo used to be.
  - Loading state shows dotted wave (no “Analyzing & Processing…” default text).