## What’s happening
- Code blocks are rendered intentionally “wide” (`min-w-max` + `whitespace-pre`) so they preserve formatting.
- The chat row/bubble layout currently combines a large `max-w` (up to 90% on small screens) with an avatar + gap, and also uses `overflow-x-hidden` on bubble ancestors.
- Result: when code is long, the row’s min-content sizing + the aggressive `max-w` can push the whole bubble past the viewport, and the ancestor `overflow-x-hidden` can clip instead of letting the code block scroll.

## Fix approach (so code scrolls, bubble doesn’t expand)
### 1) Make the row layout mathematically safe on small screens
- Update [MessageRow.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/chat/MessageRow.tsx#L50-L75)
  - Change the “message column” container (currently `w-full ... max-w-[85%] xs:max-w-[90%] ...`) to `flex-1 min-w-0` so the avatar + message column never exceed the viewport.
  - Move width constraints to the bubble itself (apply `max-w-[85%] xs:max-w-[90%] sm:max-w-[75%]` on the bubble), and prefer `w-fit` (or `inline-flex`) so the bubble sizes to content up to the cap.

### 2) Stop clipping horizontal scroll areas
- In the same [MessageRow.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/chat/MessageRow.tsx#L66-L75)
  - Remove `overflow-x-hidden` from the message column and assistant bubble so nested `overflow-x-auto` areas (code blocks) can display and scroll normally.

### 3) Ensure code blocks always scroll horizontally
- Keep the existing code-block wrapper in [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx#L627-L646), but tighten constraints so it can’t influence bubble width:
  - Ensure the wrapper is `w-full max-w-full min-w-0 overflow-x-auto` (already) and add any missing `max-w-full`/`min-w-0` at the closest flex boundaries after step (1).

### 4) Prevent long inline code from forcing width
- Update inline `code` renderer in [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx#L658-L666)
  - Add `whitespace-pre-wrap` and optionally `[overflow-wrap:anywhere]` so long inline tokens wrap instead of expanding the bubble.

## Verification (manual)
- In the running UI, send messages containing:
  - A long fenced code block (hundreds of characters per line)
  - A long inline code token (no spaces)
- Confirm:
  - Bubble never extends past the viewport.
  - Code blocks show a horizontal scrollbar inside the bubble.
  - No visible clipping/cutoff in the middle of the screen.

## Task log update
- Add a 2026-02-15 TASK.md entry for “Fix chat code block overflow (horizontal scroll)”.
- If this fully resolves the earlier 2026-01-14 item (“prevent chat bubble clipping”), mark it completed.