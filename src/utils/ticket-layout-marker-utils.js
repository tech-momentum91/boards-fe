import { layoutCoordinatePointsToAnnotation } from '@/utils/layout-coordinate-payload';
import {
  findAssociatedSpaceRegionAt,
  findLayoutMarkerTargetAt,
} from '@/components/floor-plan-editor';
import {
  SERVER_SUBSPACE_PIN_SOURCE,
  TICKET_MARKER_SOURCE,
} from '@/constants/layout/annotation-sources';

import {
  TICKET_MARKER_COORDINATE_API_FIELD,
  TICKET_MARKER_COORDINATE_FIELD,
  getTicketFieldValue,
} from '@/components/ticket-management/constants';

export const TICKET_MARKER_ANNOTATION_ID = 'ticket-location-marker';

/**
 * Read marker coordinate from ticket API/detail payload.
 *
 * @param {object | null | undefined} ticket
 * @returns {unknown}
 */
export function readTicketMarkerCoordinateFromTicket(ticket) {
  if (!ticket || typeof ticket !== 'object') return '';
  const mapped = getTicketFieldValue(ticket, TICKET_MARKER_COORDINATE_FIELD);
  if (mapped !== undefined && mapped !== null && mapped !== '') {
    return mapped;
  }
  return ticket[TICKET_MARKER_COORDINATE_API_FIELD] ?? ticket[TICKET_MARKER_COORDINATE_FIELD] ?? '';
}

/**
 * @param {unknown} ref
 * @returns {string}
 */
export function normalizeLayoutFloorRefKey(ref) {
  return String(ref ?? '')
    .trim()
    .toLowerCase();
}

/**
 * @param {unknown} requestedRef
 * @param {unknown} detailRef
 * @returns {boolean}
 */
export function areLayoutFloorRefsEquivalent(requestedRef, detailRef) {
  const requested = normalizeLayoutFloorRefKey(requestedRef);
  const detail = normalizeLayoutFloorRefKey(detailRef);
  if (!requested || !detail) return true;
  return requested === detail;
}

/**
 * @param {object | null | undefined} ticket
 * @param {object | null | undefined} [markerCoordinate]
 * @returns {string}
 */
export function resolveTicketMarkerFloorRef(ticket, markerCoordinate = null) {
  const marker =
    markerCoordinate && typeof markerCoordinate === 'object'
      ? markerCoordinate
      : parseTicketMarkerCoordinate(readTicketMarkerCoordinateFromTicket(ticket));
  return String(marker?.floor_ref ?? '').trim();
}

/**
 * @param {unknown} raw
 * @returns {object | null}
 */
export function parseTicketMarkerCoordinate(raw) {
  if (raw == null || raw === '') return null;

  let value = raw;
  for (let depth = 0; depth < 3 && typeof value === 'string'; depth += 1) {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const points = value.points;
  if (!Array.isArray(points) || points.length === 0) return null;

  const normalizedPoints = points
    .map((point) => {
      if (Array.isArray(point) && point.length >= 2) {
        const x = Number(point[0]);
        const y = Number(point[1]);
        return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
      }
      if (point && typeof point === 'object') {
        const x = Number(point.x);
        const y = Number(point.y);
        return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
      }
      return null;
    })
    .filter(Boolean);

  if (normalizedPoints.length === 0) return null;

  return {
    ...value,
    points: normalizedPoints,
  };
}

/**
 * @param {object | null | undefined} coordinate
 * @returns {object | null}
 */
export function ticketMarkerCoordinateToAnnotation(coordinate) {
  const parsed = parseTicketMarkerCoordinate(coordinate);
  if (!parsed) return null;
  const pairs = Array.isArray(parsed.points)
    ? parsed.points.filter(
        (p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]),
      )
    : [];
  if (pairs.length === 0) return null;
  const base = layoutCoordinatePointsToAnnotation(TICKET_MARKER_ANNOTATION_ID, '', pairs);
  return {
    ...base,
    id: TICKET_MARKER_ANNOTATION_ID,
    type: 'point',
    source: TICKET_MARKER_SOURCE,
    locked: true,
    visible: true,
    suppressCanvasShape: true,
  };
}

/**
 * @param {object | null | undefined} option
 * @returns {string}
 */
function resolveFloorOptionRef(option) {
  if (!option || typeof option !== 'object') return '';
  return String(
    option.floor_ref ?? option.name ?? option.block_floor_id ?? option.value ?? '',
  ).trim();
}

/**
 * @param {object[]} floorOptions
 * @param {string} floorValue
 * @returns {string}
 */
export function resolveFloorRefFromOptions(floorOptions, floorValue) {
  const value = String(floorValue || '').trim();
  if (!value) return '';

  const options = Array.isArray(floorOptions) ? floorOptions : [];
  const match = options.find((option) => {
    const candidates = [
      option?.value,
      option?.label,
      option?.name,
      option?.floor_ref,
      option?.block_floor_id,
      option?.floor,
    ]
      .map((candidate) => String(candidate ?? '').trim())
      .filter(Boolean);
    return candidates.includes(value);
  });

  if (match) return resolveFloorOptionRef(match);
  return value;
}

