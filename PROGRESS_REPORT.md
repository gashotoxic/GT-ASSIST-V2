# GT-ASSIST-V2 — Project Progress Report
**Last updated:** 2026-08-30 · **Branch:** main (`0d5ab00`)
**State:** All recent work merged to `main` and live on create.gashotech.com (Vercel prod deployment READY, 0 runtime errors)

---

## 1. WHAT'S DONE ✓

### A. Model Catalog (live-synced with Chutes API)
- Catalog matches the live `llm.chutes.ai` catalog exactly (13-14 LLMs)
- Added: Kimi K3 (vision), DeepSeek V4 Flash, Qwen 3 Thinking 235B, Mistral Nemo, GLM 5.1/5.2, Qwen 3.8 27B (vision)
- Removed retired: Kimi K2.5, GLM 5 (no longer on Chutes)
- Display names strip the `-TEE` suffix; API calls send full `-TEE` IDs
- Tier naming explicit: "DeepSeek V4 Flash" (Pro pending), GLM 5.3 pending
- Credit costs centralized in `creditCosts.ts`

### B. LTX Video — LTX 2.5 is now the ONLY LTX model ✅
- **LTX 2.3 removed entirely** (PR #7, merged 2026-08-30): deleted `chutesLtx2.ts` + `Ltx23AdvancedOptions.tsx`, removed model entries, `ltx2Params`, interface, and routing. ~561 lines removed.
- **LTX 2.5 live and stable:** endpoint `vonkaiser-ltx-25-video.chutes.ai/generate`, distilled 8+3 step, i2v + t2v.
  - Fixed the `stage_2_sigmas` non-strictly-decreasing bug that caused every 400
  - Sigma schedule validator guard added
  - Auto-duration + num_frames conflict resolved
  - Verified live against the endpoint

### C. Photoshop Corner — MAJOR UPGRADE (5 phases + audits, MERGED)
| Phase | Delivered |
|-------|-----------|
| 1 | Real Selection (rect/ellipse/lasso, marching ants, copy/cut/paste), Transform tool, History panel |
| 2 | Brush presets (6 builtin + custom/localStorage + jitter), Clone stamp + Healing brush, Retouch (blur/sharpen/smudge) |
| 3 | Layer effects (shadow/stroke/glow), Layer groups (drag-to-organize), Layer masks (paint-on-mask) |
| 4 | Rulers + draggable guides + snapping, Navigator mini-map, Custom grid, Ctrl+0/Ctrl+1 zoom |
| 5 | 12 export presets (social/blog/print), fit/fill/stretch, batch layer export, clipboard, Send-to-Media-Studio |

**Audit fixes:** nested-group recursion, stroke edge detection, orphaned group children, cycle guard, rAF leaks, Text tool (was empty stub), Shape tool (blank-layer), Eraser race condition.

### D. SEO (merged 2026-08-28)
- `sitemap.xml`, `robots.txt`, `llms.txt` + meta tags/JSON-LD in `index.html` → serves on create.gashotech.com

### E. Code Quality Cleanup (PR #8, merged 2026-08-30)
- Typed **54 of 62** `: any` declarations across 20 files → 8 intentional `any` remain (Clerk user, rumark AST, etc.)
- Files: supabase.ts (16), chutes.ts (9), useMediaHandlers (6), chat hooks, small components
- `tsc` 0 errors, build 0 errors, eslint unchanged

### F. Infrastructure / Delegation
- Subagent delegation **fixed** to use mimo-v2.5-pro (2026-08-30) — was broken with "Invalid API response" (Hermes parser bug with streaming reasoning tokens). Test passed (35s), then used successfully for the code-quality subagents.
- Iteration cap raised 25→60, timeout 900→1800 across profiles

---

## 2. WHAT'S NOT DONE YET (known gaps)

### Code / product
- [ ] **Brand chat: auto-save generated images to gallery + full-screen view + Send to Animate button** (feature request, logged in TODO)

### Known
- [ ] Clone + Retouch tools still have theoretical stale-canvas race (same async pattern as eraser — smaller severity)
- [ ] DeepSeek V4 **Pro** + GLM **5.3** — upcoming, reserve slots (not yet on Chutes)
- [ ] LTX 2.5 still intermittently 429s (Chutes-side "Infrastructure at maximum capacity"; retry/backoff not yet added)
- [ ] Full manual QA of every Photoshop tool/shortcut/panel still pending

### Docs / infra
- [ ] gasho.tech llms.txt — could list all 38 blog posts dynamically (currently 4 samples)
- [ ] gasho.tech sitemap.ts — could add create.gashotech.com entry
- [ ] SSR migration for real SEO (Vite SPA → Next.js) — plan in `SSR_MIGRATION_PLAN.md`, not started

---

## 3. WHAT COMES NEXT (priority)
1. **Full user QA on production** → fix whatever surfaces
2. **Brand chat image-to-gallery + Send to Animate** — logged feature
3. **Clone/Retouch race fix** (small, backlog)
4. **Keep catalog in sync** — add DeepSeek V4 Pro / GLM 5.3 when they drop
5. **LTX 2.5 retry/backoff** for intermittent 429

---

## 4. KEY DECISIONS WORTH REMEMBERING
- Model display vs API ID split (strip `-TEE` from display, keep full `-TEE` in API calls)
- Chutes API = source of truth for model catalog
- LTX 2.5 is the sole LTX model; LTX 2.3 removed (PR #7)
- Delegation uses mimo-v2.5-pro (works); Hermes streaming-parser bug is upstream (issue filed)
- Performance baseline: no SSE4.2/POPCNT on host — Python/Node only
- Always verify ALL subagent output independently (tsc + build + grep)
