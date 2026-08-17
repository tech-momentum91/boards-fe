/**
 * Helpers for layout annotation ↔ space list (Redux list rows use spaceType/spaceName;
 * floor-plan sidebar + SpaceInfoPopover expect inventory_type / inventory_name).
 */

import {
  isNormalizedPointInAssociatedSpaceShape,
  isNormalizedPointInShapeGeometry,
} from '@/components/floor-plan-editor';
import {
  DESK_COWORKER_MARKER,
  SERVER_SUBSPACE_PIN_SOURCE,
  SUBSPACE_LAYOUT_PENDING_SOURCE,
} from '@/constants/layout/annotation-sources';
import {
  layoutCoordinateToAnnotationShape,
  readDeskAssignedClient,
  readDeskAssignedClientCompanyLogo,
  readDeskAssignedClientName,
} from '@/utils/client-floor-layout-annotations';
import {
  isLayoutCoworkingDeskMarkerType,
  LEGACY_FLEXI_DESK_COWORKING_TYPE,
  normalizeCoworkingInventoryType,
  resolveCoworkingInventoryTypeForApi,
} from '@/utils/layout-coworking-inventory-type';
import { layoutCoordinatePointsToAnnotation } from '@/utils/layout-coordinate-payload';

export { SERVER_SUBSPACE_PIN_SOURCE, DESK_COWORKER_MARKER };
export {
  LEGACY_FLEXI_DESK_COWORKING_TYPE,
  isLayoutCoworkingDeskMarkerType,
  normalizeCoworkingInventoryType,
  resolveCoworkingInventoryTypeForApi,
};

/**
 * Format assignment / lease dates for SpaceInfoPopover (e.g. "23 Jan 25").
 *
 * @param {string | number | Date | null | undefined} value
 * @returns {string}
 */
