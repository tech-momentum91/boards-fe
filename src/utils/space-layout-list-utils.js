import {
  mergeSpaceWithClientsForPopover,
  normalizeLayoutFloorSpaceRowForAssociation,
} from '@/utils/layout-annotation-space';
import { layoutCoordinatePointsToAnnotation } from '@/utils/layout-coordinate-payload';
import { buildSpaceListApiFiltersFromApplied } from '@/components/space-management/constants';

function pickFloorMetaFromEntry(floorEntry) {
  if (!floorEntry || typeof floorEntry !== 'object') return {};
  if (floorEntry.floor && typeof floorEntry.floor === 'object') {
    return floorEntry.floor;
  }

  const {
    floor_ref,
    block,
    floor,
    block_floor_id,
    carpet_area,
    floor_height,
    has_parking,
    layout_image,
    layout_image_url,
    has_layout_image,
  } = floorEntry;

  return {
    floor_ref,
    block,
    floor,
    block_floor_id,
    carpet_area,
    floor_height,
    has_parking,
    layout_image,
    layout_image_url,
    has_layout_image,
  };
}

function buildLayoutListFloorSection(centerId, floorEntry, floorIndex) {
  if (!floorEntry || typeof floorEntry !== 'object') return null;

  const floorMeta = pickFloorMetaFromEntry(floorEntry);
  const floorRef = String(floorMeta.floor_ref || '').trim();
  const blockFloorId = String(floorMeta.block_floor_id || '').trim();
  const spaces = Array.isArray(floorEntry.spaces)
    ? floorEntry.spaces.map((space) => normalizeLayoutListSpace(space))
    : [];

  return {
    centerId,
    floor: floorMeta,
    spaces,
    spaceCount: Number(floorEntry.space_count ?? spaces.length) || 0,
    key: `${centerId}-${floorRef || blockFloorId || floorIndex}`,
  };
}

function buildLayoutListCenterGroup(centerId, centerName, floorEntries = []) {
  const floors = floorEntries
    .map((floorEntry, floorIndex) => buildLayoutListFloorSection(centerId, floorEntry, floorIndex))
    .filter(Boolean);

  return {
    centerId,
    centerName,
    floors,
  };
}

function pushLayoutListFloorItem(items, centerId, centerName, floorEntry, floorIndex) {
  const section = buildLayoutListFloorSection(centerId, floorEntry, floorIndex);
  if (!section) return;
  items.push({
    centerId,
    centerName,
    ...section,
  });
}

function resolveCenterFloorsFromBlock(centerKey, centerBlock) {
  if (!centerBlock || typeof centerBlock !== 'object') {
    return { centerId: centerKey, centerName: centerKey, floors: [] };
  }

  if (Array.isArray(centerBlock)) {
    return { centerId: centerKey, centerName: centerKey, floors: centerBlock };
  }

  const centerId = String(
    centerBlock.center_id || centerBlock.center || centerBlock.name || centerKey,
  ).trim();
  const centerName = String(
    centerBlock.center_name || centerBlock.centerName || centerId || centerKey,
  ).trim();
  const floors = Array.isArray(centerBlock.floors) ? centerBlock.floors : [];

  return {
    centerId: centerId || centerKey,
    centerName: centerName || centerId || centerKey,
    floors,
  };
}

/**
 * Resolve a grouped floor section for layout cards (supports nested or flat floor rows).
 *
 * @param {object | null | undefined} section
 */
export function resolveLayoutListFloorSection(section) {
  if (!section || typeof section !== 'object') {
    return { floor: {}, spaces: [], key: '' };
  }

  const floor = pickFloorMetaFromEntry(section);
  const spaces = Array.isArray(section.spaces) ? section.spaces : [];

  return {
    floor,
    spaces,
    key: String(section.key || '').trim(),
  };
}

/**
 * Map space-management applied filters to layout listview API filters (omit empty arrays).
 *
 * @param {object | null | undefined} applied
 */
export function buildLayoutListApiFilters(applied = {}) {
  const out = {};

  const client = applied.client ?? applied.customer;
  if (Array.isArray(client) && client.length > 0) {
    out.clients = client;
  }

  const inventoryType = applied.spaceType ?? applied.inventory_type;
  if (Array.isArray(inventoryType) && inventoryType.length > 0) {
    out.inventory_type = inventoryType;
    out.space_type = inventoryType;
  }

  const status = applied.status ?? applied.space_status;
  if (Array.isArray(status) && status.length > 0) {
    out.status = status;
    out.space_status = status;
  }

  return out;
}

