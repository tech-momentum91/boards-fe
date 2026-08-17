import apiClient from '@/api/axios';
import { AUM_LIST_PAGE_SIZE } from '@/components/aum/constants';
import { resolveFileUrl } from '@/lib/utils';

const GET_ASSET_IN_LISTVIEW_PATH =
  '/method/devx.asset_module.api.api_asset_in.get_asset_in_listview';

const GET_ASSET_IN_OPTIONS_PATH = '/method/devx.asset_module.api.api_asset_in.get_asset_in_options';

const GET_CENTER_FLOORS_PATH = '/method/devx.center_management.doctype.center.center.get_floors';

const GET_ASSET_IN_FLOOR_SPACES_PATH =
  '/method/devx.asset_module.api.api_asset_in.get_asset_in_floor_spaces';

const GET_ASSET_IN_FLOOR_LAYOUT_PATH =
  '/method/devx.asset_module.api.api_asset_in.get_asset_in_floor_layout';

const GET_ASSET_IN_DETAIL_PATH = '/method/devx.asset_module.api.api_asset_in.get_asset_in_detail';

const SAVE_ASSET_IN_PATH = '/method/devx.asset_module.api.api_asset_in.save_asset_in';

const GET_ASSET_IN_PRODUCTS_PATH =
  '/method/devx.asset_module.api.api_asset_in.get_asset_in_products';

const RESOLVE_ASSET_IN_ITEM_GROUP_HIERARCHY_PATH =
  '/method/devx.asset_module.api.api_asset_in.resolve_asset_in_item_group_hierarchy';

function unwrapMessage(response) {
  return response?.data?.message ?? response?.data ?? {};
}

function extractSpaceResults(message) {
  if (Array.isArray(message?.results)) return message.results;
  if (Array.isArray(message)) return message;
  if (Array.isArray(message?.spaces)) return message.spaces;
  if (Array.isArray(message?.data)) return message.data;
  return [];
}

function mapSpaceRowsToOptions(rows) {
  return (rows ?? [])
    .map((row) => {
      const value = String(row?.name ?? row?.space_id ?? '').trim();
      if (!value) return null;
      const label = String(row?.inventory_name ?? row?.space_name ?? row?.title ?? value).trim();
      return { value, label };
    })
    .filter(Boolean);
}

/**
 * @param {Array<object>} rows Detail page asset rows
 * @returns {Array<object>}
 */
export function mapAssetRowsToApiItems(rows) {
  return (rows ?? [])
    .filter((row) => {
      const productName = row.productCode || (row.code && row.code !== '-' ? row.code : '');
      return Boolean(productName) && Boolean(row.name);
    })
    .map((row) => ({
      product_name: row.productCode || row.code,
      product_code: row.code && row.code !== '-' ? row.code : row.productCode,
      brand: row.brand || '',
      qty: Number(row.qty) || 0,
      rate: Number(row.rate) || 0,
      purchase_date: row.purchaseDate || '',
      available_for_use_date: row.availableForUseDate || '',
      associate_bill: row.bill || '',
      product_type: row.type || '',
      product_group: row.group || '',
      category: row.category || '',
      category_group: row.categoryGroup || '',
    }));
}

/**
 * Map Asset In `images` child table rows for the Media tab.
 * @param {Array<object>} rows
 * @returns {Array<{ id: string, name: string, preview: string, image: string, fromApi: boolean }>}
 */
