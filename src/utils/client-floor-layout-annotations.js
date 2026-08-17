import {
  CLIENT_SPACE_REGION_SOURCE,
  CLIENT_SUBSPACE_HIGHLIGHT_SOURCE,
  CLIENT_SUBSPACE_SLOT_SOURCE,
} from '@/constants/layout/annotation-sources';
import { CLIENT_SUBSPACE_COLORS } from '@/constants/layout/client-floor-constants';
import {
  getDeskCoworkerAssignmentList,
  normalizeDeskAssignmentRow,
  pickPrimaryCoworkerAssignment,
  resolveDeskAssignmentSchedule,
} from '@/utils/client-desk-assignment-utils';

/** @typedef {'production' | 'hotDesk' | 'resource'} ClientSubSpaceColorKey */

export { CLIENT_SUBSPACE_COLORS };

/**
 * @param {unknown} subSpaceType
 * @param {unknown} subSpaceAreaType
 * @returns {ClientSubSpaceColorKey | null}
 */
export function getClientSubSpaceColorKey(subSpaceType, subSpaceAreaType) {
  const type = String(subSpaceType || '')
    .trim()
    .toLowerCase();
  const area = String(subSpaceAreaType || '')
    .trim()
    .toLowerCase();

  if (type === 'resource') return 'resource';
  if (type === 'production area' || type === 'production') {
    if (area === 'hot desk' || area === 'hotdesk') return 'hotDesk';
    return 'production';
  }
  return null;
}

/**
 * @param {unknown} coordinate
 * @returns {{ type: 'polygon', points: number[] } | { type: 'rectangle', x: number, y: number, width: number, height: number } | null}
 */
export function layoutCoordinateToAnnotationShape(coordinate) {
  if (!coordinate || typeof coordinate !== 'object') return null;

  const points = coordinate.points;
  if (Array.isArray(points) && points.length >= 3) {
    const flat = points.flatMap((pair) => {
      if (!Array.isArray(pair) || pair.length < 2) return [];
      const x = Number(pair[0]);
      const y = Number(pair[1]);
      return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : [];
    });
    if (flat.length >= 6) {
      return { type: 'polygon', points: flat };
    }
  }

  const x = Number(coordinate.x);
  const y = Number(coordinate.y);
  const width = Number(coordinate.width);
  const height = Number(coordinate.height);
  if (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  ) {
    return { type: 'rectangle', x, y, width, height };
  }

  return null;
}

/**
 * Whether a coworker is assigned to this desk for the requested date/time.
 * `desk_status` / layout pins alone do not count as booked.
 *
 * @param {unknown} desk
 * @returns {boolean}
 */
export function isDeskBooked(desk) {
  if (!desk || typeof desk !== 'object') return false;
  if (getDeskCoworkerAssignmentList(desk).some(rowHasCoworkerIdentity)) return true;
  if (String(desk.client_coworker_ref ?? '').trim()) return true;
  if (desk.coworker_details && typeof desk.coworker_details === 'object') return true;
  return Boolean(buildCoworkerDetailsFromRow(desk));
}

/**
 * @param {unknown} desk
 * @returns {boolean}
 */
export function deskHasAssignedCoworker(desk, subSpace = null) {
  return resolveDeskCoworkerForDesk(desk, subSpace).isAssigned;
}

/**
 * @param {unknown} row
 * @returns {string}
 */
function readCoworkerRefFromRow(row) {
  if (!row || typeof row !== 'object') return '';
  // Do NOT use `row.name` — Desk / Sub Space Frappe row ids look like coworker refs
  // and incorrectly mark unassigned desks as occupied on the client layout.
  return String(row.client_coworker_ref ?? row.coworker_id ?? row.coworker_ref ?? '').trim();
}

