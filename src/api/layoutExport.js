import apiClient from '@/api/axios';
import { getCachedFloorDetailsListForCenter } from '@/utils/resolve-floor-ref';
import { getLayoutFloorLabel } from '@/utils/space-layout-list-utils';

const GET_LAYOUT_EXPORT_DATA_PATH = '/method/devx.layouts.api.api_layout.get_layout_export_data';

/**
 * Map export API layout_shapes to space rows for annotation rendering.
 *
 * @param {object[]} layoutShapes
 * @returns {object[]}
 */
export function mapLayoutExportShapesToSpaces(layoutShapes = []) {
  return (Array.isArray(layoutShapes) ? layoutShapes : [])
    .map((shape) => {
      if (!shape || typeof shape !== 'object') return null;
      const space = shape.space && typeof shape.space === 'object' ? shape.space : {};
      const spaceRef = String(space.name || shape.space_id || '').trim();
      if (!spaceRef) return null;

      return {
        ...space,
        name: spaceRef,
        layout_coordinate:
          shape.layout_coordinate ?? shape.coordinate ?? space.layout_coordinate ?? null,
        clients: Array.isArray(shape.clients) ? shape.clients : [],
        has_layout_coordinate: Boolean(
          shape.layout_coordinate ?? shape.coordinate ?? space.layout_coordinate,
        ),
      };
    })
    .filter(Boolean);
}

/**
 * Flatten get_layout_export_data `results` into render-ready floor items.
 *
 * @param {object | null | undefined} message
 * @returns {{
 *   items: object[],
 *   centerCount: number,
 *   floorCount: number,
 *   ok: boolean,
 *   raw: object,
 * }}
 */
export function normalizeLayoutExportResponse(message) {
  const raw = message && typeof message === 'object' ? message : {};
  const results = raw.results;

  if (!results || typeof results !== 'object') {
    return {
      items: [],
      centerCount: Number(raw.center_count ?? 0),
      floorCount: Number(raw.floor_count ?? 0),
      ok: Boolean(raw.ok),
      raw,
    };
  }

  const items = [];

  Object.entries(results).forEach(([centerId, centerBlock]) => {
    if (!centerBlock || typeof centerBlock !== 'object') return;

    const centerName = String(centerBlock.center_name || centerId).trim();
    const floors = Array.isArray(centerBlock.floors) ? centerBlock.floors : [];

    floors.forEach((floorEntry) => {
      if (!floorEntry || typeof floorEntry !== 'object') return;

      const floorMeta =
        floorEntry.floor && typeof floorEntry.floor === 'object' ? floorEntry.floor : {};
      const spaces = mapLayoutExportShapesToSpaces(floorEntry.layout_shapes);

      items.push({
        center_id: String(floorMeta.center_id || centerId).trim(),
        center_name: centerName,
        floor: floorMeta,
        floor_ref: String(floorMeta.floor_ref || '').trim(),
        block_floor_id: String(floorMeta.block_floor_id || '').trim(),
        floor_label: getLayoutFloorLabel(floorMeta),
        layout_image: floorMeta.layout_image || '',
        layout_image_url: floorMeta.layout_image_url || '',
        layout_image_proxy_url:
          floorMeta.layout_image_proxy_url || floorEntry.layout_image_proxy_url || '',
        has_layout_image: Boolean(floorMeta.has_layout_image ?? floorMeta.layout_image),
        spaces,
        space_count: Number(floorEntry.space_count ?? spaces.length),
      });
    });
  });

  return {
    items,
    centerCount: Number(raw.center_count ?? Object.keys(results).length),
    floorCount: Number(raw.floor_count ?? items.length),
    ok: Boolean(raw.ok),
    raw,
  };
}

/**
 * Floor picker options from center floor-detail rows (list_floor_details, not export API).
 *
 * @param {Array<{ value: string, label?: string } | string>} centers
 * @returns {Promise<Array<{ value: string, blockFloorId: string, label: string, centerId: string }>>}
 */
export async function fetchLayoutExportFloorOptionsForCenters(centers = []) {
  const normalized = (Array.isArray(centers) ? centers : [])
    .map((center) => {
      if (typeof center === 'string') {
        const value = center.trim();
        return value ? { value, label: value } : null;
      }
      const value = String(center?.value || '').trim();
      if (!value) return null;
      return {
        value,
        label: String(center?.label || value).trim() || value,
      };
    })
    .filter(Boolean);

  if (normalized.length === 0) return [];

  const showCenterInLabel = normalized.length > 1;
  const entries = await Promise.all(
    normalized.map(async ({ value, label }) => {
      const floors = await getCachedFloorDetailsListForCenter(value);
      return { centerId: value, centerName: label, floors };
    }),
  );

  return entries.flatMap(({ centerId, centerName, floors }) =>
    (Array.isArray(floors) ? floors : [])
      .filter((floor) =>
        Boolean(floor?.layout_image || floor?.has_layout_image || floor?.layout_image_url),
      )
      .map((floor) => {
        const floorRef = String(floor?.name || floor?.floor_ref || '').trim();
        if (!floorRef) return null;
        const floorLabel = getLayoutFloorLabel(floor);
        return {
          value: floorRef,
          blockFloorId: String(floor?.block_floor_id || '').trim(),
          label: showCenterInLabel && centerName ? `${centerName} · ${floorLabel}` : floorLabel,
          centerId,
        };
      })
      .filter(Boolean),
  );
}

