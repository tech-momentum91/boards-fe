/**
 * Geometry helpers — normalized 0–1 relative to image bounds.
 * Reuses shared math from layout-annotation; adds bbox / hit helpers for the editor.
 */

export {
  polygonAreaFromNormalized,
  polygonCentroidNormalized,
  polylineLengthFromNormalized,
  polylineMidAnchorNormalized,
  rectangleAreaFromNormalized,
  rectangleCenterNormalized,
} from '@/utils/layout-annotation-geometry';

/** @param {number} v */
export function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

/**
 * @param {number[]} flat - normalized [x,y,...]
 * @param {number} imageW
 * @param {number} imageH
 * @returns {number[]}
 */
export function flatNormalizedToWorld(flat, imageW, imageH) {
  const out = [];
  if (!flat?.length) return out;
  for (let i = 0; i < flat.length; i += 2) {
    out.push(flat[i] * imageW, flat[i + 1] * imageH);
  }
  return out;
}

/**
 * @param {{ type: string, points?: number[], x?: number, y?: number, width?: number, height?: number }} ann
 * @returns {{ minX: number, minY: number, maxX: number, maxY: number } | null}
 */
export function boundingBoxNormalized(ann) {
  if (!ann?.type) return null;
  if (ann.type === 'polygon' || ann.type === 'polyline') {
    const pts = ann.points;
    if (!pts?.length) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      minX = Math.min(minX, pts[i]);
      minY = Math.min(minY, pts[i + 1]);
      maxX = Math.max(maxX, pts[i]);
      maxY = Math.max(maxY, pts[i + 1]);
    }
    return { minX, minY, maxX, maxY };
  }
  if (ann.type === 'rectangle') {
    const { x = 0, y = 0, width = 0, height = 0 } = ann;
    return { minX: x, minY: y, maxX: x + width, maxY: y + height };
  }
  if (ann.type === 'circle') {
    const { x = 0, y = 0, radiusX = 0, radiusY = 0 } = ann;
    return { minX: x - radiusX, minY: y - radiusY, maxX: x + radiusX, maxY: y + radiusY };
  }
  if (ann.type === 'point') {
    const { x = 0, y = 0 } = ann;
    return { minX: x, minY: y, maxX: x, maxY: y };
  }
  return null;
}

/**
 * Axis-aligned rect intersect (normalized space).
 * @param {{ minX: number, minY: number, maxX: number, maxY: number }} a
 * @param {{ minX: number, minY: number, maxX: number, maxY: number }} b
 */
export function normalizedRectsIntersect(a, b) {
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
}

/**
 * @param {number} ax normalized
 * @param {number} ay normalized
 * @param {number} bx normalized
 * @param {number} by normalized
 * @param {number} imageW
 * @param {number} imageH
 */
export function distanceNormPx(ax, ay, bx, by, imageW, imageH) {
  const px = (ax - bx) * imageW;
  const py = (ay - by) * imageH;
  return Math.hypot(px, py);
}
