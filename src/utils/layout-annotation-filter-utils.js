import apiClient from '@/api/axios';
import {
  LAYOUT_AGREEMENT_DATE_FILTER_OPTIONS,
  LAYOUT_AGREEMENT_DATE_RANGE_PRESET_OPTIONS,
  LAYOUT_FILTER_ALL,
  LAYOUT_INVENTORY_TYPE_UI_TO_API,
  LAYOUT_OCCUPANCY_OPTIONS,
  LAYOUT_OCCUPANCY_UI_TO_API,
  LAYOUT_SPACE_TYPE_FILTER_OPTIONS,
  LAYOUT_SPACE_TYPE_MULTI_SELECT_OPTIONS,
} from '@/constants/layout/center-filter-constants';
import {
  pickPrimaryLayoutClient,
  DESK_COWORKER_MARKER,
  SERVER_SUBSPACE_PIN_SOURCE,
} from '@/utils/layout-annotation-space';
import {
  CENTER_SUBSPACE_MARKER,
  SUBSPACE_LAYOUT_PENDING_SOURCE,
} from '@/utils/layout-annotation-subspace';

export {
  LAYOUT_AGREEMENT_DATE_FILTER_OPTIONS,
  LAYOUT_AGREEMENT_DATE_RANGE_PRESET_OPTIONS,
  LAYOUT_FILTER_ALL,
  LAYOUT_OCCUPANCY_OPTIONS,
  LAYOUT_SPACE_TYPE_FILTER_OPTIONS,
  LAYOUT_SPACE_TYPE_MULTI_SELECT_OPTIONS,
  LAYOUT_OCCUPANCY_UI_TO_API,
  LAYOUT_INVENTORY_TYPE_UI_TO_API,
};

/**
 * @param {string | string[] | undefined} spaceTypeOrTypes
 * @returns {string[]}
 */
export function normalizeLayoutSpaceTypeFilters(spaceTypeOrTypes) {
  if (Array.isArray(spaceTypeOrTypes)) {
    return spaceTypeOrTypes
      .map((v) => String(v ?? '').trim())
      .filter((v) => v && v !== LAYOUT_FILTER_ALL);
  }
  const single = String(spaceTypeOrTypes ?? '').trim();
  if (!single || single === LAYOUT_FILTER_ALL) return [];
  return [single];
}

/**
 * @param {{ clientId?: string, spaceRef?: string, spaceType?: string | string[], spaceTypes?: string[], occupancy?: string, agreementDateFilterType?: string, fromDate?: string, toDate?: string }} uiFilters
 */
export function hasActiveLayoutDetailFilters(uiFilters) {
  const clientId = String(uiFilters?.clientId ?? '').trim();
  const spaceRef = String(uiFilters?.spaceRef ?? '').trim();
  const spaceTypes = normalizeLayoutSpaceTypeFilters(uiFilters?.spaceTypes ?? uiFilters?.spaceType);
  const occupancy = String(uiFilters?.occupancy ?? '').trim();
  const agreementDateFilterType = String(uiFilters?.agreementDateFilterType ?? '').trim();
  const fromDate = String(uiFilters?.fromDate ?? '').trim();
  const toDate = String(uiFilters?.toDate ?? '').trim();
  return (
    (clientId && clientId !== LAYOUT_FILTER_ALL) ||
    (spaceRef && spaceRef !== LAYOUT_FILTER_ALL) ||
    spaceTypes.length > 0 ||
    (occupancy && occupancy !== LAYOUT_FILTER_ALL) ||
    Boolean(agreementDateFilterType && fromDate && toDate)
  );
}

/**
 * Map header filter state to `get_layout_detail` `filters` payload.
 *
 * @param {{ clientId?: string, spaceRef?: string, spaceType?: string | string[], spaceTypes?: string[], occupancy?: string, agreementDateFilterType?: string, fromDate?: string, toDate?: string }} uiFilters
 * @returns {Record<string, string | string[]> | undefined}
 */
/** Stable key for matching layout detail responses to the active filter request. */
export function serializeLayoutDetailFiltersKey(filters) {
  return JSON.stringify(filters ?? null);
}

