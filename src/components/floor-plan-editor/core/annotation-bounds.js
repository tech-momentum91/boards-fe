import {
  SERVER_SUBSPACE_PIN_SOURCE,
  SUBSPACE_LAYOUT_PENDING_SOURCE,
} from '@/constants/layout/annotation-sources';

import { clamp01 } from './geometry.js';
import {
  isNormalizedPointInShapeGeometry,
  sampleClosedBezierOutlineNormalized,
} from '@/components/floor-plan-editor/core/space-region-hit.js';

/**
 * Pixel-space bounds and centers for floor-plan annotations (normalized coords × image size).
 */

/**
 * @param {object | null | undefined} ann
 * @returns {{ minX: number, minY: number, width: number, height: number } | null}
 */
export function getNormalizedAnnotationBBox(ann) {
  if (!ann) return null;

  if (ann.type === 'rectangle') {
    const width = Number(ann.width ?? 0);
    const height = Number(ann.height ?? 0);
    if (width <= 0 || height <= 0) return null;
    return { minX: Number(ann.x ?? 0), minY: Number(ann.y ?? 0), width, height };
  }

  if (ann.type === 'circle') {
    const radiusX = Number(ann.radiusX ?? 0);
    const radiusY = Number(ann.radiusY ?? 0);
    if (radiusX <= 0 || radiusY <= 0) return null;
    const cx = Number(ann.x ?? 0);
    const cy = Number(ann.y ?? 0);
    return { minX: cx - radiusX, minY: cy - radiusY, width: radiusX * 2, height: radiusY * 2 };
  }

  const collectPoints = () => {
    if (ann.type === 'polygon' || ann.type === 'polyline') {
      const pts = ann.points;
      if (!Array.isArray(pts) || pts.length < 2) return [];
      const out = [];
      for (let index = 0; index + 1 < pts.length; index += 2) {
        out.push({ x: Number(pts[index]), y: Number(pts[index + 1]) });
      }
      return out;
    }

    if (ann.type === 'pen') {
      if (Array.isArray(ann.bezierPoints) && ann.bezierPoints.length > 0) {
        return ann.bezierPoints.map((point) => ({
          x: Number(point?.x ?? 0),
          y: Number(point?.y ?? 0),
        }));
      }
      const pts = ann.points;
      if (!Array.isArray(pts) || pts.length < 2) return [];
      const out = [];
      for (let index = 0; index + 1 < pts.length; index += 2) {
        out.push({ x: Number(pts[index]), y: Number(pts[index + 1]) });
      }
      return out;
    }

    return [];
  };

  const points = collectPoints();
  if (points.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  if (!Number.isFinite(minX)) return null;
  const width = maxX - minX;
  const height = maxY - minY;
  if (width <= 0 || height <= 0) return null;
  return { minX, minY, width, height };
}

/**
 * Whether an annotation can use the Konva bounding-box Transformer (resize handles).
 *
 * @param {object | null | undefined} ann
 * @returns {boolean}
 */
export function isBoundsTransformableAnnotation(ann, options = {}) {
  if (!ann) return false;
  const allowLockedSubSpacePin =
    options.allowLockedSubSpacePin === true && ann.source === SERVER_SUBSPACE_PIN_SOURCE;
  const allowLockedResize =
    ann.allowBoundsResize === true ||
    ann.source === SUBSPACE_LAYOUT_PENDING_SOURCE ||
    allowLockedSubSpacePin;
  if (ann.locked && !allowLockedResize) return false;
  if (ann.type === 'rectangle' || ann.type === 'circle') return true;
  if (ann.type === 'polygon') return ann.closed !== false;
  if (ann.type === 'polyline') {
    return Array.isArray(ann.points) && ann.points.length >= 4;
  }
  if (ann.type === 'pen') {
    if (Array.isArray(ann.bezierPoints) && ann.bezierPoints.length >= 2) return true;
    return Array.isArray(ann.points) && ann.points.length >= 4;
  }
  return false;
}

/**
 * Scale polygon / pen geometry to fit a new normalized bounding box.
 *
 * @param {object} ann
 * @param {{ minX: number, minY: number, width: number, height: number }} fromBBox
 * @param {{ minX: number, minY: number, width: number, height: number }} toBBox
 * @returns {object}
 */
export function scaleAnnotationToBBox(ann, fromBBox, toBBox) {
  if (!ann || !fromBBox || !toBBox) return {};
  const { minX, minY, width, height } = fromBBox;
  if (width <= 0 || height <= 0 || toBBox.width <= 0 || toBBox.height <= 0) return {};

  const scalePoint = (x, y) => ({
    x: clamp01(toBBox.minX + ((x - minX) / width) * toBBox.width),
    y: clamp01(toBBox.minY + ((y - minY) / height) * toBBox.height),
  });

  if (ann.type === 'polygon' || ann.type === 'polyline') {
    const pts = ann.points ?? [];
    const next = [];
    for (let index = 0; index + 1 < pts.length; index += 2) {
      const scaled = scalePoint(Number(pts[index]), Number(pts[index + 1]));
      next.push(scaled.x, scaled.y);
    }
    return { points: next };
  }

  if (ann.type === 'pen' && Array.isArray(ann.bezierPoints)) {
    return {
      bezierPoints: ann.bezierPoints.map((point) => {
        const anchor = scalePoint(Number(point.x), Number(point.y));
        return {
          ...point,
          x: anchor.x,
          y: anchor.y,
          handleIn: point.handleIn
            ? scalePoint(Number(point.handleIn.x), Number(point.handleIn.y))
            : null,
          handleOut: point.handleOut
            ? scalePoint(Number(point.handleOut.x), Number(point.handleOut.y))
            : null,
        };
      }),
    };
  }

  if (ann.type === 'pen' && Array.isArray(ann.points)) {
    const pts = ann.points;
    const next = [];
    for (let index = 0; index + 1 < pts.length; index += 2) {
      const scaled = scalePoint(Number(pts[index]), Number(pts[index + 1]));
      next.push(scaled.x, scaled.y);
    }
    return { points: next };
  }

  if (ann.type === 'rectangle') {
    return {
      x: toBBox.minX,
      y: toBBox.minY,
      width: toBBox.width,
      height: toBBox.height,
    };
  }

  if (ann.type === 'circle') {
    return {
      x: toBBox.minX + toBBox.width / 2,
      y: toBBox.minY + toBBox.height / 2,
      radiusX: toBBox.width / 2,
      radiusY: toBBox.height / 2,
    };
  }

  return {};
}

function flatNormalizedBounds(flat) {
  if (!Array.isArray(flat) || flat.length < 4) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const px = Number(flat[i]);
    const py = Number(flat[i + 1]);
    if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
    minX = Math.min(minX, px);
    maxX = Math.max(maxX, px);
    minY = Math.min(minY, py);
    maxY = Math.max(maxY, py);
  }
  if (!Number.isFinite(minX) || maxX <= minX || maxY <= minY) return null;
  return { minX, minY, maxX, maxY };
}

