## What we can (and can’t) guarantee
- We can’t *guarantee* 100% perfect bullets/numbering across all models because output is probabilistic.
- We *can* make it very consistent by adding an explicit, high-priority “response format contract” to the system prompt that all chat requests use.
- The UI already renders Markdown lists/headers cleanly via `ReactMarkdown` + `remark-gfm` in [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx#L571-L673), so the missing piece is enforcing Markdown structure at generation time.

## Where to enforce formatting
- Prompt assembly happens in [useChatSendMessage.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/chat/hooks/useChatSendMessage.tsx#L159-L218).
- Best place to add formatting rules: in `finalSystemPrompt` assembly (applies to both Chat and Brand), right before the prompt is sent.

## Implementation changes
### 1) Add a reusable formatting contract
- Add a new exported constant in [types.ts](file:///f:/vibe_coding/GT-ASSIST-V2/types.ts) (e.g. `RESPONSE_FORMAT_CONTEXT`) that tells the model exactly how to format:
  - Use Markdown headings for sections (e.g. `##`)
  - Use `- ` for bullets (never unicode bullets)
  - Use `1.` style numbering for ordered steps
  - Always put a blank line between sections and between paragraphs and lists
  - Keep list items to one line when possible
  - If user asks for a different format, follow the user

### 2) Apply it to every chat request (chat + brand)
- In [useChatSendMessage.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/chat/hooks/useChatSendMessage.tsx#L175-L198), append the formatting contract to `finalSystemPrompt`.
- Place it at the *end* of the system prompt (after `User Instructions`) so it has the highest priority, but include a rule: “Unless the user explicitly requests a different format”.

### 3) (Optional but recommended) Align Brand prompt
- The brand prompt file [brandPrompt.txt](file:///f:/vibe_coding/GT-ASSIST-V2/brandPrompt.txt) already has an output structure section, but we can add one short, explicit “Markdown formatting contract” near the formatting section so Brand mode is equally consistent.

## Verification
- In dev UI, send prompts that usually produce messy formatting (multi-part questions, long explanations) and verify:
  - Sections use headings
  - Lists render as true bullets/numbered lists
  - Spacing between sections is readable
- Run `npm run lint` and `npm run build`.

## Deliverable
- Models respond with consistent Markdown structure (bullets, numbering, spacing) by default, while still allowing the user to override formatting when explicitly requested.