export function formatLayoutPopoverDate(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  const d = new Date(s.includes('T') ? s : `${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    }).format(d);
  } catch {
    return s;
  }
}

/**
 * Prefer an occupied assignment when multiple client rows exist on a layout shape.
 *
 * @param {unknown[]} clients
 * @returns {object | null}
 */
/**
 * Resource, Parking, and Common Area spaces do not support allocate-client or sub-space actions.
 *
 * @param {string | null | undefined} inventoryType
 */
export function isLayoutSpaceExcludedFromAllocateAndSubSpace(inventoryType) {
  const v = String(inventoryType || '')
    .trim()
    .toLowerCase();
  if (!v) return false;
  if (v === 'resource') return true;
  if (v === 'parking') return true;
  if (v.includes('common')) return true;
  return false;
}

/**
 * Co-working spaces use desk markers instead of client allocation on the layout.
 *
 * @param {unknown} inventoryType
 * @returns {boolean}
 */
export function isLayoutCoworkingSpace(inventoryType) {
  const v = String(inventoryType || '')
    .trim()
    .toLowerCase();
  if (!v) return false;
  return v === 'co-working space' || v.includes('co-work') || v.includes('cowork');
}

/**
 * @param {unknown} inventoryType
 * @returns {boolean}
 */
export function isLayoutManagedOfficeSpace(inventoryType) {
  return String(inventoryType || '').trim() === 'Managed Office';
}

export function pickPrimaryLayoutClient(clients) {
  if (!Array.isArray(clients) || clients.length === 0) return null;
  const occupied = clients.find((c) =>
    String(c?.status || '')
      .toLowerCase()
      .includes('occup'),
  );
  return occupied ?? clients[0];
}

/**
 * Whether a layout space has a real client assignment (assign_space), not merely
 * `status: Occupied` from desk/sub-space side effects on get_layout_detail.
 *
 * @param {object | null | undefined} space
 * @param {unknown[] | null | undefined} [clients]
 * @returns {boolean}
 */
export function hasLayoutSpaceClientAssignment(space, clients) {
  if (!space || typeof space !== 'object') return false;

  const nameFromSpace = String(
    space.client_name ?? space.customer_name ?? space.custom_legal_name ?? '',
  ).trim();
  if (nameFromSpace) return true;

  const customerRef = String(space.customer ?? space.customer_id ?? space.client ?? '').trim();
  if (customerRef) return true;

  const clientList = Array.isArray(clients)
    ? clients
    : Array.isArray(space.clients)
      ? space.clients
      : [];
  const primary = pickPrimaryLayoutClient(clientList);
  if (!primary || typeof primary !== 'object') return false;

  const primaryCustomer = String(
    primary.customer ?? primary.customer_id ?? primary.customer_name ?? primary.name ?? '',
  ).trim();
  const primaryName = String(
    primary.customer_name ?? primary.custom_legal_name ?? primary.client_name ?? '',
  ).trim();

  return Boolean(primaryCustomer || primaryName);
}

/**
 * Merge layout-detail `space` + shape-level `clients[]` into one object for SpaceInfoPopover.
 * Does not call extra APIs — uses embedded assignment rows from get_layout_detail.
 *
 * @param {object | null | undefined} space
 * @param {unknown[] | null | undefined} clients
 * @returns {object | null}
 */
export function mergeSpaceWithClientsForPopover(space, clients) {
  if (!space || typeof space !== 'object') return null;

  const primary = pickPrimaryLayoutClient(Array.isArray(clients) ? clients : []);
  const merged = { ...space };

  merged.inventory_type = String(merged.inventory_type || '').trim();
  merged.inventory_name = String(merged.inventory_name || merged.name || '').trim();

  if (merged.expected_per_seat_cost == null && merged.expected_per_seat_rate != null) {
    merged.expected_per_seat_cost = Number(merged.expected_per_seat_rate);
  }

  if (primary && typeof primary === 'object') {
    merged.client_name =
      primary.customer_name || primary.customer || merged.client_name || merged.customer_name;
    merged.client_phone =
      primary.phone || primary.mobile_no || primary.contact_phone || merged.client_phone;
    merged.client_email = primary.email || merged.client_email;

    // if (primary.status) merged.status = primary.status;

    if (primary.start_date) {
      merged.lease_start_date = formatLayoutPopoverDate(primary.start_date);
    }
    if (primary.end_date) {
      merged.lease_end_date = formatLayoutPopoverDate(primary.end_date);
    }

    if (primary.expected_per_seat_rate != null && merged.expected_per_seat_cost == null) {
      merged.expected_per_seat_cost = Number(primary.expected_per_seat_rate);
    }
    if (primary.credit_per_seat != null && merged.credit_per_seat == null) {
      merged.credit_per_seat = Number(primary.credit_per_seat);
    }
    if (primary.inventory_type && !merged.inventory_type) {
      merged.inventory_type = String(primary.inventory_type).trim();
    }
    if (
      primary.assigned_seats != null &&
      (merged.total_seats == null || Number(merged.total_seats) === 0)
    ) {
      merged.total_seats = Number(primary.assigned_seats);
    }
  }

  if (
    !hasLayoutSpaceClientAssignment(merged, clients) &&
    String(merged.status || '')
      .toLowerCase()
      .includes('occup')
  ) {
    merged.status = 'Available';
  }

  return merged;
}

export function parseLayoutCoordinates(input) {
  if (!input) return [];
  let parsed = [];
  try {
    parsed = typeof input === 'string' ? JSON.parse(input) : input;
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item) => {
    if (!item || typeof item !== 'object') return item;
    if (item.type === 'rectangled') return { ...item, type: 'rectangle' };
    return item;
  });
}

/**
 * Flatten layout detail shapes into annotation rows (same shape as layout-annotation-page initial seed).
 *
 * @param {object | null | undefined} layoutDetailData
 * @returns {object[]}
 */
/**
 * New API: rows with `space_id` + `layout_coordinate.points` (and optional `space` / `clients`).
 *
 * @param {unknown[]} rows
 * @returns {object[]}
 */
function flattenCoordinateRowsToAnnotations(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const out = [];
  rows.forEach((row, idx) => {
    if (!row || typeof row !== 'object') return;
    const spaceRef = String(row.space_id ?? row.space_ref ?? row.name ?? '').trim();
    const lc = row.layout_coordinate ?? row.layout_coordinates ?? row.coordinates;
    const pts = lc && typeof lc === 'object' ? lc.points : null;
    if (!spaceRef || !Array.isArray(pts)) return;
    const normalizedSpace = row.space
      ? normalizeLayoutFloorSpaceRowForAssociation(row.space)
      : null;
    const spaceMeta =
      mergeSpaceWithClientsForPopover(normalizedSpace, row.clients) ?? normalizedSpace ?? null;
    const id = spaceRef ? `srv-${spaceRef}` : `srv-row-${idx}`;
    out.push(layoutCoordinatePointsToAnnotation(id, spaceRef, pts, spaceMeta));
  });
  return out;
}

/**
 * Detect arrays on the detail payload that carry per-space layout coordinates.
 *
 * @param {object | null | undefined} layoutDetailData
 * @returns {unknown[] | null}
 */
function findCoordinateItemRows(layoutDetailData) {
  if (!layoutDetailData || typeof layoutDetailData !== 'object') return null;
  const candidates = [
    layoutDetailData.space_layout_items,
    layoutDetailData.layout_coordinate_items,
    layoutDetailData.layout_items,
    layoutDetailData.space_coordinates,
  ];
  for (const arr of candidates) {
    if (!Array.isArray(arr) || arr.length === 0) continue;
    const first = arr[0];
    if (first && typeof first === 'object' && (first.layout_coordinate != null || first.space_id)) {
      return arr;
    }
  }
  return null;
}

export function flattenLayoutShapesToAnnotations(layoutDetailData) {
  if (!layoutDetailData) return [];

  const directRows = findCoordinateItemRows(layoutDetailData);
  if (directRows) {
    const fromRows = flattenCoordinateRowsToAnnotations(directRows);
    if (fromRows.length > 0) return fromRows;
  }

  let allShapes = [];
  if (Array.isArray(layoutDetailData.layout_shapes)) {
    allShapes = layoutDetailData.layout_shapes;
  } else if (Array.isArray(layoutDetailData.shapes)) {
    allShapes = layoutDetailData.shapes;
  }

  const newFormatShapes = allShapes.filter(
    (s) =>
      s &&
      typeof s === 'object' &&
      (s.layout_coordinate?.points || s.layout_coordinates?.points || s.coordinates?.points) &&
      (s.space_id || s.space_ref),
  );
  if (newFormatShapes.length > 0) {
    return flattenCoordinateRowsToAnnotations(newFormatShapes);
  }

  if (allShapes.length === 0) return [];
  const sorted = [...allShapes].sort(
    (a, b) => (a.display_order ?? Infinity) - (b.display_order ?? Infinity),
  );
  return sorted.flatMap((shape) =>
    parseLayoutCoordinates(shape?.coordinates).map((coord) => ({
      ...coord,
      layout_shape_id: shape?.name || coord?.layout_shape_id || '',
      space_ref: shape?.space_ref || coord?.space_ref || '',
      hasCoordinateOnServer: true,
      ...shape,
      space: mergeSpaceWithClientsForPopover(shape?.space, shape?.clients) ?? shape?.space,
    })),
  );
}

/**
 * Match space list row by Frappe name (`id` / `name`) against the selected ref from the associate modal.
 *
 * @param {unknown[]} spacesData
 * @param {string} selectedSpaceRef
 * @returns {object | undefined}
 */
export function findSpaceRowForAssociation(spacesData, selectedSpaceRef) {
  if (!selectedSpaceRef || !Array.isArray(spacesData)) return undefined;
  const ref = String(selectedSpaceRef).trim();
  return spacesData.find((s) => {
    if (s && typeof s === 'object') {
      const id = s.id == null ? '' : String(s.id).trim();
      const name = s.name == null ? '' : String(s.name).trim();
      return ref === id || ref === name;
    }
    return false;
  });
}

/**
 * Normalize a space row from `get_spaces_by_floor` (or compatible layout detail `space`) for association + popover.
 *
 * @param {object | null | undefined} raw
 * @returns {object | null}
 */
export function normalizeLayoutFloorSpaceRowForAssociation(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name ?? raw.space_id ?? raw.id ?? '').trim();
  if (!name) return null;

  const details = raw.details && typeof raw.details === 'object' ? raw.details : {};

  const inventory_type = String(raw.inventory_type ?? raw.space_type ?? raw.spaceType ?? '').trim();
  const inventory_name = String(
    raw.inventory_name ?? raw.space_name ?? raw.spaceName ?? raw.title ?? name,
  ).trim();

  const coworking_inventory_type = normalizeCoworkingInventoryType(
    raw.coworking_inventory_type ?? details.coworking_inventory_type ?? '',
  );
  const managed_office_type = String(
    raw.managed_office_type ?? details.managed_office_type ?? '',
  ).trim();
  const resource_type = String(raw.resource_type ?? details.resource_type ?? '').trim();

  let subSpaceType = '';
  if (inventory_type === 'Co-working Space') subSpaceType = coworking_inventory_type;
  else if (inventory_type === 'Managed Office') subSpaceType = managed_office_type;
  else if (inventory_type === 'Resource') subSpaceType = resource_type;

  const expected_per_seat_cost = Number(
    raw.expected_per_seat_cost ?? details.expected_per_seat_cost ?? Number.NaN,
  );
  const credit_per_hour = Number(raw.credit_per_hour ?? details.credit_per_hour ?? Number.NaN);
  const credit_per_seat = Number(
    raw.credit_per_seat ?? raw.creditPerSeat ?? details.credit_per_seat ?? Number.NaN,
  );

  let seatRate = Number(raw.seatRate);
  if (!Number.isFinite(seatRate) || seatRate <= 0) {
    if (inventory_type === 'Resource' && Number.isFinite(credit_per_hour) && credit_per_hour > 0) {
      seatRate = credit_per_hour;
    } else if (
      inventory_type === 'Co-working Space' &&
      Number.isFinite(expected_per_seat_cost) &&
      expected_per_seat_cost > 0
    ) {
      seatRate = expected_per_seat_cost;
    } else {
      seatRate = Number(raw.expected_per_seat_rate ?? details.expected_per_seat_rate ?? Number.NaN);
    }
  }

  const pax = details.pax ?? raw.pax;
  const total_seats = Number(raw.total_seats ?? details.total_seats ?? 0) || 0;
  const available_seats = Number(raw.available_seats ?? details.available_seats ?? 0) || 0;

  return {
    ...raw,
    ...details,
    ...(total_seats > 0 ? { total_seats, totalSeats: total_seats } : {}),
    ...(available_seats >= 0 ? { available_seats, availableSeats: available_seats } : {}),
    id: name,
    name,
    spaceName: inventory_name,
    spaceType: inventory_type,
    inventory_type,
    inventory_name,
    coworking_inventory_type,
    managed_office_type,
    resource_type,
    subSpaceType,
    ...(Number.isFinite(seatRate) && seatRate > 0 ? { seatRate } : {}),
    ...(Number.isFinite(expected_per_seat_cost) && expected_per_seat_cost > 0
      ? { expected_per_seat_cost }
      : {}),
    ...(Number.isFinite(credit_per_hour) && credit_per_hour > 0 ? { credit_per_hour } : {}),
    ...(Number.isFinite(credit_per_seat) && credit_per_seat > 0
      ? { credit_per_seat, creditPerSeat: credit_per_seat }
      : {}),
    ...(pax != null && String(pax).trim() !== '' ? { pax } : {}),
  };
}

/**
 * Map Redux space list row → fields SpaceInfoPopover + annotationGroup expect.
 *
 * @param {object | null | undefined} row
 * @returns {object | null}
 */
export function buildAnnotationSpaceFromListRow(row) {
  if (!row || typeof row !== 'object') return null;

  const inventory_type = String(row.inventory_type || row.spaceType || '').trim();
  const inventory_name = String(row.inventory_name || row.spaceName || row.name || '').trim();

  const subSpaceType = row.subSpaceType && row.subSpaceType !== '-' ? row.subSpaceType : '';
  const seatRate = Number(row.seatRate);
  const seatRateNum = Number.isFinite(seatRate) ? seatRate : 0;

  const base = {
    ...row,
    inventory_type,
    inventory_name,
    status: row.status || 'Available',
    clients: row.clients ?? [],
    total_seats: Number(row.totalSeats ?? row.total_seats ?? 0) || 0,
  };

  if (inventory_type === 'Managed Office') {
    base.managed_office_type = row.managed_office_type || subSpaceType || '';
  } else if (inventory_type === 'Co-working Space') {
    base.coworking_inventory_type = normalizeCoworkingInventoryType(
      row.coworking_inventory_type || subSpaceType || '',
    );
    if (seatRateNum > 0) base.expected_per_seat_cost = seatRateNum;
  } else if (inventory_type === 'Resource') {
    base.resource_type = row.resource_type || subSpaceType || '';
    if (seatRateNum > 0) base.credit_per_hour = seatRateNum;
  }

  if (row.creditPerSeat != null && Number(row.creditPerSeat) > 0) {
    base.credit_per_seat = Number(row.creditPerSeat);
  }

  if (!base.expected_per_seat_cost && seatRateNum > 0) {
    base.expected_per_seat_cost = seatRateNum;
  }

  const { clients, client_name: existingClientName } = base;
  if (!existingClientName && Array.isArray(clients) && clients.length > 0) {
    const [firstClient] = clients;
    if (firstClient && typeof firstClient === 'object') {
      base.client_name = firstClient.client_name || firstClient.name || firstClient.customer_name;
      base.client_phone = firstClient.phone || firstClient.mobile_no || firstClient.contact_phone;
      base.client_email = firstClient.email;
    }
  }

  return base;
}

/**
 * Map layout annotation merged `space` (popover / shape meta) into the shape expected by
 * `AllocatedSpaceModal` (allocate-space-modal).
 *
 * @param {object | null | undefined} mergedSpace
 * @param {string} centerApiId Center docname for Assign Space API (`center` field).
 * @param {string} [blockFloorId] Floor / block id for Assign Space API.
 * @returns {object | null}
 */
/**
 * Resolve merged space meta for a layout shape by `space_id` / `space_ref` (layout detail API).
 *
 * @param {object | null | undefined} layoutDetailData
 * @param {string} spaceRef
 * @returns {object | null}
 */
export function findLayoutShapeMergedSpace(layoutDetailData, spaceRef) {
  const ref = String(spaceRef || '').trim();
  if (!ref || !layoutDetailData || typeof layoutDetailData !== 'object') return null;

  const shapes = Array.isArray(layoutDetailData.layout_shapes)
    ? layoutDetailData.layout_shapes
    : Array.isArray(layoutDetailData.shapes)
      ? layoutDetailData.shapes
      : [];

  const row = shapes.find((shape) => {
    if (!shape || typeof shape !== 'object') return false;
    const id = String(shape.space_id ?? shape.space_ref ?? shape.name ?? '').trim();
    return id === ref;
  });
  if (!row) return null;

  const normalized = row.space ? normalizeLayoutFloorSpaceRowForAssociation(row.space) : null;
  return mergeSpaceWithClientsForPopover(normalized, row.clients) ?? normalized;
}

export function mapMergedLayoutSpaceToAllocateModalSpaceData(
  mergedSpace,
  centerApiId,
  blockFloorId,
) {
  if (!mergedSpace || typeof mergedSpace !== 'object') return null;
  const id = String(
    mergedSpace.name ?? mergedSpace.id ?? mergedSpace.space_id ?? mergedSpace.space_ref ?? '',
  ).trim();
  if (!id) return null;

  const inventory_type = String(mergedSpace.inventory_type ?? mergedSpace.spaceType ?? '').trim();
  const totalSeats = Number(mergedSpace.total_seats ?? mergedSpace.totalSeats ?? 0) || 0;
  const availableSeats = Number(
    mergedSpace.available_seats ??
      mergedSpace.availableSeats ??
      mergedSpace.details?.available_seats ??
      0,
  );

  const coworking_inventory_type = normalizeCoworkingInventoryType(
    mergedSpace.coworking_inventory_type ?? mergedSpace.details?.coworking_inventory_type ?? '',
  );
  const managed_office_type = String(mergedSpace.managed_office_type ?? '').trim();
  const resource_type = String(mergedSpace.resource_type ?? '').trim();

  let subSpaceType = '';
  if (inventory_type === 'Co-working Space') subSpaceType = coworking_inventory_type;
  else if (inventory_type === 'Managed Office') subSpaceType = managed_office_type;
  else if (inventory_type === 'Resource') subSpaceType = resource_type;

  const clients = Array.isArray(mergedSpace.clients) ? mergedSpace.clients : [];
  const hasAssignment = hasLayoutSpaceClientAssignment(mergedSpace, clients);
  const resolvedStatus = hasAssignment
    ? String(mergedSpace.status || 'Occupied').trim() || 'Occupied'
    : 'Available';

  return {
    ...mergedSpace,
    id,
    centerId: String(centerApiId ?? '').trim(),
    floor: String(blockFloorId ?? '').trim(),
    spaceType: inventory_type,
    subSpaceType,
    spaceName: mergedSpace.inventory_name || mergedSpace.spaceName || id,
    totalSeats,
    total_seats: totalSeats,
    availableSeats: Number.isFinite(availableSeats) ? availableSeats : 0,
    available_seats: Number.isFinite(availableSeats) ? availableSeats : 0,
    clients,
    status: resolvedStatus,
  };
}

/**
 * Normalized center for a desk coworker coordinate payload (point or small rect).
 *
 * @param {object | null | undefined} cc
 * @returns {{ x: number, y: number } | null}
 */
export function parseDeskCoworkerCoordinateCenter(cc) {
  if (!cc || typeof cc !== 'object') return null;
  const x = Number(cc.x);
  const y = Number(cc.y);
  const w = Number(cc.width);
  const h = Number(cc.height);
  if (Number.isFinite(x) && Number.isFinite(y)) {
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      return { x: x + w / 2, y: y + h / 2 };
    }
    return { x, y };
  }
  return null;
}

/** Layout markers use normalized 0–1 coords; allocation payloads may use pixel values. */
const DESK_COWORKER_LAYOUT_COORD_MAX = 1.5;

/**
 * Whether a desk has a saved layout marker coordinate (normalized), not allocation-only pixels.
 *
 * @param {object | null | undefined} cc
 * @returns {boolean}
 */
export function deskCoworkerCoordinateIsPlacedOnLayout(cc) {
  const center = parseDeskCoworkerCoordinateCenter(cc);
  if (!center) return false;
  return (
    center.x >= -0.05 &&
    center.x <= DESK_COWORKER_LAYOUT_COORD_MAX &&
    center.y >= -0.05 &&
    center.y <= DESK_COWORKER_LAYOUT_COORD_MAX
  );
}

/**
 * Collect every desk row under a co-working parent space (all sub-spaces + shape desks).
 *
 * @param {object | null | undefined} layoutDetailData
 * @param {string} spaceRef
 * @returns {object[]}
 */
export function collectDesksForCoworkingParentSpace(layoutDetailData, spaceRef) {
  const ref = String(spaceRef || '').trim();
  if (!ref) return [];

  const seen = new Set();
  const out = [];

  const pushDesk = (desk, rowSubSpaceId = '') => {
    if (!desk || typeof desk !== 'object') return;
    const deskId = String(desk.desk_id ?? '').trim();
    if (!deskId || seen.has(deskId)) return;
    seen.add(deskId);
    out.push({
      ...desk,
      sub_space_id: String(desk.sub_space_id ?? rowSubSpaceId ?? ref).trim() || ref,
    });
  };

  for (const ss of getSubSpaceRowsForParentSpace(layoutDetailData, ref)) {
    if (!ss || typeof ss !== 'object') continue;
    const rowSubSpaceId = String(ss.sub_space_id ?? '').trim();
    const deskList = Array.isArray(ss.desks) ? ss.desks : [];
    if (deskList.length > 0) {
      deskList.forEach((d) => pushDesk(d, rowSubSpaceId));
    }
  }

  const shapes = Array.isArray(layoutDetailData?.layout_shapes)
    ? layoutDetailData.layout_shapes
    : [];
  const shape = shapes.find((s) => s && String(s.space_ref ?? s.space_id ?? '').trim() === ref);
  const flat = Array.isArray(shape?.desks) ? shape.desks : [];
  flat.forEach((d) => pushDesk(d, ref));

  return out;
}

function coworkerMarkerCoordKey(x, y) {
  const nx = Number(x);
  const ny = Number(y);
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return '';
  return `${Math.round(nx * 1e5)}:${Math.round(ny * 1e5)}`;
}

/** Hit radius for API sub-space pins stored as a single normalized point (no bbox). */
const SUBSPACE_PIN_POINT_HIT_RADIUS = 0.03;

/** Co-working marker placement: easier hit on centroid-only sub-space pins. */
const COWORKING_SUBSPACE_PIN_POINT_HIT_RADIUS = 0.12;

/**
 * Point pins from API often only store a centroid; use sub_space row bbox for area hits when present.
 *
 * @param {object | null | undefined} ann
 * @returns {object | null | undefined}
 */
function resolveSubSpacePinHitTestShape(ann) {
  if (!ann || ann.source !== SERVER_SUBSPACE_PIN_SOURCE) return ann;
  if (ann.type !== 'point') return ann;

  const meta = ann.sub_space_meta;
  const lc =
    meta && typeof meta === 'object'
      ? (meta.sub_space_coordinate ?? meta.layout_coordinate ?? meta.coordinates)
      : null;
  if (!lc || typeof lc !== 'object') return ann;

  const pts = lc.points;
  if (Array.isArray(pts)) {
    const flat = [];
    if (pts.length > 0 && Array.isArray(pts[0])) {
      for (const pair of pts) {
        if (Array.isArray(pair) && pair.length >= 2) {
          const px = Number(pair[0]);
          const py = Number(pair[1]);
          if (Number.isFinite(px) && Number.isFinite(py)) flat.push(px, py);
        }
      }
    } else {
      for (let i = 0; i + 1 < pts.length; i += 2) {
        const px = Number(pts[i]);
        const py = Number(pts[i + 1]);
        if (Number.isFinite(px) && Number.isFinite(py)) flat.push(px, py);
      }
    }
    if (flat.length >= 6) {
      return { ...ann, type: 'polygon', points: flat };
    }
    if (flat.length === 2) {
      return ann;
    }
  }

  const x = Number(lc.x);
  const y = Number(lc.y);
  const w = Number(lc.width);
  const h = Number(lc.height);
  if ([x, y, w, h].every((n) => Number.isFinite(n)) && w > 0 && h > 0) {
    return { ...ann, type: 'rectangle', x, y, width: w, height: h };
  }

  return ann;
}

/**
 * Whether (nx, ny) lies inside a server sub-space pin (rectangle, polygon, pen, or point+radius).
 *
 * @param {number} nx
 * @param {number} ny
 * @param {object | null | undefined} ann
 * @param {{ coworkingMode?: boolean }} [options]
 * @returns {boolean}
 */
export function isNormalizedPointInsideSubSpacePin(nx, ny, ann, options = {}) {
  if (!ann || ann.source !== SERVER_SUBSPACE_PIN_SOURCE) return false;

  const hitShape = resolveSubSpacePinHitTestShape(ann);
  if (hitShape.type !== 'point') {
    return isNormalizedPointInShapeGeometry(nx, ny, hitShape);
  }

  const px = Number(hitShape.x);
  const py = Number(hitShape.y);
  if (!Number.isFinite(px) || !Number.isFinite(py)) return false;
  const radius = options.coworkingMode
    ? COWORKING_SUBSPACE_PIN_POINT_HIT_RADIUS
    : SUBSPACE_PIN_POINT_HIT_RADIUS;
  return Math.hypot(nx - px, ny - py) <= radius;
}

/**
 * @param {object} shapeRow
 * @param {object} ss
 * @param {number} idx
 * @returns {object | null}
 */
function buildCoworkingSubSpaceTargetFromRow(shapeRow, ss, idx = 0) {
  const spaceRef = String(shapeRow.space_ref ?? shapeRow.space_id ?? '').trim();
  const subSpaceId = String(ss.sub_space_id ?? '').trim();
  const rowKey = String(ss.sub_space_row_id ?? ss.name ?? idx ?? '').trim();
  if (!spaceRef || (!subSpaceId && !rowKey)) return null;

  return {
    id: `subpin-${spaceRef}-${rowKey || subSpaceId}-${String(idx)}`,
    type: 'point',
    x: 0,
    y: 0,
    source: SERVER_SUBSPACE_PIN_SOURCE,
    space_ref: spaceRef,
    sub_space_id: subSpaceId,
    sub_space_meta: { ...ss },
    label: String(ss.sub_space_name ?? '').trim() || subSpaceId || rowKey,
  };
}

/**
 * @param {object | null | undefined} target
 * @returns {object | null}
 */
function withCoworkingSubSpaceTargetId(target) {
  if (!target) return null;
  const ssid = String(target.sub_space_id ?? target.sub_space_meta?.sub_space_id ?? '').trim();
  if (!ssid) return null;
  return { ...target, sub_space_id: ssid };
}

/**
 * Top-most server sub-space pin for `parentSpaceRef` whose geometry contains (nx, ny).
 * Does not use {@link findAssociatedSpaceRegionAt} — that helper intentionally skips sub-space pins.
 *
 * @param {object[]} annotations
 * @param {string} parentSpaceRef
 * @param {number} nx
 * @param {number} ny
 * @returns {object | null}
 */
export function findServerSubSpacePinContainingNormalizedPoint(
  annotations,
  parentSpaceRef,
  nx,
  ny,
) {
  const pr = String(parentSpaceRef || '').trim();
  if (!pr || !Array.isArray(annotations)) return null;
  const pins = annotations.filter(
    (a) => a && a.source === SERVER_SUBSPACE_PIN_SOURCE && String(a.space_ref || '').trim() === pr,
  );
  for (let i = pins.length - 1; i >= 0; i -= 1) {
    const pin = pins[i];
    if (isNormalizedPointInsideSubSpacePin(nx, ny, pin)) return pin;
  }
  return null;
}

/**
 * Resolve sub-space at (nx, ny) for co-working marker placement: canvas pins first, then layout rows.
 *
 * @param {object | null | undefined} layoutDetailData
 * @param {object[]} annotations
 * @param {string} parentSpaceRef
 * @param {number} nx
 * @param {number} ny
 * @returns {object | null}
 */
export function findCoworkingSubSpaceTargetAtPoint(
  layoutDetailData,
  annotations,
  parentSpaceRef,
  nx,
  ny,
) {
  const pr = String(parentSpaceRef || '').trim();
  if (!pr || !Array.isArray(annotations)) return null;

  const hitOpts = { coworkingMode: true };

  const pins = annotations.filter(
    (a) => a && a.source === SERVER_SUBSPACE_PIN_SOURCE && String(a.space_ref || '').trim() === pr,
  );
  for (let i = pins.length - 1; i >= 0; i -= 1) {
    const hit = withCoworkingSubSpaceTargetId(
      isNormalizedPointInsideSubSpacePin(nx, ny, pins[i], hitOpts) ? pins[i] : null,
    );
    if (hit) return hit;
  }

  for (let i = annotations.length - 1; i >= 0; i -= 1) {
    const a = annotations[i];
    if (!a || a.source !== SUBSPACE_LAYOUT_PENDING_SOURCE) continue;
    if (!isNormalizedPointInShapeGeometry(nx, ny, a)) continue;
    const meta = a.sub_space_meta && typeof a.sub_space_meta === 'object' ? a.sub_space_meta : {};
    return withCoworkingSubSpaceTargetId({
      id: a.id,
      type: 'point',
      x: nx,
      y: ny,
      source: SERVER_SUBSPACE_PIN_SOURCE,
      space_ref: pr,
      sub_space_id: String(meta.sub_space_id ?? a.sub_space_id ?? '').trim(),
      sub_space_meta: meta,
      label: a.label ?? '',
    });
  }

  const rows = getSubSpaceRowsForParentSpace(layoutDetailData, pr);
  const shapeStub = { space_ref: pr, space_id: pr };
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const ss = rows[i];
    if (!ss || typeof ss !== 'object') continue;

    const coord = ss.sub_space_coordinate ?? ss.layout_coordinate ?? ss.coordinates;
    const shape = layoutCoordinateToAnnotationShape(coord);
    if (shape && isNormalizedPointInShapeGeometry(nx, ny, shape)) {
      const target =
        parseSubSpaceRowToPinAnnotation(shapeStub, ss, i) ??
        buildCoworkingSubSpaceTargetFromRow(shapeStub, ss, i);
      const resolved = withCoworkingSubSpaceTargetId(target);
      if (resolved) return resolved;
    }

    const synthetic = parseSubSpaceRowToPinAnnotation(shapeStub, ss, i);
    if (synthetic && isNormalizedPointInsideSubSpacePin(nx, ny, synthetic, hitOpts)) {
      const resolved = withCoworkingSubSpaceTargetId(synthetic);
      if (resolved) return resolved;
    }
  }

  const parentAnn = annotations.find(
    (a) =>
      a &&
      typeof a === 'object' &&
      String(a.space_ref || '').trim() === pr &&
      a.source !== SERVER_SUBSPACE_PIN_SOURCE &&
      a.source !== DESK_COWORKER_MARKER &&
      a.type !== 'point',
  );
  if (!parentAnn || !isNormalizedPointInAssociatedSpaceShape(nx, ny, parentAnn)) {
    return null;
  }

  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const ss = rows[i];
    if (!ss || typeof ss !== 'object') continue;
    const coord = ss.sub_space_coordinate ?? ss.layout_coordinate ?? ss.coordinates;
    if (coord != null && typeof coord === 'object') continue;

    const target = buildCoworkingSubSpaceTargetFromRow(shapeStub, ss, i);
    const resolved = withCoworkingSubSpaceTargetId(target);
    if (!resolved) continue;

    const ssid = String(resolved.sub_space_id || '').trim();
    const subCap = getCoworkingSubSpaceMarkerCapacity(layoutDetailData, pr, ssid, resolved);
    if (subCap <= 0) return resolved;

    const subPlaced = countPlacedCoworkingMarkersInSubSpace(
      layoutDetailData,
      annotations,
      pr,
      ssid,
    );
    if (subPlaced < subCap) return resolved;
  }

  return null;
}

/**
 * Whether a co-working parent space already has desk-marker targets from layout detail
 * (sub-space rows and/or shape-level desks).
 *
 * @param {object | null | undefined} layoutDetailData
 * @param {string} spaceRef
 * @returns {boolean}
 */
export function layoutCoworkingParentHasDeskMarkerTargets(layoutDetailData, spaceRef) {
  const ref = String(spaceRef || '').trim();
  if (!ref) return false;
  if (getSubSpaceRowsForParentSpace(layoutDetailData, ref).length > 0) return true;

  const shapes = Array.isArray(layoutDetailData?.layout_shapes)
    ? layoutDetailData.layout_shapes
    : [];
  const shape = shapes.find((s) => s && String(s.space_ref ?? s.space_id ?? '').trim() === ref);
  return Array.isArray(shape?.desks) && shape.desks.length > 0;
}

/**
 * @param {object | null | undefined} layoutDetailData
 * @param {string} parentSpaceRef
 * @param {string} subSpaceId
 * @returns {object[]}
 */
export function getDesksForSubSpaceFromLayoutDetail(layoutDetailData, parentSpaceRef, subSpaceId) {
  const ref = String(parentSpaceRef || '').trim();
  const ssid = String(subSpaceId || '').trim();
  if (!ref || !ssid) return [];

  // Co-working batch save uses space_id === sub_space_id — include every desk under the parent.
  if (ssid === ref) {
    return collectDesksForCoworkingParentSpace(layoutDetailData, ref);
  }

  const rows = getSubSpaceRowsForParentSpace(layoutDetailData, ref);
  const ss = rows.find((r) => String(r?.sub_space_id ?? '').trim() === ssid);
  let list = Array.isArray(ss?.desks) ? ss.desks : [];
  if (list.length === 0 && layoutDetailData && typeof layoutDetailData === 'object') {
    const shapes = Array.isArray(layoutDetailData.layout_shapes)
      ? layoutDetailData.layout_shapes
      : [];
    const shape = shapes.find((s) => s && String(s.space_ref ?? s.space_id ?? '').trim() === ref);
    const flat = Array.isArray(shape?.desks) ? shape.desks : [];
    list = flat.filter((d) => d && String(d.sub_space_id ?? '').trim() === ssid);
  }
  return list;
}

/**
 * Next desk in the sub-space without a saved or local coworker position.
 *
 * @param {object | null | undefined} layoutDetailData
 * @param {object[]} annotations
 * @param {string} parentSpaceRef
 * @param {string} subSpaceId
 * @returns {string}
 */
export function pickNextUnplacedDeskId(layoutDetailData, annotations, parentSpaceRef, subSpaceId) {
  const ref = String(parentSpaceRef || '').trim();
  const ssid = String(subSpaceId || '').trim();
  const desks = getDesksForSubSpaceFromLayoutDetail(layoutDetailData, ref, ssid);
  const sorted = [...desks].sort((a, b) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));
  const placed = new Set();
  for (const d of sorted) {
    const cc = d.desk_coordinate ?? d.layout_coordinate ?? d.coordinates;
    if (deskCoworkerCoordinateIsPlacedOnLayout(cc)) {
      placed.add(String(d.desk_id ?? '').trim());
    }
  }
  if (Array.isArray(annotations)) {
    const isParentCoworkingBatch = ssid === ref;
    for (const a of annotations) {
      if (a?.source !== DESK_COWORKER_MARKER) continue;
      if (String(a.parent_space_ref || '').trim() !== ref) continue;
      const annSubSpaceId = String(a.sub_space_id ?? '').trim();
      if (!isParentCoworkingBatch && annSubSpaceId !== ssid) continue;
      const id = String(a.desk_id ?? '').trim();
      if (id) {
        placed.add(id);
        continue;
      }
      placed.add(`local:${a.id}`);
    }
  }
  for (const d of sorted) {
    const id = String(d.desk_id ?? '').trim();
    if (id && !placed.has(id)) return id;
  }
  return '';
}

/**
 * Count desks that already have a coworker position (API and/or local markers).
 *
 * @param {object | null | undefined} layoutDetailData
 * @param {object[]} annotations
 * @param {string} parentSpaceRef
 * @param {string} subSpaceId
 * @returns {number}
 */
export function countPlacedDesksInSubSpace(
  layoutDetailData,
  annotations,
  parentSpaceRef,
  subSpaceId,
) {
  const ssid = String(subSpaceId || '').trim();
  if (!ssid) return 0;

  const placed = new Set();
  const desks = getDesksForSubSpaceFromLayoutDetail(layoutDetailData, parentSpaceRef, ssid);
  for (const d of desks) {
    const cc = d.desk_coordinate ?? d.layout_coordinate ?? d.coordinates;
    const deskId = String(d.desk_id ?? '').trim();
    if (deskCoworkerCoordinateIsPlacedOnLayout(cc) && deskId) placed.add(deskId);
  }

  if (Array.isArray(annotations)) {
    const ref = String(parentSpaceRef || '').trim();
    const isParentCoworkingBatch = ssid === ref;
    for (const a of annotations) {
      if (a?.source !== DESK_COWORKER_MARKER) continue;
      if (String(a.parent_space_ref || '').trim() !== ref) continue;
      const annSubSpaceId = String(a.sub_space_id ?? '').trim();
      if (!isParentCoworkingBatch && annSubSpaceId !== ssid) continue;
      const id = String(a.desk_id ?? '').trim();
      if (id) {
        placed.add(id);
        continue;
      }
      placed.add(`local:${a.id}`);
    }
  }

  return placed.size;
}

/**
 * Seat capacity for coworker markers inside one co-working sub-space.
 *
 * @param {object | null | undefined} layoutDetailData
 * @param {string} parentSpaceRef
 * @param {string} subSpaceId
 * @param {object | null | undefined} [pin]
 * @returns {number}
 */
export function getCoworkingSubSpaceMarkerCapacity(
  layoutDetailData,
  parentSpaceRef,
  subSpaceId,
  pin,
) {
  const ssid = String(subSpaceId || '').trim();
  if (!ssid) return 0;

  const desks = getDesksForSubSpaceFromLayoutDetail(layoutDetailData, parentSpaceRef, ssid);
  if (desks.length > 0) return desks.length;

  const meta =
    pin?.sub_space_meta && typeof pin.sub_space_meta === 'object' ? pin.sub_space_meta : {};
  const fromPin = Math.max(0, Math.floor(Number(meta.desk_count ?? 0)));
  if (fromPin > 0) return fromPin;

  const rows = getSubSpaceRowsForParentSpace(layoutDetailData, parentSpaceRef);
  const row = rows.find((r) => String(r?.sub_space_id ?? '').trim() === ssid);
  if (!row) return 0;

  const rowDesks = Array.isArray(row.desks) ? row.desks : [];
  if (rowDesks.length > 0) return rowDesks.length;

  return Math.max(0, Math.floor(Number(row.desk_count ?? 0)));
}

/**
 * Count coworker markers already placed in a co-working sub-space (API + local).
 *
 * @param {object | null | undefined} layoutDetailData
 * @param {object[]} annotations
 * @param {string} parentSpaceRef
 * @param {string} subSpaceId
 * @returns {number}
 */
export function countPlacedCoworkingMarkersInSubSpace(
  layoutDetailData,
  annotations,
  parentSpaceRef,
  subSpaceId,
) {
  const pr = String(parentSpaceRef || '').trim();
  const ssid = String(subSpaceId || '').trim();
  if (!pr || !ssid) return 0;

  const placed = new Set();
  const serverCoordKeys = new Set();

  const desks = getDesksForSubSpaceFromLayoutDetail(layoutDetailData, pr, ssid);
  for (const d of desks) {
    const cc = d.desk_coordinate ?? d.layout_coordinate ?? d.coordinates;
    if (!deskCoworkerCoordinateIsPlacedOnLayout(cc)) continue;
    const center = parseDeskCoworkerCoordinateCenter(cc);
    if (!center) continue;
    const deskId = String(d.desk_id ?? '').trim();
    placed.add(deskId ? `desk:${deskId}` : `desk-row:${placed.size}`);
    const key = coworkerMarkerCoordKey(center.x, center.y);
    if (key) serverCoordKeys.add(key);
  }

  const rows = getSubSpaceRowsForParentSpace(layoutDetailData, pr);
  const row = rows.find((r) => String(r?.sub_space_id ?? '').trim() === ssid);
  const rowMarkerCenter = row ? parseDeskCoworkerCoordinateCenter(row.desk_coordinate) : null;
  const hasRowLevelMarker =
    row && desks.length === 0 && deskCoworkerCoordinateIsPlacedOnLayout(row.desk_coordinate);
  if (hasRowLevelMarker) {
    placed.add('subspace:marker');
    const key = coworkerMarkerCoordKey(rowMarkerCenter.x, rowMarkerCenter.y);
    if (key) serverCoordKeys.add(key);
  }

  if (Array.isArray(annotations)) {
    for (const a of annotations) {
      if (a?.source !== DESK_COWORKER_MARKER) continue;
      if (String(a.parent_space_ref || '').trim() !== pr) continue;
      if (String(a.sub_space_id ?? '').trim() !== ssid) continue;

      const deskId = String(a.desk_id ?? '').trim();
      if (deskId) {
        if (placed.has(`desk:${deskId}`)) continue;
        placed.add(`desk:${deskId}`);
        continue;
      }

      if (a.hasCoordinateOnServer) continue;

      const localKey = coworkerMarkerCoordKey(a.x, a.y);
      if (localKey && serverCoordKeys.has(localKey)) continue;
      if (hasRowLevelMarker) continue;

      placed.add(`local:${a.id}`);
    }
  }

  return placed.size;
}

/**
 * Total sellable seats for a co-working parent space (layout row or associated space meta).
 *
 * @param {object | null | undefined} layoutDetailData
 * @param {string} parentSpaceRef
 * @param {object | null | undefined} [parentSpace]
 * @returns {number}
 */
export function getCoworkingParentMarkerCapacity(layoutDetailData, parentSpaceRef, parentSpace) {
  const details =
    parentSpace?.details && typeof parentSpace.details === 'object' ? parentSpace.details : {};
  const fromSpace = Math.max(
    0,
    Math.floor(
      Number(
        parentSpace?.total_seats ??
          parentSpace?.totalSeats ??
          details.total_seats ??
          details.totalSeats ??
          0,
      ),
    ),
  );
  if (fromSpace > 0) return fromSpace;

  const pr = String(parentSpaceRef || '').trim();
  if (!pr || !layoutDetailData) return 0;

  const shapes = Array.isArray(layoutDetailData.layout_shapes)
    ? layoutDetailData.layout_shapes
    : [];
  const shape = shapes.find((s) => s && String(s.space_ref ?? s.space_id ?? '').trim() === pr);
  const fromShape = Math.max(
    0,
    Math.floor(
      Number(shape?.total_seats ?? shape?.space?.total_seats ?? shape?.space?.totalSeats ?? 0),
    ),
  );
  if (fromShape > 0) return fromShape;

  const rows = getSubSpaceRowsForParentSpace(layoutDetailData, pr);
  let sum = 0;
  for (const ss of rows) {
    const ssid = String(ss?.sub_space_id ?? '').trim();
    if (!ssid) continue;
    sum += getCoworkingSubSpaceMarkerCapacity(layoutDetailData, pr, ssid, { sub_space_meta: ss });
  }
  return sum;
}

/**
 * Count all coworker markers under a co-working parent space.
 *
 * @param {object | null | undefined} layoutDetailData
 * @param {object[]} annotations
 * @param {string} parentSpaceRef
 * @returns {number}
 */
export function countPlacedCoworkingMarkersForParentSpace(
  layoutDetailData,
  annotations,
  parentSpaceRef,
) {
  const pr = String(parentSpaceRef || '').trim();
  if (!pr || !Array.isArray(annotations)) return 0;
  return annotations.filter(
    (a) => a?.source === DESK_COWORKER_MARKER && String(a.parent_space_ref || '').trim() === pr,
  ).length;
}

/**
 * @param {object | null | undefined} layoutDetailData
 * @param {object[]} annotations
 * @param {string} parentSpaceRef
 * @param {string} subSpaceId
 * @param {object | null | undefined} pin
 * @param {object | null | undefined} [parentSpace]
 * @returns {string | null} user-facing error, or null if placement is allowed
 */
export function validateCoworkingMarkerPlacement(
  layoutDetailData,
  annotations,
  parentSpaceRef,
  subSpaceId,
  pin,
  parentSpace,
) {
  const pr = String(parentSpaceRef || '').trim();
  const ssid = String(subSpaceId || '').trim();
  if (!pr || !ssid) return 'Sub-space is missing an id. Reload the layout and try again.';

  const parentCap = getCoworkingParentMarkerCapacity(layoutDetailData, pr, parentSpace);
  const parentPlaced = countPlacedCoworkingMarkersForParentSpace(layoutDetailData, annotations, pr);
  if (parentCap > 0 && parentPlaced >= parentCap) {
    return `All ${parentCap} seat${parentCap === 1 ? '' : 's'} for this co-working space already have markers.`;
  }

  const subCap = getCoworkingSubSpaceMarkerCapacity(layoutDetailData, pr, ssid, pin);
  if (subCap > 0) {
    const subPlaced = countPlacedCoworkingMarkersInSubSpace(
      layoutDetailData,
      annotations,
      pr,
      ssid,
    );
    if (subPlaced >= subCap) {
      return 'All seats for this sub-space already have a marker.';
    }
  }

  return null;
}

/**
 * Turn one `sub_spaces[]` row + parent shape into a floor-plan annotation (pin/bbox).
 *
 * @param {object} shapeRow - layout_shapes item
 * @param {object} ss - sub_spaces row
 * @param {number} idx
 * @returns {object | null}
 */
export function parseSubSpaceRowToPinAnnotation(shapeRow, ss, idx = 0) {
  if (!ss || typeof ss !== 'object') return null;
  const lc = ss.sub_space_coordinate ?? ss.layout_coordinate ?? ss.coordinates;
  if (lc == null || typeof lc !== 'object') return null;

  const spaceRef = String(shapeRow.space_ref ?? shapeRow.space_id ?? '').trim();
  const subSpaceId = String(ss.sub_space_id ?? '').trim();
  const rowKey = String(ss.sub_space_row_id ?? ss.name ?? idx ?? '').trim();
  if (!spaceRef || (!subSpaceId && !rowKey)) return null;

  const displayLabel = String(ss.sub_space_name ?? '').trim() || subSpaceId || rowKey;

  const stableId = `subpin-${spaceRef}-${rowKey || subSpaceId}-${String(idx)}`;

  const pts = lc.points;
  if (Array.isArray(pts)) {
    const flat = [];
    if (pts.length > 0 && Array.isArray(pts[0])) {
      for (const pair of pts) {
        if (Array.isArray(pair) && pair.length >= 2) {
          const px = Number(pair[0]);
          const py = Number(pair[1]);
          if (Number.isFinite(px) && Number.isFinite(py)) flat.push(px, py);
        }
      }
    } else {
      for (let i = 0; i + 1 < pts.length; i += 2) {
        const px = Number(pts[i]);
        const py = Number(pts[i + 1]);
        if (Number.isFinite(px) && Number.isFinite(py)) flat.push(px, py);
      }
    }

    if (flat.length >= 2) {
      if (flat.length === 2) {
        return {
          id: stableId,
          type: 'point',
          x: flat[0],
          y: flat[1],
          locked: true,
          visible: true,
          source: SERVER_SUBSPACE_PIN_SOURCE,
          space_ref: spaceRef,
          sub_space_id: subSpaceId,
          sub_space_meta: { ...ss },
          label: displayLabel,
          hasCoordinateOnServer: true,
        };
      }
      if (flat.length >= 6) {
        return {
          id: stableId,
          type: 'polygon',
          points: flat,
          locked: true,
          visible: true,
          source: SERVER_SUBSPACE_PIN_SOURCE,
          space_ref: spaceRef,
          sub_space_id: subSpaceId,
          sub_space_meta: { ...ss },
          label: displayLabel,
          hasCoordinateOnServer: true,
        };
      }
    }
  }

  const x = Number(lc.x);
  const y = Number(lc.y);
  const w = Number(lc.width);
  const h = Number(lc.height);
  if ([x, y, w, h].every((n) => Number.isFinite(n)) && w > 0 && h > 0) {
    return {
      id: stableId,
      type: 'rectangle',
      x,
      y,
      width: w,
      height: h,
      locked: true,
      visible: true,
      source: SERVER_SUBSPACE_PIN_SOURCE,
      space_ref: spaceRef,
      sub_space_id: subSpaceId,
      sub_space_meta: { ...ss },
      label: displayLabel,
      hasCoordinateOnServer: true,
    };
  }

  return null;
}

/**
 * All sub-space pins that already have coordinates from get_layout_detail.
 *
 * @param {object | null | undefined} layoutDetailData
 * @returns {object[]}
 */
export function flattenSubSpacePinAnnotations(layoutDetailData) {
  if (!layoutDetailData || typeof layoutDetailData !== 'object') return [];

  let shapes = [];
  if (Array.isArray(layoutDetailData.layout_shapes)) {
    shapes = layoutDetailData.layout_shapes;
  } else if (Array.isArray(layoutDetailData.shapes)) {
    shapes = layoutDetailData.shapes;
  }

  const out = [];
  shapes.forEach((shape) => {
    if (!shape || typeof shape !== 'object') return;
    const subs = shape.sub_spaces;
    if (!Array.isArray(subs)) return;
    subs.forEach((ss, idx) => {
      const ann = parseSubSpaceRowToPinAnnotation(shape, ss, idx);
      if (ann) out.push(ann);
    });
  });
  return out;
}

export function enrichDeskCoworkerMarkerFromDeskRow(marker, deskRow) {
  if (!marker || typeof marker !== 'object') return marker;
  if (!deskRow || typeof deskRow !== 'object') return marker;

  const assignedClient = readDeskAssignedClient(deskRow);
  const companyLogo = readDeskAssignedClientCompanyLogo(deskRow);
  const clientName = readDeskAssignedClientName(deskRow);

  return {
    ...marker,
    desk_sequence: Number(deskRow.sequence ?? marker.desk_sequence) || marker.desk_sequence || 0,
    assigned_client: assignedClient,
    company_logo: companyLogo || undefined,
    client_name: clientName || undefined,
  };
}

/**
 * Desk coworker dots from `layout_shapes[].sub_spaces[].desks[]` (normalized centers).
 *
 * @param {object | null | undefined} layoutDetailData
 * @returns {object[]}
 */
export function flattenDeskCoworkerMarkersFromLayoutDetail(layoutDetailData) {
  if (!layoutDetailData || typeof layoutDetailData !== 'object') return [];

  let shapes = [];
  if (Array.isArray(layoutDetailData.layout_shapes)) {
    shapes = layoutDetailData.layout_shapes;
  } else if (Array.isArray(layoutDetailData.shapes)) {
    shapes = layoutDetailData.shapes;
  }

  const out = [];
  const pushDeskMarker = (desk, spaceRef, subSpaceId) => {
    if (!desk || typeof desk !== 'object') return;
    const deskId = String(desk.desk_id ?? '').trim();
    if (!deskId) return;
    const cc = desk.desk_coordinate ?? desk.layout_coordinate ?? desk.coordinates;
    if (!deskCoworkerCoordinateIsPlacedOnLayout(cc)) return;
    const center = parseDeskCoworkerCoordinateCenter(cc);
    if (!center) return;
    const assignedClient = readDeskAssignedClient(desk);
    const companyLogo = readDeskAssignedClientCompanyLogo(desk);
    const clientName = readDeskAssignedClientName(desk);

    out.push({
      id: `desk-coworker-${deskId}`,
      type: 'point',
      x: center.x,
      y: center.y,
      locked: false,
      visible: true,
      source: DESK_COWORKER_MARKER,
      desk_id: deskId,
      sub_space_id: subSpaceId || String(desk.sub_space_id ?? '').trim(),
      parent_space_ref: spaceRef,
      desk_sequence: Number(desk.sequence) || 0,
      hasCoordinateOnServer: true,
      assigned_client: assignedClient,
      company_logo: companyLogo || undefined,
      client_name: clientName || undefined,
    });
  };

  shapes.forEach((shape) => {
    if (!shape || typeof shape !== 'object') return;
    const spaceRef = String(shape.space_ref ?? shape.space_id ?? '').trim();
    if (!spaceRef) return;
    const seenDeskIds = new Set();
    const subs = shape.sub_spaces;
    if (Array.isArray(subs)) {
      subs.forEach((ss) => {
        if (!ss || typeof ss !== 'object') return;
        const subSpaceId = String(ss.sub_space_id ?? '').trim();
        const deskList = Array.isArray(ss.desks) ? ss.desks : [];
        deskList.forEach((desk) => {
          const deskId = String(desk?.desk_id ?? '').trim();
          if (!deskId || seenDeskIds.has(deskId)) return;
          seenDeskIds.add(deskId);
          pushDeskMarker(desk, spaceRef, subSpaceId);
        });
      });
    }
    const shapeDesks = Array.isArray(shape.desks) ? shape.desks : [];
    shapeDesks.forEach((desk) => {
      const deskId = String(desk?.desk_id ?? '').trim();
      if (!deskId || seenDeskIds.has(deskId)) return;
      seenDeskIds.add(deskId);
      const deskSubSpaceId = String(desk.sub_space_id ?? '').trim();
      pushDeskMarker(desk, spaceRef, deskSubSpaceId || spaceRef);
    });
  });
  return out;
}

function sortDeskCoworkerStateRows(rows) {
  return [...rows].sort((a, b) => {
    const da = String(a.desk_id || '').localeCompare(String(b.desk_id || ''));
    if (da !== 0) return da;
    return String(a.sub_space_id || '').localeCompare(String(b.sub_space_id || ''));
  });
}

/**
 * Canonical serialized desk coworker placements for a parent space (compare local vs layout detail).
 *
 * @param {object | null | undefined} layoutDetailData
 * @param {string} parentSpaceRef
 * @returns {string}
 */
export function serializeDeskCoworkerStateFromLayoutDetail(layoutDetailData, parentSpaceRef) {
  const ref = String(parentSpaceRef || '').trim();
  if (!ref) return '[]';
  const flat = flattenDeskCoworkerMarkersFromLayoutDetail(layoutDetailData).filter(
    (a) => String(a.parent_space_ref || '').trim() === ref,
  );
  const rows = sortDeskCoworkerStateRows(
    flat.map((a) => ({
      desk_id: String(a.desk_id || '').trim(),
      sub_space_id: String(a.sub_space_id || '').trim(),
      x: Math.round(Number(a.x) * 1e6) / 1e6,
      y: Math.round(Number(a.y) * 1e6) / 1e6,
    })),
  );
  return JSON.stringify(rows);
}

/**
 * @param {unknown[]} annotations
 * @param {string} parentSpaceRef
 * @returns {string}
 */
export function serializeDeskCoworkerStateFromAnnotations(annotations, parentSpaceRef) {
  const ref = String(parentSpaceRef || '').trim();
  if (!ref || !Array.isArray(annotations)) return '[]';
  const rows = annotations.filter(
    (a) =>
      a &&
      a.source === DESK_COWORKER_MARKER &&
      String(a.parent_space_ref || '').trim() === ref &&
      String(a.desk_id || '').trim(),
  );
  const normalized = sortDeskCoworkerStateRows(
    rows.map((a) => ({
      desk_id: String(a.desk_id || '').trim(),
      sub_space_id: String(a.sub_space_id || '').trim(),
      x: Math.round(Number(a.x) * 1e6) / 1e6,
      y: Math.round(Number(a.y) * 1e6) / 1e6,
    })),
  );
  return JSON.stringify(normalized);
}

/**
 * Sub-space rows for the Associate popover (same parent space as the marker).
 *
 * @param {object | null | undefined} layoutDetailData
 * @param {string} spaceRef
 * @returns {object[]}
 */
export function getSubSpaceRowsForParentSpace(layoutDetailData, spaceRef) {
  const ref = String(spaceRef || '').trim();
  if (!ref) return [];
  const shapes = Array.isArray(layoutDetailData?.layout_shapes)
    ? layoutDetailData.layout_shapes
    : [];
  const shape = shapes.find((s) => s && String(s.space_ref ?? s.space_id ?? '').trim() === ref);
  return Array.isArray(shape?.sub_spaces) ? shape.sub_spaces : [];
}

/**
 * Sub-space is eligible for placing a coworker seat marker when `desk_coordinate` is unset / null
 * or does not define a finite center yet.
 *
 * @param {object | null | undefined} ss
 * @returns {boolean}
 */
export function isSubSpaceCoworkerCoordinateUnset(ss) {
  if (!ss || typeof ss !== 'object') return false;
  const cc = ss.desk_coordinate;
  if (cc == null) return true;
  if (typeof cc !== 'object') return false;
  const x = Number(cc.x);
  const y = Number(cc.y);
  const hasCenter = Number.isFinite(x) && Number.isFinite(y);
  return !hasCenter;
}

/**
 * Sub-space rows for the assign popover: same as {@link getSubSpaceRowsForParentSpace} but excludes
 * seats that already have a coworker coordinate.
 *
 * @param {object | null | undefined} layoutDetailData
 * @param {string} spaceRef
 * @returns {object[]}
 */
export function getAssignableSubSpaceRowsForParentSpace(layoutDetailData, spaceRef) {
  return getSubSpaceRowsForParentSpace(layoutDetailData, spaceRef).filter(
    isSubSpaceCoworkerCoordinateUnset,
  );
}

/**
 * After get_layout_detail, merge embedded server `space` (and ids) onto local annotations without dropping optimistic fields.
 *
 * @param {object[]} prev
 * @param {object | null | undefined} layoutDetailData
 * @returns {object[]}
 */
export function mergeLocalAnnotationsWithLayoutDetail(prev, layoutDetailData) {
  const serverList = flattenLayoutShapesToAnnotations(layoutDetailData);
  if (serverList.length === 0) return prev;

  const byId = new Map(serverList.map((s) => [s.id, s]));
  const bySpace = new Map(
    serverList.filter((s) => s.space_ref).map((s) => [String(s.space_ref).trim(), s]),
  );
  return prev.map((a) => {
    const srv =
      byId.get(a.id) ?? (a.space_ref ? bySpace.get(String(a.space_ref).trim()) : undefined);
    if (!srv) return a;
    const nextSpace =
      mergeSpaceWithClientsForPopover(srv.space, srv.clients) ??
      mergeSpaceWithClientsForPopover(a.space, srv.clients ?? a.clients) ??
      srv.space ??
      a.space;
    return {
      ...a,
      space_ref: srv.space_ref ?? a.space_ref,
      layout_shape_id: srv.layout_shape_id || srv.name || a.layout_shape_id,
      hasCoordinateOnServer: srv.hasCoordinateOnServer ?? a.hasCoordinateOnServer,
      clients: srv.clients ?? a.clients,
      space: nextSpace,
    };
  });
}
