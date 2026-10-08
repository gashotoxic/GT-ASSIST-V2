# Media payload validation — /api/chutes proxy (2026-10-08)

Card t_ad34ccfb, executed against preview
`gashochat-5roecz5dc-gashotoxics-projects.vercel.app`
(deployment `dpl_BRT2nZpu1QK55No5Xg7hAvYJVPHL`, commit `6fe8749`,
branch `feature/proxy-auth-hardening`, PR #37) using a real Clerk session JWT
minted via the Clerk Backend API and the Vercel share-link protection bypass.

Re-run any time:

```
CLERK_TOKEN=<session jwt> VERCEL_COOKIE="_vercel_jwt=<value>" \
  node scripts/media_proxy_probe.mjs <base-url> [--out <dir>] [--skip-media]
```

## Limits that shape the tunnel

| Limit | Value | Handling |
|---|---|---|
| Vercel request body | ~4.5MB | `api/chutes.ts` fails fast with 413 + "pass media inputs as URLs" (both `content-length` and measured body size are checked) |
| Function duration | 300s (Vercel Hobby max since Fluid Compute; was 60s) | `api/chutes.ts` `maxDuration: 300` — the old 60s cap killed video gen mid-relay (measured: 76s) |
| Session token lifetime | ~10 min when minted with `expires_in: 600` | long chains must re-mint; `scripts/media_proxy_probe.mjs` pre-flights and reports `blocked` instead of false 401s |

## Results (real payloads, real upstream Chutes calls)

| Path | Result | Evidence |
|---|---|---|
| TTS `vonkaiser-audiodojo.chutes.ai/speak` | **PASS** | 200, `audio/wav`, 211,244 bytes, 3.98s |
| Image edit `vonkaiser-qwen-image-edit-2511.chutes.ai/generate` (base64 PNG in JSON) | **PASS** | 200, `image/jpeg`, 2,832 bytes, 15.6s, req ~3KB |
| Video gen LTX 2.5 `vonkaiser-ltx-25-video.chutes.ai/generate` (2s, 448x256) | **PASS** | 200, `video/mp4`, 51,276 bytes, **76.0s** — only survives because maxDuration is now 300s |
| Lip sync `chutes-musetalk.chutes.ai/generate` (base64 video + audio in JSON) | **TRANSPORT PASS / UPSTREAM DEAD** | req 350,237 bytes (cap 4,500,000) forwarded and answered in 2.2s — but upstream gateway: `404 {"detail":"No matching chute found!"}` |
| BYOK `userKey` passthrough | **PASS** | invalid user key forwarded to Tavily; upstream's own `401 {"detail":{"error":"Unauthorized: missing or invalid API key."}}` passed through untouched (no `X-Proxy-Error`) |
| Boundary: no/garbage token → 401 `X-Proxy-Error: 1`; evil Origin → 403; oversize body → 413; GET /api/chutes → 405; probe GET /api/search → 200 booleans | **PASS** | `scripts/media_proxy_probe.mjs` boundary group |

## Finding: the lip-sync upstream no longer exists (product gap, not a proxy bug)

`chutes-musetalk.chutes.ai` answers `404 {"detail":"No matching chute found!"}`
for every payload shape (flat args, `input_args`-wrapped, empty body). The
platform catalog (chutes.ai/models) and vonkaiser's 12 public chutes contain
**no lip-sync/MuseTalk entry**, and `chutes.ai/app/user/chutes-musetalk` is
itself 404 — the chute was retired or left the platform. The base64 transport
itself is proven healthy (350KB body forwarded, gateway answered), so:

- **Do not** treat this as a tunnel/body-size problem; nothing about the
  request shape needs to change for small inputs.
- The lip-sync feature needs a **new upstream** (find an active lip-sync chute
  or another provider) or removal — tracked as follow-up work.
- When a working upstream returns, prefer **URL inputs** (`video_input` /
  `audio_input` already accept `https://...`) for anything beyond ~3MB of
  base64: the 4.5MB body cap leaves little headroom once JSON/base64 overhead
  (~+33%) is added. Upload to Supabase Storage and pass the URL.

## Transport guidance (for future media endpoints)

1. Keep payloads under ~3MB effective JSON (base64 inflates raw bytes by ~33%).
2. Above that: URL inputs (Supabase Storage), never base64.
3. Anything synchronous beyond ~300s cannot be a single request/response —
   it needs an async job pattern (out of scope for the current relay).
4. Binary responses (audio/image/video blobs) pass through the proxy untouched;
   SSE streams pass through too (both proven in `npm run test:api` + live).