/**
 * Resolve center scope for layout listview from Space module toolbar filters only.
 * Does not use the global navbar center selection (shared across Billing, Tickets, etc.).
 *
 * @returns {{
 *   apiCenter: string | null,
 *   filterCenterIds: string[] | null,
 *   isEmpty: boolean,
 * }}
 */
export function resolveLayoutCenterFilter(applied = {}, centerAccessData = []) {
  const tuples = buildSpaceListApiFiltersFromApplied(applied, centerAccessData);
  const isEmpty = tuples.some(
    (tuple) => tuple[0] === 'name' && tuple[1] === '=' && tuple[2] === '',
  );

  if (isEmpty) {
    return { apiCenter: null, filterCenterIds: [], isEmpty: true };
  }

  const centerTuple = tuples.find((tuple) => tuple[0] === 'center');
  if (!centerTuple) {
    return { apiCenter: null, filterCenterIds: null, isEmpty: false };
  }

  if (centerTuple[1] === '=') {
    const centerId = String(centerTuple[2] || '').trim();
    return {
      apiCenter: centerId || null,
      filterCenterIds: centerId ? [centerId] : [],
      isEmpty: false,
    };
  }

  if (centerTuple[1] === 'in' && Array.isArray(centerTuple[2])) {
    const centerIds = centerTuple[2].map((id) => String(id || '').trim()).filter(Boolean);
    if (centerIds.length === 1) {
      return { apiCenter: centerIds[0], filterCenterIds: centerIds, isEmpty: false };
    }
    return { apiCenter: null, filterCenterIds: centerIds, isEmpty: false };
  }

  return { apiCenter: null, filterCenterIds: null, isEmpty: false };
}

/**
 * Merge paginated center groups (pagination unit = center).
 *
 * @param {Array<{ centerId: string }>} previous
 * @param {Array<{ centerId: string }>} incoming
 */
export function mergeLayoutListCenters(previous, incoming) {
  if (!Array.isArray(previous) || previous.length === 0) {
    return Array.isArray(incoming) ? [...incoming] : [];
  }
  if (!Array.isArray(incoming) || incoming.length === 0) return previous;

  const merged = [...previous];
  const indexByCenter = new Map(merged.map((center, index) => [center.centerId, index]));

  incoming.forEach((center) => {
    const centerId = String(center?.centerId || '').trim();
    if (!centerId) return;
    const existingIndex = indexByCenter.get(centerId);
    if (existingIndex == null) {
      indexByCenter.set(centerId, merged.length);
      merged.push(center);
      return;
    }
    merged[existingIndex] = center;
  });

  return merged;
}

/**
 * Flatten center groups into floor sections (for filters that operate per floor).
 *
 * @param {Array<{ centerId: string, centerName: string, floors?: object[] }>} centers
 */
export function flattenLayoutListCenters(centers = []) {
  return centers.flatMap((center) => {
    const centerId = String(center?.centerId || '').trim();
    const centerName = String(center?.centerName || centerId).trim();
    const floors = Array.isArray(center?.floors) ? center.floors : [];
    return floors.map((floorSection) => ({
      ...floorSection,
      centerId,
      centerName,
    }));
  });
}

/**
 * Parse `get_layout_listview` into center groups (pagination is per center).
 *
 * Supports:
 * - `{ CTR-05: { center_name, floors: [{ floor, spaces }] } }`
 * - `[{ center_id, center_name, floors: [...] }]`
 * - `[{ center, center_name, floor, spaces }]`
 *
 * @param {object | null | undefined} message
 * @returns {{
 *   centers: Array<{
 *     centerId: string,
 *     centerName: string,
 *     floors: Array<{
 *       key: string,
 *       floor: object,
 *       spaces: object[],
 *       spaceCount: number,
 *     }>,
 *   }>,
 *   items: Array<{
 *     centerId: string,
 *     centerName: string,
 *     floor: object,
 *     spaces: object[],
 *     spaceCount: number,
 *     key: string,
 *   }>,
 *   hasMore: boolean,
 *   totalCount: number,
 *   totalCenters: number,
 *   pageCenterCount: number,
 *   page: number,
 *   pageSize: number,
 * }}
 */