function buildCoworkerDetailsFromRow(row) {
  if (!row || typeof row !== 'object') return null;
  if (row.coworker_details && typeof row.coworker_details === 'object') {
    return row.coworker_details;
  }

  const fullName = String(
    row.full_name ?? row.coworker_name ?? row.employee_name ?? row.display_name ?? '',
  ).trim();
  const firstName = String(row.first_name ?? '').trim();
  const lastName = String(row.last_name ?? '').trim();
  const composed = fullName || [firstName, lastName].filter(Boolean).join(' ');

  if (composed) {
    return {
      full_name: composed,
      coworker_name: composed,
      first_name: firstName || composed.split(/\s+/)[0] || '',
      last_name: lastName || composed.split(/\s+/).slice(1).join(' '),
      image: row.image ?? row.user_image ?? null,
      email: row.email ?? null,
    };
  }

  return null;
}

/**
 * Whether a row represents a real coworker booking (not an empty / inventory-only object).
 *
 * @param {unknown} row
 * @returns {boolean}
 */
function rowHasCoworkerIdentity(row) {
  if (!row || typeof row !== 'object') return false;
  if (readCoworkerRefFromRow(row)) return true;
  if (buildCoworkerDetailsFromRow(row)) return true;
  if (row.coworker_details && typeof row.coworker_details === 'object') return true;
  return false;
}

/**
 * @param {unknown} desk
 * @returns {object | null}
 */
export function getDeskCoworkerDetails(desk) {
  if (!desk || typeof desk !== 'object') return null;

  for (const row of getDeskCoworkerAssignmentList(desk)) {
    const fromRow = buildCoworkerDetailsFromRow(row);
    if (fromRow) return fromRow;
  }

  for (const key of [
    'desk_assignments',
    'assignments',
    'scheduled_assignments',
    'upcoming_assignments',
  ]) {
    const rows = desk[key];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const fromRow = buildCoworkerDetailsFromRow(row);
      if (fromRow) return fromRow;
    }
  }

  const assignmentObj =
    desk.desk_assignment ??
    desk.assignment ??
    desk.active_assignment ??
    desk.pending_assignment ??
    null;
  if (assignmentObj && typeof assignmentObj === 'object') {
    const fromAssignment = buildCoworkerDetailsFromRow(assignmentObj);
    if (fromAssignment) return fromAssignment;
  }

  const details = desk.coworker_details;
  if (details && typeof details === 'object') return details;

  const nested = desk.coworker;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const fromNested = nested.coworker_details ?? nested;
    if (
      fromNested &&
      typeof fromNested === 'object' &&
      (fromNested.first_name ||
        fromNested.last_name ||
        fromNested.full_name ||
        fromNested.coworker_name)
    ) {
      return fromNested;
    }
  }

  const assigned = desk.assigned_coworker;
  if (assigned && typeof assigned === 'object' && !Array.isArray(assigned)) {
    const fromAssigned = assigned.coworker_details ?? assigned;
    if (fromAssigned && typeof fromAssigned === 'object') return fromAssigned;
  }

  return null;
}

/**
 * Resolve co-worker assignment for a single desk (never copies sub-space assignment to all desks).
 *
 * @param {unknown} desk
 * @param {unknown} subSpace
 * @returns {{
 *   deskId: string,
 *   coworkerDetails: object | null,
 *   clientCoworkerRef: string | null,
 *   isAssigned: boolean,
 *   deskAssignment: object | null,
 * }}
 */
