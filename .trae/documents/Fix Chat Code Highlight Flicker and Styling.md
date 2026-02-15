## Goals
- Remove the inline-code “pill” styling.
- Ensure fenced code blocks are syntax highlighted without flicker.
- Eliminate the double-background/layering issue in both dark and light mode.
- Prevent highlights from disappearing after the message finishes rendering.

## Root Cause (Current Behavior)
- Highlighting is applied by mutating the DOM after render (`hljs.highlightElement`), which causes a visible “flash” (unhighlighted → highlighted).
- React re-renders message content during streaming/finalization and overwrites the DOM that Highlight.js modified, so highlights can disappear.
- Code blocks currently get background from both the chat styling and the Highlight.js theme, causing two different background layers.
- Inline code is styled with a pill background, but you only want syntax highlighting for actual code blocks.

## Implementation Plan
### 1) Make code highlighting render-time (no DOM mutation)
- Replace the post-render `hljs.highlightElement` effect in ChatInterface with a render-time code block renderer.
- In the Markdown renderer’s `pre` component:
  - Extract the raw code text + optional language (from `node` / `className`).
  - Use `window.hljs` to compute highlighted HTML (`hljs.highlight` when language is known, otherwise `hljs.highlightAuto`).
  - Render the result with `dangerouslySetInnerHTML` inside the `<code>` element.
  - Keep copy-to-clipboard functionality by using the extracted raw code string (not DOM text).
- Outcome: no flicker, and highlights persist across re-renders because React owns the highlighted markup.

### 2) Remove the inline code “pill” styling
- Update the Markdown `code` renderer so inline code is just monospace (optionally a subtle text color) with no background/pill.
- Keep fenced code blocks handled exclusively by the custom `pre` renderer.

### 3) Fix double background layers
- Keep a single background source:
  - Make the chat code block container background consistent (e.g., a single dark background that looks good in both modes, matching the current GitHub Dark theme), and ensure Highlight.js background is not adding a second layer.
- Add a small CSS override in `index.html` to force `.hljs` background to transparent so only the outer block background shows.

### 4) Unify behavior for both message shapes
- Apply the same Markdown components (pre/code/table/link) for both:
  - `content: string` messages
  - `content: [{type:'text'}]` multipart messages
- Outcome: code blocks behave identically everywhere.

## Files to Change
- f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx
  - Remove DOM-based highlighting effect.
  - Implement render-time code block highlighting in the Markdown `pre` renderer.
  - Remove inline code pill styling.
  - Reuse the same Markdown components for both message content branches.
- f:/vibe_coding/GT-ASSIST-V2/index.html
  - Add a minimal `.hljs { background: transparent !important; }` override (and any needed related selectors).

## Verification
- Send a message that returns:
  - fenced code blocks with a language (```js)
  - fenced code blocks without a language
  - inline code (`like this`)
- Confirm:
  - no flash/flicker when code appears
  - highlighting stays after streaming finishes
  - only one background layer
  - inline code has no pill background
- Run lint/build to ensure no regressions.