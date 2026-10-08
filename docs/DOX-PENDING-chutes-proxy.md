# DOX PENDING — Chutes proxy security change (branch feature/proxy-auth-hardening, PR #37)

AGENTS.md writes are approval-gated and could not be applied by unattended
workers (kanban task t_babf09d8, 2026-10-10-07; re-confirmed still gated
2026-10-08). The exact deltas below are ready to paste in an interactive
session. Apply, then DELETE this file.

Refreshed 2026-10-08 (task t_ad34ccfb) after the proxy hardening landed:
Clerk session auth on both routes, `X-Proxy-Error: 1` on all proxy-generated
errors, `maxDuration` 300 on `/api/chutes`, the ~4.5MB body cap, and the
`VITE_TAVILY`/`VITE_BRAVE` fallbacks deleted (Vercel env migrated to
`TAVILY_API_KEY`). New files since the last refresh: `services/authToken.ts`,
`scripts/media_proxy_probe.mjs`, `docs/media-proxy-validation.md`.

---

## 1. NEW FILE: api/AGENTS.md

```markdown
# DOX -- api

**Server-side proxy routes (Vercel serverless functions) — secret isolation + auth layer**

## Purpose

Hold every secret-bearing third-party call so no API key ever ships in the browser bundle, and require a real Clerk session on every stateful call.

## Ownership

- chutes.ts -- `POST /api/chutes`: passthrough to chutes.ai hosts (LLM chat, TTS, STT, image gen/edit, video, lip sync, embeddings)
- search.ts -- `POST /api/search`: Tavily/Brave search; `GET /api/search`: capability probe (booleans only)

## Local Contracts

- SECURITY: client code never reads a secret from `import.meta.env` — keys resolve only here from `process.env` (`CHUTES_API_KEY`, `TAVILY_API_KEY`, `BRAVE_API_KEY`). Never read a secret from a `VITE_*` name: Vite inlines those into the public bundle. The legacy `VITE_` fallbacks were removed 2026-10-08 (smoke tripwires in `scripts/api_smoke.mjs` fail if they return).
- AUTH: `POST` handlers require a Clerk session JWT (`Authorization: Bearer <token>`), verified server-side against Clerk's JWKS with `node:crypto` RS256 (no deps). Issuer derives from `VITE_CLERK_PUBLISHABLE_KEY` (`pk_..._` + base64url "<domain>$"), overridable via `CLERK_ISSUER` / `CLERK_JWKS_URL`. `alg:none`/non-RS256 fail closed; `exp`/`nbf` checked with 60s skew; unknown `kid` triggers one JWKS refresh (rotation). `GET /api/search` stays unauthenticated (booleans only, no upstream call). Client side: `services/authToken.ts` attaches the token.
- The inlined auth block (marked `---- Client session auth ----`) MUST stay byte-identical in both files (Vercel does not bundle relative cross-directory imports — ERR_MODULE_NOT_FOUND); `scripts/api_smoke.mjs` asserts the two copies match.
- Every proxy-generated error response carries `X-Proxy-Error: 1` (400/401/403/405/413/429/499/502/503) — clients must not retry those; upstream passthroughs never carry the header.
- `/api/chutes` allowlist: `https` only, host `chutes.ai` or `*.chutes.ai`. Any other `targetUrl` -> 400 with no upstream call (SSRF guard). Request shape: `{ targetUrl, body, userKey? }`; `userKey` is BYOK, absent -> platform key. Upstream response (status, content-type, body incl. SSE + binary) passes through untouched.
- Request bodies over ~4.5MB (the Vercel platform cap) -> 413 with "pass media inputs as URLs"; the cap is enforced on `content-length` AND measured body size.
- Missing server key -> 503, no upstream call. Key values are never logged or echoed.
- `maxDuration`: 300s on chutes (Vercel Hobby max — video gen measured at 76s), 30s on search.

## Work Guidance

- New secret-bearing upstream: add or extend a route here, keep the allowlist explicit-host/https, extend `scripts/api_smoke.mjs`, and keep the auth block in sync.
- Never reintroduce `Authorization` headers or secret env reads in `services/` — the proxy owns them.
- Media inputs >~3MB effective: pass URLs (Supabase Storage), never base64 — see `docs/media-proxy-validation.md`.

## Verification

- `npm run build` ends with `scripts/scan-dist-secrets.mjs`, which scans `dist/` and FAILS the build on any key shape (`cpk_`, `tvly-`, `sk-`/`sk_`, `AKIA`, GitHub/Slack/Google tokens, private-key blocks, `VITE_(CHUTES|TAVILY|BRAVE)` names, api-key literal assignments) and also fails on an empty/missing scan.
- `npm run test:api` — 24 groups incl. Clerk auth positive controls (forged/alg-none/tampered/rogue-key/expired/wrong-issuer tokens must 401), JWKS rotation, issuer derivation, the inlined-block sync assert, legacy `VITE_` tripwires, and the 413 body cap.
- `scripts/media_proxy_probe.mjs` — live probe of the real routes (see `docs/media-proxy-validation.md` for the 2026-10-08 results).
```

