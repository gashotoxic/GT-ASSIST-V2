# DOX -- types

**TypeScript type definitions**

## Purpose

Central type definitions for the entire app. Keeps types separate from implementation for easy reference.

## Files

- types.ts -- App-level types (ImageGenRequest, ImageEditRequest, BrandConfig, etc.)
- photoshop.ts -- Photoshop-specific types (PhotoshopLayer, PhotoshopTool, CanvasState, ShapeSettings, GradientSettings, BrushSettings, ColorState, LayerType, BlendMode)

## Local Contracts

- All UI types defined here -- no inline type definitions in components
- PhotoshopLayer has optional text and shape fields for metadata layers
- TextLayerData defined in components/photoshop/tools/textUtils.ts (not types/)