export function buildLayoutDetailApiFilters(uiFilters) {
  const clientId = String(uiFilters?.clientId ?? '').trim();
  const spaceName = String(uiFilters?.spaceRef ?? '').trim();
  const spaceTypes = normalizeLayoutSpaceTypeFilters(uiFilters?.spaceTypes ?? uiFilters?.spaceType);
  const occupancy = String(uiFilters?.occupancy ?? '').trim();
  const agreementDateFilterType = String(uiFilters?.agreementDateFilterType ?? '').trim();
  const fromDate = String(uiFilters?.fromDate ?? '').trim();
  const toDate = String(uiFilters?.toDate ?? '').trim();

  const out = {};

  if (clientId && clientId !== LAYOUT_FILTER_ALL) {
    out.client = [clientId];
  }
  if (spaceName && spaceName !== LAYOUT_FILTER_ALL) {
    out.inventory_name = [spaceName];
  }
  if (spaceTypes.length > 0) {
    out.inventory_type = spaceTypes.map((t) => LAYOUT_INVENTORY_TYPE_UI_TO_API[t] ?? t);
  }
  if (occupancy && occupancy !== LAYOUT_FILTER_ALL) {
    out.space_status = [LAYOUT_OCCUPANCY_UI_TO_API[occupancy] ?? occupancy];
  }
  if (agreementDateFilterType && fromDate && toDate) {
    out.from_date = fromDate;
    out.to_date = toDate;
    out.agreement_date_filter = [agreementDateFilterType];
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * @param {string} centerId
 * @param {string} floorRef layout row `name` from get_layout_detail
 */
export function buildLayoutAnnotationPath(centerId, floorRef) {
  const cid = String(centerId || '').trim();
  const fid = String(floorRef || '').trim();
  if (!cid || !fid) return '';
  return `/centers/${encodeURIComponent(cid)}/layouts/${encodeURIComponent(fid)}`;
}

function normalizeInventoryTypeKey(raw) {
  const v = String(raw || '')
    .trim()
    .toLowerCase();
  if (!v) return '';
  if (v === 'managed office') return 'managed office';
  if (v.includes('co-work') || v.includes('cowork')) return 'co-working space';
  if (v === 'resource') return 'resource';
  if (v.includes('pure rental')) return 'pure rental';
  if (v.includes('common')) return 'common';
  return v;
}

/**
 * @param {object | null | undefined} ann
 * @returns {string}
 */
export function getAnnotationInventoryTypeKey(ann) {
  const s = ann?.space;
  if (!s || typeof s !== 'object') return '';
  return normalizeInventoryTypeKey(s.inventory_type ?? s.spaceType);
}

/**
 * Occupancy bucket for canvas filtering (Available, Occupied, Inactive, Notice, Locked).
 *
 * @param {object | null | undefined} ann
 * @returns {string}
 */
export function getAnnotationOccupancyBucket(ann) {
  const s = ann?.space;
  const clients = Array.isArray(ann?.clients) ? ann.clients : [];
  const primary = pickPrimaryLayoutClient(clients);
  const raw = String(primary?.status ?? s?.status ?? '')
    .trim()
    .toLowerCase();

  if (raw.includes('lock')) return 'locked';
  if (raw.includes('notice')) return 'notice';
  if (raw.includes('inactive')) return 'inactive';
  if (raw.includes('occup')) return 'occupied';
  if (raw.includes('avail') || raw.includes('vacant') || raw.includes('free')) return 'available';

  if (primary || s?.client_name || s?.client) return 'occupied';
  if (String(ann?.space_ref || '').trim()) return 'available';
  return 'available';
}

/**
 * Count associated layout spaces in the "available" occupancy bucket (for page header meta).
 *
 * @param {unknown[]} annotations
 */
export function countAvailableLayoutSpaces(annotations) {
  return (annotations ?? []).filter((ann) => {
    if (!ann || typeof ann !== 'object') return false;
    if (
      ann.source === SERVER_SUBSPACE_PIN_SOURCE ||
      ann.source === DESK_COWORKER_MARKER ||
      ann.source === CENTER_SUBSPACE_MARKER ||
      ann.source === SUBSPACE_LAYOUT_PENDING_SOURCE
    ) {
      return false;
    }
    if (!String(ann.space_ref || '').trim()) return false;
    return getAnnotationOccupancyBucket(ann) === 'available';
  }).length;
}

/**
 * @param {object | null | undefined} ann
 * @returns {string}
 */
export function getAnnotationClientFilterKey(ann) {
  const clients = Array.isArray(ann?.clients) ? ann.clients : [];
  const primary = pickPrimaryLayoutClient(clients);
  if (primary && typeof primary === 'object') {
    const id = String(primary.customer ?? primary.customer_id ?? primary.name ?? '').trim();
    if (id) return id;
    const name = String(primary.customer_name ?? '').trim();
    if (name) return `${name}`;
  }
  const s = ann?.space;
  const name = String(s?.client_name ?? s?.customer_name ?? '').trim();
  if (name) return `${name}`;
  return '';
}

/**
 * @param {unknown[]} annotations
 */
/**
 * Client dropdown from CRM client list API (same source as allocate modal).
 *
 * @param {unknown[]} clients
 */
export function buildLayoutAnnotationClientFilterOptionsFromApiClients(clients) {
  const map = new Map();
  for (const c of clients ?? []) {
    if (!c || typeof c !== 'object') continue;
    const value = String(c.name ?? c.customer ?? c.customer_id ?? '').trim();
    if (!value) continue;
    const label =
      String(c.custom_display_name ?? c.customer_name ?? c.client_name ?? c.name ?? value).trim() ||
      value;
    if (!map.has(value)) map.set(value, label);
  }
  return [
    { value: LAYOUT_FILTER_ALL, label: 'All client' },
    ...[...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label })),
  ];
}

