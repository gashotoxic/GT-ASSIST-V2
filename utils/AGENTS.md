# DOX -- utils

**Utility functions**

## Files

- canvasFilters.ts -- Image processing functions (brightness/contrast, HSL, levels, blur/sharpen, 8 filter presets)
- blogImageExport.ts -- Blog image export utilities (OG Card, Blog Inline presets)

## Local Contracts

- canvasFilters: all functions work on canvas pixel data via ImageData
- compositeAdjustment(canvas, type, params) returns dataUrl -- main entry point for filter application
- Blog export presets: OG Card (1200x630) and Blog Inline (800xauto)
