# DOX -- components/chat

**Chat Interface**

## Purpose

Main conversational AI interface where users interact with AI assistants.

## Ownership

- hooks/ -- Chat-specific hooks (useChatSendMessage)

## Local Contracts

- Messages flow through ChatInterface.tsx to ChatComposer.tsx
- AI responses via Chutes API (llm.chutes.ai/v1/chat/completions)
- Auth: Clerk-based user session