export function normalizeLayoutListViewResponse(message) {
  const rawResults = message?.results;
  const centers = [];
  const items = [];

  if (Array.isArray(rawResults)) {
    rawResults.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') return;

      if (Array.isArray(entry.floors)) {
        const { centerId, centerName, floors } = resolveCenterFloorsFromBlock(
          String(entry.center_id || entry.center || entry.name || `center-${index}`).trim(),
          entry,
        );
        const centerGroup = buildLayoutListCenterGroup(centerId, centerName, floors);
        centers.push(centerGroup);
        floors.forEach((floorEntry, floorIndex) => {
          pushLayoutListFloorItem(items, centerId, centerName, floorEntry, floorIndex);
        });
        return;
      }

      const centerId = String(
        entry.center || entry.center_id || entry.name || `center-${index}`,
      ).trim();
      const centerName = String(entry.center_name || entry.centerName || centerId).trim();
      const centerGroup = buildLayoutListCenterGroup(centerId, centerName, [entry]);
      centers.push(centerGroup);
      pushLayoutListFloorItem(items, centerId, centerName, entry, 0);
    });
  } else if (rawResults && typeof rawResults === 'object') {
    Object.entries(rawResults).forEach(([centerKey, centerBlock]) => {
      const { centerId, centerName, floors } = resolveCenterFloorsFromBlock(centerKey, centerBlock);
      centers.push(buildLayoutListCenterGroup(centerId, centerName, floors));
      floors.forEach((floorEntry, floorIndex) => {
        pushLayoutListFloorItem(items, centerId, centerName, floorEntry, floorIndex);
      });
    });
  }

  const totalCenters = Number(
    message?.total_center_count ?? message?.center_count_total ?? message?.total_count ?? 0,
  );
  const pageCenterCount = Number(message?.center_count ?? centers.length);

  return {
    centers,
    items,
    hasMore: Boolean(message?.has_more),
    totalCount: totalCenters,
    totalCenters,
    pageCenterCount,
    page: Number(message?.page ?? 1),
    pageSize: Number(message?.page_size ?? message?.limit_page_length ?? 3),
  };
}

/**
 * @param {object | null | undefined} raw
 * @returns {object}
 */
export function normalizeLayoutListSpace(raw) {
  const normalized = normalizeLayoutFloorSpaceRowForAssociation(raw);
  const clients = Array.isArray(raw?.clients) ? raw.clients : [];
  const merged =
    mergeSpaceWithClientsForPopover(normalized, clients) ??
    normalized ??
    (raw && typeof raw === 'object' ? { ...raw } : {});

  const assignment = raw?.assignment && typeof raw.assignment === 'object' ? raw.assignment : null;
  const customerName =
    merged.client_name ||
    merged.assigned_customer_name ||
    raw?.assigned_customer_name ||
    assignment?.customer_name ||
    '';

  if (customerName && !merged.client_name) {
    merged.client_name = customerName;
  }

  return {
    ...merged,
    id: String(merged.id ?? merged.name ?? raw?.name ?? '').trim(),
    name: String(merged.name ?? raw?.name ?? '').trim(),
    clients,
    assignment,
    layout_coordinate: raw?.layout_coordinate ?? merged.layout_coordinate ?? null,
    has_layout_coordinate: Boolean(raw?.has_layout_coordinate ?? merged.has_layout_coordinate),
  };
}

/**
 * Extract normalized (0–1) point pairs from a layout coordinate payload.
 *
 * @param {unknown} coordinate
 * @param {number} [imageWidth]
 * @param {number} [imageHeight]
 * @returns {number[][]}
 */
export function extractLayoutCoordinatePairs(coordinate, imageWidth = 0, imageHeight = 0) {
  if (!coordinate || typeof coordinate !== 'object') return [];

  const normalizeValue = (value, max) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    if (num > 1 && max > 0) return num / max;
    return num;
  };

  const points = coordinate.points;
  if (Array.isArray(points) && points.length > 0) {
    return points
      .map((pair) => {
        if (!Array.isArray(pair) || pair.length < 2) return null;
        const x = normalizeValue(pair[0], imageWidth);
        const y = normalizeValue(pair[1], imageHeight);
        if (x == null || y == null) return null;
        return [x, y];
      })
      .filter(Boolean);
  }

  const x = normalizeValue(coordinate.x, imageWidth);
  const y = normalizeValue(coordinate.y, imageHeight);
  if (x == null || y == null) return [];
  return [[x, y]];
}

/**
 * @param {string} search
 * @param {object} space
 * @returns {boolean}
 */
export function spaceMatchesLayoutSearch(search, space) {
  const term = String(search || '')
    .trim()
    .toLowerCase();
  if (!term) return true;

  const haystack = [
    space?.name,
    space?.id,
    space?.inventory_name,
    space?.inventory_type,
    space?.center_name,
    space?.client_name,
    space?.assigned_customer_name,
    space?.floor,
  ]
    .map((v) => String(v || '').toLowerCase())
    .join(' ');

  return haystack.includes(term);
}

/**
 * Build FloorPlanEditor annotations from layout list spaces.
 *
 * @param {object[]} spaces
 * @param {number} [imageWidth]
 * @param {number} [imageHeight]
 * @returns {object[]}
 */
