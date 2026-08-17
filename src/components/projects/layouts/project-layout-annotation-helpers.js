import { isNormalizedPointInShapeGeometry } from '@/components/floor-plan-editor/core/space-region-hit.js';
import { parseLayoutCoordinates } from '@/utils/layout-annotation-space';
import {
  formatLayoutVersionFromFields,
  resolveLayoutVersionKind,
} from '@/components/projects/layouts/project-layout-helpers';
import {
  isTopLevelLayoutSpaceBoundaryCandidate,
  layoutSpaceBoundaryOverlapsAny,
} from '@/utils/layout-annotation-subspace';

export const PROJECT_LAYOUT_AREA_COLORS = [
  '#FF5733',
  '#2563eb',
  '#16a34a',
  '#c026d3',
  '#ea580c',
  '#0891b2',
];

function pixelToNormalized(point, naturalWidth, naturalHeight) {
  const x = Number(point?.x ?? 0);
  const y = Number(point?.y ?? 0);

  if (naturalWidth > 0 && naturalHeight > 0) {
    return {
      x: x / naturalWidth,
      y: y / naturalHeight,
    };
  }

  return { x, y };
}

function normalizedToPixel(x, y, naturalWidth, naturalHeight) {
  return {
    x: Math.round(Number(x) * naturalWidth),
    y: Math.round(Number(y) * naturalHeight),
  };
}

/**
 * Convert API area coordinates into a single floor-plan annotation.
 *
 * @param {unknown} coordinates
 * @param {{ imageWidth?: number, imageHeight?: number }} [options]
 * @param {object} [meta]
 */
