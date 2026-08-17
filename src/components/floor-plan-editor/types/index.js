/**
 * Shared constants for the floor plan editor (JSDoc shapes — see docs/floor-plan-editor-sdk-architecture.md).
 */

/** @typedef {'select' | 'hand' | 'polygon' | 'polyline' | 'rectangle' | 'circle' | 'point' | 'pen'} ToolId */

export const TOOL_IDS = {
  SELECT: 'select',
  HAND: 'hand',
  POINT: 'point',
  PEN: 'pen',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  POLYGON: 'polygon',
  POLYLINE: 'polyline',
  DOWNLOAD: 'download',
};

export const POINT_TYPES = {
  CORNER: 'corner',
  CURVE: 'curve',
};

export const DEFAULT_EDITOR_CONFIG = {
  minZoom: 0.05,
  maxZoom: 8,
  zoomStep: 1.15,
  gridSize: 40,
  showGrid: true,
  snapToGrid: false,
  enableRotation: false,
  debounceMs: 0,
  maxHistory: 100,
  locale: 'en',
};