function pointToSegmentDistanceSq(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ddx = px - x1;
    const ddy = py - y1;
    return ddx * ddx + ddy * ddy;
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  const ddx = px - cx;
  const ddy = py - cy;
  return ddx * ddx + ddy * ddy;
}

function minDistanceSqToPolygonEdges(px, py, flat) {
  let minSq = Infinity;
  const vertexCount = flat.length / 2;
  for (let i = 0; i < vertexCount; i += 1) {
    const j = (i + 1) % vertexCount;
    const sq = pointToSegmentDistanceSq(
      px,
      py,
      flat[i * 2],
      flat[i * 2 + 1],
      flat[j * 2],
      flat[j * 2 + 1],
    );
    if (sq < minSq) minSq = sq;
  }
  return minSq;
}

/**
 * Pole-of-inaccessibility style label point — deepest interior point, robust for concave shapes.
 *
 * @param {object} ann
 * @param {number[]} flat - closed outline [x0,y0,...] in normalized coords
 * @param {{ minX: number, minY: number, maxX: number, maxY: number }} bounds
 * @returns {{ x: number, y: number } | null}
 */
function findShapeInteriorLabelPoint(ann, flat, bounds) {
  const INTERIOR_GRID = 48;
  let bestPoint = null;
  let bestDistSq = -1;

  for (let row = 0; row <= INTERIOR_GRID; row += 1) {
    for (let col = 0; col <= INTERIOR_GRID; col += 1) {
      const x = bounds.minX + ((bounds.maxX - bounds.minX) * col) / INTERIOR_GRID;
      const y = bounds.minY + ((bounds.maxY - bounds.minY) * row) / INTERIOR_GRID;
      if (!isNormalizedPointInShapeGeometry(x, y, ann)) continue;
      const distSq = minDistanceSqToPolygonEdges(x, y, flat);
      if (distSq > bestDistSq) {
        bestDistSq = distSq;
        bestPoint = { x, y };
      }
    }
  }

  if (!bestPoint) return null;

  const cellW = (bounds.maxX - bounds.minX) / INTERIOR_GRID;
  const cellH = (bounds.maxY - bounds.minY) / INTERIOR_GRID;
  let cx = bestPoint.x;
  let cy = bestPoint.y;

  for (let pass = 0; pass < 3; pass += 1) {
    const refineSteps = 8;
    const stepW = cellW / refineSteps;
    const stepH = cellH / refineSteps;
    let improved = false;
    for (let dy = -refineSteps; dy <= refineSteps; dy += 1) {
      for (let dx = -refineSteps; dx <= refineSteps; dx += 1) {
        const x = cx + dx * stepW;
        const y = cy + dy * stepH;
        if (!isNormalizedPointInShapeGeometry(x, y, ann)) continue;
        const distSq = minDistanceSqToPolygonEdges(x, y, flat);
        if (distSq > bestDistSq) {
          bestDistSq = distSq;
          cx = x;
          cy = y;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }

  return { x: cx, y: cy };
}

/**
 * A normalized point inside the shape — safe for concave / irregular polygons and pen paths.
 *
 * @param {object | null | undefined} ann
 * @returns {{ x: number, y: number } | null}
 */
export function resolveShapeInteriorCenterNormalized(ann) {
  if (!ann || typeof ann !== 'object') return null;

  if (ann.type === 'rectangle') {
    const { x = 0, y = 0, width = 0, height = 0 } = ann;
    if (width <= 0 || height <= 0) return null;
    return { x: x + width / 2, y: y + height / 2 };
  }

  if (ann.type === 'circle') {
    const { x = 0, y = 0, radiusX = 0, radiusY = 0 } = ann;
    if (radiusX <= 0 || radiusY <= 0) return null;
    return { x, y };
  }

  if (ann.type === 'point') {
    const px = Number(ann.x);
    const py = Number(ann.y);
    if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
    return { x: px, y: py };
  }

  let flat = null;
  if ((ann.type === 'polygon' || ann.type === 'polyline') && Array.isArray(ann.points)) {
    flat = ann.points;
  } else if (ann.type === 'pen') {
    if (ann.closed && Array.isArray(ann.bezierPoints) && ann.bezierPoints.length >= 2) {
      flat = sampleClosedBezierOutlineNormalized(ann.bezierPoints, 16);
    } else if (Array.isArray(ann.points)) {
      flat = ann.points;
    }
  }

  if (!flat || flat.length < 4) return null;

  const bounds = flatNormalizedBounds(flat);
  if (!bounds) return null;

  return findShapeInteriorLabelPoint(ann, flat, bounds);
}

export function computeAnnotationCenter(ann, imageW, imageH) {
  if (!ann || !imageW || !imageH) return null;

  const interior = resolveShapeInteriorCenterNormalized(ann);
  if (interior) {
    return { x: interior.x * imageW, y: interior.y * imageH };
  }

  return null;
}
export function computeAnnotationBBox(ann, imageW, imageH) {
  if (!ann || !imageW || !imageH) return null;
  if (ann.type === 'rectangle') {
    return { x: ann.x * imageW, y: ann.y * imageH, w: ann.width * imageW, h: ann.height * imageH };
  }
  if (ann.type === 'circle') {
    const rx = ann.radiusX * imageW;
    const ry = ann.radiusY * imageH;
    return { x: ann.x * imageW - rx, y: ann.y * imageH - ry, w: rx * 2, h: ry * 2 };
  }
  if (ann.type === 'polygon' || ann.type === 'polyline') {
    const pts = ann.points;
    if (!Array.isArray(pts) || pts.length < 2) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      const wx = pts[i] * imageW;
      const wy = pts[i + 1] * imageH;
      if (wx < minX) minX = wx;
      if (wx > maxX) maxX = wx;
      if (wy < minY) minY = wy;
      if (wy > maxY) maxY = wy;
    }
    if (!Number.isFinite(minX)) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  if (ann.type === 'pen') {
    const anchorPts = ann.bezierPoints ?? null;
    const flatPts = ann.points ?? null;
    const source = anchorPts ?? flatPts;
    if (!source || source.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    if (anchorPts) {
      for (const pt of anchorPts) {
        const wx = pt.x * imageW;
        const wy = pt.y * imageH;
        if (wx < minX) minX = wx;
        if (wx > maxX) maxX = wx;
        if (wy < minY) minY = wy;
        if (wy > maxY) maxY = wy;
      }
    } else {
      for (let i = 0; i < flatPts.length; i += 2) {
        const wx = flatPts[i] * imageW;
        const wy = flatPts[i + 1] * imageH;
        if (wx < minX) minX = wx;
        if (wx > maxX) maxX = wx;
        if (wy < minY) minY = wy;
        if (wy > maxY) maxY = wy;
      }
    }
    if (!Number.isFinite(minX)) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  if (ann.type === 'point') {
    const r = 40;
    return { x: ann.x * imageW - r, y: ann.y * imageH - r, w: r * 2, h: r * 2 };
  }
  return null;
}

/**
 * Viewport transform that fits an annotation bbox inside the visible area with padding,
 * centered on the annotation (centroid preferred over bbox center).
 *
 * @param {{
 *   ann: object,
 *   imageW: number,
 *   imageH: number,
 *   viewportW: number,
 *   viewportH: number,
 *   fitRatio?: number,
 *   padding?: number,
 *   minZoom?: number,
 *   maxZoom?: number,
 * }} params
 * @returns {{ x: number, y: number, scale: number } | null}
 */
export function computeAnnotationViewportTransform({
  ann,
  imageW,
  imageH,
  viewportW,
  viewportH,
  fitRatio = 0.4,
  padding = 48,
  minZoom = 0.05,
  maxZoom = 8,
  maxScaleRelativeToImageFit = 0,
}) {
  const bbox = computeAnnotationBBox(ann, imageW, imageH);
  if (!bbox || viewportW < 16 || viewportH < 16) return null;

  const pad = Math.max(0, Number(padding) || 0);
  const availW = Math.max(1, viewportW - pad * 2);
  const availH = Math.max(1, viewportH - pad * 2);
  const fit = Math.min(Math.max(Number(fitRatio) || 0.4, 0.15), 0.75);

  const scaleCap = Math.min(Math.max(maxZoom, minZoom), 8);
  const scaleFromW = (availW * fit) / Math.max(bbox.w, 1);
  const scaleFromH = (availH * fit) / Math.max(bbox.h, 1);
  let scale = Math.max(minZoom, Math.min(scaleFromW, scaleFromH, scaleCap));

  if (imageW > 0 && imageH > 0 && maxScaleRelativeToImageFit > 0) {
    const imageFitScale = Math.min(availW / imageW, availH / imageH);
    scale = Math.min(scale, imageFitScale * maxScaleRelativeToImageFit);
  }

  const cx = bbox.x + bbox.w / 2;
  const cy = bbox.y + bbox.h / 2;

  return {
    x: viewportW / 2 - cx * scale,
    y: viewportH / 2 - cy * scale,
    scale,
  };
}
