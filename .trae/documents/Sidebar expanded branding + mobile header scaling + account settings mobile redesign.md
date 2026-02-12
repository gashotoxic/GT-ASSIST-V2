## 1) Sidebar: Expanded Shows Logo + Name
- Update [Sidebar.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/Sidebar.tsx) so when `isOpen === true` the brand mark + “GashoChat” appears on **desktop too** (remove the current `lg:hidden` gating on the logo/name block).
- Keep “History” + count as the secondary line under the brand, so the header stays compact and consistent across breakpoints.

## 2) Slim Sidebar Rail: Move Settings to Bottom
- In the collapsed desktop rail (the `isOpen === false` branch in [Sidebar.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/Sidebar.tsx)):
  - Keep logo at the top.
  - Keep “New chat” near the top (below logo).
  - Push “Settings” to the bottom using a `flex-1` spacer or `mt-auto` so it always sits low regardless of screen height.

## 3) Mobile Header: Make Navbar Scale Reliably Across Devices
- Refactor the `md:hidden` header layout in [App.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/App.tsx) from a wrapping flex row into a **3-column grid**: `left / center / right`.
  - **Left**: sidebar toggle + model chip.
  - **Center**: Chat/Media pills.
  - **Right**: credits + profile (or pricing + sign-in).
- Prevent collisions by:
  - Applying `min-w-0` + `overflow-hidden` correctly on the grid columns.
  - Making the center pill group `overflow-x-auto` (horizontal scroll) on narrow widths instead of forcing overlaps.
  - Reducing padding/text for very small widths (e.g. `<360px`): shrink pill padding, and optionally hide credit number while keeping the icon.

## 4) Account Settings: Creative Mobile-First UI
- Redesign the Account Settings modal layout on small screens in [AccountSettingsModal.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/AccountSettingsModal.tsx):
  - Remove the fixed `h-[600px]` behavior on mobile; use `h-[calc(100dvh-…)]`/`max-h` so it fits all devices.
  - Replace the left sidebar tabs with a **top sticky horizontal tab bar** (icon + short label) that can scroll horizontally.
  - Reduce paddings (e.g. `p-4` instead of `p-8`) and tighten typography.
  - Move “Member Status” card into a compact top card (or into the tab bar area) so it doesn’t dominate vertical space.
- Keep the existing split sidebar+content layout for `md+` where it already works well.

## 5) Verification
- Run `npm run lint` and `npm run build`.
- Manual responsive checks:
  - iPhone 4 width (320): no overlaps; model chip truncates; nav pills scroll if needed.
  - Pixel width (~412): nav pills and credits don’t collide.
  - Sidebar: expanded shows logo+name on desktop; collapsed rail has settings pinned to bottom.