export function resolveDeskCoworkerForDesk(desk, subSpace = null) {
  const deskId = String(desk?.desk_id ?? '').trim();

  const assignmentList = getDeskCoworkerAssignmentList(desk).filter(rowHasCoworkerIdentity);
  if (assignmentList.length > 0) {
    const primary = pickPrimaryCoworkerAssignment(assignmentList) || assignmentList[0];
    const rowRef = readCoworkerRefFromRow(primary);
    const rowDetails = buildCoworkerDetailsFromRow(primary) ?? getDeskCoworkerDetails(primary);
    const deskRef = rowRef || String(desk?.client_coworker_ref ?? '').trim() || null;

    return {
      deskId,
      coworkerDetails: rowDetails ?? desk.coworker_details ?? null,
      clientCoworkerRef: deskRef || null,
      isAssigned: true,
      deskAssignment: normalizeDeskAssignmentRow(primary),
    };
  }

  const deskRef = String(
    desk?.client_coworker_ref ?? desk?.coworker_ref ?? desk?.coworker_id ?? '',
  ).trim();
  const deskDetails = buildCoworkerDetailsFromRow(desk) ?? desk.coworker_details ?? null;

  if (deskRef || deskDetails) {
    return {
      deskId,
      coworkerDetails: deskDetails,
      clientCoworkerRef: deskRef || null,
      isAssigned: true,
      deskAssignment: resolveDeskAssignmentSchedule(desk),
    };
  }

  if (subSpace && typeof subSpace === 'object') {
    const subDeskAssignments = Array.isArray(subSpace.desk_assignments)
      ? subSpace.desk_assignments
      : [];
    const matchedRow = subDeskAssignments.find(
      (row) =>
        row &&
        typeof row === 'object' &&
        String(row.desk_id ?? '').trim() === deskId &&
        deskId &&
        rowHasCoworkerIdentity(row),
    );
    if (matchedRow) {
      const rowRef = readCoworkerRefFromRow(matchedRow);
      const rowDetails =
        buildCoworkerDetailsFromRow(matchedRow) ?? getDeskCoworkerDetails(matchedRow);
      if (rowRef || rowDetails) {
        return {
          deskId,
          coworkerDetails: rowDetails,
          clientCoworkerRef: rowRef || null,
          isAssigned: true,
          deskAssignment: normalizeDeskAssignmentRow(matchedRow),
        };
      }
    }

    const scopedDeskId = String(
      subSpace.assigned_desk_id ?? subSpace.coworker_desk_id ?? '',
    ).trim();
    // Do not match on subSpace.desk_id alone — that is often the zone's first desk id
    // and would stamp one coworker onto every seat.
    if (deskId && scopedDeskId && scopedDeskId === deskId) {
      const subRef =
        String(subSpace.client_coworker_ref ?? '').trim() || readCoworkerRefFromRow(subSpace);
      const subDetails = buildCoworkerDetailsFromRow(subSpace) ?? getDeskCoworkerDetails(subSpace);
      if (subRef || subDetails) {
        return {
          deskId,
          coworkerDetails: subDetails,
          clientCoworkerRef: subRef || null,
          isAssigned: true,
          deskAssignment: resolveDeskAssignmentSchedule(subSpace),
        };
      }
    }
  }

  return {
    deskId,
    coworkerDetails: null,
    clientCoworkerRef: null,
    isAssigned: false,
    deskAssignment: null,
  };
}

/**
 * @param {unknown} areaType
 * @returns {boolean}
 */
export function isHotDeskSubSpaceAreaType(areaType) {
  const normalized = String(areaType || '')
    .trim()
    .toLowerCase();
  return normalized === 'hot desk' || normalized === 'hotdesk';
}

/**
 * @param {unknown} subSpace
 * @returns {string}
 */