export function apiAreaCoordinatesToAnnotation(
  coordinates,
  { imageWidth = 0, imageHeight = 0 } = {},
  meta = {},
) {
  let points = [];

  if (Array.isArray(coordinates)) {
    if (coordinates.length > 0 && typeof coordinates[0] === 'object' && 'x' in coordinates[0]) {
      points = coordinates;
    } else {
      const parsed = parseLayoutCoordinates(coordinates);
      if (parsed.length === 1 && parsed[0]?.points) {
        return { ...parsed[0], ...meta };
      }
      return parsed[0] ? { ...parsed[0], ...meta } : null;
    }
  } else {
    const parsed = parseLayoutCoordinates(coordinates);
    if (parsed[0]) return { ...parsed[0], ...meta };
    return null;
  }

  if (points.length === 0) return null;

  if (imageWidth <= 0 || imageHeight <= 0) return null;

  const normalized = points.map((point) => pixelToNormalized(point, imageWidth, imageHeight));

  if (normalized.length === 4) {
    const xs = normalized.map((point) => point.x);
    const ys = normalized.map((point) => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    return {
      type: 'rectangle',
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      id: meta.id,
      label: meta.area_label ?? meta.label ?? '',
      visible: true,
      ...meta,
    };
  }

  return {
    type: 'polygon',
    points: normalized.flatMap((point) => [point.x, point.y]),
    closed: true,
    id: meta.id,
    label: meta.area_label ?? meta.label ?? '',
    visible: true,
    ...meta,
  };
}

/**
 * Map project layout `areas` rows into floor-plan editor annotations.
 *
 * @param {unknown[]} areas
 * @param {{ imageWidth?: number, imageHeight?: number }} [options]
 * @returns {object[]}
 */
export function flattenProjectLayoutAreasToAnnotations(
  areas = [],
  { imageWidth = 0, imageHeight = 0 } = {},
) {
  if (!Array.isArray(areas) || areas.length === 0) return [];
  if (imageWidth <= 0 || imageHeight <= 0) return [];

  return areas
    .map((area, areaIndex) => {
      const areaId = String(area?.area_id ?? area?.name ?? area?.id ?? `area-${areaIndex}`);
      const annotation = apiAreaCoordinatesToAnnotation(
        area?.coordinates ?? area?.coords,
        { imageWidth, imageHeight },
        {
          id: areaId,
          area_ref: areaId,
          area_label: area?.area_label ?? area?.area_name ?? area?.area ?? '',
          area_type: area?.area_type ?? '',
          carpet_area: area?.carpet_area ?? '',
          color: area?.color ?? '',
          saved: true,
          locked: false,
          area,
        },
      );

      return annotation;
    })
    .filter(Boolean);
}

/**
 * @param {object} annotation
 * @returns {string}
 */
export function getProjectLayoutAreaId(annotation) {
  return String(
    annotation?.area_ref ??
      annotation?.area?.area_id ??
      annotation?.area?.name ??
      annotation?.id ??
      '',
  ).trim();
}

/**
 * @param {object} annotation
 */
export function isProjectLayoutAnnotationSaved(annotation) {
  return annotation?.saved === true;
}

const PROJECT_LAYOUT_AREA_SHAPE_TYPES = new Set([
  'rectangle',
  'circle',
  'polygon',
  'polyline',
  'pen',
]);

/**
 * Unsaved drawn shape that still needs "Add area" modal (not a marker point).
 *
 * @param {object | null | undefined} annotation
 */
export function isProjectLayoutDraftArea(annotation) {
  if (!annotation || isProjectLayoutAnnotationSaved(annotation)) return false;
  if (annotation.type === 'point' || annotation.marker) return false;
  return PROJECT_LAYOUT_AREA_SHAPE_TYPES.has(annotation.type);
}

/**
 * Saved or draft area boundary on the project layout canvas (excludes markers).
 *
 * @param {object | null | undefined} annotation
 * @returns {boolean}
 */
export function isProjectLayoutAreaBoundaryCandidate(annotation) {
  if (!annotation || annotation.type === 'point' || annotation.marker) return false;
  if (!isProjectLayoutAnnotationSaved(annotation) && !isProjectLayoutDraftArea(annotation)) {
    return false;
  }
  return isTopLevelLayoutSpaceBoundaryCandidate(annotation);
}

/**
 * Whether a project layout area boundary overlaps any other area boundary.
 *
 * @param {object} candidate
 * @param {object[]} annotations
 * @returns {boolean}
 */
export function projectLayoutAreaBoundaryOverlapsAny(candidate, annotations) {
  if (!isProjectLayoutAreaBoundaryCandidate(candidate)) return false;
  const peers = (annotations ?? []).filter(
    (item) => isProjectLayoutAreaBoundaryCandidate(item) && item.id !== candidate.id,
  );
  return layoutSpaceBoundaryOverlapsAny(candidate, peers);
}

/**
 * Stable signature for area geometry (move/resize detection).
 *
 * @param {object | null | undefined} annotation
 * @returns {string}
 */
export function getProjectLayoutAreaBoundaryGeometrySignature(annotation) {
  if (!annotation) return '';

  if (annotation.type === 'rectangle') {
    return JSON.stringify({
      type: annotation.type,
      x: annotation.x,
      y: annotation.y,
      width: annotation.width,
      height: annotation.height,
    });
  }

  if (annotation.type === 'circle') {
    return JSON.stringify({
      type: annotation.type,
      x: annotation.x,
      y: annotation.y,
      radiusX: annotation.radiusX,
      radiusY: annotation.radiusY,
    });
  }

  if (annotation.type === 'polygon' || annotation.type === 'polyline') {
    return JSON.stringify({
      type: annotation.type,
      points: annotation.points,
      closed: annotation.closed,
    });
  }

  if (annotation.type === 'pen') {
    return JSON.stringify({
      type: annotation.type,
      closed: annotation.closed,
      bezierPoints: annotation.bezierPoints,
    });
  }

  return '';
}

/**
 * Top-most saved project layout area containing normalized (nx, ny), if any.
 *
 * @param {number} nx
 * @param {number} ny
 * @param {object[] | null | undefined} annotations
 * @returns {object | null}
 */
export function findSavedProjectLayoutAreaAt(nx, ny, annotations) {
  if (!Array.isArray(annotations) || annotations.length === 0) return null;

  for (let index = annotations.length - 1; index >= 0; index -= 1) {
    const annotation = annotations[index];
    if (!isProjectLayoutAnnotationSaved(annotation)) continue;
    if (annotation.type === 'point') continue;
    if (isNormalizedPointInShapeGeometry(nx, ny, annotation)) return annotation;
  }

  return null;
}

/**
 * @param {number} nx
 * @param {number} ny
 * @param {object[] | null | undefined} annotations
 */
export function isPointInSavedProjectLayoutAreas(nx, ny, annotations) {
  return findSavedProjectLayoutAreaAt(nx, ny, annotations) != null;
}

/**
 * @param {object} annotation
 * @param {number} naturalWidth
 * @param {number} naturalHeight
 * @returns {string}
 */
export function getProjectLayoutAreaCoordinatesSignature(annotation, naturalWidth, naturalHeight) {
  return JSON.stringify(annotationToApiCoordinates(annotation, naturalWidth, naturalHeight));
}

/**
 * @param {object} annotation
 * @param {number} naturalWidth
 * @param {number} naturalHeight
 * @returns {{ x: number, y: number }[]}
 */
export function annotationToApiCoordinates(annotation, naturalWidth, naturalHeight) {
  if (!annotation || naturalWidth <= 0 || naturalHeight <= 0) return [];

  const toPixel = (x, y) => normalizedToPixel(x, y, naturalWidth, naturalHeight);

  if (annotation.type === 'rectangle') {
    const x1 = annotation.x;
    const y1 = annotation.y;
    const x2 = annotation.x + annotation.width;
    const y2 = annotation.y + annotation.height;
    return [toPixel(x1, y1), toPixel(x2, y1), toPixel(x2, y2), toPixel(x1, y2)];
  }

  if (annotation.type === 'circle') {
    const cx = Number(annotation.x ?? 0);
    const cy = Number(annotation.y ?? 0);
    const radiusX = Number(annotation.radiusX ?? 0);
    const radiusY = Number(annotation.radiusY ?? 0);
    return [
      toPixel(cx - radiusX, cy - radiusY),
      toPixel(cx + radiusX, cy - radiusY),
      toPixel(cx + radiusX, cy + radiusY),
      toPixel(cx - radiusX, cy + radiusY),
    ];
  }

  if (annotation.type === 'polygon' || annotation.type === 'polyline') {
    const pts = annotation.points ?? [];
    const result = [];
    for (let index = 0; index < pts.length; index += 2) {
      result.push(toPixel(pts[index], pts[index + 1]));
    }
    return result;
  }

  if (annotation.type === 'pen' && Array.isArray(annotation.bezierPoints)) {
    return annotation.bezierPoints.map((point) => toPixel(point.x, point.y));
  }

  if (annotation.type === 'point') {
    return [toPixel(annotation.x, annotation.y)];
  }

  return [];
}

/**
 * @param {string} layoutId
 * @param {object} annotation
 * @param {{ area_label: string, area_type: string, carpet_area?: string }} formValues
 * @param {number} naturalWidth
 * @param {number} naturalHeight
 * @param {number} [colorIndex]
 */
export function buildSaveLayoutAreasPayload(
  layoutId,
  annotation,
  formValues,
  naturalWidth,
  naturalHeight,
  colorIndex = 0,
) {
  const coordinates = annotationToApiCoordinates(annotation, naturalWidth, naturalHeight);
  const color =
    annotation?.color || PROJECT_LAYOUT_AREA_COLORS[colorIndex % PROJECT_LAYOUT_AREA_COLORS.length];

  return {
    layout_id: String(layoutId ?? '').trim(),
    areas: [
      {
        area_label: formValues.area_label,
        area_type: formValues.area_type,
        carpet_area: String(formValues.carpet_area ?? '').trim(),
        color,
        coordinates,
      },
    ],
  };
}

/**
 * @param {object} annotation
 * @param {number} naturalWidth
 * @param {number} naturalHeight
 */
export function buildEditLayoutAreaPayload(annotation, naturalWidth, naturalHeight) {
  const areaId = getProjectLayoutAreaId(annotation);
  return {
    area_id: areaId,
    area_label: annotation?.area_label ?? annotation?.label ?? '',
    area_type: annotation?.area_type ?? '',
    carpet_area: String(annotation?.carpet_area ?? '').trim(),
    color: String(annotation?.color ?? '').trim(),
    coordinates: annotationToApiCoordinates(annotation, naturalWidth, naturalHeight),
  };
}

/**
 * @param {object} annotation
 * @param {number} naturalWidth
 * @param {number} naturalHeight
 * @returns {{ x: number, y: number } | null}
 */
export function getAnnotationPixelCenter(annotation, naturalWidth, naturalHeight) {
  if (!annotation || naturalWidth <= 0 || naturalHeight <= 0) return null;

  if (annotation.type === 'rectangle') {
    return normalizedToPixel(
      annotation.x + annotation.width / 2,
      annotation.y + annotation.height / 2,
      naturalWidth,
      naturalHeight,
    );
  }

  if (annotation.type === 'circle') {
    return normalizedToPixel(annotation.x, annotation.y, naturalWidth, naturalHeight);
  }

  if (annotation.type === 'polygon' || annotation.type === 'polyline') {
    const pts = annotation.points ?? [];
    if (pts.length < 2) return null;
    let sumX = 0;
    let sumY = 0;
    const count = pts.length / 2;
    for (let index = 0; index < pts.length; index += 2) {
      sumX += pts[index];
      sumY += pts[index + 1];
    }
    return normalizedToPixel(sumX / count, sumY / count, naturalWidth, naturalHeight);
  }

  if (annotation.type === 'pen' && Array.isArray(annotation.bezierPoints)) {
    const count = annotation.bezierPoints.length;
    if (count === 0) return null;
    const sumX = annotation.bezierPoints.reduce((total, point) => total + point.x, 0);
    const sumY = annotation.bezierPoints.reduce((total, point) => total + point.y, 0);
    return normalizedToPixel(sumX / count, sumY / count, naturalWidth, naturalHeight);
  }

  if (annotation.type === 'point') {
    return normalizedToPixel(annotation.x, annotation.y, naturalWidth, naturalHeight);
  }

  return null;
}

/**
 * @param {string} projectId
 * @param {string} layoutId
 * @returns {string}
 */
export function buildProjectLayoutEditorUrl(projectId, layoutId) {
  const project = String(projectId ?? '').trim();
  const layout = String(layoutId ?? '').trim();
  if (!project || !layout) return '';
  return `/projects/${encodeURIComponent(project)}/layouts/${encodeURIComponent(layout)}`;
}

function resolveFloorDraftCycle(row, historyRows = []) {
  const explicit = Number(row?.draft_cycle_version ?? 0);
  if (explicit > 0) return explicit;

  // Same rule as backend `_floor_draft_cycle`: nearest earlier lock milestone.
  const seq = Number(row?.version ?? 0);
  if (seq <= 0) return 0;

  let best = 0;
  for (const other of historyRows) {
    const locked = Number(other?.locked_version ?? 0);
    const otherSeq = Number(other?.version ?? other?.seq ?? 0);
    if (locked > 0 && otherSeq < seq && locked > best) {
      best = locked;
    }
  }
  return best;
}

function accordionListSortKey(row, { historyRows = [] } = {}) {
  const layoutType = row?.layout_type ?? 'Floor Layout';
  const locked = Number(row?.locked_version ?? 0);
  const period = Number(row?.period_version ?? 0);
  const floorSync = Number(row?.floor_sync ?? 0);
  const sub = Number(row?.sub_version ?? 0);
  const seq = Number(row?.version ?? 0);

  if (layoutType === 'Floor Layout') {
    if (locked) return [locked, 0, 0, 0, seq];
    // Do NOT fall back to current floor_locked_version — that pulls old v1 drafts into the V2 cycle.
    const cycle = resolveFloorDraftCycle(row, historyRows);
    return [cycle, 1, period, sub, seq];
  }

  if (floorSync > 0 && sub > 0) return [floorSync, 2, sub, period, seq];
  if (floorSync > 0) return [floorSync, 0, 0, 0, seq];
  return [0, 1, period, sub, seq];
}

function versionHistorySortKey(row, currentId, context) {
  const rowId = String(row?.layout_id ?? row?.name ?? row?.id ?? '').trim();
  const isCurrent = Boolean(row?.is_current) || rowId === currentId;
  const key = accordionListSortKey(row, context);
  return [isCurrent ? 0 : 1, ...key.map((value) => (typeof value === 'number' ? -value : value))];
}

function compareVersionHistorySortKeys(left, right) {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    if (a < b) return -1;
    if (a > b) return 1;
  }
  return 0;
}

