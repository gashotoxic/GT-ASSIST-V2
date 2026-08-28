# GT-ASSIST-V2 — Project Progress Report
**Generated:** 2026-08-15 · **Branch:** feature/photoshop-upgrade · **Worktree:** clean
**19 commits ahead of main** · **31 files changed vs main** · Preview deployed

---

## 1. WHAT'S DONE ✓

### A. Model Catalog (live-synced with Chutes API)
- Catalog matches the live kllm.chutes.ai catalog exactly (14 LLMs now)
- Added: Kimi K3 (vision), DeepSeek V4 Flash, Qwen 3 Thinking 235B, Mistral Nemo, GLM 5.1/5.2, Qwen 3.8 27B (vision, newest)
- Removed retired: Kimi K2.5, GLM 5 (no longer on Chutes)
- Display names strip the "-TEE" suffix; API calls always send full -TEE IDs (no more errors)
- Delta naming explicit: DeepSeek V4 Flash (Pro pending), GLM 5.3 pending
- Credit costs centralized in creditCosts.ts

### B. LTX 2.5 Video Generation (was broken → fixed)
- **Root cause found & eliminated:** stage_2_sigmas default was not strictly decreasing → every T2V request 400'd; auto_duration + num_frames conflicted.
- Fixed defaults + added sigma-schedule validator guard
- **Verified live:** exact app request shape now accepted by vonkaiser-ltx-25 endpoint
- New endpoint, new API format (distilled 8+3 step pipeline, no CFG params)

### C. Photoshop Corner — MAJOR UPGRADE (5 phases + 2 audits, all complete)
| Phase | Delivered |
|-------|-----------|
| 1 | Real Selection (rect/ellipse/lasso, marching ants, copy/cut/paste), Transform tool (rotate/scale/flip/perspective), History panel (thumbnails, jump-to) |
| 2 | Brush presets (6 builtin + custom/localStorage + jitter), Clone stamp + Healing brush, Retouch (blur/sharpen/smudge) |
| 3 | Layer effects (shadow/stroke/glow), Layer groups (drag-to-organize, collapse), Layer masks (paint-on-mask) |
| 4 | Rulers + draggable guides + snapping, Navigator mini-map, Custom grid, Ctrl+0/Ctrl+1 zoom |
| 5 | 12 export presets (social/blog/print), fit/fill/stretch, batch layer export, clipboard copy, Send-to-Media-Studio |

**Audit fixes (2 subagent passes + manual):**
- 7 bugs from render/layer/history audit (nested-group recursion, stroke effects, orphaned children, cycle guard, rAF leaks)
- **Text tool fixed** — canvas click now opens dialog at click position (was an empty stub), layers created with layerType
- **Shape tool fixed** — works on blank layers (was silently returning without dataUrl)
- **Eraser fixed** — eliminated async stroke race condition (stale canvas commit on quick strokes)
- Pre-existing build brokenness cleaned: tsc went from errors → 0 errors

### D. Infrastructure / Delegation
- Subagent iteration cap raised 25→60 + timeout 900→1800 (across ALL agent profiles: GIMA, MUGO, VICTOR, SCOUT, JOBSCOUT; AEGIS had no delegation block)
- Gateway restarted to apply configs

---

## 2. WHAT'S NOT DONE YET (known gaps)

### Known
- [ ] Clone + Retouch tools still have the theoretical stale-canvas race (brush/eraser fixed, same async pattern not yet applied to these two)
- [ ] DeepSeek V4 **Pro** + GLM **5.3** — upcoming models, reserve slots (not yet on Chutes)
- [ ] Batch/MediaStudio pipeline: "Send to Media Studio" wired but end-to-end QA of the full flow not done
- [ ] LTX 2.5 still intermittently 429s ("Infrastructure at maximum capacity" — Chutes-side, no client fix; retry logic not yet added)
- [ ] Full Photoshop QA on preview: every tool/shortcut/panel not yet manually test-clicked by user

### Phase 2 of the plan (future roadmap — was in PHOTOSHOP_UPGRADE_PLAN.md)
- [ ] Rulers/guides polish, smart objects (linked layers), keyboard shortcut customization
- [ ] Remaining advanced exports (CMYK/print 300dpi batch presets were partially covered)
- [x] Everything in the original 5-phase plan that was defined is now shipped

---

## 3. WHAT COMES NEXT

1. **User QA pass on preview** → fix whatever surfaces (highest priority)
2. **Clone/Retouch race fix** (small, in the backlog)
3. **Pull request** — feature/photoshop-upgrade → develop → main (await user approval; nothing is merged to main yet)
4. **Keep catalog in sync** — add DeepSeek V4 Pro / GLM 5.3 when they drop on Chutes
5. **LTX 2.5 retry/backoff** for the intermittent 429

---

## 4. CODE QUALITY TOOLING — HOW WE USE CODERABBIT
(see dedicated section below; configuration at .coderabbit.yaml, committed)

---

## 5. KEY DECISIONS WORTH REMEMBERING
- Model display vs API ID split (strip TEE for display, keep for API)
- Chutes API = source of truth for model catalog
- Delegation does NOT fall back to mimo/bridge
- Performance baseline: no SSE4.2/POPCNT on host — Python/Node only, no compiled binaries
- Bump-delegation-cap pattern proved necessary; verify ALL subagent output independently
