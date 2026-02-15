## What’s happening
- The code block has long, unbroken lines, so something in the code-block layout is being allowed to exceed the message bubble width.
- When any child becomes wider than the viewport, the browser gives the whole page a horizontal scroll, which is what you’re seeing.

## Goal
- Keep the message bubble (the outer `div` around the response) constrained to the screen width.
- Allow ONLY the code block area (`pre`) to scroll horizontally when lines are long.

## Plan
### 1) Make the code block scroll container explicit
- In [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx), adjust the code block renderer so:
  - The outer wrapper becomes `max-w-full overflow-x-auto`.
  - The inner `pre` becomes `min-w-max` (so it can be wider than the viewport) and **does not** force the parent bubble wider.
  - Remove any `overflow-hidden` on the wrapper that could interfere with scrollbar visibility.

Concrete structure:
- Wrapper: `w-full max-w-full min-w-0 overflow-x-auto`
- Inner `pre`: `min-w-max` + existing padding/background/border.

### 2) Ensure the message bubble is allowed to shrink
- In [MessageRow.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/chat/MessageRow.tsx), add hard constraints on the assistant bubble container so it never expands beyond its column:
  - Add `max-w-full min-w-0 overflow-x-hidden` to the bubble element (the one that wraps `renderMessageContent`).
  - This prevents any accidental child overflow from pushing the layout.

### 3) Keep normal text wrapping as-is
- Leave normal prose text wrapping (`break-words`) untouched.
- Only code blocks get horizontal scroll.

### 4) Verification
- On mobile widths (e.g. 375px and 412px), render a response with very long code lines.
- Confirm:
  - No page-level horizontal scrolling.
  - The message bubble stays within the screen.
  - Only the code block shows a horizontal scrollbar.
- Run lint/build afterward.