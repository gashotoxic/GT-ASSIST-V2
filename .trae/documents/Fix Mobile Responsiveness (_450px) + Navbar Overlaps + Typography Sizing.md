## What’s Causing The Issues
- **Left cut-off on <450px**: message rows use `avatar (fixed width) + gap + bubble max-w-[95%]`, which can exceed 100% width; the chat card has `overflow-hidden`, so the left edge gets clipped.
- **Large/zoomed text feel**: markdown content is wrapped in Tailwind Typography `prose`, which sets its own base font-size (often larger than the bubble’s `text-sm`).
- **Credits/profile overlap**: the header is `flex-nowrap` and mobile buttons/pills have “desktop-ish” padding, so the left and right groups collide on ultra-narrow screens.
- **Profile button extra right space**: the profile trigger always includes padding + chevron, so it looks like it has an unnecessary “toggle area”.

## Planned Fixes
### 1) Chat messages: prevent horizontal overflow + reduce left spacing
- Update message row/bubble layout in `components/ChatInterface.tsx`:
  - Make the bubble container shrink safely (`min-w-0` + `flex-1` / `max-w-full`) so it never exceeds available width.
  - Reduce small-screen spacing: `gap-1` on base with `xs:gap-2`, and slightly smaller avatars on base.
  - Tighten message area padding on base: `p-1 xs:p-2 sm:p-6` to reduce the left margin on narrow devices.

### 2) Typography: stop markdown from looking “zoomed in”
- Change the markdown wrapper class from `prose` to a smaller preset:
  - Use `prose prose-sm sm:prose-base dark:prose-invert max-w-none` so chat text aligns with the bubble’s intended sizing.

### 3) Header/nav: stop credits + profile + icons overlapping
- Update header layout in `App.tsx`:
  - Allow wrapping only when needed on narrow screens: `flex-wrap sm:flex-nowrap` and add `gap-y-2`.
  - Compress mobile nav buttons (Chat/Media): smaller padding on base (`px-2`) and keep current spacing on `xs+`.
  - Keep credit pill compact on base: slightly smaller icon/text and `whitespace-nowrap`.

### 4) Profile control: remove “extra right space” and improve alignment
- Update `components/UserProfile.tsx`:
  - Reduce trigger padding/gap on base (e.g., `px-2 gap-2`).
  - Hide the chevron on the smallest widths (`hidden xs:block`) so it looks like a clean avatar button and frees space.
  - Make dropdown width responsive so it never overflows tiny screens: `w-[min(20rem,calc(100vw-1rem))]`.

### 5) “Prettier” polish (light touch)
- Ensure consistent rounding and spacing across header pills/buttons on mobile.
- Keep everything glassy but less cramped: slightly more consistent `rounded-xl/2xl` and spacing rules on narrow screens.

## Files I’ll Change
- `components/ChatInterface.tsx`
- `App.tsx`
- `components/UserProfile.tsx`
- (If you want the project tracking rule enforced) create/update `TASK.md` with today’s entry (2026-01-14).

## Verification
- Run `npm run lint` and `npm run build`.
- Start the dev server and check widths: 320px / 360px / 390px / 430px / 450px.
- Confirm:
  - No horizontal clipping in chat bubbles.
  - Smaller, consistent chat text (no “zoomed” feel).
  - Credits + profile never overlap; profile has no weird extra right space.

If you confirm this plan, I’ll implement the changes and verify them.