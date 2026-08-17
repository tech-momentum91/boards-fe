import { resolveShapeInteriorCenterNormalized } from '@/components/floor-plan-editor/core/annotation-bounds.js';
import {
  isNormalizedPointInAssociatedSpaceShape,
  isNormalizedPointInShapeGeometry,
  sampleClosedBezierOutlineNormalized,
} from '@/components/floor-plan-editor/core/space-region-hit.js';
import {
  boundingBoxNormalized,
  normalizedRectsIntersect,
} from '@/components/floor-plan-editor/core/geometry.js';
import { circleToPolygonPairs } from '@/utils/layout-coordinate-payload';
import {
  CENTER_SUBSPACE_MARKER,
  SUBSPACE_LAYOUT_PENDING_SOURCE,
} from '@/constants/layout/annotation-sources';
import { DESK_COWORKER_MARKER, SERVER_SUBSPACE_PIN_SOURCE } from '@/utils/layout-annotation-space';

export { CENTER_SUBSPACE_MARKER, SUBSPACE_LAYOUT_PENDING_SOURCE };

/** Canvas fill/stroke palette for managed-office sub-space types (matches parent space inventory colors). */
const MANAGED_OFFICE_SUB_SPACE_TYPE_STYLES = Object.freeze({
  'production area': {
    fill: 'rgba(234, 88, 12, 0.22)',
    stroke: '#ea580c',
    strokeWidth: 2,
  },
  resource: {
    fill: 'rgba(220, 40, 145, 0.22)',
    stroke: '#dc2891',
    strokeWidth: 2.5,
  },
  'common area': {
    fill: 'rgba(68, 172, 255, 0.4)',
    stroke: '#44a2ff',
    strokeWidth: 2.5,
  },
});

const DEFAULT_MANAGED_OFFICE_SUB_SPACE_STYLE = Object.freeze({
  fill: 'rgba(0, 0, 0, 0.20)',
  stroke: 'rgba(0, 0, 0, 0.32)',
  strokeWidth: 1.5,
});

/**
 * @param {object | null | undefined} ann
 * @returns {string}
 */
export function readSubSpaceTypeFromAnnotation(ann) {
  return String(
    ann?.sub_space_type ?? ann?.sub_space_meta?.sub_space_type ?? ann?.sub_space_meta?.type ?? '',
  ).trim();
}

/**
 * Badge color token for managed-office sub-space type labels.
 *
 * @param {string} subSpaceType
 * @returns {'orange' | 'pink' | 'sky' | 'gray'}
 */
export function getManagedOfficeSubSpaceTypeBadgeColor(subSpaceType) {
  const key = String(subSpaceType || '')
    .trim()
    .toLowerCase();
  if (key === 'production area') return 'orange';
  if (key === 'resource') return 'pink';
  if (key.includes('common')) return 'sky';
  return 'gray';
}

/**
 * Konva annotation style for a managed-office sub-space polygon by `sub_space_type`.
 *
 * @param {string} subSpaceType
 * @param {{ emphasized?: boolean }} [options]
 * @returns {{ fill: string, stroke: string, strokeWidth: number }}
 */
export function resolveManagedOfficeSubSpaceAnnotationStyle(subSpaceType, options = {}) {
  const key = String(subSpaceType || '')
    .trim()
    .toLowerCase();
  const base =
    MANAGED_OFFICE_SUB_SPACE_TYPE_STYLES[key] ??
    (key.includes('common') ? MANAGED_OFFICE_SUB_SPACE_TYPE_STYLES['common area'] : null) ??
    DEFAULT_MANAGED_OFFICE_SUB_SPACE_STYLE;

  if (!options.emphasized) {
    return { ...base };
  }

  return {
    ...base,
    strokeWidth: (base.strokeWidth ?? 2) + 0.5,
  };
}

/**
 * Normalize a sub-space row from `get_space_sub_spaces` for define-sub-space search.
 *
 * @param {object | null | undefined} raw
 * @returns {{
 *   sub_space_id: string,
 *   sub_space_row_id: string,
 *   sub_space_name: string,
 *   sub_space_type: string,
 * } | null}
 */