export function buildLayoutAnnotationClientFilterOptions(annotations) {
  const map = new Map();
  for (const ann of annotations) {
    if (!ann || typeof ann !== 'object') continue;
    if (!String(ann.space_ref || '').trim()) continue;
    const clients = Array.isArray(ann.clients) ? ann.clients : [];
    if (clients.length > 0) {
      for (const c of clients) {
        if (!c || typeof c !== 'object') continue;
        const id = String(c.customer ?? c.customer_id ?? c.name ?? '').trim();
        const label = String(c.customer_name ?? c.customer ?? id).trim();
        if (!id && !label) continue;
        const key = id || `name:${label.toLowerCase()}`;
        if (!map.has(key)) map.set(key, label || id);
      }
    } else {
      const key = getAnnotationClientFilterKey(ann);
      if (!key) continue;
      const label = String(ann.space?.client_name ?? ann.space?.customer_name ?? key).trim();
      map.set(key, label || key);
    }
  }
  return [
    { value: LAYOUT_FILTER_ALL, label: 'All client' },
    ...[...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label })),
  ];
}

/**
 * @param {unknown[]} annotations
 */
export function buildLayoutAnnotationSpaceFilterOptions(annotations) {
  const map = new Map();
  for (const ann of annotations) {
    if (!ann || typeof ann !== 'object') continue;
    if (!String(ann.space_ref || '').trim()) continue;
    const inventoryName = String(
      ann.space?.inventory_name ?? ann.space?.name ?? ann.label ?? '',
    ).trim();
    if (!inventoryName) continue;
    if (!map.has(inventoryName)) map.set(inventoryName, inventoryName);
  }
  return buildLayoutSpaceNameSelectOptions([...map.keys()]);
}

/**
 * Build `{ value, label }` options for the layout header space-name filter.
 * @param {string[]} inventoryNames
 */
export function buildLayoutSpaceNameSelectOptions(inventoryNames) {
  const unique = [
    ...new Set((inventoryNames || []).map((n) => String(n ?? '').trim()).filter(Boolean)),
  ];
  unique.sort((a, b) => a.localeCompare(b));
  return [
    { value: LAYOUT_FILTER_ALL, label: 'All space' },
    ...unique.map((name) => ({ value: name, label: name })),
  ];
}

function unwrapSpaceListviewRows(response) {
  const responseData = response?.data;
  const message = responseData?.message || {};
  if (Array.isArray(message.results)) return message.results;
  if (Array.isArray(message.data)) return message.data;
  if (Array.isArray(message)) return message;
  if (Array.isArray(responseData?.data)) return responseData.data;
  if (Array.isArray(responseData)) return responseData;
  return [];
}

/**
 * Fetch space names for layout header filters (center + floor + optional space types + keyword).
 *
 * @param {{
 *   center: string,
 *   floor: string,
 *   spaceTypes?: string[],
 *   keyword?: string,
 * }} params
 */
export async function fetchLayoutSpaceNameFilterOptions({
  center,
  floor,
  spaceTypes = [],
  keyword = '',
}) {
  const centerId = String(center ?? '').trim();
  const floorId = String(floor ?? '').trim();
  if (!centerId || !floorId) {
    return buildLayoutSpaceNameSelectOptions([]);
  }

  const filters = [
    ['center', '=', centerId],
    ['floor', '=', floorId],
  ];

  const apiTypes = normalizeLayoutSpaceTypeFilters(spaceTypes).map(
    (t) => LAYOUT_INVENTORY_TYPE_UI_TO_API[t] ?? t,
  );

  if (apiTypes.length === 1) {
    filters.push(['inventory_type', '=', apiTypes[0]]);
  } else if (apiTypes.length > 1) {
    filters.push(['inventory_type', 'in', apiTypes]);
  }

  const formData = new FormData();
  formData.append('doctype', 'Space');
  formData.append('filters', JSON.stringify(filters));
  formData.append('fields', JSON.stringify(['name', 'inventory_name', 'inventory_type']));
  formData.append('order_by', 'inventory_name asc');
  formData.append('limit_page_length', '200');
  formData.append('page', '1');
  const trimmedKeyword = String(keyword ?? '').trim();
  if (trimmedKeyword) {
    formData.append('keyword', trimmedKeyword);
  }

  const response = await apiClient.post(
    '/method/devx.seat_inventory.doctype.space.space.get_space_listview',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );

  const rows = unwrapSpaceListviewRows(response);
  const names = rows
    .map((row) => String(row?.inventory_name ?? row?.spaceName ?? '').trim())
    .filter(Boolean);

  return buildLayoutSpaceNameSelectOptions(names);
}

