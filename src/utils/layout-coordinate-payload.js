/**
 * Convert floor-plan annotations ↔ API `layout_coordinate.points` (pairs of numbers).
 * Editor uses normalized coordinates (0–1) for geometry.
 */

/**
 * @param {number} cx normalized center x
 * @param {number} cy normalized center y
 * @param {number} radiusX normalized x radius
 * @param {number} radiusY normalized y radius
 * @param {number} [segments]
 * @returns {number[][]}
 */
export function circleToPolygonPairs(cx, cy, radiusX, radiusY, segments = 32) {
  const pairs = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (2 * Math.PI * i) / segments;
    pairs.push([cx + radiusX * Math.cos(angle), cy + radiusY * Math.sin(angle)]);
  }
  return pairs;
}

/**
 * @param {number[]} flat - [x0,y0,x1,y1,...] normalized
 * @returns {number[][]}
 */
export function flatNormalizedToPointPairs(flat) {
  if (!Array.isArray(flat) || flat.length < 2) return [];
  const out = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    out.push([flat[i], flat[i + 1]]);
  }
  return out;
}

/**
 * @param {object} ann - annotation from FloorPlanEditor
 * @returns {{ points: number[][] } | null}
 */
export function annotationToLayoutCoordinate(ann) {
  if (!ann || typeof ann !== 'object') return null;

  if (ann.type === 'rectangle') {
    const x = Number(ann.x);
    const y = Number(ann.y);
    const w = Number(ann.width);
    const h = Number(ann.height);
    if (![x, y, w, h].every((n) => Number.isFinite(n))) return null;
    return {
      points: [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ],
    };
  }

  if (ann.type === 'circle') {
    const cx = Number(ann.x);
    const cy = Number(ann.y);
    const rx = Number(ann.radiusX);
    const ry = Number(ann.radiusY);
    if (![cx, cy, rx, ry].every((n) => Number.isFinite(n)) || rx <= 0 || ry <= 0) return null;
    return { points: circleToPolygonPairs(cx, cy, rx, ry) };
  }

  if (ann.type === 'polygon' || ann.type === 'polyline') {
    const pairs = flatNormalizedToPointPairs(ann.points);
    return pairs.length > 0 ? { points: pairs } : null;
  }

  if (ann.type === 'pen') {
    if (Array.isArray(ann.bezierPoints) && ann.bezierPoints.length > 0) {
      const pairs = ann.bezierPoints.map((p) => [Number(p.x), Number(p.y)]);
      return pairs.length > 0 ? { points: pairs } : null;
    }
    const pairs = flatNormalizedToPointPairs(ann.points ?? []);
    return pairs.length > 0 ? { points: pairs } : null;
  }

  if (ann.type === 'point') {
    const x = Number(ann.x);
    const y = Number(ann.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { points: [[x, y]] };
  }

  return null;
}

/**
 * Build a minimal annotation object from API points for loading into the editor.
 *
 * @param {string} id - client annotation id (stable)
 * @param {string} spaceRef - space row name
 * @param {number[][]} pairs
 * @param {object} [spaceMeta] - merged space payload for popover
 * @returns {object}
 */
export function layoutCoordinatePointsToAnnotation(id, spaceRef, pairs, spaceMeta = null) {
  const cleanPairs = Array.isArray(pairs)
    ? pairs.filter(
        (p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]),
      )
    : [];
  if (cleanPairs.length === 0) {
    return {
      id,
      type: 'point',
      x: 0,
      y: 0,
      space_ref: spaceRef,
      space: spaceMeta,
      hasCoordinateOnServer: true,
    };
  }

  if (cleanPairs.length === 1) {
    return {
      id,
      type: 'point',
      x: cleanPairs[0][0],
      y: cleanPairs[0][1],
      space_ref: spaceRef,
      space: spaceMeta,
      hasCoordinateOnServer: true,
    };
  }

  const flat = cleanPairs.flatMap(([x, y]) => [x, y]);
  const isRect =
    cleanPairs.length === 4 &&
    (() => {
      const [p0, p1, p2, p3] = cleanPairs;
      const tol = 1e-6;
      const sameY = (a, b) => Math.abs(a - b) < tol;
      const sameX = (a, b) => Math.abs(a - b) < tol;
      return (
        sameY(p0[1], p1[1]) && sameX(p1[0], p2[0]) && sameY(p2[1], p3[1]) && sameX(p3[0], p0[0])
      );
    })();

  if (isRect) {
    const xs = cleanPairs.map((p) => p[0]);
    const ys = cleanPairs.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      id,
      type: 'rectangle',
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      space_ref: spaceRef,
      space: spaceMeta,
      hasCoordinateOnServer: true,
    };
  }

  return {
    id,
    type: 'polygon',
    points: flat,
    space_ref: spaceRef,
    space: spaceMeta,
    hasCoordinateOnServer: true,
  };
}
