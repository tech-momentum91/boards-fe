import { SERVER_SUBSPACE_PIN_SOURCE } from '@/constants/layout/annotation-sources';
import { isPointInPolygon } from './point-in-polygon.js';

/**
 * Closed Bézier outline as flat normalized [x0,y0,...] for ray-casting.
 * Mirrors sampling strategy used in `closestSegmentPoint` (cubic with fallback controls).
 *
 * @param {object[]} bezierPoints - normalized editor anchors
 * @param {number} samplesPerSegment
 * @returns {number[]}
 */
export function sampleClosedBezierOutlineNormalized(bezierPoints, samplesPerSegment = 14) {
  if (!Array.isArray(bezierPoints) || bezierPoints.length < 2) return [];
  const n = bezierPoints.length;
  const flat = [];
  const numSegs = n;
  for (let s = 0; s < numSegs; s++) {
    const prev = bezierPoints[s];
    const curr = bezierPoints[(s + 1) % n];
    const cp1 = prev.handleOut ?? prev;
    const cp2 = curr.handleIn ?? curr;
    for (let k = 0; k < samplesPerSegment; k++) {
      const t = k / samplesPerSegment;
      const mt = 1 - t;
      const x =
        mt * mt * mt * prev.x +
        3 * mt * mt * t * cp1.x +
        3 * mt * t * t * cp2.x +
        t * t * t * curr.x;
      const y =
        mt * mt * mt * prev.y +
        3 * mt * mt * t * cp1.y +
        3 * mt * t * t * cp2.y +
        t * t * t * curr.y;
      flat.push(x, y);
    }
  }
  return flat;
}

function hasSpaceRef(ann) {
  return Boolean(String(ann?.space_ref ?? '').trim());
}

function isHitTestableAssociatedShape(ann) {
  if (!ann || typeof ann !== 'object') return false;
  if (
    ann.source === 'client-marker' ||
    ann.source === 'center-subspace-marker' ||
    ann.source === 'server-subspace-pin'
  ) {
    return false;
  }
  if (ann.type === 'point') return false;
  if (!hasSpaceRef(ann)) return false;
  return true;
}

/**
 * Whether normalized (nx, ny) lies inside the filled region of a single annotation.
 * Only meaningful for shapes that represent allocated space (polygon, rectangle, closed pen).
 *
 * @param {number} nx
 * @param {number} ny
 * @param {object} ann
 * @returns {boolean}
 */
export function isNormalizedPointInAssociatedSpaceShape(nx, ny, ann) {
  if (!ann || !hasSpaceRef(ann)) return false;

  if (ann.type === 'rectangle') {
    const { x = 0, y = 0, width = 0, height = 0 } = ann;
    if (width <= 0 || height <= 0) return false;
    return nx >= x && nx <= x + width && ny >= y && ny <= y + height;
  }

  if (ann.type === 'circle') {
    const { x = 0, y = 0, radiusX = 0, radiusY = 0 } = ann;
    if (radiusX <= 0 || radiusY <= 0) return false;
    const dx = (nx - x) / radiusX;
    const dy = (ny - y) / radiusY;
    return dx * dx + dy * dy <= 1;
  }

  if (ann.type === 'polygon') {
    return (
      Array.isArray(ann.points) && ann.points.length >= 6 && isPointInPolygon(nx, ny, ann.points)
    );
  }

  if (ann.type === 'pen') {
    if (!ann.closed) return false;
    if (Array.isArray(ann.bezierPoints) && ann.bezierPoints.length >= 2) {
      const flat = sampleClosedBezierOutlineNormalized(ann.bezierPoints);
      return flat.length >= 6 && isPointInPolygon(nx, ny, flat);
    }
    if (Array.isArray(ann.points) && ann.points.length >= 6) {
      return isPointInPolygon(nx, ny, ann.points);
    }
    return false;
  }

  return false;
}

/**
 * Hit-test any editor shape geometry (no `space_ref` requirement). Used for sub-space pins.
 *
 * @param {number} nx
 * @param {number} ny
 * @param {object} ann
 * @returns {boolean}
 */
