# Task Log

## 2026-02-16
- Add in-app camera capture option in Brand chat (quick tools → Camera) to attach photos for vision prompts. (completed)
- Add camera indicator for vision-capable models and fix camera overlay capture button visibility. (completed)
- Diagnose Vercel blank/white screen and harden environment configuration handling. (completed)

## 2026-02-15
- Fix chat code block overflow: keep bubbles within viewport and make long code scroll horizontally. (completed)
- Stop chat loading dots from persisting after stream completion. (completed)
- Prevent guest mode from attempting Supabase session upserts (avoids Failed to fetch noise). (completed)
- Fix stuck loading indicator by ending streams on finish_reason and emitting a done signal; reduce dots to 3. (completed)
- Harden mobile chat width: prevent horizontal chat scroll and enable swipe-scroll inside code blocks. (completed)

## 2026-02-12
- Add logo model picker with short names, add GLM-5, and make Brand mode vision-only with Kimi K2.5 default; document Dots OCR curl. (completed)

## 2026-02-08
- Add Brand Studio chat mode switch with Plus/Pro image tools (generate/edit) and inline media results. (completed)

## 2026-01-14
- Fix mobile UI responsiveness under 450px: prevent chat bubble clipping, reduce oversized chat text, and stop header credits/profile overlap.

## 2026-01-15
- Add close button to icon popup and theme available-credits bar. (completed)
- Improve Media prompt enhancer: enforce African American subjects when prompt includes images, cap enhanced prompt to 1000 chars, refine without changing base system prompt. (completed)
- Add aspect ratio selector for image generation and send width/height to Chutes API payload (input_args). (completed)
- Remove media watermarking and improve Media scroll/preview for tall aspect ratios. (completed)
- Ensure Magic Enhance defaults people to African American unless specified. (completed)

## 2026-01-18
- Add video frame capture from any timestamp (preview + lightbox) with edit/animate flow. (completed)
- Add MuseTalk (Mustalk) lipsync section under Media → Animator. (completed)

## 2026-02-06
- Implement LTX-2 (Chutes) integration in Media Studio: new model selection, advanced options UI, and API integration. (completed)

## 2026-02-05
- Make Media preview scroll/zoom responsive and improve onboarding guide cancel UX.