export function buildLayoutAnnotationsFromSpaces(spaces, imageWidth = 0, imageHeight = 0) {
  const list = Array.isArray(spaces) ? spaces : [];
  return list
    .map((space, index) => {
      const spaceRef = String(space?.name ?? space?.id ?? index).trim();
      if (!spaceRef) return null;
      const pairs = extractLayoutCoordinatePairs(space?.layout_coordinate, imageWidth, imageHeight);
      if (pairs.length === 0) return null;
      const annotation = layoutCoordinatePointsToAnnotation(
        `layout-${spaceRef}`,
        spaceRef,
        pairs,
        space,
      );
      return {
        ...annotation,
        locked: true,
        visible: true,
        space,
        space_ref: spaceRef,
      };
    })
    .filter(Boolean);
}

/**
 * Resolve polygon/rectangle style by inventory type (layout annotation palette).
 *
 * @param {object} ann
 * @returns {{ fill: string, stroke: string, strokeWidth: number } | undefined}
 */
export function resolveLayoutListAnnotationStyle(ann) {
  const space = ann?.space;
  if (!space) return undefined;

  const type = String(space.inventory_type || space.spaceType || '')
    .trim()
    .toLowerCase();

  if (type === 'managed office') {
    return { fill: 'rgba(147, 51, 234, 0.28)', stroke: '#9333ea', strokeWidth: 2 };
  }
  if (type.includes('co-work') || type.includes('cowork')) {
    return { fill: 'rgba(234, 88, 12, 0.28)', stroke: '#ea580c', strokeWidth: 2 };
  }
  if (type.includes('resource')) {
    return { fill: 'rgba(236, 72, 153, 0.28)', stroke: '#db2777', strokeWidth: 2 };
  }
  if (type.includes('pure rental')) {
    return { fill: 'rgba(37, 99, 235, 0.28)', stroke: '#2563eb', strokeWidth: 2 };
  }
  if (type.includes('common')) {
    return { fill: 'rgba(34, 197, 94, 0.28)', stroke: '#16a34a', strokeWidth: 2 };
  }

  const status = String(space.status || '').toLowerCase();
  if (status.includes('avail')) {
    return { fill: 'rgba(34, 197, 94, 0.28)', stroke: '#16a34a', strokeWidth: 2 };
  }
  if (status.includes('occup')) {
    return { fill: 'rgba(147, 51, 234, 0.28)', stroke: '#9333ea', strokeWidth: 2 };
  }

  return { fill: 'rgba(37, 99, 235, 0.22)', stroke: '#2563eb', strokeWidth: 2 };
}

/**
 * @param {Array<{ spaces?: object[] }>} floors
 * @returns {Array<{ key: string, label: string, value: string | number, trend?: object }>}
 */
export function computeCenterLayoutStats(floors = []) {
  const allSpaces = floors.flatMap((floor) => (Array.isArray(floor?.spaces) ? floor.spaces : []));
  const occupied = allSpaces.filter(
    (space) =>
      String(space?.status || '')
        .trim()
        .toLowerCase() === 'occupied',
  ).length;
  const available = allSpaces.filter(
    (space) =>
      String(space?.status || '')
        .trim()
        .toLowerCase() === 'available',
  ).length;
  const total = occupied + available;
  const occupancyRate = total > 0 ? `${Math.round((occupied / total) * 100)}%` : '0%';

  return [
    { key: 'occupancyRate', label: 'Occupancy Rate', value: occupancyRate },
    { key: 'occupied', label: 'Occupied Space', value: occupied },
    { key: 'available', label: 'Available Spaces', value: available },
  ];
}

/**
 * @param {object} floorMeta
 * @returns {string}
 */
export function getLayoutFloorLabel(floorMeta = {}) {
  const blockFloorId = String(floorMeta.block_floor_id || '').trim();
  if (blockFloorId) return blockFloorId;

  const block = floorMeta.block != null ? String(floorMeta.block).trim() : '';
  const floor = floorMeta.floor != null ? String(floorMeta.floor).trim() : '';
  if (block && floor) return `${block} - ${floor}`;
  if (floor) return `Floor ${floor}`;
  return 'Floor';
}

export function spaceMatchesLayoutStatusTabs(statusTab, inventoryTypeTab, space) {
  const status = String(space?.status || '').trim();
  const inventoryType = String(space?.inventory_type || space?.spaceType || '').trim();

  if (inventoryTypeTab) {
    return inventoryType === inventoryTypeTab;
  }

  if (!statusTab || statusTab === 'all') return true;
  return status === statusTab;
}
