# Photoshop Corner v2 — Comprehensive Feature Plan

> **Branch:** `feature/photoshop-v2`
> **Focus:** Client-side manual image editing with optional AI enhancements
> **Core Philosophy:** All editing happens in the browser, zero API calls for manual tools. AI features are optional add-ons.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Photoshop Editor                     │
├──────────┬────────────────────────┬─────────────────────┤
│  TOOLBAR  │       CANVAS          │     PANELS          │
│ (left)   │     (center)          │     (right)         │
│          │                       │                     │
│ Select   │   Zoom: 100%        │ Layers              │
│ Crop     │   Pan: scroll       │ Properties          │
│ Resize   │   Grid overlay      │ History             │
│ Text     │   Guides            │                     │
│ Brush    │                     │                     │
│ Shapes   │                     │  ┌─────────────┐    │
│ Eraser   │                     │  │ AI Tools    │    │
│ Fill     │                     │  │ (optional)  │    │
│ Eyedrop  │                     │  └─────────────┘    │
├──────────┴────────────────────────┴─────────────────────┤
│   MENU BAR: File | Edit | Filter | View | AI Tools      │
│   STATUS BAR: Zoom % | Canvas Size | Layer Info         │
└─────────────────────────────────────────────────────────┘
```

---

## Feature Catalog

### 1. CANVAS ENGINE (Foundation)
- HTML5 Canvas rendering with WebGL fallback
- Zoom: 10%–3200% with smooth scroll (+/- buttons + Ctrl+Scroll)
- Pan: Click-drag canvas / scroll bars
- Grid overlay (rule of thirds, golden ratio, square)
- Rulers (top + left edge)
- Snap-to-grid guides

### 2. LAYERS SYSTEM (Core)
- **Add layer** — blank, duplicate current, from file
- **Reorder** — drag & drop layer stack
- **Visibility** — eye toggle per layer
- **Opacity** — slider 0–100% per layer
- **Blend modes** — Normal, Multiply, Screen, Overlay, Darken, Lighten, Color Dodge, Difference, Hard Light
- **Lock** — prevent edits to locked layers
- **Merge** — merge visible / merge down / flatten
- **Delete** — confirm delete layer
- **Layer thumbnails** — 64×64 preview in panel
- **Layer groups** — folder organization for complex projects

### 3. SELECTION TOOLS
- **Rectangular Marquee** — select rectangle area
- **Elliptical Marquee** — select circle/ellipse area
- **Lasso** — freehand selection
- **Magic Wand** — select by color similarity (tolerance slider)
- **Invert Selection**
- **Feather** — soft edges on selection (radius slider)
- **Move Selection** — reposition selection outline
- **Deselect / Select All**

### 4. CROP TOOL
- **Freeform** — drag corners/resize
- **Aspect Ratio presets:**
  - Original (no crop)
  - 1:1 (Square — Instagram)
  - 16:9 (Widescreen — YouTube)
  - 4:3 (Classic photo)
  - 3:2 (35mm film)
  - 9:16 (Story — TikTok/Reels)
  - 1200×630 (OG Card — blog export)
  - Custom (input W×H)
- **Rule of thirds overlay** during crop
- **Straighten** — rotation slider during crop
- **Crop to selection** — use current selection as crop boundary
- **Cancel / Apply** crop

### 5. RESIZE & TRANSFORM
- **Resize Canvas** — change canvas dimensions
- **Resize Image** — scale all layers (preserve aspect ratio toggle)
- **Presets:**
  - OG Card (1200×630)
  - Blog Inline (800×600)
  - Instagram Post (1080×1080)
  - Twitter/X Card (1200×675)
  - Custom W×H
- **Rotate** — 90° CW / 90° CCW / 180° / Free rotate slider
- **Flip** — Horizontal / Vertical
- **Distort** — free transform handles (corner drag)
- **Interpolation** — Nearest Neighbor / Bilinear / Bicubic (quality toggle)

### 6. TEXT TOOL
- **Add text** — click to place, type inline
- **Font family** — system fonts dropdown (Arial, Helvetica, Georgia, Times, Courier, Impact, Comic Sans, Montserrat, Inter)
- **Font size** — slider + input (8px–500px)
- **Font weight** — light / regular / bold / black
- **Font style** — normal / italic
- **Text color** — color picker + hex input
- **Background color** — text highlight/background
- **Opacity** — text layer opacity
- **Alignment** — left / center / right / justify
- **Line spacing** — slider
- **Character spacing** — slider (tracking)
- **Text transform** — uppercase / lowercase / capitalize
- **Text on path** — curve text along a drawn path (advanced)
- **Edit existing text** — double-click text layer to edit
- **Move text** — drag to reposition
- **Text bounding box** — resize box re-wraps text

### 7. DRAWING TOOLS
- **Brush tool:**
  - Size slider (1–500px)
  - Hardness slider (0–100%)
  - Opacity slider (0–100%)
  - Flow slider (0–100%)
  - Color picker
  - Brush presets: Round, Soft Round, Chalk, Marker, Airbrush, Calligraphy
  - Tablet pressure sensitivity support (Wacom)
- **Pencil tool** — 1px hard edge, aliased
- **Eraser tool** — brush-like eraser (size, hardness, opacity)
- **Fill tool** — flood fill (paint bucket) with tolerance
- **Gradient tool:**
  - Linear gradient
  - Radial gradient
  - Gradient editor (multi-stop color picker)
- **Shape tools:**
  - Rectangle (fill + stroke options)
  - Rounded Rectangle (corner radius)
  - Ellipse/Circle
  - Line (width, arrowheads start/end)
  - Polygon (click-to-add points)
  - Arrow (configurable heads)
- **Smoothing** — stroke smoothing slider (anti-aliasing)

### 8. ADJUSTMENTS (Pixel-level)
- **Brightness / Contrast**
- **Hue / Saturation / Lightness**
- **Color Balance** — shadows / midtones / highlights
- **Levels** — histogram-based input/output sliders
- **Curves** — bezier curve adjustment (advanced)
- **Exposure**
- **Vibrance**
- **Temperature / Tint**
- **Sharpness / Blur:**
  - Gaussian Blur (radius slider)
  - Motion Blur (angle + distance)
  - Sharpen (amount slider)
  - Unsharp Mask (amount + radius + threshold)
- **Noise:**
  - Add Noise (amount)
  - Denoise / Reduce Noise
  - Median filter
- **Threshold** — convert to high-contrast B&W
- **Posterize** — reduce color levels
- **Desaturate**

### 9. FILTERS (Preset effects)
- **Classic:**
  - Grayscale
  - Sepia
  - Invert
  - Binary (threshold)
- **Artistic:**
  - Oil Painting effect
  - Pencil Sketch
  - Charcoal
  - Watercolor
  - Pixelate (pixel size slider)
  - Mosaic
  - Emboss
  - Edge Detect (Sobel/Canny)
- **Photo:**
  - Vintage / Retro
  - Vignette
  - Glow
  - Drop Shadow
  - Glow / Bloom
- **Custom filter** — combine multiple adjustments

### 10. COLOR TOOLS
- **Color Picker** — full spectrum picker
- **Eyedropper** — pick color from canvas
- **Palette** — recent colors / swatches / color history
- **Hex / RGB / HSL** input
- **Color Harmonies** — complementary, triadic, analogous generator

### 11. HISTORY & UNDO
- **Undo/Redo** — Ctrl+Z / Ctrl+Shift+Z
- **History panel** — full list of actions (last 50+)
- **Non-linear history** — click any history state to jump
- **Clear history** button

### 12. FILE OPERATIONS
- **Open** — from local file (PNG, JPEG, WebP, GIF, BMP, SVG)
- **Open from Gallery** — pick from media history
- **Save** — save project file (JSON with layer data)
- **Export:**
  - PNG (lossless)
  - JPEG (quality slider 0–100)
  - WebP (quality slider)
  - BMP
  - GIF (animated? maybe v2)
  - SVG (trace bitmap? maybe v2)
- **Export for Blog** — direct integration with blogImageExport.ts
- **Layer presets** — save/load layer configurations

### 13. AI TOOLS (Optional, API-powered)
These sit in a separate panel, toggled on when user wants AI assistance:
- **Smart Edit** — prompt-based edit (existing Qwen Magic Edit)
- **Remove Background** — one-click
- **Upscale / Enhance** — AI upscaling
- **Style Transfer** — presets (Cyberpunk, Oil Painting, Sketch, etc.)
- **Generate Fill** — select area, describe what to fill
- **Text to Image** — generate new layer from prompt

---

## Implementation Phases

### Phase 0: Foundation (Week 1–2)
- New branch: `feature/photoshop-v2`
- Create canvas engine wrapper (`CanvasEngine.tsx`)
- Zoom/pan controls
- Image loading (from file, from gallery)
- Basic undo/redo stack
- Layer system (add, delete, reorder, visibility, opacity)
- Separate from MediaStudio into its own page/view

**Files:**
- `components/photoshop/PhotoshopEditor.tsx`
- `components/photoshop/CanvasEngine.tsx`
- `components/photoshop/LayerPanel.tsx`
- `components/photoshop/HistoryPanel.tsx`
- `hooks/useCanvasEngine.ts`
- `hooks/useLayerManager.ts`
- `hooks/useHistory.ts`
- `types/photoshop.ts`

### Phase 1: Tools (Week 2–3)
- Crop tool with aspect ratio presets
- Resize & transform
- Selection tools (rect, elliptical, lasso)
- Move tool
- Export dialog

**Files:**
- `components/photoshop/tools/CropTool.tsx`
- `components/photoshop/tools/ResizeDialog.tsx`
- `components/photoshop/tools/SelectTool.tsx`
- `components/photoshop/ExportDialog.tsx`

### Phase 2: Drawing (Week 3–4)
- Brush, eraser, fill, gradient
- Shape tools (rect, ellipse, line, arrow, polygon)
- Color picker
- Stroke settings panel

**Files:**
- `components/photoshop/tools/BrushTool.tsx`
- `components/photoshop/tools/ShapeTool.tsx`
- `components/photoshop/tools/ColorPicker.tsx`
- `components/photoshop/tools/GradientTool.tsx`

### Phase 3: Text & Typography (Week 4–5)
- Text tool (add, edit, style)
- Font loading
- Text layer rendering on canvas
- Text bounding box interaction

**Files:**
- `components/photoshop/tools/TextTool.tsx`
- `components/photoshop/TextProperties.tsx`

### Phase 4: Adjustments & Filters (Week 5–6)
- Brightness/contrast/saturation
- Blur/sharpen
- Color balance, levels, curves
- Filter presets (grayscale, sepia, vintage, etc.)
- Apply adjustments as non-destructive layers

**Files:**
- `components/photoshop/adjustments/BrightnessContrast.tsx`
- `components/photoshop/adjustments/HSL.tsx`
- `components/photoshop/adjustments/Levels.tsx`
- `components/photoshop/adjustments/Curves.tsx`
- `components/photoshop/filters/FilterGallery.tsx`
- `utils/canvasFilters.ts`

### Phase 5: AI Integration (Week 6–7)
- AI tools panel (Smart Edit, Remove BG, Upscale, Style Transfer)
- Generate Fill (select area → AI fills)
- Toggle between manual and AI mode
- Credit cost tracking for AI tools

**Files:**
- `components/photoshop/AIToolsPanel.tsx`
- `services/photoshopAIService.ts`

### Phase 6: Polish (Week 7–8)
- Keyboard shortcuts (S for select, B for brush, T for text, V for move, etc.)
- Performance optimization (canvas tiling for large images)
- Mobile responsiveness
- Error boundaries
- Loading states
- Dark/light theme consistency
- Integration with MediaStudio (pipeline: generate → photoshop → export)
- Gallery integration (edit any gallery image)

---

## Navigation & UI Flow

```
MediaStudio Nav Tabs: [ Image ] [ Edit ] [ Video ] [ Gallery ] [ ✏️ Photoshop ]

