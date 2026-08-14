# Photoshop Corner — Major Upgrade Plan
**Date:** 2026-08-14
**Branch:** feature/photoshop-upgrade
**Goal:** Transform the Photoshop Corner from a basic editor into a professional-grade tool that works seamlessly with the platform

---

## Current State (v2.0)

**Working tools (14):** move, pan, select, crop, resize, text, brush, eraser, fill, shape, gradient, eyedropper, ai
**Working features:** layers (opacity, blend, visibility, lock), undo/redo (50 steps), filters (9 presets), adjustments (brightness/contrast/HSL/levels/blur), export (PNG/JPEG/WebP)

**Known issues:**
1. Select tool is a stub — no actual selection functionality
2. No lasso/magnetic selection
3. No transform tool (rotate, skew, distort)
4. No clone stamp / healing brush
5. No blur/sharpen tool (only global filters)
6. No history panel (only undo/redo buttons)
7. No layer effects (drop shadow, stroke, glow)
8. No rulers/guides
9. No zoom to fit / zoom to 100%
10. No canvas rotation
11. No keyboard shortcut customization
12. No brush presets (only size/hardness/opacity/flow)
13. No layer groups/folders
14. No smart objects (linked layers)
15. No export presets (only manual size entry)

---

## Upgrade Phases

### Phase 1: Core Selection & Transform (Week 1)
**Goal:** Make the select tool actually work, add transform

1. **Fix Select Tool** — implement rectangle, ellipse, lasso selection
   - Draw selection marquee on canvas
   - Marching ants animation
   - Select all/none/invert
   - Feather edges option
   - Copy/cut/paste selection to new layer

2. **Add Transform Tool** — rotate, scale, skew, distort
   - Free transform with handles
   - Numeric input for precise transforms
   - Flip horizontal/vertical
   - Rotate 90 CW/CCW
   - Perspective distort (4-point)

3. **Add History Panel** — visual undo/redo
   - Thumbnail list of history states
   - Click to jump to any state
   - Label each state with action name
   - Clear history button

### Phase 2: Brush & Paint Upgrade (Week 2)
**Goal:** Professional brush engine

4. **Brush Presets** — save/load custom brushes
   - Preset list (soft round, hard round, airbrush, texture)
   - Custom brush creation from selection
   - Brush size jitter, opacity jitter
   - Dual brush (blend two brushes)

5. **Clone Stamp / Healing Brush**
   - Clone from source point (Alt+click to set source)
   - Healing brush (blend edges automatically)
   - Spot healing (click to remove blemishes)

6. **Blur/Sharpen/Smudge Tools**
   - Blur tool (gaussian, motion, radial)
   - Sharpen tool (unsharp mask)
   - Smudge tool (finger painting)

### Phase 3: Layer Effects & Groups (Week 3)
**Goal:** Professional layer management

7. **Layer Effects (Styles)**
   - Drop shadow (offset, blur, color, opacity)
   - Stroke (outline with size, color, position)
   - Outer glow / inner glow
   - Bevel/emboss
   - Color overlay / gradient overlay

8. **Layer Groups/Folders**
   - Create group from selected layers
   - Nested groups
   - Group opacity/blend mode
   - Expand/collapse in panel

9. **Layer Masking**
   - Add layer mask (white = visible, black = hidden)
   - Paint on mask with brush
   - Gradient mask
   - Link/unlink mask from layer

### Phase 4: Canvas & Workspace (Week 4)
**Goal:** Professional workspace experience

10. **Rulers & Guides**
    - Horizontal/vertical rulers with units (px, %, in)
    - Drag from ruler to create guide
    - Snap to guides
    - Lock/hide guides
    - Guide colors

11. **Zoom & Navigation**
    - Zoom to fit (Ctrl+0)
    - Zoom to 100% (Ctrl+1)
    - Zoom to selection
    - Bird's eye view (navigator panel)
    - Canvas rotation (non-destructive)

12. **Grid & Snapping**
    - Configurable grid (size, color, subdivisions)
    - Snap to grid
    - Snap to layer edges
    - Snap to canvas center

### Phase 5: Export & Integration (Week 5)
**Goal:** Seamless platform integration

13. **Export Presets**
    - Social media presets (Instagram 1080x1080, Twitter 1200x675, etc.)
    - Blog presets (OG 1200x630, featured 1200x675, thumbnail 300x200)
    - Print presets (300dpi, CMYK simulation)
    - Batch export (all layers as separate files)
    - Export for web (optimize file size)

14. **Smart Objects (Linked Layers)**
    - Link layer to external file
    - Update linked layer when file changes
    - Embed vs link option

15. **Keyboard Shortcut Customization**
    - Remap any shortcut
    - Export/import shortcut profiles
    - Reset to defaults

---

## Technical Approach

### New Files to Create
```
components/photoshop/
├── tools/
│   ├── TransformTool.tsx          — Free transform with handles
│   ├── CloneStampTool.tsx         — Clone/healing brush
│   ├── BlurSharpenTool.tsx        — Blur, sharpen, smudge
│   └── SelectionEngine.tsx        — Selection logic (rectangle, ellipse, lasso)
├── panels/
│   ├── HistoryPanel.tsx           — Visual undo/redo panel
│   ├── LayerEffectsPanel.tsx      — Drop shadow, stroke, glow, etc.
│   ├── NavigatorPanel.tsx         — Bird's eye view
│   └── RulerGuides.tsx            — Rulers and guide management
├── hooks/
│   ├── useSelection.ts            — Selection state management
│   ├── useTransform.ts            — Transform state management
│   └── useBrushEngine.ts          — Advanced brush engine
└── utils/
    ├── selectionUtils.ts          — Selection math (marching ants, feather)
    ├── transformUtils.ts          — Transform math (matrix operations)
    └── brushPresets.ts            — Brush preset definitions
```

### Modified Files
```
components/photoshop/
├── PhotoshopEditor.tsx            — Add new tools to TOOLS array, wire new panels
├── CanvasEngine.tsx               — Add selection rendering, transform handles
├── LayerPanel.tsx                 — Add groups, effects, masking
└── tools/
    ├── BrushTool.tsx              — Add preset picker, jitter controls
    ├── SelectTool.tsx             — Replace stub with real selection
    └── StrokeSettingsPanel.tsx    — Add jitter, dual brush controls
```

### State Management
- useSelection.ts — selection path, marching ants, feather
- useTransform.ts — transform matrix, handles, rotation
- useBrushEngine.ts — brush presets, jitter, dual brush
- useHistory.ts — already exists, add history panel integration

### Canvas Operations
- Selection: draw marching ants on overlay canvas, composite with XOR
- Transform: apply matrix transform to layer data, redraw
- Clone stamp: copy pixels from source point to destination
- Blur/sharpen: convolution filters on canvas region
- Layer effects: render effects on separate canvas, composite

---

## Success Criteria

- [ ] All 15 new features work end-to-end
- [ ] No regression in existing 14 tools
- [ ] Build passes: npm run build (0 errors)
- [ ] Type check passes: npx tsc --noEmit (0 errors)
- [ ] Vercel preview deploys successfully
- [ ] User can complete a full edit workflow: open image → select → transform → paint → apply effects → export

---

## Notes

- All new features must follow the existing patterns: snapshot before mutation, ref-based keyboard handlers, canvas-space coordinates
- All AI features must be credit-gated (existing pattern)
- All manual features must be free (no API calls)
- Keep the UI minimal and dark-themed (slate/green palette)
- Performance: canvas operations must be < 16ms per frame (60fps)