export function isNormalizedPointInShapeGeometry(nx, ny, ann) {
  if (!ann || typeof ann !== 'object') return false;

  if (ann.type === 'rectangle') {
    const { x = 0, y = 0, width = 0, height = 0 } = ann;
    if (width <= 0 || height <= 0) return false;
    return nx >= x && nx <= x + width && ny >= y && ny <= y + height;
  }

  if (ann.type === 'circle') {
    const { x = 0, y = 0, radiusX = 0, radiusY = 0 } = ann;
    if (radiusX <= 0 || radiusY <= 0) return false;
    const dx = (nx - x) / radiusX;
    const dy = (ny - y) / radiusY;
    return dx * dx + dy * dy <= 1;
  }

  if (ann.type === 'polygon') {
    return (
      Array.isArray(ann.points) && ann.points.length >= 6 && isPointInPolygon(nx, ny, ann.points)
    );
  }

  if (ann.type === 'polyline' && Array.isArray(ann.points) && ann.points.length >= 4) {
    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;
    for (let i = 0; i + 1 < ann.points.length; i += 2) {
      const px = Number(ann.points[i]);
      const py = Number(ann.points[i + 1]);
      if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
    const w = Math.max(0.002, maxX - minX);
    const h = Math.max(0.002, maxY - minY);
    return nx >= minX && nx <= minX + w && ny >= minY && ny <= minY + h;
  }

  if (ann.type === 'pen') {
    if (!ann.closed) return false;
    if (Array.isArray(ann.bezierPoints) && ann.bezierPoints.length >= 2) {
      const flat = sampleClosedBezierOutlineNormalized(ann.bezierPoints);
      return flat.length >= 6 && isPointInPolygon(nx, ny, flat);
    }
    if (Array.isArray(ann.points) && ann.points.length >= 6) {
      return isPointInPolygon(nx, ny, ann.points);
    }
    return false;
  }

  if (ann.type === 'point') {
    const px = Number(ann.x);
    const py = Number(ann.y);
    if (!Number.isFinite(px) || !Number.isFinite(py)) return false;
    const r = Number(ann.hitRadius);
    const radius = Number.isFinite(r) && r > 0 ? r : 0.03;
    return Math.hypot(nx - px, ny - py) <= radius;
  }

  return false;
}

/**
 * Find the top-most (last in stack order) space-associated region containing (nx, ny).
 * Used for client dot placement / sub-space assignment.
 *
 * @param {number} nx - normalized x (0–1)
 * @param {number} ny - normalized y (0–1)
 * @param {object[] | null | undefined} annotations
 * @returns {object | null}
 */
export function findAssociatedSpaceRegionAt(nx, ny, annotations) {
  if (!Array.isArray(annotations) || annotations.length === 0) return null;

  for (let i = annotations.length - 1; i >= 0; i--) {
    const ann = annotations[i];
    if (!isHitTestableAssociatedShape(ann)) continue;
    if (isNormalizedPointInAssociatedSpaceShape(nx, ny, ann)) return ann;
  }

  return null;
}

/**
 * Resolve marker placement target: sub-space pin (top-most) then parent space region.
 *
 * @param {number} nx
 * @param {number} ny
 * @param {object[] | null | undefined} annotations
 * @returns {{ kind: 'space' | 'subspace', ann: object, spaceId: string, subSpaceId: string } | null}
 */
export function findLayoutMarkerTargetAt(nx, ny, annotations) {
  if (!Array.isArray(annotations) || annotations.length === 0) return null;

  const subPins = annotations.filter((ann) => ann?.source === SERVER_SUBSPACE_PIN_SOURCE);
  for (let i = subPins.length - 1; i >= 0; i--) {
    const ann = subPins[i];
    if (!isNormalizedPointInShapeGeometry(nx, ny, ann)) continue;
    const spaceId = String(ann?.space_ref ?? '').trim();
    const subSpaceId = String(ann?.sub_space_id ?? '').trim();
    if (!spaceId && !subSpaceId) continue;
    return { kind: 'subspace', ann, spaceId, subSpaceId };
  }

  const spaceAnn = findAssociatedSpaceRegionAt(nx, ny, annotations);
  if (!spaceAnn) return null;

  const spaceId = String(
    spaceAnn?.space_ref ?? spaceAnn?.space?.name ?? spaceAnn?.space_id ?? '',
  ).trim();
  if (!spaceId) return null;

  return { kind: 'space', ann: spaceAnn, spaceId, subSpaceId: '' };
}

/**
 * Whether (nx, ny) is inside a space or sub-space region suitable for marker placement.
 *
 * @param {number} nx
 * @param {number} ny
 * @param {object[] | null | undefined} annotations
 * @returns {boolean}
 */
export function isPointInMarkerPlacementRegions(nx, ny, annotations) {
  return findLayoutMarkerTargetAt(nx, ny, annotations) != null;
}
