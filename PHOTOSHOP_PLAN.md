# Photoshop Corner — Implementation Plan

> **Branch:** `feature/photoshop-v1`
> **Objective:** Transform the basic Media Editor into a full editing suite where images and videos generated on the platform can be edited, chained, and iterated.

---

## Architecture Overview

The current Editor has:
- A single `MediaEditControls.tsx` — upload image, type prompt, apply edit
- A `useMediaHandlers.tsx` handler — calls `chutesService.editImage()`
- `transferToEdit()` — sends generated images from other tabs to the editor
- `MediaFooterActions.tsx` — shows pipeline buttons (Edit, Animate, Download) after generation

The Photoshop Corner expands this into a proper editing workspace with:

```
MediaStudio Tab: Editor
├── Source Panel (left column)
│   ├── Upload image
│   ├── Pick from Gallery
│   ├── Pick from current generation
│   └── Frame capture from video
├── Edit Actions Panel
│   ├── Smart Edit (prompt-based — Qwen Edit)
│   ├── Remove Background
│   ├── Upscale / Enhance
│   ├── Style Transfer presets
│   └── Batch quick actions
├── Preview Panel (right column)
│   ├── Before/After split view
│   ├── Zoom controls
│   ├── Fullscreen
│   └── Download
└── Pipeline Footer
    ├── Edit Again (chain — send result back to editor)
    ├── Animate
    ├── Download
    └── Share / Gallery
```

---

## Phase 1: MediaEditControls Enhancement

### 1.1 New Edit Mode Selector
Add edit modes as radio/pill buttons:
- **Smart Edit** (current prompt-based edit via Qwen Magic Edit)
- **Remove Background** (dedicated button, uses AI to remove bg)
- **Upscale** (enhance resolution)
- **Style Transfer** (quick presets: Cyberpunk, Oil Painting, Sketch, Anime, Vintage, Neon)

### 1.2 Gallery Source Picker
Add a "Pick from Gallery" button inside Editor source panel that opens a media picker modal showing all images from history.

### 1.3 Before/After Toggle
Add a toggle/slider in the preview that lets users see the original source vs the edited result.

### 1.4 Enhanced Preview
- Show source image thumbnail beside the edit result
- Add zoom controls (fit, actual size)
- Add loading states

### 1.5 Edit Chain
- After edit completes, show an "Edit Again" button that sends the result back as the new source
- Maintain a small edit history stack (max 5) for undo

### Files to modify:
- `components/media/MediaEditControls.tsx`
- `components/media/MediaPreviewContent.tsx`
- `components/media/MediaFooterActions.tsx`
- `components/media/hooks/useMediaHandlers.tsx`
- `components/MediaStudio.tsx`

---

## Phase 2: Video Frame Editing Pipeline

### 2.1 Capture → Edit Pipeline
- Capture frame from generated video
- Send captured frame directly to Editor tab
- Edit frame with Smart Edit
- Send edited frame back to Animator as I2V source

### 2.2 Video Extend Enhancement
- Extend video from last frame currently captures frame and opens capture modal
- Should provide a direct "Edit last frame → Re-animate" option in the capture modal

### Files to modify:
- `components/media/MediaCaptureFrameModal.tsx`
- `components/media/MediaFooterActions.tsx`

---

## Phase 3: Gallery Integration

### 3.1 Gallery Item → Edit
In the Lightbox, enhance the existing "Edit" action to:
- Open the Editor tab with the gallery image pre-loaded as source
- Show the image in a before/after comparison

### 3.2 Gallery Item → Edit → Animate Pipeline
- Select a gallery image → Edit it → Animate the result — all within 3 clicks

### Files to modify:
- `components/media/MediaLightbox.tsx`
- `components/media/MediaGalleryPanel.tsx`

---

## Phase 4: Backend Service Updates

### 4.1 Edit Image Service Enhancement
Add new methods to `chutes.ts`:
- `removeBackground(image_b64)` — call vonkaiser-qwen-image-edit with remove bg prompt
- `upscaleImage(image_b64)` — call appropriate endpoint for upscaling

### 4.2 Credit Cost Updates
Add costs for new edit operations.

### Files to modify:
- `services/chutes.ts`
- `services/creditCosts.ts`

---

## Phase 5: Polish & Verify

### 5.1 Error States
- Show meaningful error messages for each edit mode
- Handle API failures gracefully

### 5.2 Loading States
- Smooth progress indicators for each edit operation
- Prevent double-clicks

### 5.3 TypeScript
- Ensure all types are correct
- Build must pass with 0 errors

---

## File Change Summary

| File | Change |
|------|--------|
| `components/media/MediaEditControls.tsx` | Add mode selector, gallery picker, edit chaining |
| `components/media/MediaPreviewContent.tsx` | Add before/after toggle, zoom controls |
| `components/media/MediaFooterActions.tsx` | Add "Edit Again" for chaining |
| `components/media/hooks/useMediaHandlers.tsx` | Add new edit mode handlers |
| `components/MediaStudio.tsx` | Wire new editor features, state management |
| `components/media/MediaLightbox.tsx` | Enhanced edit actions from gallery |
| `components/media/MediaCaptureFrameModal.tsx` | Direct edit-then-animate option |
| `services/chutes.ts` | Add new edit methods |
| `services/creditCosts.ts` | Add costs for new edit operations |
