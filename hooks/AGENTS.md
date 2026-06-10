# DOX -- hooks

**Shared React hooks**

## Files

- useCanvasEngine.ts -- Canvas zoom/pan state (zoom level, pan offset, DPR)
- useHistory.ts -- Undo/redo system (pushSnapshot, undo, redo, canUndo, canRedo)
- useLayerManager.ts -- Layer CRUD (add, remove, update, duplicate, reorder)
- useAIService.ts -- AI service integration

## Local Contracts

- useHistory: stores snapshots of layer arrays, indexed by historyIndexRef
- useLayerManager: layers stored as state, each with id, name, type, dataUrl, position, dims, optional metadata
- useCanvasEngine: manages canvas transform (pan/zoom) via requestAnimationFrame