function sortProjectLayoutVersionHistoryRows(rows, layout) {
  const currentId = String(layout?.name ?? layout?.id ?? '').trim();
  const context = {
    historyRows: rows,
  };

  return [...rows].sort((left, right) =>
    compareVersionHistorySortKeys(
      versionHistorySortKey(left, currentId, context),
      versionHistorySortKey(right, currentId, context),
    ),
  );
}

/**
 * @param {object | null | undefined} layout
 * @returns {{ id: string, label: string, layout: object, isCurrent: boolean, readOnly: boolean, versionKind?: string, indentLevel?: number }[]}
 */
export function getProjectLayoutVersionSections(layout) {
  if (!layout) return [];

  const currentId = String(layout?.name ?? layout?.id ?? 'current').trim();
  const historyRows = Array.isArray(layout?.version_history) ? layout.version_history : null;

  const sourceRows = historyRows?.length
    ? historyRows
    : [
        {
          layout_id: currentId,
          name: currentId,
          id: currentId,
          display_version: layout?.display_version,
          layout_image: layout?.layout_image ?? '',
          areas: Array.isArray(layout?.areas) ? layout.areas : [],
          version: layout?.version,
          status: layout?.status ?? '',
          parent_layout: layout?.parent_layout ?? null,
          area_count: layout?.area_count ?? layout?.areas?.length ?? 0,
          locked_version: layout?.locked_version ?? 0,
          period_version: layout?.period_version ?? 0,
          floor_sync: layout?.floor_sync ?? 0,
          sub_version: layout?.sub_version ?? 0,
          version_kind: layout?.version_kind,
          is_current: true,
        },
        ...(Array.isArray(layout?.versions) ? layout.versions : []),
      ];

  const orderedRows = sortProjectLayoutVersionHistoryRows(sourceRows, layout);
  const floorLockedVersion = Number(layout?.floor_locked_version ?? 0);

  return orderedRows
    .map((versionRow) => {
      const versionId = String(
        versionRow?.layout_id ?? versionRow?.name ?? versionRow?.id ?? '',
      ).trim();
      if (!versionId) return null;

      const isCurrent = Boolean(versionRow?.is_current) || versionId === currentId;
      const locked = Number(versionRow?.locked_version ?? 0);
      const isLatestLock = floorLockedVersion > 0 && locked === floorLockedVersion;
      const versionKind = resolveLayoutVersionKind(versionRow, { floorLockedVersion });
      const indentLevel = versionKind === 'sub' ? 2 : versionKind === 'draft' ? 1 : 0;
      // "Current" = open draft/sub edit only — locked milestones (V3) use Active + Locked.
      const showCurrentBadge = isCurrent && versionKind !== 'locked';

      // Version lifecycle badge (Active / Superseded) — not layout task workflow status.
      let status = versionRow?.status ?? (isCurrent ? 'Active' : 'Superseded');
      if (isLatestLock || isCurrent) {
        status = 'Active';
      } else {
        status = 'Superseded';
      }

      let areas = Array.isArray(versionRow?.areas) ? versionRow.areas : [];
      if (isCurrent && areas.length === 0 && Array.isArray(layout?.areas)) {
        areas = layout.areas;
      }
      const layoutImage =
        String(versionRow?.layout_image ?? '').trim() ||
        (isCurrent ? String(layout?.layout_image ?? '').trim() : '') ||
        '';

      return {
        id: versionId,
        label: formatLayoutVersionFromFields({
          ...versionRow,
          layout_type: versionRow?.layout_type ?? layout?.layout_type ?? layout?.custom_layout_type,
          custom_layout_type:
            versionRow?.custom_layout_type ?? layout?.custom_layout_type ?? layout?.layout_type,
          floor_locked_version: floorLockedVersion,
          draft_cycle_version: versionRow?.draft_cycle_version,
        }),
        versionKind,
        indentLevel,
        isCurrent,
        showCurrentBadge,
        isLatestLock,
        layout: {
          name: versionId,
          id: versionId,
          layout_image: layoutImage,
          areas,
          version: versionRow?.version,
          display_version: formatLayoutVersionFromFields({
            ...versionRow,
            layout_type:
              versionRow?.layout_type ?? layout?.layout_type ?? layout?.custom_layout_type,
            floor_locked_version: floorLockedVersion,
          }),
          status,
          parent_layout: versionRow?.parent_layout ?? null,
          area_count: versionRow?.area_count ?? areas.length,
          locked_version: versionRow?.locked_version ?? 0,
          period_version: versionRow?.period_version ?? 0,
          floor_sync: versionRow?.floor_sync ?? 0,
          sub_version: versionRow?.sub_version ?? 0,
          floor_locked_version: floorLockedVersion,
          version_kind: versionKind,
        },
        readOnly: !isCurrent,
      };
    })
    .filter(Boolean);
}