---

## 2. PATCH: root AGENTS.md

Add before `## Child DOX Index`:

```markdown
## Security Contract

- No API secret ever appears in client code or the built bundle: `import.meta.env.VITE_*` is for publishable keys only (Clerk, Supabase anon, Paystack public). Server secrets live in plain-named env vars (`CHUTES_API_KEY`, `TAVILY_API_KEY`, `BRAVE_API_KEY`) and are read only inside `api/`.
- `/api/chutes` and `/api/search` POSTs require a Clerk session JWT, verified server-side against Clerk's JWKS (`node:crypto`, no deps); every proxy-generated error carries `X-Proxy-Error: 1`.
- `npm run build` fails when `scripts/scan-dist-secrets.mjs` finds any key shape in `dist/`.
- `npm run test:api` re-verifies the proxy contract incl. auth positive controls.
```

Add to `## Child DOX Index` (top entry):

```markdown
- [api/](./api/AGENTS.md) -- Server-side proxy routes (secret isolation + session auth)
```

---

## 3. PATCH: services/AGENTS.md

- Files list, chutes.ts bullet — replace with:
  `- chutes.ts -- Chutes API client (LLM, image gen, image edit, video gen, style transfer, remove bg, upscale, TTS, STT). Video routing: LTX 2.5 (chutesLtx25.ts) + Wan; LTX 2.3 removed 2026-08-29. ALL calls go through the /api/chutes proxy with a Clerk session header — this file never sets an upstream Authorization header or reads secret env vars.`
- Add missing files to the list:
  `- authToken.ts -- Clerk session-token plumbing: AuthProvider registers getToken(); authHeaders() attaches \`Authorization: Bearer <jwt>\` to every /api call. No key material, only short-lived session JWTs.`
  `- searchAgent.ts -- multi-provider web-search orchestration (Tavily/Brave via /api/search proxy)`
  `- search.ts -- legacy SearchService (DEAD CODE, no importers — candidate for deletion)`
- Local Contracts — add:
  `- No VITE_-prefixed secret may be read in services/ — see api/AGENTS.md; client BYOK keys pass to the proxy as userKey`
  `- retryFetch/fetchWithRetry skip retrying proxy-generated errors (X-Proxy-Error: 1) — only upstream passthroughs are retried`

---

## 4. PATCH: components/chat/AGENTS.md

- Replace `AI responses via Chutes API (llm.chutes.ai/v1/chat/completions)` with:
  `AI responses via the /api/chutes proxy -> llm.chutes.ai/v1/chat/completions (Clerk session auth + platform key injected server-side; BYOK keys forwarded as userKey)`
- Add:
  `- Web search via /api/search proxy; the composer search toggle gates on the GET /api/search capability probe + BYOK keys (probe is unauthenticated, booleans only)`