Clicking "Photoshop" tab opens the full editor workspace:
┌─────────────────────────────────────────────────────────┐
│ [File] [Edit] [Filter] [View] [AI Tools]  [?] [X]     │
├──────────┬──────────────────────────────────────────────┤
│ Tools    │ Canvas Area                    │ Layers      │
│ ┌──────┐ │ ┌────────────────────────┐    │ ┌────────┐ │
│ │Move  │ │ │                        │    │ │Layer 3 │ │
│ │Select│ │ │   [image here]         │    │ │Layer 2 │ │
│ │Crop  │ │ │                        │    │ │Layer 1 │ │
│ │Resize│ │ └────────────────────────┘    │ └────────┘ │
│ │Text  │ │                                │ Properties│
│ │Brush │ │  Zoom: 100%  [─○───────●]     │ ┌────────┐ │
│ │Eraser│ │                                │ │Color   │ │
│ │Fill  │ │                                │ │Size    │ │
│ │Shape │ │                                │ │Opacity │ │
│ │...   │ │                                │ └────────┘ │
│ └──────┘ │                                │ History    │
│           │                                │ ┌────────┐ │
│           │                                │ │Undo    │ │
│           │                                │ │Redo    │ │
│           │                                │ │Step 3  │ │
│           │                                │ └────────┘ │
└───────────┴────────────────────────────────┴────────────┘
```

---

## Tech Stack

- **Canvas rendering:** HTML5 Canvas 2D API + `OffscreenCanvas` for workers
- **Filters:** WebGL shaders via `glfx.js` or custom compute shaders
- **State management:** React Context + useReducer for editor state
- **Layers:** Canvas per layer (offscreen canvases), composited on render
- **History:** Snapshot-based (store ImageData diffs or full snapshots)
- **Undo:** Command pattern with serialized layer state
- **File loading:** FileReader API → Image → OffscreenCanvas
- **Export:** Canvas.toBlob() for PNG/JPEG/WebP, Canvas.toDataURL() for BMP

---

## Key Design Decisions

1. **Every layer = its own canvas** — composite via `ctx.drawImage()` onto a master canvas. This enables non-destructive editing.
2. **History stores serialized layer state** — JSON with base64 image data. Debounced to prevent memory bloat.
3. **Filters are applied destructively** (on the layer canvas) unless we implement adjustment layers (v2 feature).
4. **Crop is non-destructive** — crop boundary is stored as metadata, applied on export.
5. **Text is rendered as canvas text** — no DOM overlay. Text layers store font/color/size metadata and re-render on edit.
6. **AI tools are in a separate panel** — toggled on/off. Each AI call uses credits.
7. **Mobile support** — responsive layout with collapsible panels (v2).

---

## File Tree

```
components/photoshop/
├── PhotoshopEditor.tsx          # Main editor container
├── CanvasEngine.tsx             # Canvas wrapper with zoom/pan
├── LayerPanel.tsx               # Layer list + controls
├── HistoryPanel.tsx             # Undo/redo history
├── ColorPicker.tsx              # Full color picker
├── ExportDialog.tsx             # Export/save dialog
├── PropertiesPanel.tsx          # Context-sensitive properties
├── AIToolsPanel.tsx             # Optional AI features
├── Toolbar.tsx                  # Left toolbar
├── MenuBar.tsx                  # Top menu bar
├── StatusBar.tsx                # Bottom status bar
├── tools/
│   ├── CropTool.tsx
│   ├── SelectTool.tsx
│   ├── BrushTool.tsx
│   ├── EraserTool.tsx
│   ├── FillTool.tsx
│   ├── ShapeTool.tsx
│   ├── TextTool.tsx
│   ├── GradientTool.tsx
│   ├── ResizeDialog.tsx
│   └── MoveTool.tsx
├── adjustments/
│   ├── BrightnessContrast.tsx
│   ├── HSL.tsx
│   ├── Levels.tsx
│   ├── Curves.tsx
│   ├── BlurSharpen.tsx
│   └── Noise.tsx
└── filters/
    ├── FilterGallery.tsx
    └── ArtisticFilters.tsx