/**
 * Floor picker options derived from get_layout_export_data results.
 *
 * @param {ReturnType<typeof normalizeLayoutExportResponse>} normalized
 * @returns {Array<{ value: string, blockFloorId: string, label: string, centerId: string }>}
 */
export function extractLayoutExportFloorOptions(normalized) {
  const items = Array.isArray(normalized?.items) ? normalized.items : [];
  const centerIds = new Set(
    items.map((item) => String(item?.center_id || '').trim()).filter(Boolean),
  );
  const showCenterInLabel = centerIds.size > 1;

  return items
    .map((item) => {
      const floorRef = String(item?.floor_ref || item?.floor?.floor_ref || '').trim();
      if (!floorRef) return null;
      const floorLabel = String(item?.floor_label || getLayoutFloorLabel(item?.floor || {})).trim();
      const centerName = String(item?.center_name || item?.center_id || '').trim();
      return {
        value: floorRef,
        blockFloorId: String(item?.block_floor_id || item?.floor?.block_floor_id || '').trim(),
        label: showCenterInLabel && centerName ? `${centerName} · ${floorLabel}` : floorLabel,
        centerId: String(item?.center_id || '').trim(),
      };
    })
    .filter(Boolean);
}

/**
 * Build request payload for get_layout_export_data.
 *
 * @param {{
 *   center?: string | string[] | null,
 *   floor_ref?: string,
 *   floor_refs?: string[],
 *   block_floor_id?: string,
 *   all_centers?: boolean,
 *   keyword?: string,
 *   filters?: object,
 * }} params
 */
export function buildLayoutExportRequestPayload({
  center,
  floor_ref,
  floor_refs,
  block_floor_id,
  all_centers = false,
  keyword = '',
  filters = {},
} = {}) {
  const filterSource = filters && typeof filters === 'object' ? filters : {};
  const payload = {
    all_centers: Boolean(all_centers),
    filters: {
      clients: Array.isArray(filterSource.clients) ? filterSource.clients : [],
      inventory_type: Array.isArray(filterSource.inventory_type) ? filterSource.inventory_type : [],
      status: Array.isArray(filterSource.status) ? filterSource.status : [],
    },
  };

  const keywordStr = String(keyword || '').trim();
  payload.keyword = keywordStr || null;

  if (!all_centers) {
    if (Array.isArray(center)) {
      payload.center = center;
    } else {
      const centerId = String(center || '').trim();
      if (centerId) {
        payload.center = centerId;
      }
    }
  }

  const floorRef = String(floor_ref || '').trim();
  const floorRefList = (Array.isArray(floor_refs) ? floor_refs : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  // Single floor can be sent to API; multiple floors are filtered client-side after fetch.
  if (floorRefList.length === 1) {
    payload.floor_ref = floorRefList[0];
  } else if (floorRef && floorRefList.length === 0) {
    payload.floor_ref = floorRef;
  }

  const blockFloorId = String(block_floor_id || '').trim();
  if (blockFloorId) payload.block_floor_id = blockFloorId;

  return payload;
}

/**
 * Fetch floor layout export payloads (image + space coordinates) for client-side PNG rendering.
 *
 * @param {{
 *   center?: string | string[] | null,
 *   floor_ref?: string,
 *   floor_refs?: string[],
 *   block_floor_id?: string,
 *   all_centers?: boolean,
 *   keyword?: string,
 *   filters?: object,
 * }} params
 * @returns {Promise<ReturnType<typeof normalizeLayoutExportResponse>>}
 */
export async function postGetLayoutExportData(params = {}) {
  const payload = buildLayoutExportRequestPayload(params);
  const response = await apiClient.post(GET_LAYOUT_EXPORT_DATA_PATH, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  const message = response?.data?.message ?? response?.data ?? {};
  return normalizeLayoutExportResponse(message);
}

/**
 * Resolve the export row for a center + floor_ref from get_layout_export_data.
 *
 * @param {{
 *   center?: string,
 *   floor_ref?: string,
 *   block_floor_id?: string,
 * }} params
 * @returns {Promise<object | null>}
 */
export async function fetchLayoutExportItemForFloor(params = {}) {
  const normalized = await postGetLayoutExportData(params);
  const items = Array.isArray(normalized?.items) ? normalized.items : [];
  if (items.length === 0) return null;

  const floorRef = String(params.floor_ref || '').trim();
  const blockFloorId = String(params.block_floor_id || '').trim();

  if (floorRef) {
    const match = items.find((item) => String(item?.floor_ref || '').trim() === floorRef);
    if (match) return match;
  }

  if (blockFloorId) {
    const match = items.find(
      (item) =>
        String(item?.block_floor_id || item?.floor?.block_floor_id || '').trim() === blockFloorId,
    );
    if (match) return match;
  }

  return items[0] ?? null;
}