export function normalizeSubSpaceRowForAssociation(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const subSpaceId = String(raw.sub_space_id ?? raw.name ?? raw.id ?? '').trim();
  const rowId = String(raw.sub_space_row_id ?? raw.name ?? raw.id ?? '').trim();
  const subSpaceName = String(
    raw.sub_space_name ?? raw.subspace_name ?? raw.label ?? raw.title ?? '',
  ).trim();
  const subSpaceType = String(raw.sub_space_type ?? raw.subspace_type ?? raw.type ?? '').trim();

  if (!subSpaceName && !subSpaceId && !rowId) return null;

  return {
    sub_space_id: subSpaceId || rowId,
    sub_space_row_id: rowId || subSpaceId,
    sub_space_name: subSpaceName || subSpaceId || rowId,
    sub_space_type: subSpaceType,
  };
}

/**
 * A normalized point inside `ann` for containment checks (centroid / bbox center).
 *
 * @param {object} ann
 * @returns {{ x: number, y: number } | null}
 */
export function getShapeInteriorProbeNormalized(ann) {
  return resolveShapeInteriorCenterNormalized(ann);
}

/**
 * Normalized axis-aligned bbox for `create_sub_space` (API expects x, y, width, height).
 *
 * @param {object} ann
 * @returns {{ x: number, y: number, width: number, height: number } | null}
 */
export function annotationToCreateSubSpaceBoundingBox(ann) {
  const lc = annotationToSubSpaceApiLayoutCoordinate(ann);
  if (!lc) return null;
  if (
    lc.x != null &&
    lc.y != null &&
    lc.width != null &&
    lc.height != null &&
    [lc.x, lc.y, lc.width, lc.height].every((n) => Number.isFinite(Number(n)))
  ) {
    const x = Number(lc.x);
    const y = Number(lc.y);
    const width = Number(lc.width);
    const height = Number(lc.height);
    if (width <= 0 || height <= 0) return null;
    return { x, y, width, height };
  }
  if (Array.isArray(lc.points) && lc.points.length > 0) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const pair of lc.points) {
      if (!Array.isArray(pair) || pair.length < 2) continue;
      const px = Number(pair[0]);
      const py = Number(pair[1]);
      if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
    if (!Number.isFinite(minX) || maxX <= minX || maxY <= minY) return null;
    const width = Math.max(0.004, maxX - minX);
    const height = Math.max(0.004, maxY - minY);
    return { x: minX, y: minY, width, height };
  }
  return null;
}

/**
 * Convert flat normalized points to API `points: number[][]` (pairs 0–1).
 *
 * @param {number[]} flat
 * @returns {number[][]}
 */
function flatNormalizedToPairs(flat) {
  const out = [];
  if (!Array.isArray(flat)) return out;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const x = Number(flat[i]);
    const y = Number(flat[i + 1]);
    if (Number.isFinite(x) && Number.isFinite(y)) out.push([x, y]);
  }
  return out;
}

/**
 * Layout payload for `save_sub_space_layout_coordinate` from an editor annotation.
 * Supports rectangle, polygon, polyline (bbox), closed pen (outline / points).
 *
 * @param {object} ann
 * @returns {{ points?: number[][], x?: number, y?: number, width?: number, height?: number } | null}
 */
export function annotationToSubSpaceApiLayoutCoordinate(ann) {
  if (!ann || typeof ann !== 'object') return null;

  if (ann.type === 'rectangle') {
    const { x = 0, y = 0, width = 0, height = 0 } = ann;
    if (width <= 0 || height <= 0) return null;
    return { x, y, width, height };
  }

  if (ann.type === 'circle') {
    const { x = 0, y = 0, radiusX = 0, radiusY = 0 } = ann;
    if (radiusX <= 0 || radiusY <= 0) return null;
    const pairs = circleToPolygonPairs(x, y, radiusX, radiusY);
    return pairs.length >= 3 ? { points: pairs } : null;
  }

  if (ann.type === 'polygon' && Array.isArray(ann.points) && ann.points.length >= 6) {
    const pairs = flatNormalizedToPairs(ann.points);
    if (pairs.length >= 3) return { points: pairs };
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
    const w = Math.max(0.004, maxX - minX);
    const h = Math.max(0.004, maxY - minY);
    return { x: minX, y: minY, width: w, height: h };
  }

  if (ann.type === 'pen') {
    if (ann.closed && Array.isArray(ann.bezierPoints) && ann.bezierPoints.length >= 2) {
      const flat = sampleClosedBezierOutlineNormalized(ann.bezierPoints, 12);
      const pairs = flatNormalizedToPairs(flat);
      if (pairs.length >= 3) return { points: pairs };
    }
    if (Array.isArray(ann.points) && ann.points.length >= 6) {
      const pairs = flatNormalizedToPairs(ann.points);
      if (pairs.length >= 3) return { points: pairs };
    }
  }

  return null;
}

