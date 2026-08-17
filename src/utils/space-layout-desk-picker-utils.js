import {
  desksToCoworkerSlotAnnotations,
  layoutCoordinateToAnnotationShape,
  subSpacesToHighlightAnnotations,
} from '@/utils/client-floor-layout-annotations';
import {
  CLIENT_SPACE_REGION_SOURCE,
  CLIENT_SUBSPACE_HIGHLIGHT_SOURCE,
} from '@/constants/layout/annotation-sources';
import { isDeskOptionUnavailable, getDeskOptionStatus } from '@/utils/coworking-desk-options';

/** Lighter fills for allocate layout picker so desk icons stay visible. */
const ALLOCATE_SUBSPACE_AREA_FILL = 'rgba(234, 88, 12, 0.12)';
const ALLOCATE_SUBSPACE_AREA_STROKE = '#ea580c';
const ALLOCATE_CURRENT_SPACE_FILLS = {
  coworking: 'rgba(234, 88, 12, 0.1)',
  managedOffice: 'rgba(107, 33, 168, 0.1)',
  common: 'rgba(68, 172, 255, 0.12)',
  pureRental: 'rgba(37, 99, 235, 0.1)',
  default: 'rgba(99, 102, 241, 0.08)',
};

function collectNumericValues(value, out = []) {
  if (value == null) return out;
  if (typeof value === 'number' && Number.isFinite(value)) {
    out.push(Math.abs(value));
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectNumericValues(item, out));
    return out;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach((item) => collectNumericValues(item, out));
  }
  return out;
}

/**
 * @param {unknown} coordinate
 * @returns {boolean}
 */
export function coordinatesLookLikePixels(coordinate) {
  const values = collectNumericValues(coordinate);
  if (values.length === 0) return false;
  return values.some((value) => value > 1.5);
}

/**
 * @param {unknown} coordinate
 * @param {number} imageW
 * @param {number} imageH
 * @returns {unknown}
 */
