/**
 * Floor plan editor SDK — reusable Konva canvas (domain-agnostic).
 * @see docs/floor-plan-editor-sdk-architecture.md
 */

export { default as FloorPlanEditor } from './react/floor-plan-editor.jsx';
export { DefaultFloorPlanToolbar } from './react/ui/default-toolbar.jsx';
export { DefaultFloorPlanSidebar } from './react/ui/default-sidebar.jsx';
export { GlassPanel } from './react/ui/glass-panel.jsx';
export {
  EditorCanvas,
  pointerToNormalizedFromEvent,
  isCanvasBackgroundTarget,
  isShapeDrawingSurfaceTarget,
} from './react/editor-canvas.jsx';
export { useFloorPlanAnnotations } from './hooks/use-floor-plan-annotations.js';
export { useWorldViewport } from './hooks/use-world-viewport.js';
export { TOOL_IDS, DEFAULT_EDITOR_CONFIG } from './types/index.js';
export * from './core/geometry.js';
export {
  findAssociatedSpaceRegionAt,
  findLayoutMarkerTargetAt,
  isNormalizedPointInAssociatedSpaceShape,
  isNormalizedPointInShapeGeometry,
  isPointInMarkerPlacementRegions,
} from './core/space-region-hit.js';
export * from './core/viewport.js';
export * from './core/selection.js';