/**
 * Spotlight mask holes for "view/edit sub-spaces".
 *
 * The selected parent space must stay clear so the user can draw/edit sub-spaces
 * inside it; only the area outside the parent gets dimmed. Existing sub-space
 * pins are rendered as separate Konva shapes on top of the canvas, so they stay
 * visible inside the bright parent area without needing their own holes.
 *
 * The `pinAnnotations` argument is accepted for backward compatibility and is
 * intentionally ignored.
 *
 * @param {object | null} parentAnn
 * @param {object[]} [_pinAnnotations]
 * @returns {object[]}
 */
export function annotationsForEditSubSpaceSpotlightHoles(parentAnn, _pinAnnotations) {
  return annotationsForSpotlightMask(parentAnn);
}

/**
 * Annotations suitable for {@link import('@/components/floor-plan-editor/react/shapes/client-mask-shape.jsx').ClientMaskShape} (polygon holes in normalized space).
 *
 * @param {object | null} ann
 * @returns {object[]}
 */
export function annotationsForSpotlightMask(ann) {
  if (!ann || typeof ann !== 'object') return [];

  if (ann.type === 'polygon' && Array.isArray(ann.points) && ann.points.length >= 6) {
    return [{ type: 'polygon', points: ann.points }];
  }

  if (ann.type === 'rectangle') {
    const { x = 0, y = 0, width = 0, height = 0 } = ann;
    if (width <= 0 || height <= 0) return [];
    return [
      {
        type: 'polygon',
        points: [x, y, x + width, y, x + width, y + height, x, y + height],
      },
    ];
  }

  if (ann.type === 'circle') {
    const { x = 0, y = 0, radiusX = 0, radiusY = 0 } = ann;
    if (radiusX <= 0 || radiusY <= 0) return [];
    const pairs = circleToPolygonPairs(x, y, radiusX, radiusY, 24);
    if (pairs.length < 3) return [];
    return [{ type: 'polygon', points: pairs.flatMap(([px, py]) => [px, py]) }];
  }

  if (ann.type === 'pen' && ann.closed) {
    if (Array.isArray(ann.bezierPoints) && ann.bezierPoints.length >= 2) {
      const flat = sampleClosedBezierOutlineNormalized(ann.bezierPoints, 14);
      if (flat.length >= 6) return [{ type: 'polygon', points: flat }];
    }
    if (Array.isArray(ann.points) && ann.points.length >= 6) {
      return [{ type: 'polygon', points: ann.points }];
    }
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
    return [
      {
        type: 'polygon',
        points: [minX, minY, minX + w, minY, minX + w, minY + h, minX, minY + h],
      },
    ];
  }

  return [];
}

/**
 * Build a unique sub_space id from a display name (for API).
 *
 * @param {string} name
 * @returns {string}
 */
export function slugSubSpaceIdFromName(name) {
  const base = String(name || 'sub')
    .trim()
    .split(/\s+/)
    .join('-')
    .replaceAll(/[^\w-]/g, '')
    .slice(0, 36);
  return `${base || 'sub'}-${Date.now().toString(36)}`;
}

/**
 * Top-most space-linked shape whose interior contains `childAnn`'s probe (for inner drawings).
 *
 * @param {object} childAnn
 * @param {object[]} list
 * @returns {object | null}
 */
export function findContainingParentSpaceForUnassociatedChild(childAnn, list) {
  if (!childAnn || !Array.isArray(list)) return null;
  const probe = getShapeInteriorProbeNormalized(childAnn);
  if (!probe) return null;

  for (let i = list.length - 1; i >= 0; i -= 1) {
    const cand = list[i];
    if (!cand || cand.id === childAnn.id) continue;
    if (!String(cand.space_ref || '').trim()) continue;
    if (
      cand.source === SERVER_SUBSPACE_PIN_SOURCE ||
      cand.source === CENTER_SUBSPACE_MARKER ||
      cand.source === DESK_COWORKER_MARKER ||
      cand.source === SUBSPACE_LAYOUT_PENDING_SOURCE
    ) {
      continue;
    }
    if (!['rectangle', 'circle', 'polygon', 'polyline', 'pen'].includes(cand.type)) continue;
    if (!isNormalizedPointInAssociatedSpaceShape(probe.x, probe.y, cand)) continue;
    return cand;
  }
  return null;
}

