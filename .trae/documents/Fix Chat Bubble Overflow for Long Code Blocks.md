## Findings
- The code block is correctly set up to scroll (`overflow-x-auto` wrapper + `min-w-max` on `<pre>`), but the *message bubble itself* is still sizing from content in some cases.
- In a flex layout, an item can still overflow if the bubble (or its immediate flex parent) is allowed to size to content instead of being forced to the available width.

## Goal
- Keep the assistant message bubble strictly within the chat column width.
- Let only the code-block area scroll horizontally.

## Plan
### 1) Force assistant bubble to not size from content
- In [MessageRow.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/chat/MessageRow.tsx), add `w-full` to the assistant-bubble class branch (the non-user, non-system bubble).
- Keep `max-w-full min-w-0 overflow-x-hidden` so the bubble cannot extend beyond its container.

### 2) Constrain the message wrapper that holds the bubble
- In [MessageRow.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/chat/MessageRow.tsx), add `w-full min-w-0 overflow-x-hidden` to the wrapper that currently has `min-w-0 max-w-[85%]...`.
- This prevents any internal child from forcing page-level horizontal scroll even if something slips through.

### 3) Ensure code-block wrapper remains the only horizontal scroller
- Keep the current code-block layout in [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx):
  - wrapper: `w-full max-w-full min-w-0 overflow-x-auto`
  - `<pre>`: `min-w-max whitespace-pre`
- If needed after step 1–2, add `max-w-full` and `display:block` safety on the wrapper.

## Verification
- Test on 375px and 412px widths with a long code response.
- Confirm:
  - Bubble stays within the screen.
  - No page-level horizontal scroll.
  - Only the code section scrolls horizontally.
- Run lint/build after changes.