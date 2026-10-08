# DOX -- components/chat

**Chat Interface**

## Purpose

Main conversational AI interface where users interact with AI assistants.

## Ownership

- hooks/ -- Chat-specific hooks (useChatSendMessage)

## Local Contracts

- Messages flow through ChatInterface.tsx to ChatComposer.tsx
- AI responses via the /api/chutes proxy -> llm.chutes.ai/v1/chat/completions (Clerk session auth + platform key injected server-side; BYOK keys forwarded as userKey)
- Web search via /api/search proxy; the composer search toggle gates on the GET /api/search capability probe + BYOK keys (probe is unauthenticated, booleans only)
- Auth: Clerk-based user session