const LAYOUT_SPACE_BOUNDARY_TYPES = new Set(['rectangle', 'circle', 'polygon', 'polyline', 'pen']);
/** Ignore near-touching edges when checking top-level space overlap. */
const LAYOUT_SPACE_OVERLAP_INSET = 0.0035;

function layoutSpaceBoundaryBBox(ann) {
  const base = boundingBoxNormalized(ann);
  if (base) {
    const minX = base.minX + LAYOUT_SPACE_OVERLAP_INSET;
    const minY = base.minY + LAYOUT_SPACE_OVERLAP_INSET;
    const maxX = base.maxX - LAYOUT_SPACE_OVERLAP_INSET;
    const maxY = base.maxY - LAYOUT_SPACE_OVERLAP_INSET;
    if (maxX <= minX || maxY <= minY) return null;
    return { minX, minY, maxX, maxY };
  }
  if (ann?.type !== 'pen' || !Array.isArray(ann.bezierPoints) || ann.bezierPoints.length === 0) {
    return null;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const pt of ann.bezierPoints) {
    const px = Number(pt?.x);
    const py = Number(pt?.y);
    if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
    minX = Math.min(minX, px);
    maxX = Math.max(maxX, px);
    minY = Math.min(minY, py);
    maxY = Math.max(maxY, py);
  }
  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

function collectLayoutSpaceBoundarySamplePoints(ann) {
  const points = [];
  const probe = getShapeInteriorProbeNormalized(ann);
  if (probe) points.push(probe);
  return points;
}

/**
 * Floor-plan shape used to define a space region (not sub-space pins / markers).
 *
 * @param {object | null | undefined} ann
 * @returns {boolean}
 */
export function isTopLevelLayoutSpaceBoundaryCandidate(ann) {
  if (!ann || typeof ann !== 'object') return false;
  if (!LAYOUT_SPACE_BOUNDARY_TYPES.has(ann.type)) return false;
  if (ann.type === 'pen' && ann.closed === false) return false;
  if (
    ann.source === SERVER_SUBSPACE_PIN_SOURCE ||
    ann.source === DESK_COWORKER_MARKER ||
    ann.source === CENTER_SUBSPACE_MARKER ||
    ann.source === SUBSPACE_LAYOUT_PENDING_SOURCE
  ) {
    return false;
  }
  return true;
}

/**
 * Whether two top-level space boundary shapes overlap (normalized coordinates).
 *
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
export function layoutSpaceBoundaryShapesOverlap(a, b) {
  if (!a || !b || a.id === b.id) return false;

  const boxA = layoutSpaceBoundaryBBox(a);
  const boxB = layoutSpaceBoundaryBBox(b);
  if (boxA && boxB && !normalizedRectsIntersect(boxA, boxB)) return false;

  const aPoints = collectLayoutSpaceBoundarySamplePoints(a);
  const bPoints = collectLayoutSpaceBoundarySamplePoints(b);

  for (const pt of aPoints) {
    if (isNormalizedPointInShapeGeometry(pt.x, pt.y, b)) return true;
  }
  for (const pt of bPoints) {
    if (isNormalizedPointInShapeGeometry(pt.x, pt.y, a)) return true;
  }
  return false;
}

/**
 * @param {object} candidate
 * @param {object[]} annotations
 * @param {{ excludeId?: string }} [options]
 * @returns {boolean}
 */
export function layoutSpaceBoundaryOverlapsAny(candidate, annotations, options = {}) {
  if (!isTopLevelLayoutSpaceBoundaryCandidate(candidate)) return false;
  const excludeId = String(options.excludeId ?? '').trim();
  if (!Array.isArray(annotations)) return false;

  for (const other of annotations) {
    if (!other || other.id === candidate.id) continue;
    if (excludeId && other.id === excludeId) continue;
    if (!isTopLevelLayoutSpaceBoundaryCandidate(other)) continue;
    if (layoutSpaceBoundaryShapesOverlap(candidate, other)) return true;
  }
  return false;
}