export function resolveSubSpaceAssignSpaceId(subSpace) {
  if (!subSpace || typeof subSpace !== 'object') return '';
  return String(subSpace.assign_space_id ?? subSpace.assign_space ?? subSpace.name ?? '').trim();
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
function normalizeClientDepartmentValue(raw) {
  const value = String(raw ?? '').trim();
  if (!value || value.toLowerCase() === 'null') return '';
  return value;
}

/**
 * Client department on Sub Space doctype — not co-worker `coworker_details.department`.
 *
 * @param {unknown} subSpace - `spaces[].sub_spaces[]` from layout coordinates API
 * @returns {string}
 */
export function resolveSubSpaceClientDepartment(subSpace) {
  if (!subSpace || typeof subSpace !== 'object') return '';
  return normalizeClientDepartmentValue(subSpace.client_department ?? subSpace.clientDepartment);
}

/**
 * @param {unknown} subSpace
 * @returns {string}
 */
export function formatClientSubSpaceAreaTypeLabel(subSpace) {
  if (!subSpace || typeof subSpace !== 'object') return '';
  const area = String(subSpace.sub_space_area_type ?? '').trim();
  if (area) return area;
  const type = String(subSpace.sub_space_type ?? '').trim();
  return type;
}

/**
 * Merged annotations for {@link ClientViewFloorPlanEditor} from layout API `spaces[]`.
 *
 * @param {unknown[]} spaces
 * @returns {object[]}
 */
export function buildClientViewSpaceAnnotations(spaces) {
  return [
    ...spacesToFloorPlanAnnotations(spaces),
    ...subSpacesToHighlightAnnotations(spaces),
    ...desksToCoworkerSlotAnnotations(spaces),
  ];
}

/**
 * Map get_client_floor_layout_coordinates `spaces[]` → FloorPlanEditor annotations.
 * Coordinates are normalized 0–1; polygon uses flat [x0,y0,x1,y1,...] per editor rules.
 *
 * @param {unknown[]} spaces
 * @returns {object[]}
 */
export function spacesToFloorPlanAnnotations(spaces) {
  if (!Array.isArray(spaces)) return [];
  return spaces
    .map((s, i) => {
      if (!s || typeof s !== 'object') return null;
      const lc = s.layout_coordinate ?? s.coordinates;
      const shape = layoutCoordinateToAnnotationShape(lc);
      if (!shape || shape.type !== 'polygon') return null;

      const sid = String(s.space_id ?? '').trim();
      const label = String(s.space_name || s.inventory_name || sid || `Area ${i + 1}`).trim();

      return {
        id: `client-floor-${sid || `idx-${i}`}`,
        type: 'polygon',
        points: shape.points,
        label,
        space_ref: sid,
        source: CLIENT_SPACE_REGION_SOURCE,
        locked: true,
        visible: true,
        space: {
          inventory_name: s.inventory_name || s.space_name || label,
          inventory_type: s.inventory_type || '',
          status: s.status || '',
          name: sid,
          floor: s.floor,
        },
      };
    })
    .filter(Boolean);
}

/**
 * Sub-space polygons/rectangles with type-based fill (green / orange / purple).
 *
 * @param {unknown[]} spaces
 * @returns {object[]}
 */
export function subSpacesToHighlightAnnotations(spaces) {
  if (!Array.isArray(spaces)) return [];
  const out = [];

  for (const [si, s] of spaces.entries()) {
    if (!s || typeof s !== 'object') continue;
    const spaceId = String(s.space_id ?? '').trim();
    const parentSpaceName = String(s.space_name || s.inventory_name || '').trim();
    const subs = Array.isArray(s.sub_spaces) ? s.sub_spaces : [];

    for (const [j, ss] of subs.entries()) {
      if (!ss || typeof ss !== 'object') continue;

      const coord = ss.sub_space_coordinate ?? ss.layout_coordinate ?? ss.coordinates;
      const shape = layoutCoordinateToAnnotationShape(coord);
      if (!shape) continue;

      const colorKey = getClientSubSpaceColorKey(ss.sub_space_type, ss.sub_space_area_type);
      if (!colorKey) continue;

      const colors = CLIENT_SUBSPACE_COLORS[colorKey];
      const subId = String(ss.sub_space_id ?? '').trim();
      const subName = String(ss.sub_space_name || '').trim();
      const label = subName || subId || `Sub-space ${si + 1}-${j + 1}`;
      const assignSpaceId = resolveSubSpaceAssignSpaceId(ss);
      const clientDepartment = resolveSubSpaceClientDepartment(ss);
      const areaTypeLabel = formatClientSubSpaceAreaTypeLabel(ss);

      out.push({
        id: `client-subspace-region-${subId || `${spaceId}-${j}`}`,
        ...shape,
        label,
        source: CLIENT_SUBSPACE_HIGHLIGHT_SOURCE,
        subSpaceColorKey: colorKey,
        fill: colors.fill,
        stroke: colors.stroke,
        strokeWidth: 2,
        locked: true,
        visible: true,
        hideFromLayers: true,
        space_id: spaceId,
        sub_space_id: subId,
        sub_space_row_id: String(ss.sub_space_row_id ?? '').trim(),
        sub_space_name: subName,
        sub_space_type: ss.sub_space_type,
        sub_space_area_type: ss.sub_space_area_type,
        sub_space_area_type_label: areaTypeLabel,
        parent_space_name: parentSpaceName,
        assign_space_id: assignSpaceId,
        client_department: clientDepartment,
      });
    }
  }

  return out;
}

/**
 * @param {unknown} desk
 * @returns {object | null}
 */
export function readDeskAssignedClient(desk) {
  const assigned = desk?.assigned_client;
  if (!assigned || typeof assigned !== 'object') return null;
  return assigned;
}

/**
 * @param {unknown} desk
 * @returns {string}
 */
export function readDeskAssignedClientCompanyLogo(desk) {
  const assigned = readDeskAssignedClient(desk);
  if (!assigned) return '';
  return String(assigned.company_logo ?? '').trim();
}

/**
 * @param {unknown} desk
 * @returns {string}
 */
export function readDeskAssignedClientName(desk) {
  const assigned = readDeskAssignedClient(desk);
  if (!assigned) return '';
  return String(
    assigned.customer_name ?? assigned.customer_legal_name ?? assigned.customer_id ?? '',
  ).trim();
}

/**
 * @param {unknown} desk
 * @returns {boolean}
 */
export function deskHasAssignedClient(desk) {
  const assigned = readDeskAssignedClient(desk);
  if (!assigned) return false;
  return Boolean(
    String(
      assigned.customer_id ?? assigned.customer_name ?? assigned.customer_legal_name ?? '',
    ).trim(),
  );
}

/**
 * @param {unknown} desk
 * @returns {object | null}
 */
function resolveDeskCoordinateObject(desk) {
  if (!desk || typeof desk !== 'object') return null;
  const cc = desk.desk_coordinate ?? desk.layout_coordinate ?? desk.coordinates;
  if (!cc || typeof cc !== 'object') return null;

  const nx = Number(cc.x);
  const ny = Number(cc.y);
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return null;

  const w = Number(cc.width);
  const h = Number(cc.height);
  return {
    x: Number.isFinite(w) && w > 0 ? nx + w / 2 : nx,
    y: Number.isFinite(h) && h > 0 ? ny + h / 2 : ny,
  };
}

/**
 * @param {unknown} space
 * @param {unknown} desk
 * @returns {object | null}
 */
function findSubSpaceForDesk(space, desk) {
  if (!space || typeof space !== 'object' || !desk || typeof desk !== 'object') return null;
  const deskSubSpaceId = String(desk.sub_space_id ?? '').trim();
  if (!deskSubSpaceId) return null;
  const subs = Array.isArray(space.sub_spaces) ? space.sub_spaces : [];
  return subs.find((ss) => String(ss?.sub_space_id ?? '').trim() === deskSubSpaceId) ?? null;
}

/**
 * Desk `desk_coordinate` (normalized point) → clickable seat markers.
 * Collects desks from each sub-space and falls back to space-level `desks` /
 * `desk_coordinates` when the API aggregates them at the space root.
 *
 * @param {unknown[]} spaces
 * @returns {object[]}
 */
export function desksToCoworkerSlotAnnotations(spaces) {
  if (!Array.isArray(spaces)) return [];
  const out = [];
  const seenDeskKeys = new Set();

  const pushDeskPin = (desk, context, indexLabel) => {
    if (!desk || typeof desk !== 'object') return;

    const center = resolveDeskCoordinateObject(desk);
    if (!center) return;

    const { space: s, subSpace: ss, spaceIndex, subSpaceIndex } = context;
    const spaceId = String(s.space_id ?? '').trim();
    const parentSpaceName = String(s.space_name || s.inventory_name || '').trim();
    const subId = String(ss?.sub_space_id ?? desk.sub_space_id ?? '').trim();
    const subName = String(ss?.sub_space_name || '').trim();

    const deskId = String(desk.desk_id ?? '').trim();
    const deskRowId = String(desk.desk_row_id ?? desk.name ?? '').trim();
    const dedupeKey = deskId || deskRowId;
    if (dedupeKey && seenDeskKeys.has(dedupeKey)) return;
    if (dedupeKey) seenDeskKeys.add(dedupeKey);

    const seq = desk.sequence != null && desk.sequence !== '' ? String(desk.sequence) : '';
    const assignment = resolveDeskCoworkerForDesk(desk, ss);
    const assignedClient = readDeskAssignedClient(desk);
    const companyLogo = readDeskAssignedClientCompanyLogo(desk);
    const clientName = readDeskAssignedClientName(desk);
    const hasAssignedClient = deskHasAssignedClient(desk);
    const coworkerAssignments = getDeskCoworkerAssignmentList(desk).filter(rowHasCoworkerIdentity);
    const hasCoworkerAssignment = assignment.isAssigned;
    const countedFromApi = Number(desk.coworker_assignment_count);
    const coworkerAssignmentCount =
      Number.isFinite(countedFromApi) && countedFromApi > 0
        ? countedFromApi
        : coworkerAssignments.length;
    const clientDeskStatus = String(desk.client_desk_status || '').trim();

    const labelParts = [parentSpaceName, subName, seq ? `#${seq}` : ''].filter(Boolean);
    const label = labelParts.join(' · ') || deskId || indexLabel;

    out.push({
      id: `client-desk-pin-${deskId || deskRowId || `${subId || spaceId}-${indexLabel}`}`,
      type: 'point',
      x: center.x,
      y: center.y,
      source: CLIENT_SUBSPACE_SLOT_SOURCE,
      suppressCanvasShape: true,
      hideFromLayers: true,
      locked: true,
      visible: true,
      label,
      space_id: spaceId,
      sub_space_id: subId,
      sub_space_row_id: String(ss?.sub_space_row_id ?? '').trim(),
      desk_id: deskId,
      desk_row_id: deskRowId,
      sequence: seq,
      hasDeskAssignment: hasCoworkerAssignment,
      hasAssignedCoworker: hasCoworkerAssignment,
      hasAssignedClient,
      assigned_client: assignedClient,
      company_logo: companyLogo || undefined,
      client_name: clientName || undefined,
      coworker_details: assignment.coworkerDetails,
      client_coworker_ref: assignment.clientCoworkerRef,
      desk_assignment: assignment.deskAssignment,
      coworker_assignments: coworkerAssignments,
      coworker_assignment_count: coworkerAssignmentCount,
      client_desk_status: clientDeskStatus,
      parent_space_name: parentSpaceName,
      sub_space_name: subName,
      sub_space_type: ss?.sub_space_type,
      sub_space_area_type: ss?.sub_space_area_type,
    });
  };

  for (const [si, s] of spaces.entries()) {
    if (!s || typeof s !== 'object') continue;
    const subs = Array.isArray(s.sub_spaces) ? s.sub_spaces : [];

    for (const [j, ss] of subs.entries()) {
      if (!ss || typeof ss !== 'object') continue;

      const desks = Array.isArray(ss.desks)
        ? ss.desks
        : Array.isArray(ss.desk_coordinates)
          ? ss.desk_coordinates
          : [];

      for (const [k, desk] of desks.entries()) {
        pushDeskPin(
          desk,
          { space: s, subSpace: ss, spaceIndex: si, subSpaceIndex: j },
          `Seat ${si + 1}-${j + 1}-${k + 1}`,
        );
      }
    }

    const spaceDesks = Array.isArray(s.desks)
      ? s.desks
      : Array.isArray(s.desk_coordinates)
        ? s.desk_coordinates
        : [];

    for (const [k, desk] of spaceDesks.entries()) {
      const ss = findSubSpaceForDesk(s, desk);
      pushDeskPin(
        desk,
        { space: s, subSpace: ss, spaceIndex: si, subSpaceIndex: -1 },
        `Space desk ${si + 1}-${k + 1}`,
      );
    }
  }

  return out;
}

/** @deprecated Use desksToCoworkerSlotAnnotations — kept for existing imports */
export function subSpacesToCoworkerSlotAnnotations(spaces) {
  return desksToCoworkerSlotAnnotations(spaces);
}
