# Requested UI Updates (Plan)

## Scope Summary
You want 3 big changes:
1) Brand/Chat switch ordering + clearer sizing.
2) Major mobile input-row decluttering with a “+” expander (and web search ON by default).
3) Major mobile header + sidebar behavior overhaul (logged-out vs logged-in layouts, and sidebar width 450px).

## 1) Brand/Chat Switch Improvements
### What changes
- Swap the order to **Brand** then **Chat**, while keeping **Chat selected by default**.
- Increase padding/size so it reads clearly as two sections.

### Where
- Chat empty-state “How can I help?” block in [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx) (below “Running on …”).

### Aesthetics
- Keep the same rounded/glass pill style; just make each segment wider/taller and improve visual separation.

## 2) Mobile Input Row “+” Expander (Reduce Congestion)
### What changes
- Replace the always-visible icon row (paperclip, web search, knowledge base, brand tools) with:
  - A **Plus** icon button that expands/collapses a mini toolbar.
  - When **collapsed**: show only icons that are currently enabled/active (plus always visible).
  - When **expanded**: show **all** icons (Attach, Web Search, Knowledge Base, Brand Tools).
- Make **Web Search enabled by default**.

### Rules
- Collapsed state hides disabled toggles.
- Expanded state shows all toggles so the user can find/enable them.
- Keep existing gating:
  - Knowledge Base locked for free tier.
  - Brand Tools locked for non Plus/Pro.

### Where
- Input toolbar in [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx) (the input-row `div` you highlighted).

### Notes
- I’ll keep the UI consistent: same rounded ghost buttons, same subtle active tint, same tooltips.

## 3) Mobile Header Redesign (Logged Out vs Logged In)
You want the header’s mobile layout to be fully reworked while retaining desktop behavior.

### 3.1 Logged out (mobile)
**Target:** in the mobile header row, left-to-right:
- Sign In button
- Pricing button
- Media button
- Chat button
- History/sidebar button

**Also:**
- Remove the logo block on mobile.
- Remove the current mobile Chat/Media block and replace with the new ordered row.

### 3.2 Logged in (mobile)
**Target:** right side shows a **vertical dots menu** (kebab) that contains:
- Credits (current credits pill behavior)
- Media button
- Chat button
- Logo block
- History/sidebar toggle (3-lines) for expanding/collapsing chats
- The current profile menu content (settings/billing/sign out)

**Implementation approach (keeps aesthetics + reduces code duplication):**
- Introduce a single mobile menu popover for signed-in users.
- Reuse the same actions already used today:
  - Open pricing view
  - Open account settings modal
  - Sign out
  - Toggle sidebar open/close

### Where
- Header JSX in [App.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/App.tsx#L359-L503).
- We’ll keep desktop sections as-is (`hidden md:flex` desktop switcher, etc.) and only change `md:hidden` blocks.

## 4) Chat History Sidebar: Mobile Half-Width + Smoother Collapse
### What changes
- On mobile devices under **450px width**, sidebar should open to **~50vw** (half screen), not nearly full width.
- Smooth expand/collapse animation (translate + width consistent).

### Where
- Sidebar container and inner wrapper width constraints in [Sidebar.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/Sidebar.tsx).
  - Current hard widths (`w-80`, `min-w-[20rem]`) will become responsive.
  - Use Tailwind’s `max-[450px]:w-[50vw]` (and remove the min-width constraint under 450px).

## 5) Kimi K2.5 Model in Model List
### What changes
- Add `moonshotai/Kimi-K2.5-TEE` to the selectable model list in [types.ts](file:///f:/vibe_coding/GT-ASSIST-V2/types.ts).
- Ensure chat credit-cost mapping recognizes it (so it stays 1 credit like others) in [creditCosts.ts](file:///f:/vibe_coding/GT-ASSIST-V2/services/creditCosts.ts).

## 6) Verification
- Run `npm run lint` and `npm run build`.
- Manual smoke:
  - Mobile 450px: input row not congested, plus expander works.
  - Mobile logged out: header order matches your spec, logo hidden.
  - Mobile logged in: kebab menu contains required items and fits.
  - Sidebar opens half-width on 450px and closes smoothly.

If you confirm, I’ll implement all changes across:
- [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx)
- [App.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/App.tsx)
- [Sidebar.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/Sidebar.tsx)
- [UserProfile.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/UserProfile.tsx) (only if needed to reuse its menu content cleanly)
- [types.ts](file:///f:/vibe_coding/GT-ASSIST-V2/types.ts)
- [creditCosts.ts](file:///f:/vibe_coding/GT-ASSIST-V2/services/creditCosts.ts)