/**
 * @param {object | null | undefined} ticket
 * @param {object[]} floorOptions
 * @returns {string}
 */
export function resolveTicketLayoutFloorRef(ticket, floorOptions) {
  const markerFloorRef = resolveTicketMarkerFloorRef(ticket);
  if (markerFloorRef) return markerFloorRef;

  const floorValue = String(
    ticket?.custom_floor ?? ticket?.floor_zone ?? ticket?.floor ?? '',
  ).trim();
  return resolveFloorRefFromOptions(floorOptions, floorValue);
}

/**
 * Space row id from ticket API (`custom_space` link) or marker payload.
 *
 * @param {object | null | undefined} ticket
 * @param {object | null | undefined} [markerCoordinate]
 * @returns {string}
 */
export function resolveTicketSpaceRef(ticket, markerCoordinate = null) {
  const marker =
    markerCoordinate && typeof markerCoordinate === 'object'
      ? markerCoordinate
      : parseTicketMarkerCoordinate(readTicketMarkerCoordinateFromTicket(ticket));

  const fromMarker = String(marker?.space_id ?? '').trim();
  if (fromMarker) return fromMarker;

  const fromCustomSpace = String(ticket?.custom_space ?? '').trim();
  if (fromCustomSpace) return fromCustomSpace;

  return String(ticket?.space ?? '').trim();
}

/**
 * Display label for ticket space (`custom_space_name` from API).
 *
 * @param {object | null | undefined} ticket
 * @returns {string}
 */
export function resolveTicketSpaceDisplayName(ticket) {
  return String(ticket?.custom_space_name ?? '').trim();
}

/**
 * @param {string} spaceRef
 * @param {object[]} annotations
 * @param {string} [displayName]
 * @returns {object | null}
 */
export function findSpaceAnnotationByRef(spaceRef, annotations, displayName = '') {
  const ref = String(spaceRef || '').trim();
  const nameLower = String(displayName || '')
    .trim()
    .toLowerCase();
  if (!Array.isArray(annotations) || annotations.length === 0) return null;

  if (ref) {
    const byRef =
      annotations.find((ann) => String(ann?.space_ref ?? '').trim() === ref) ??
      annotations.find((ann) => {
        const spaceName = String(ann?.space?.name ?? ann?.space?.id ?? '').trim();
        return spaceName === ref;
      });
    if (byRef) return byRef;
  }

  if (nameLower) {
    return (
      annotations.find((ann) => {
        const space = ann?.space;
        if (!space || typeof space !== 'object') return false;
        const candidates = [space.inventory_name, space.inventoryName, space.label, space.name]
          .map((v) =>
            String(v || '')
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean);
        return candidates.includes(nameLower);
      }) ?? null
    );
  }

  return null;
}

/**
 * @param {string} spaceRef
 * @param {object[]} annotations
 * @returns {string}
 */
export function resolveSpaceDisplayName(spaceRef, annotations) {
  const ann = findSpaceAnnotationByRef(spaceRef, annotations);
  const space = ann?.space;
  if (space && typeof space === 'object') {
    return String(
      space.inventory_name || space.inventoryName || space.label || space.name || '',
    ).trim();
  }
  return String(spaceRef || '').trim();
}

/**
 * Resolve which annotation to zoom/highlight when opening a layout with a saved marker.
 *
 * @param {{
 *   markerCoordinate?: object | null,
 *   markerAnnotation?: object | null,
 *   spaceId?: string,
 *   serverAnnotations?: object[],
 * }} params
 * @returns {{ focusAnnotationId: string | null, highlightedAnnotationId: string | null }}
 */
export function resolveLayoutMarkerFocusTargets({
  markerCoordinate = null,
  markerAnnotation = null,
  spaceId = '',
  serverAnnotations = [],
}) {
  const ann = markerAnnotation ?? ticketMarkerCoordinateToAnnotation(markerCoordinate);
  const spaceRef = String(spaceId ?? markerCoordinate?.space_id ?? '').trim();
  const subSpaceId = String(markerCoordinate?.sub_space_id ?? '').trim();
  const annotations = Array.isArray(serverAnnotations) ? serverAnnotations : [];

  let highlighted = null;

  if (subSpaceId) {
    highlighted =
      annotations.find(
        (row) =>
          row?.source === SERVER_SUBSPACE_PIN_SOURCE &&
          String(row?.sub_space_id ?? '').trim() === subSpaceId,
      ) ?? null;
  }

  if (!highlighted && spaceRef) {
    highlighted = findSpaceAnnotationByRef(spaceRef, annotations);
  }

  if (!highlighted && ann) {
    const target = findLayoutMarkerTargetAt(ann.x, ann.y, annotations);
    highlighted = target?.ann ?? null;
  }

  if (!highlighted && ann) {
    highlighted = findAssociatedSpaceRegionAt(ann.x, ann.y, annotations);
  }

  const highlightedAnnotationId = highlighted?.id ?? null;
  const focusAnnotationId = highlightedAnnotationId ?? ann?.id ?? null;

  return { focusAnnotationId, highlightedAnnotationId };
}