export function mapAssetInMediaFromApi(rows) {
  return (rows ?? [])
    .map((row, index) => {
      const imagePath = String(row?.image_url || row?.image || '').trim();
      if (!imagePath) return null;
      const id = String(row?.name || `asset-in-image-${row?.idx ?? index}`).trim();
      return {
        id,
        name: id,
        preview: resolveFileUrl(imagePath),
        image: String(row?.image || imagePath).trim(),
        idx: Number(row?.idx ?? index + 1),
        fromApi: true,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.idx - right.idx);
}

/**
 * @param {object} payload
 * @returns {Promise<{ name: string, status: string, data: object }>}
 */
export async function saveAssetIn(payload) {
  const response = await apiClient.post(SAVE_ASSET_IN_PATH, payload);
  const message = unwrapMessage(response);
  return {
    name: message.name,
    status: message.status,
    docstatus: message.docstatus,
    data: message.data ?? message,
  };
}

/**
 * @param {{ search?: string, center?: string, status?: string, page?: number, page_size?: number }} [params]
 */
export async function fetchAssetInList(params = {}) {
  const response = await apiClient.get(GET_ASSET_IN_LISTVIEW_PATH, {
    params: {
      search: params.search ?? '',
      center: params.center ?? '',
      status: params.status ?? '',
      page: params.page ?? 1,
      page_size: params.page_size ?? AUM_LIST_PAGE_SIZE,
    },
  });

  const message = unwrapMessage(response);
  const rows = Array.isArray(message.data)
    ? message.data
    : Array.isArray(message.results)
      ? message.results
      : [];

  return {
    rows,
    totalCount: message.total_count ?? rows.length,
    page: message.page ?? params.page ?? 1,
  };
}

/**
 * @returns {Promise<{ centers: Array<{ value: string, label: string }>, clients: Array<{ value: string, label: string }> }>}
 */
export async function fetchAssetInOptions() {
  const response = await apiClient.get(GET_ASSET_IN_OPTIONS_PATH);
  const message = unwrapMessage(response);
  return {
    centers: Array.isArray(message.centers) ? message.centers : [],
    clients: Array.isArray(message.clients) ? message.clients : [],
  };
}

/**
 * @param {string} center Center doc name
 * @returns {Promise<Array<{ value: string, label: string }>>}
 */
export async function fetchCenterFloors(center) {
  if (!center) return [];
  const response = await apiClient.get(GET_CENTER_FLOORS_PATH, { params: { center } });
  const message = unwrapMessage(response);
  return Array.isArray(message) ? message : [];
}

/**
 * @param {{ center: string, block_floor_id: string, keyword?: string }} params
 * @returns {Promise<Array<{ value: string, label: string }>>}
 */
export async function fetchSpacesForAssetInFloor({ center, block_floor_id, keyword = '' }) {
  if (!center || !block_floor_id) return [];

  const response = await apiClient.get(GET_ASSET_IN_FLOOR_SPACES_PATH, {
    params: {
      center,
      block_floor_id,
      keyword,
      unmapped_only: 0,
      limit_page_length: AUM_LIST_PAGE_SIZE,
      page: 1,
    },
  });

  return mapSpaceRowsToOptions(extractSpaceResults(unwrapMessage(response)));
}

/**
 * @param {{ center: string, block_floor_id: string }} params
 * @returns {Promise<{
 *   layout_image_url: string,
 *   floor_label: string,
 *   spaces: Array<{ value: string, label: string, inventory_type?: string, layout_coordinate?: object }>
 * }>}
 */
export async function fetchAssetInFloorLayout({ center, block_floor_id }) {
  if (!center || !block_floor_id) {
    return { layout_image_url: '', floor_label: '', spaces: [] };
  }

  const response = await apiClient.get(GET_ASSET_IN_FLOOR_LAYOUT_PATH, {
    params: { center, block_floor_id },
  });

  const message = unwrapMessage(response);
  const spaces = (message.spaces ?? [])
    .map((row) => {
      const value = String(row?.value ?? row?.name ?? '').trim();
      if (!value) return null;
      return {
        value,
        label: String(row?.label ?? row?.inventory_name ?? value).trim(),
        inventory_type: row?.inventory_type || '',
        layout_coordinate: row?.layout_coordinate ?? null,
        has_layout_coordinate: Boolean(row?.has_layout_coordinate),
      };
    })
    .filter(Boolean);

  return {
    layout_image_url: message.layout_image_url || message.layout_image || '',
    floor_label: message.floor_label || block_floor_id,
    spaces,
  };
}

/**
 * @param {{
 *   center: string,
 *   space: string,
 *   floor?: string,
 *   floor_ref?: string,
 *   client?: string,
 *   condition?: string,
 * }} payload
 * @returns {Promise<{ name: string, status: string, data: object }>}
 */
export async function saveAssetInDraft(payload) {
  return saveAssetIn({
    action: 'save_draft',
    ...payload,
  });
}

/**
 * @param {string} name Asset In doc name
 * @param {Array<object>} rows Detail page asset rows
 */
export async function submitAssetIn(name, rows) {
  return saveAssetIn({
    name,
    action: 'submit',
    items: mapAssetRowsToApiItems(rows),
  });
}

/**
 * @param {string} name Asset In doc name
 * @returns {Promise<object>}
 */
export async function fetchAssetInDetail(name) {
  const response = await apiClient.get(GET_ASSET_IN_DETAIL_PATH, { params: { name } });
  const message = unwrapMessage(response);
  return message.data ?? message;
}

/**
 * @param {{ keyword?: string }} [params]
 * @returns {Promise<Array<{ value: string, name: string, code: string, brand: string, type: string, group: string, category: string, categoryGroup: string, image?: string }>>}
 */
export async function fetchAssetInProducts(params = {}) {
  const response = await apiClient.get(GET_ASSET_IN_PRODUCTS_PATH, {
    params: {
      keyword: params.keyword ?? '',
      limit_page_length: params.limit_page_length ?? AUM_LIST_PAGE_SIZE,
      page: params.page ?? 1,
    },
  });
  const message = unwrapMessage(response);
  if (Array.isArray(message?.results)) return message.results;
  if (Array.isArray(message)) return message;
  return [];
}

/**
 * @param {string} itemGroup
 * @returns {Promise<{ category: string, group: string, categoryGroup: string }>}
 */
export async function resolveAssetInItemGroupHierarchy(itemGroup) {
  if (!itemGroup) {
    return { category: '', group: '', categoryGroup: '' };
  }

  const response = await apiClient.get(RESOLVE_ASSET_IN_ITEM_GROUP_HIERARCHY_PATH, {
    params: { item_group: itemGroup },
  });
  const message = unwrapMessage(response);
  return {
    category: message.category || '',
    group: message.group || '',
    categoryGroup: message.categoryGroup || '',
    type: message.type || itemGroup,
  };
}
