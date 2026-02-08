## Re-evaluation (what’s solid vs what I’ll tighten)
- Solid: The correct “tips/user guide” system is Joyride in [OnboardingTour.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/OnboardingTour.tsx#L1-L270), and the “section div” most likely needing scroll/scale is the Media preview viewport `#tour-media-content` in [MediaStudio.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/MediaStudio.tsx#L1198-L1283).
- What I’m tightening: I’ll prioritize a simple, reliable zoom/scroll approach that doesn’t require new libraries and works across devices (scroll container + fit modes + explicit zoom controls), instead of ambitious gesture handling.

## Goal (explicit acceptance criteria)
1. Media preview area:
   - On small screens, tall images are not squished; they display at readable size and can be scrolled vertically.
   - On larger screens, images remain nicely centered and fit-to-screen.
2. Lightbox viewer:
   - Images can be zoomed in/out and, when zoomed, the user can scroll/pan to view different parts.
3. Onboarding tips:
   - Copy is friendlier and clearer.
   - “Cancel/Skip” ends immediately and leaves the user with a positive outcome (a short banner + a clear way to restart later).

## Implementation Plan (minimal risk, no new deps)

## 1) Make the Media preview section scrollable + responsive fit
Files: [MediaStudio.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/MediaStudio.tsx#L1198-L1283)
1. Change `#tour-media-content` container from `overflow-hidden` to `overflow-auto`.
2. Adjust layout behavior by breakpoint:
   - On mobile widths: prefer `items-start` and allow vertical scrolling.
   - On desktop: keep `items-center`.
3. Render images differently depending on screen size:
   - Mobile default: `w-full h-auto` (fit-to-width) so tall images can be scrolled.
   - Desktop default: keep existing `max-w-full max-h-full object-contain`.
4. Add safe scroll ergonomics:
   - `overscroll-contain` to avoid “rubber band” scrolling conflicts.
   - Keep the existing click-to-open lightbox.

## 2) Add “real” zoom in the Lightbox (scroll-based pan)
Files: [MediaStudio.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/MediaStudio.tsx#L1333-L1489)
1. Change the lightbox center content wrapper to `overflow-auto` (instead of `overflow-hidden`).
2. For images only:
   - Maintain a `zoom` state (e.g., 1.0–4.0) and a `fitMode` state (`'fit' | 'width'`).
   - Apply zoom via `transform: scale(zoom)` on the `<img>` and ensure the container scrolls when scaled.
3. Add small glassmorphism zoom controls in the lightbox top bar:
   - `-` (zoom out), `+` (zoom in), `Reset`, and a `Fit/Width` toggle.
4. Add lightweight interactions (optional but low-risk):
   - Ctrl/⌘ + wheel to zoom on desktop.
   - Double-click/double-tap toggles between `fit` and `2x`.

## 3) Make the onboarding tips user-friendly + “good” cancel behavior
Files: [OnboardingTour.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/OnboardingTour.tsx#L103-L267), optional small UI hook in [Sidebar.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/Sidebar.tsx#L225-L257)
1. Rewrite step content to be clearer and more human.
2. Customize Joyride labels (`locale`) so cancel feels friendly:
   - `Skip` → “Not now”, `Last` → “Done”, etc.
3. Improve cancel/skip outcome:
   - When `STATUS.SKIPPED` (or close action), immediately stop that tour and mark it “seen” as today’s behavior does.
   - Also show a small in-app banner (6–8s) with:
     - Message: “Guide closed — you can restart anytime.”
     - Actions: “Restart guide” + “Dismiss”.
   - Ensure any tour-driven UI state is cleaned up (e.g., close sidebar if the chat tour opened it).
4. Add a clear “restart” entry point:
   - Add a “Guide” button near the settings/footer area in the sidebar.
   - Implement a simple `CustomEvent('start-tour', { detail: { tour: 'chat' | 'image' | ... } })`.
   - `OnboardingTour` listens for this event and starts the requested tour even if the user has previously seen it (without forcing them to clear storage manually).

## 4) Repo process alignment
- Add a task entry to [TASK.md](file:///f:/vibe_coding/GT-ASSIST-V2/TASK.md) dated 2026-02-05 describing: “Make media preview scroll/zoom responsive; improve onboarding tour cancel UX.”
- Note: I could not find `PLANNING.md` in the repository; I’ll follow the conventions in `PROJECT_CONTEXT.md` and existing component patterns.

## 5) Verification
- Manual UI checks:
  - Mobile width: tall image preview is scrollable and readable.
  - Lightbox: zoom in/out + scroll to pan works.
  - Tour: “Not now” ends and shows the friendly banner; “Restart guide” relaunches.
- Build hygiene:
  - `npm run lint`
  - `npm run build`

If you approve this plan, I’ll implement it with minimal code added and no new dependencies.