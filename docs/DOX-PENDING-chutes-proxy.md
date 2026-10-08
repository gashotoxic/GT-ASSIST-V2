# DOX PENDING — Chutes proxy security change (branch fix/chutes-server-proxy)

AGENTS.md writes are approval-gated and could not be applied by the unattended
worker (kanban task t_babf09d8, 2026-10-10-07; re-confirmed still gated 2026-10-08,
run 14). The exact deltas below are ready to paste in an interactive session.
Apply, then DELETE this file.

Refreshed 2026-10-08 after the `5457c40` sweep removed the legacy
`VITE_CHUTES_API_KEY` fallback from `api/chutes.ts` — the staged wording below
now reflects that (search's transitional `VITE_` fallbacks remain).

---

## 1. NEW FILE: api/AGENTS.md

```markdown
# DOX -- api

**Server-side proxy routes (Vercel serverless functions) — secret isolation layer**

## Purpose

Hold every secret-bearing third-party call so no API key ever ships in the browser bundle.

## Ownership

- chutes.ts -- `POST /api/chutes`: passthrough to chutes.ai hosts (LLM chat, TTS, STT, image gen/edit, video, lip sync, embeddings)
- search.ts -- `POST /api/search`: Tavily/Brave search; `GET /api/search`: capability probe (booleans only)

## Local Contracts

- SECURITY: client code never reads a secret from `import.meta.env` — keys resolve only here from `process.env` (`CHUTES_API_KEY`, `TAVILY_API_KEY`, `BRAVE_API_KEY`). The legacy `VITE_` env names are transitional server-side fallbacks inside `api/` only; migrate to the plain names and delete the `VITE_` ones.
- `/api/chutes` allowlist: `https` only, host `chutes.ai` or `*.chutes.ai`. Any other `targetUrl` -> 400 with no upstream call (SSRF guard).
- Request shape: `{ targetUrl, body, userKey? }`. `userKey` is an optional BYOK key from the caller's settings; absent -> platform key.
- Upstream response (status, content-type, body — including SSE streams and binary blobs) passes through untouched, so client retry/error handling keeps working on real upstream statuses.
- Missing server key -> 503, and no upstream call is made. Key values are never logged or echoed.
- `/api/search` builds the upstream request server-side (no arbitrary URLs): Tavily `POST api.tavily.com/search` with `api_key` in body; Brave `GET api.search.brave.com` with `X-Subscription-Token` header. Unknown provider/empty query -> 400.
- Handlers declare `maxDuration` 60s (30s for search) — deploy-safe on every Vercel plan. Long media generations beyond 60s need a plan check before raising this.

## Work Guidance

- New secret-bearing upstream: add or extend a route here, keep the allowlist to explicit hosts over https, and extend `scripts/api_smoke.mjs`.
- Never reintroduce `Authorization` headers or secret env reads in `services/` — the proxy owns them.
- When Vercel env migration to the plain names is done, remove the `VITE_` fallback branches here in the same change.

## Verification

- `npm run build` ends with `scripts/scan-dist-secrets.mjs`, which scans `dist/` and FAILS the build on any key shape (`cpk_`, `tvly-`, `sk-`/`sk_`, `AKIA`, GitHub/Slack/Google tokens, private-key blocks, `VITE_(CHUTES|TAVILY|BRAVE)` names, api-key literal assignments) and also fails on an empty/missing scan.
- `npm run test:api` bundles both handlers with esbuild and asserts the contract above (injection, BYOK precedence, allowlist, 405/400/503, SSE passthrough, probe shape) with stubbed `fetch` — no network, no real keys.
```

---

## 2. PATCH: root AGENTS.md

Add before `## Child DOX Index`:

```markdown
## Security Contract

- No API secret ever appears in client code or the built bundle: `import.meta.env.VITE_*` is for publishable keys only (Clerk, Supabase anon, Paystack public).
- Secret-bearing third-party calls (Chutes, Tavily, Brave) run through `api/` proxy routes which inject keys from server env (`CHUTES_API_KEY`, `TAVILY_API_KEY`, `BRAVE_API_KEY`); legacy `VITE_` env names exist only as server-side fallbacks inside `api/`.
- `npm run build` fails when `scripts/scan-dist-secrets.mjs` finds any key shape in `dist/`.
- `npm run test:api` re-verifies the proxy contract (allowlist, key injection, stream passthrough).
```

Add to `## Child DOX Index` (top entry):

```markdown
- [api/](./api/AGENTS.md) -- Server-side proxy routes (secret isolation)
```

---

## 3. PATCH: services/AGENTS.md

- Files list, chutes.ts bullet — replace with:
  `- chutes.ts -- Chutes API client (LLM, image gen, image edit, video gen, style transfer, remove bg, upscale, TTS, STT). Video routing: LTX 2.5 (chutesLtx25.ts) + Wan; LTX 2.3 removed 2026-08-29. ALL calls go through the /api/chutes proxy — this file never sets an Authorization header or reads secret env vars.`
- Add missing files to the list:
  `- searchAgent.ts -- multi-provider web-search orchestration (Tavily/Brave via /api/search proxy)`
  `- search.ts -- legacy SearchService (DEAD CODE, no importers — candidate for deletion)`
- Local Contracts — add:
  `- No VITE_-prefixed secret may be read in services/ — see api/AGENTS.md; client BYOK keys pass to the proxy as userKey`

---

## 4. PATCH: components/chat/AGENTS.md

- Replace `AI responses via Chutes API (llm.chutes.ai/v1/chat/completions)` with:
  `AI responses via the /api/chutes proxy -> llm.chutes.ai/v1/chat/completions (platform key injected server-side; BYOK keys forwarded as userKey)`
- Add:
  `- Web search via /api/search proxy; the composer search toggle gates on the GET /api/search capability probe + BYOK keys`