export function normalizeLayoutCoordinateForImage(coordinate, imageW, imageH) {
  if (!coordinate || typeof coordinate !== 'object' || !imageW || !imageH) {
    return coordinate;
  }
  if (!coordinatesLookLikePixels(coordinate)) {
    return coordinate;
  }

  const next = { ...coordinate };

  if (Array.isArray(next.points)) {
    next.points = next.points.map((pair) => {
      if (!Array.isArray(pair) || pair.length < 2) return pair;
      const x = Number(pair[0]);
      const y = Number(pair[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return pair;
      return [x / imageW, y / imageH];
    });
  }

  const x = Number(next.x);
  const y = Number(next.y);
  const width = Number(next.width);
  const height = Number(next.height);

  if (Number.isFinite(x)) next.x = x / imageW;
  if (Number.isFinite(y)) next.y = y / imageH;
  if (Number.isFinite(width)) next.width = width / imageW;
  if (Number.isFinite(height)) next.height = height / imageH;

  return next;
}

/**
 * @param {unknown} desk
 * @param {number} imageW
 * @param {number} imageH
 * @returns {unknown}
 */
function normalizeDeskForImage(desk, imageW, imageH) {
  if (!desk || typeof desk !== 'object') return desk;
  const cc = desk.desk_coordinate ?? desk.layout_coordinate ?? desk.coordinates ?? desk.coordinate;
  if (!cc) return desk;
  return {
    ...desk,
    desk_coordinate: normalizeLayoutCoordinateForImage(cc, imageW, imageH),
    layout_coordinate: normalizeLayoutCoordinateForImage(
      desk.layout_coordinate ?? cc,
      imageW,
      imageH,
    ),
    coordinates: normalizeLayoutCoordinateForImage(desk.coordinates ?? cc, imageW, imageH),
  };
}

/**
 * @param {unknown} area
 * @returns {unknown}
 */
function readAreaLayoutCoordinate(area) {
  if (!area || typeof area !== 'object') return null;
  return area.layout_coordinate ?? area.coordinates ?? area.sub_space_coordinate ?? null;
}

/**
 * @param {unknown} message
 * @returns {object | null}
 */
function findCurrentSpaceArea(message) {
  if (!message || typeof message !== 'object') return null;
  const areas = Array.isArray(message.areas) ? message.areas : [];
  const fromAreas = areas.find(
    (area) => area?.area_type === 'space' && area?.is_current_space === true,
  );
  if (fromAreas) return fromAreas;

  const floorAreas = Array.isArray(message.floor_areas) ? message.floor_areas : [];
  return floorAreas.find((area) => area?.is_current_space === true) ?? null;
}

/**
 * @param {unknown} message
 * @returns {object[]}
 */
export function collectFloorAreasFromMessage(message) {
  if (!message || typeof message !== 'object') return [];

  if (Array.isArray(message.floor_areas) && message.floor_areas.length > 0) {
    return message.floor_areas;
  }

  if (Array.isArray(message.areas) && message.areas.length > 0) {
    return message.areas.filter((area) => area?.area_type === 'space');
  }

  const layoutCoordinate = message.space_layout_coordinate ?? readAreaLayoutCoordinate(message);
  if (!layoutCoordinate) return [];

  return [
    {
      area_type: 'space',
      id: message.space_id,
      space_id: message.space_id,
      label: message.space_name,
      name: message.space_name,
      layout_coordinate: layoutCoordinate,
      coordinates: layoutCoordinate,
      is_current_space: true,
      inventory_type: message.inventory_type,
      status: message.status,
      total_seats: message.total_seats,
      available_seats: message.available_seats,
    },
  ];
}

/**
 * @param {unknown} message
 * @returns {object[]}
 */
export function collectSubSpaceAreasFromMessage(message) {
  if (!message || typeof message !== 'object') return [];
  if (!Array.isArray(message.areas)) return [];
  return message.areas.filter((area) => area?.area_type === 'sub_space');
}

/**
 * @param {unknown} message
 * @returns {object[]}
 */
export function mapSpaceLayoutWithDesksToSpacesArray(message) {
  if (!message || typeof message !== 'object') return [];

  const currentSpaceArea = findCurrentSpaceArea(message);
  const layoutCoordinate =
    message.space_layout_coordinate ?? readAreaLayoutCoordinate(currentSpaceArea);

  return [
    {
      space_id: message.space_id,
      space_name: message.space_name,
      inventory_name: message.space_name,
      inventory_type: message.inventory_type ?? currentSpaceArea?.inventory_type,
      status: message.status ?? currentSpaceArea?.status,
      layout_coordinate: layoutCoordinate,
      sub_spaces: Array.isArray(message.sub_spaces) ? message.sub_spaces : [],
      desks: Array.isArray(message.desks) ? message.desks : [],
    },
  ];
}

function readDeskPoint(desk) {
  if (!desk || typeof desk !== 'object') return null;
  const cc = desk.desk_coordinate ?? desk.layout_coordinate ?? desk.coordinates ?? desk.coordinate;
  if (!cc || typeof cc !== 'object') return null;
  const x = Number(cc.x);
  const y = Number(cc.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

/**
 * Normalizes API coordinates where polygon points may be `{ x, y }[]` instead of `[x, y][]`.
 *
 * @param {unknown} coordinate
 * @returns {unknown}
 */
export function normalizeLayoutCoordinatePoints(coordinate) {
  if (!coordinate || typeof coordinate !== 'object') return coordinate;

  const points = coordinate.points;
  if (!Array.isArray(points) || points.length === 0) {
    return coordinate;
  }

  const first = points[0];
  if (!first || typeof first !== 'object' || Array.isArray(first)) {
    return coordinate;
  }

  if (!('x' in first) && !('y' in first)) {
    return coordinate;
  }

  const flat = points.flatMap((pair) => {
    if (!pair || typeof pair !== 'object') return [];
    const x = Number(pair.x);
    const y = Number(pair.y);
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : [];
  });

  if (flat.length < 4) return coordinate;

  return {
    ...coordinate,
    points: flat,
  };
}

/**
 * Maps `get_assign_space_deselect_layout` response → layout desk picker message shape.
 *
 * @param {unknown} raw
 * @returns {object | null}
 */
export function mapAssignSpaceDeselectLayoutToPickerMessage(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const floor = raw.floor && typeof raw.floor === 'object' ? raw.floor : {};
  const space = raw.space && typeof raw.space === 'object' ? raw.space : raw;
  const assignment = raw.assignment && typeof raw.assignment === 'object' ? raw.assignment : {};
  const zones = Array.isArray(raw.zones) ? raw.zones : [];
  const deskIds = new Set(
    (Array.isArray(raw.desk_ids) ? raw.desk_ids : [])
      .map((deskId) => String(deskId ?? '').trim())
      .filter(Boolean),
  );

  const clientName = String(
    assignment.customer_name ?? assignment.customer_legal_name ?? assignment.customer_id ?? '',
  ).trim();
  const assignedClient = clientName
    ? {
        customer_id: assignment.customer_id,
        customer_name: assignment.customer_name,
        customer_legal_name: assignment.customer_legal_name,
        company_logo: assignment.company_logo ?? null,
        client_image: assignment.client_image ?? null,
      }
    : null;

  const mapDeskCoordinate = (desk) => {
    if (!desk || typeof desk !== 'object') return null;
    const cc =
      desk.coordinate ?? desk.desk_coordinate ?? desk.layout_coordinate ?? desk.coordinates;
    if (!cc || typeof cc !== 'object') return null;
    if (Number.isFinite(Number(cc.x)) && Number.isFinite(Number(cc.y))) {
      return { x: Number(cc.x), y: Number(cc.y) };
    }
    return null;
  };

  const mapDesk = (desk) => {
    if (!desk || typeof desk !== 'object') return desk;
    const deskId = String(desk.desk_id ?? '').trim();
    const isSelected =
      desk.is_selected === true ||
      (deskId && deskIds.has(deskId)) ||
      desk.is_client_assigned === true;
    const point = mapDeskCoordinate(desk);
    return {
      ...desk,
      ...(point
        ? {
            desk_coordinate: point,
            layout_coordinate: point,
            coordinates: point,
          }
        : {}),
      is_client_assigned: isSelected,
      previously_assigned: isSelected,
      assigned_client: isSelected ? assignedClient : (desk.assigned_client ?? null),
    };
  };

  const subSpaces = zones.map((zone) => {
    if (!zone || typeof zone !== 'object') return zone;
    const subSpaceCoordinate = normalizeLayoutCoordinatePoints(
      zone.sub_space_coordinate ?? zone.layout_coordinate ?? zone.coordinates ?? zone.coordinate,
    );
    return {
      ...zone,
      sub_space_id: zone.sub_space_id ?? zone.id,
      sub_space_name: zone.sub_space_name ?? zone.label ?? zone.name,
      sub_space_coordinate: subSpaceCoordinate,
      layout_coordinate: subSpaceCoordinate,
      coordinates: subSpaceCoordinate,
      desks: (Array.isArray(zone.desks) ? zone.desks : []).map(mapDesk),
    };
  });

  const areas = Array.isArray(space.areas)
    ? space.areas.map((area) => {
        if (!area || typeof area !== 'object') return area;
        const layoutCoordinate = normalizeLayoutCoordinatePoints(
          area.layout_coordinate ?? area.coordinates ?? area.coordinate,
        );
        return {
          ...area,
          space_id: area.space_id ?? area.id ?? space.space_id,
          sub_space_id: area.sub_space_id ?? area.id,
          layout_coordinate: layoutCoordinate,
          coordinates: layoutCoordinate,
        };
      })
    : [];

  const spaceLayoutCoordinate = normalizeLayoutCoordinatePoints(
    space.space_layout_coordinate ?? space.coordinate ?? space.layout_coordinate,
  );

  const rootDesks = (Array.isArray(raw.desks) ? raw.desks : []).map(mapDesk);

  return {
    ok: raw.ok,
    layout_image: floor.layout_image ?? raw.layout_image,
    layout_image_url: floor.layout_image_url ?? floor.layout_image ?? raw.layout_image_url,
    space_id: space.space_id ?? raw.space_id,
    space_name: space.space_name ?? space.name ?? raw.space_name,
    inventory_type: space.inventory_type ?? raw.inventory_type,
    status: space.status ?? raw.status,
    space_layout_coordinate: spaceLayoutCoordinate,
    areas,
    floor_areas: areas.filter((area) => area?.area_type === 'space'),
    sub_spaces: subSpaces,
    desks: rootDesks,
    desk_ids: [...deskIds],
    client_assigned_desk_ids: [...deskIds],
  };
}

/**
 * @param {unknown} coordinate
 * @returns {{ minX: number, minY: number, maxX: number, maxY: number } | null}
 */
function getNormalizedBBoxFromCoordinate(coordinate) {
  const shape = layoutCoordinateToAnnotationShape(coordinate);
  if (!shape) return null;

  if (shape.type === 'rectangle') {
    return {
      minX: shape.x,
      minY: shape.y,
      maxX: shape.x + shape.width,
      maxY: shape.y + shape.height,
    };
  }

  if (shape.type === 'polygon' && Array.isArray(shape.points) && shape.points.length >= 6) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < shape.points.length; i += 2) {
      const x = Number(shape.points[i]);
      const y = Number(shape.points[i + 1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
    return { minX, minY, maxX, maxY };
  }

  return null;
}

/**
 * Place desks missing coordinates on a simple grid inside the sub-space bounds.
 *
 * @param {unknown} subSpace
 * @returns {unknown[]}
 */
function applyFallbackDeskCoordinates(subSpace) {
  if (!subSpace || typeof subSpace !== 'object') return [];

  const desks = Array.isArray(subSpace.desks) ? subSpace.desks.map((desk) => ({ ...desk })) : [];
  const missing = desks
    .map((desk, index) => ({ desk, index }))
    .filter(({ desk }) => !readDeskPoint(desk));
  if (missing.length === 0) return desks;

  const bbox = getNormalizedBBoxFromCoordinate(
    subSpace.sub_space_coordinate ?? subSpace.layout_coordinate ?? subSpace.coordinates,
  );
  if (!bbox) return desks;

  const width = Math.max(bbox.maxX - bbox.minX, 0.001);
  const height = Math.max(bbox.maxY - bbox.minY, 0.001);
  const padX = width * 0.12;
  const padY = height * 0.12;
  const innerMinX = bbox.minX + padX;
  const innerMaxX = bbox.maxX - padX;
  const innerMinY = bbox.minY + padY;
  const innerMaxY = bbox.maxY - padY;
  const cols = Math.max(1, Math.ceil(Math.sqrt(missing.length)));
  const rows = Math.max(1, Math.ceil(missing.length / cols));

  missing.forEach(({ desk, index: deskIndex }, slotIndex) => {
    const col = slotIndex % cols;
    const row = Math.floor(slotIndex / cols);
    const x = innerMinX + ((col + 0.5) / cols) * (innerMaxX - innerMinX);
    const y = innerMinY + ((row + 0.5) / rows) * (innerMaxY - innerMinY);
    const point = { x, y };
    desks[deskIndex] = {
      ...desk,
      desk_coordinate: point,
      layout_coordinate: point,
      coordinates: point,
      _fallback_coordinate: true,
    };
  });

  return desks;
}

/**
 * @param {unknown} message
 * @param {number} imageW
 * @param {number} imageH
 * @returns {object[]}
 */
export function buildNormalizedSpacesForLayoutPicker(message, imageW, imageH) {
  return mapSpaceLayoutWithDesksToSpacesArray(message).map((space) => {
    const subSpaces = (space.sub_spaces || []).map((subSpace) => {
      const normalizedSubSpace = {
        ...subSpace,
        sub_space_coordinate: normalizeLayoutCoordinateForImage(
          subSpace.sub_space_coordinate ?? subSpace.layout_coordinate ?? subSpace.coordinates,
          imageW,
          imageH,
        ),
      };
      const desksWithFallback = applyFallbackDeskCoordinates(normalizedSubSpace);
      return {
        ...normalizedSubSpace,
        desks: desksWithFallback.map((desk) => normalizeDeskForImage(desk, imageW, imageH)),
      };
    });

    const rootDesks = applyFallbackDeskCoordinates({
      ...space,
      sub_space_coordinate: space.layout_coordinate,
      desks: space.desks || [],
    });

    return {
      ...space,
      layout_coordinate: normalizeLayoutCoordinateForImage(space.layout_coordinate, imageW, imageH),
      sub_spaces: subSpaces,
      desks: rootDesks.map((desk) => normalizeDeskForImage(desk, imageW, imageH)),
    };
  });
}

/**
 * @param {unknown} area
 * @param {number} index
 * @param {number} imageW
 * @param {number} imageH
 * @returns {object | null}
 */
function floorAreaToRegionAnnotation(area, index, imageW, imageH) {
  if (!area || typeof area !== 'object') return null;

  const coordinate = normalizeLayoutCoordinateForImage(
    readAreaLayoutCoordinate(area),
    imageW,
    imageH,
  );
  const shape = layoutCoordinateToAnnotationShape(coordinate);
  if (!shape || shape.type !== 'polygon') return null;

  const spaceId = String(area.space_id ?? area.id ?? '').trim();
  const label = String(
    area.label || area.name || area.space_name || spaceId || `Space ${index + 1}`,
  ).trim();

  return {
    id: `space-allocate-region-${spaceId || index}`,
    type: 'polygon',
    points: shape.points,
    label,
    space_ref: spaceId,
    source: CLIENT_SPACE_REGION_SOURCE,
    locked: true,
    visible: true,
    is_current_space: area.is_current_space === true,
    space: {
      inventory_name: label,
      inventory_type: area.inventory_type || '',
      status: area.status || '',
      name: spaceId,
    },
  };
}

/**
 * @param {unknown} area
 * @param {number} index
 * @param {number} imageW
 * @param {number} imageH
 * @returns {object | null}
 */
function subSpaceAreaToHighlightAnnotation(area, index, imageW, imageH) {
  if (!area || typeof area !== 'object') return null;

  const coordinate = normalizeLayoutCoordinateForImage(
    readAreaLayoutCoordinate(area),
    imageW,
    imageH,
  );
  const shape = layoutCoordinateToAnnotationShape(coordinate);
  if (!shape) return null;

  const subId = String(area.sub_space_id ?? area.id ?? '').trim();
  const spaceId = String(area.space_id ?? '').trim();
  const label = String(
    area.sub_space_name || area.label || area.name || subId || `Sub-space ${index + 1}`,
  ).trim();

  return {
    id: `space-allocate-subspace-${subId || index}`,
    ...shape,
    label,
    source: CLIENT_SUBSPACE_HIGHLIGHT_SOURCE,
    fill: ALLOCATE_SUBSPACE_AREA_FILL,
    stroke: ALLOCATE_SUBSPACE_AREA_STROKE,
    strokeWidth: 1.5,
    locked: true,
    visible: true,
    hideFromLayers: true,
    space_id: spaceId,
    sub_space_id: subId,
    sub_space_name: label,
    sub_space_type: area.sub_space_type,
  };
}

/**
 * @param {unknown} message
 * @param {number} imageW
 * @param {number} imageH
 * @returns {object[]}
 */
export function buildFloorAreaRegionAnnotations(message, imageW, imageH) {
  return collectFloorAreasFromMessage(message)
    .map((area, index) => floorAreaToRegionAnnotation(area, index, imageW, imageH))
    .filter(Boolean);
}

/**
 * @param {unknown} message
 * @param {number} imageW
 * @param {number} imageH
 * @returns {object[]}
 */
export function buildSubSpaceAreaHighlightAnnotations(message, imageW, imageH) {
  return collectSubSpaceAreasFromMessage(message)
    .map((area, index) => subSpaceAreaToHighlightAnnotation(area, index, imageW, imageH))
    .filter(Boolean);
}

/**
 * @param {unknown} ann
 * @returns {{ fill?: string, stroke?: string, strokeWidth?: number, opacity?: number } | undefined}
 */
export function resolveSpaceAllocateLayoutAnnotationStyle(ann) {
  if (ann?.source === CLIENT_SUBSPACE_HIGHLIGHT_SOURCE) {
    return {
      fill: ann.fill,
      stroke: ann.stroke,
      strokeWidth: ann.strokeWidth ?? 2,
    };
  }

  if (ann?.source !== CLIENT_SPACE_REGION_SOURCE) return undefined;

  const inventoryType = String(ann?.space?.inventory_type || '')
    .trim()
    .toLowerCase();
  const isCurrentSpace = ann?.is_current_space === true;

  let fill = ALLOCATE_CURRENT_SPACE_FILLS.default;
  let stroke = '#6366f1';

  if (inventoryType === 'managed office') {
    fill = ALLOCATE_CURRENT_SPACE_FILLS.managedOffice;
    stroke = '#9333ea';
  } else if (inventoryType.includes('co-work') || inventoryType.includes('cowork')) {
    fill = ALLOCATE_CURRENT_SPACE_FILLS.coworking;
    stroke = '#ea580c';
  } else if (inventoryType.includes('common')) {
    fill = ALLOCATE_CURRENT_SPACE_FILLS.common;
    stroke = '#44a2ff';
  } else if (inventoryType.includes('pure rental')) {
    fill = ALLOCATE_CURRENT_SPACE_FILLS.pureRental;
    stroke = '#2563eb';
  }

  if (!isCurrentSpace) {
    return {
      fill: fill.replace(/[\d.]+\)$/, '0.05)'),
      stroke,
      strokeWidth: 1.5,
      opacity: 0.45,
    };
  }

  return {
    fill,
    stroke,
    strokeWidth: 2,
  };
}

/**
 * @param {unknown} message
 * @param {number} imageW
 * @param {number} imageH
 * @returns {object[]}
 */
export function buildSpaceLayoutDeskPickerAnnotations(message, imageW, imageH) {
  const spaces = buildNormalizedSpacesForLayoutPicker(message, imageW, imageH);

  return [
    ...buildFloorAreaRegionAnnotations(message, imageW, imageH),
    ...buildSubSpaceAreaHighlightAnnotations(message, imageW, imageH),
    ...subSpacesToHighlightAnnotations(spaces),
    ...desksToCoworkerSlotAnnotations(spaces),
  ];
}

/**
 * Annotation id for the highlighted current space region (used to focus viewport on open).
 *
 * @param {unknown[]} annotations
 * @returns {string}
 */
export function findCurrentSpaceLayoutAnnotationId(annotations) {
  if (!Array.isArray(annotations)) return '';
  const match = annotations.find(
    (ann) =>
      ann &&
      ann.source === CLIENT_SPACE_REGION_SOURCE &&
      ann.is_current_space === true &&
      String(ann.space_ref || '').trim(),
  );
  return match?.id ? String(match.id) : '';
}

/**
 * @param {unknown} message
 * @returns {string[]}
 */
export function collectClientAssignedDeskIds(message) {
  if (!message || typeof message !== 'object') return [];

  const ids = new Set();

  if (Array.isArray(message.client_assigned_desk_ids)) {
    message.client_assigned_desk_ids.forEach((deskId) => {
      const normalized = String(deskId ?? '').trim();
      if (normalized) ids.add(normalized);
    });
  }

  if (Array.isArray(message.desk_ids)) {
    message.desk_ids.forEach((deskId) => {
      const normalized = String(deskId ?? '').trim();
      if (normalized) ids.add(normalized);
    });
  }

  const assignedDesks = Array.isArray(message.client_assigned_desks)
    ? message.client_assigned_desks
    : [];
  assignedDesks.forEach((desk) => {
    const normalized = String(desk?.desk_id ?? '').trim();
    if (normalized) ids.add(normalized);
  });

  const rootDesks = Array.isArray(message.desks) ? message.desks : [];
  rootDesks.forEach((desk) => {
    if (desk?.previously_assigned !== true && desk?.is_client_assigned !== true) return;
    const normalized = String(desk?.desk_id ?? '').trim();
    if (normalized) ids.add(normalized);
  });

  const zones = Array.isArray(message.zones) ? message.zones : [];
  zones.forEach((zone) => {
    const desks = Array.isArray(zone?.desks) ? zone.desks : [];
    desks.forEach((desk) => {
      if (desk?.is_selected !== true && desk?.is_client_assigned !== true) return;
      const normalized = String(desk?.desk_id ?? '').trim();
      if (normalized) ids.add(normalized);
    });
  });

  const subs = Array.isArray(message.sub_spaces) ? message.sub_spaces : [];
  subs.forEach((subSpace) => {
    const desks = Array.isArray(subSpace?.desks) ? subSpace.desks : [];
    desks.forEach((desk) => {
      if (desk?.previously_assigned !== true && desk?.is_client_assigned !== true) return;
      const normalized = String(desk?.desk_id ?? '').trim();
      if (normalized) ids.add(normalized);
    });
  });

  return [...ids];
}

/**
 * @param {unknown} desk
 * @param {Set<string>} clientAssignedDeskIds
 * @returns {boolean}
 */
function isDeskPreviouslyAssignedToClient(desk, clientAssignedDeskIds) {
  if (!desk || typeof desk !== 'object') return false;
  if (desk.is_selected === true) return true;
  const assignedClient = desk.assigned_client;
  if (assignedClient && typeof assignedClient === 'object') {
    const customerId = String(
      assignedClient.customer_id ?? assignedClient.customer_name ?? '',
    ).trim();
    if (customerId) return true;
  }
  const deskId = String(desk?.desk_id ?? desk?.name ?? '').trim();
  if (deskId && clientAssignedDeskIds.has(deskId)) return true;
  return desk?.previously_assigned === true || desk?.is_client_assigned === true;
}
/**
 * @param {unknown} message
 * @returns {Map<string, { deskId: string, subSpaceId: string, sequence: number, status: string, previouslyAssigned?: boolean }>}
 */
export function buildLayoutDeskMetaMap(message) {
  const clientAssignedDeskIds = new Set(collectClientAssignedDeskIds(message));

  const map = new Map();
  const spaces = mapSpaceLayoutWithDesksToSpacesArray(message);

  spaces.forEach((space) => {
    const subs = Array.isArray(space.sub_spaces) ? space.sub_spaces : [];
    subs.forEach((subSpace, subIndex) => {
      const subSpaceId = String(subSpace?.sub_space_id ?? subIndex).trim();
      const desks = Array.isArray(subSpace?.desks) ? subSpace.desks : [];
      desks.forEach((desk, deskIndex) => {
        const deskId = String(desk?.desk_id ?? desk?.name ?? '').trim();
        if (!deskId) return;
        map.set(deskId, {
          deskId,
          subSpaceId,
          sequence: Number(desk?.sequence ?? desk?.seq ?? deskIndex + 1) || deskIndex + 1,
          status: getDeskOptionStatus(desk),
          locked: desk?.locked ?? subSpace?.locked,
          active: desk?.active ?? subSpace?.active,
          occupied: desk?.occupied ?? subSpace?.occupied,
          requested: desk?.requested ?? subSpace?.requested,
          is_requested: desk?.is_requested ?? subSpace?.is_requested,
          previouslyAssigned: isDeskPreviouslyAssignedToClient(desk, clientAssignedDeskIds),
        });
      });
    });

    const rootDesks = Array.isArray(space.desks) ? space.desks : [];
    rootDesks.forEach((desk, deskIndex) => {
      const deskId = String(desk?.desk_id ?? desk?.name ?? '').trim();
      if (!deskId || map.has(deskId)) return;
      map.set(deskId, {
        deskId,
        subSpaceId: String(desk?.sub_space_id ?? '').trim(),
        sequence: Number(desk?.sequence ?? desk?.seq ?? deskIndex + 1) || deskIndex + 1,
        status: getDeskOptionStatus(desk),
        locked: desk?.locked,
        active: desk?.active,
        occupied: desk?.occupied,
        requested: desk?.requested,
        is_requested: desk?.is_requested,
        previouslyAssigned: isDeskPreviouslyAssignedToClient(desk, clientAssignedDeskIds),
      });
    });
  });

  return map;
}

/**
 * @param {unknown} deskMeta
 * @returns {boolean}
 */
export function isLayoutDeskSelectable(deskMeta) {
  if (deskMeta?.previouslyAssigned) return false;
  return !isDeskOptionUnavailable(deskMeta);
}

/**
 * @param {string[]} deskIds
 * @param {Map<string, { subSpaceId?: string }>} deskMetaMap
 * @returns {Array<{ desk_id: string, sub_space_id?: string }>}
 */
export function buildLayoutDeskAssignItems(deskIds, deskMetaMap) {
  return (deskIds || [])
    .map((deskId) => {
      const normalized = String(deskId ?? '').trim();
      if (!normalized) return null;
      const meta = deskMetaMap.get(normalized);
      return {
        desk_id: normalized,
        ...(meta?.subSpaceId ? { sub_space_id: meta.subSpaceId } : {}),
      };
    })
    .filter(Boolean);
}
