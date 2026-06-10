# DOX -- components/photoshop

**Photoshop Corner -- in-browser image editor with 14 tools**

## Purpose

Full-featured canvas image editor embedded in the Media Studio tab. Users can edit images directly in the browser -- crop, resize, paint, add text, apply filters, and use AI-powered tools.

## Ownership

- tools/ -- Individual tool components (Brush, Shape, Text, Crop, etc.)
- adjustments/ -- Filter and adjustment panels
- ai/ -- AI-powered editing tools

## Local Contracts

- Canvas rendering via CanvasEngine.tsx using HTML5 Canvas 2D API
- State: custom hooks (useCanvasEngine, useLayerManager, useHistory)
- Layers: PhotoshopLayer type with optional text/shape metadata
- Keyboard shortcuts: ref-based handler with empty deps to avoid stale closures
- Tools: 14 tools registered in keyboard handler (V/H/M/C/R/T/B/E/G/U/Y/I/K)
- All image operations require a snapshot before modification via pushSnapshot()
- Text layers store text metadata in layer.text and render live via renderTextOnCtx
- Brush system uses persistent offscreen canvas (strokeCanvas) -- no new Image() per pixel
- Adjustments: compositeAdjustment in utils/canvasFilters.ts

## Child DOX Index

- tools/AGENTS.md -- Photoshop drawing and editing tools
- adjustments/AGENTS.md -- Adjustments and filter panels
- ai/AGENTS.md -- AI-powered editing tools
