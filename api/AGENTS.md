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
