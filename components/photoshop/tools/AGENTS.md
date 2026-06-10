# DOX -- components/photoshop/tools

**Photoshop drawing and editing tools**

## Purpose

Individual tool UI panels that appear in the right sidebar when a tool is selected.

## Tools

| Key | Tool | Component |
|-----|------|-----------|
| V | Move | CanvasEngine mouse handlers |
| H | Pan | CanvasEngine startPan/doPan/endPan |
| M | Select | SelectTool |
| C | Crop | CropTool (7 presets) |
| R | Resize | ResizeDialog (8 presets) |
| T | Text | TextTool + TextInputDialog |
| B | Brush | BrushTool (arc-based, persistent canvas) |
| E | Eraser | BrushTool (destination-out mode) |
| G | Fill | BrushTool (fillCanvas) |
| U | Shape | ShapeTool (6 shapes) |
| Y | Gradient | GradientTool (3 types) |
| I | Eyedropper | (placeholder) |
| K | AI | AIPanel |

## Local Contracts

- Tools are pure UI panels -- actual canvas operations happen in PhotoshopEditor
- Color picker: ColorPicker.tsx (HSB square, hue bar, alpha bar, hex input, 12 swatches)
- Brush: colorUtils.ts provides fillCanvas(dims, color) and drawBrushStroke(ctx, x1, y1, x2, y2, size, hardness, opacity, color, mode)
- Text: textUtils.ts provides TextLayerData interface, renderTextOnCtx, renderTextToDataUrl, rerenderTextLayer
- Shapes: shapeUtils.ts provides drawShapeOnCanvas and drawGradientOnCanvas