/**
 * @param {unknown[]} annotations
 * @returns {Map<string, { space?: object, clients?: unknown[] }>}
 */
export function buildParentSpaceMetaByRef(annotations) {
  const map = new Map();
  for (const ann of annotations) {
    if (!ann || typeof ann !== 'object') continue;
    if (ann.source === SERVER_SUBSPACE_PIN_SOURCE) continue;
    if (ann.source === DESK_COWORKER_MARKER) continue;
    const ref = String(ann.space_ref || '').trim();
    if (!ref) continue;
    map.set(ref, { space: ann.space, clients: ann.clients });
  }
  return map;
}

/**
 * @param {object} ann
 * @param {string} spaceRef
 * @param {Map<string, { space?: object, clients?: unknown[] }>} parentSpaceMetaByRef
 */
function resolveFilterContextForAnnotation(ann, spaceRef, parentSpaceMetaByRef) {
  const ref = String(spaceRef || '').trim();
  if (!ref) return ann;
  const parent = parentSpaceMetaByRef.get(ref);
  if (!parent) return { ...ann, space_ref: ref };
  return {
    ...ann,
    space_ref: ref,
    space: parent.space ?? ann.space,
    clients: parent.clients ?? ann.clients,
  };
}

/**
 * @param {{
 *   clientId?: string,
 *   spaceRef?: string,
 *   spaceType?: string | string[],
 *   spaceTypes?: string[],
 *   occupancy?: string,
 * }} filters
 * @param {object} ann
 * @param {Map<string, { space?: object, clients?: unknown[] }>} parentSpaceMetaByRef
 */
export function annotationMatchesLayoutCanvasFilters(ann, filters, parentSpaceMetaByRef) {
  if (!ann || typeof ann !== 'object') return true;

  if (ann.source === CENTER_SUBSPACE_MARKER || ann.source === SUBSPACE_LAYOUT_PENDING_SOURCE) {
    return true;
  }

  let spaceRef = String(ann.space_ref || '').trim();
  if (ann.source === DESK_COWORKER_MARKER) {
    spaceRef = String(ann.parent_space_ref || spaceRef).trim();
  }

  const clientId = String(filters?.clientId || '').trim();
  const spaceFilter = String(filters?.spaceRef || '').trim();
  const spaceTypes = normalizeLayoutSpaceTypeFilters(filters?.spaceTypes ?? filters?.spaceType);
  const occupancy = String(filters?.occupancy || '').trim();

  const hasActiveFilter =
    (clientId && clientId !== LAYOUT_FILTER_ALL) ||
    (spaceFilter && spaceFilter !== LAYOUT_FILTER_ALL) ||
    spaceTypes.length > 0 ||
    (occupancy && occupancy !== LAYOUT_FILTER_ALL);

  if (!hasActiveFilter) return true;

  if (!spaceRef) return false;

  const ctx = resolveFilterContextForAnnotation(ann, spaceRef, parentSpaceMetaByRef);

  if (spaceFilter && spaceFilter !== LAYOUT_FILTER_ALL) {
    const inventoryName = String(
      ctx.space?.inventory_name ?? ctx.space?.spaceName ?? ctx.space?.name ?? '',
    ).trim();
    if (spaceRef !== spaceFilter && inventoryName !== spaceFilter) {
      return false;
    }
  }

  if (clientId && clientId !== LAYOUT_FILTER_ALL) {
    const annClientKey = getAnnotationClientFilterKey(ctx);
    if (annClientKey !== clientId) {
      const clients = Array.isArray(ctx.clients) ? ctx.clients : [];
      const match = clients.some((c) => {
        const id = String(c?.customer ?? c?.customer_id ?? c?.name ?? '').trim();
        return id === clientId;
      });
      if (!match) return false;
    }
  }

  if (spaceTypes.length > 0 && !spaceTypes.includes(getAnnotationInventoryTypeKey(ctx))) {
    return false;
  }

  if (
    occupancy &&
    occupancy !== LAYOUT_FILTER_ALL &&
    getAnnotationOccupancyBucket(ctx) !== occupancy
  ) {
    return false;
  }

  return true;
}