hooks/
├── useCanvasEngine.ts
├── useLayerManager.ts
├── useHistory.ts
├── useToolManager.ts
├── useKeyboardShortcuts.ts
└── usePhotoshopAI.ts
utils/
├── canvasFilters.ts             # Canvas pixel manipulation
├── canvasDrawing.ts             # Brush strokes, shapes
├── canvasExport.ts              # Export logic
├── canvasTransform.ts           # Scale, rotate, flip
├── colorUtils.ts                # Color conversion/parsing
└── imageLoader.ts               # File reading
types/
└── photoshop.ts                 # All photoshop types
```

---

## Estimated Effort

| Phase | Effort | Key Deliverables |
|-------|--------|-----------------|
| 0: Foundation | 2 weeks | Canvas engine, layers, undo/redo, basic UI |
| 1: Tools | 1 week | Crop, resize, selection, export |
| 2: Drawing | 1 week | Brush, shapes, color picker |
| 3: Text | 1 week | Text tool, font handling |
| 4: Adjustments | 1.5 weeks | Filters, color adjustments |
| 5: AI | 0.5 weeks | AI panel integration |
| 6: Polish | 1 week | Shortcuts, performance, integration |
| **Total** | **~8 weeks** | Full Photoshop Corner |

---

## First Steps (Phase 0 — Let's start here)

1. Create `feature/photoshop-v2` branch
2. Define types: `types/photoshop.ts`
3. Build `useCanvasEngine` hook (zoom, pan, canvas state)
4. Build `useLayerManager` hook (layer CRUD)
5. Build `useHistory` hook (undo/redo with snapshot)
6. Build `CanvasEngine.tsx` component
7. Build `LayerPanel.tsx` with basic controls
8. Build `PhotoshopEditor.tsx` as the container
9. Add "Photoshop" tab to MediaStudio nav
10. Test — load an image, add/delete layers, undo/redo
