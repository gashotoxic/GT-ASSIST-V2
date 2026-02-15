## Re-evaluation (what we likely missed)
- The earlier “stop on `[DONE]`” approach assumes the API always sends `data: [DONE]` and/or promptly closes the connection. In practice, many OpenAI-style streams finish via `finish_reason: "stop"` and the socket may linger.
- Even if the final text is visible, the stream can still be “open”, so `isLoading` never flips to false.
- The current mobile overflow symptom suggests at least one element in the rendered markdown is still exceeding `100vw` (often `pre`, long inline tokens, or an ancestor lacking `min-w-0/max-w-full`).
- The “code scrollbar shows but doesn’t move” is a classic nested-scroll-on-mobile issue: the scroll container needs to be the right element and needs mobile-friendly touch scrolling (`-webkit-overflow-scrolling`, `touch-action`).

## Step 1 — Identify the exact overflow source (before changing styles)
In the browser console (no code changes), find the element(s) exceeding the viewport:
- Compute `document.documentElement.clientWidth` and list nodes where `scrollWidth > clientWidth`.
- This pinpoints whether overflow is coming from the bubble, the markdown wrapper, the `pre`, a `table`, or something else.

## Step 2 — Make loading dots stop reliably (even if stream lingers)
### 2.1 Treat completion correctly in the stream parser
Update [chutes.ts](file:///f:/vibe_coding/GT-ASSIST-V2/services/chutes.ts) completion detection:
- Stop on `data: [DONE]`.
- Also stop when a parsed payload indicates `choice.finish_reason === "stop"` (and no tool call aggregation is in progress).
- Optionally treat `finish_reason === "length"` as completion.
- When completion is detected, break out of both loops and `reader.cancel()`.

### 2.2 Emit an explicit “done” event and clear UI immediately
Update the stream to `yield { type: 'done' }` right when completion is detected.
- Then update [useChatSendMessage.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/chat/hooks/useChatSendMessage.tsx#L220-L280) to handle `chunk.type === 'done'` by calling:
  - `setIsLoading(false)`
  - `setLoadingStatus(null)`
  - `abortControllerRef.current = null`
This makes the indicator stop even if anything weird happens after the final chunk.

## Step 3 — Reduce dots from 5 → 3
Update [ChatLoadingIndicator.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/chat/ChatLoadingIndicator.tsx#L20-L28)
- Render 3 dot spans with staggered animation delays.

## Step 4 — Fix mobile overflow and make code blocks swipe-scroll
### 4.1 Prevent horizontal page/chat scrolling
- Add `overflow-x-hidden` to the message list scroller in [MessageList.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/chat/MessageList.tsx#L56) so the overall chat area can’t scroll sideways.
- Add `min-w-0 max-w-full` to the markdown wrapper in [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx#L572-L673) and ensure it doesn’t create width via min-content sizing.

### 4.2 Ensure bubbles are hard-capped to the viewport on mobile
Update [MessageRow.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/chat/MessageRow.tsx#L66-L75)
- Keep the current `flex-1 min-w-0` column.
- Replace small-screen percent max-width with a viewport-based cap like `max-w-[calc(100vw-4.5rem)]` (accounts for avatar + padding), then keep the existing breakpoint behavior for larger screens.

### 4.3 Make code blocks actually scroll on mobile
Update the code block wrapper in [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx#L627-L646):
- Move `WebkitOverflowScrolling: 'touch'` to the wrapper (the real scroll container).
- Add a mobile touch hint to the wrapper:
  - Prefer Tailwind `touch-pan-x` if available; otherwise add `style={{ touchAction: 'pan-x' }}`.
- Add `overscroll-x-contain` to keep the horizontal gesture inside the code block.

## Verification
- Mobile emulation (iPhone X / 375px):
  - No horizontal scroll on the overall chat area.
  - Code blocks swipe left/right and scrollbar thumb moves.
  - Loading dots disappear immediately after the assistant finishes.
- Run `npm run lint` and `npm run build`.

## Task log
- Add a 2026-02-15 entry in TASK.md for: stuck loading dots fix + 3-dot indicator + mobile overflow hardening + code swipe-scroll.