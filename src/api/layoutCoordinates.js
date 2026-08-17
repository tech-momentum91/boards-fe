import apiClient from '@/api/axios';

const SAVE_PATH = '/method/devx.layouts.api.api_layout.save_layout_coordinates';
const CLEAR_PATH = '/method/devx.layouts.api.api_layout.clear_layout_coordinate';
const SAVE_SUB_SPACE_PATH = '/method/devx.layouts.api.api_layout.save_sub_space_layout_coordinate';
const CREATE_SUB_SPACE_PATH = '/method/devx.seat_inventory.doctype.space.space.create_sub_space';
const GET_SPACES_BY_FLOOR_PATH = '/method/devx.layouts.api.api_layout.get_spaces_by_floor';
const GET_SPACE_SUB_SPACES_PATH = '/method/devx.layouts.api.api_layout.get_space_sub_spaces';
const BATCH_DESK_COWORKER_PATH =
  '/method/devx.layouts.api.api_layout.batch_save_desks_coworker_coordinates';
const CLEAR_DESK_COWORKER_PATH =
  '/method/devx.layouts.api.api_layout.clear_desk_coworker_coordinate';
const DELETE_SUB_SPACE_PATH = '/method/devx.layouts.api.api_layout.delete_sub_space';
const GET_LAYOUT_DETAIL_PATH = '/method/devx.layouts.api.api_layout.get_layout_detail';
const GET_CENTER_FLOOR_LAYOUT_IMAGE_PATH =
  '/method/devx.layouts.api.api_layout.get_center_floor_layout_image';

/**
 * Save or update layout coordinates for one or more spaces on a floor.
 *
 * @param {{ floor_ref: string, items: Array<{ space_id: string, layout_coordinate: { points: number[][] } | null }> }} body
 * @returns {Promise<unknown>}
 */
export async function postSaveLayoutCoordinates(body) {
  const response = await apiClient.post(SAVE_PATH, body);
  return response?.data?.message ?? response?.data;
}

/**
 * Search spaces for a center + floor (layout annotation associate modal).
 * API returns a page envelope with `results[]` and optional `total_count`, `total_pages`, etc.
 *
 * @param {{
 *   center: string,
 *   block_floor_id: string,
 *   floor_ref?: string,
 *   keyword?: string,
 *   inventory_type?: string | null,
 *   space_type?: string | null,
 *   status?: string | null,
 *   unmapped_only?: boolean,
 *   page?: number,
 *   page_size?: number,
 * }} body
 * @returns {Promise<object[]>}
 */
export async function postGetSpacesByFloor(body) {
  const unmappedOnly = body.unmapped_only === true || body.unmapped_only === 1 ? 1 : 0;
  const response = await apiClient.post(GET_SPACES_BY_FLOOR_PATH, {
    center: body.center,
    block_floor_id: body.block_floor_id,
    floor_ref: body.floor_ref ?? '',
    keyword: body.keyword ?? '',
    inventory_type: body.inventory_type ?? null,
    space_type: body.space_type ?? null,
    status: body.status ?? null,
    unmapped_only: unmappedOnly,
    page: body.page ?? 1,
    limit_page_length: body.limit_page_length ?? body.page_size ?? 50,
  });
  const message = response?.data?.message ?? response?.data;
  if (Array.isArray(message)) return message;
  if (Array.isArray(message?.results)) return message.results;
  if (Array.isArray(message?.spaces)) return message.spaces;
  if (Array.isArray(message?.data)) return message.data;
  return [];
}

/**
 * Search sub-spaces for a parent space (layout annotation define sub-space modal).
 *
 * @param {{
 *   space_id: string,
 *   keyword?: string,
 *   page?: number,
 *   limit_page_length?: number,
 * }} body
 * @returns {Promise<object[]>}
 */
export async function postGetSpaceSubSpaces(body) {
  const response = await apiClient.post(GET_SPACE_SUB_SPACES_PATH, {
    space_id: String(body.space_id ?? '').trim(),
    keyword: body.keyword ?? '',
    page: body.page ?? 1,
    limit_page_length: body.limit_page_length ?? 50,
  });
  const message = response?.data?.message ?? response?.data;
  if (Array.isArray(message)) return message;
  if (Array.isArray(message?.results)) return message.results;
  if (Array.isArray(message?.sub_spaces)) return message.sub_spaces;
  if (Array.isArray(message?.data)) return message.data;
  return [];
}

/**
 * Remove stored layout coordinate for a single space.
 *
 * @param {{ space_id: string, floor_ref?: string }} body
 * @returns {Promise<unknown>}
 */
export async function postClearLayoutCoordinate(body) {
  const response = await apiClient.post(CLEAR_PATH, {
    space_id: String(body.space_id ?? '').trim(),
    floor_ref: String(body.floor_ref ?? '').trim(),
  });
  return response?.data?.message ?? response?.data;
}

/**
 * Create a sub-space row under a parent space (Frappe whitelisted method).
 *
 * @param {{
 *   space_id: string,
 *   sub_space_name: string,
 *   sub_space_type: string,
 *   sub_space_coordinate: { x: number, y: number, width: number, height: number },
 *   desk_count?: number,
 *   sub_space_area_type?: string | null,
 * }} body
 * @returns {Promise<unknown>}
 */
export async function postCreateSubSpace(body) {
  const response = await apiClient.post(CREATE_SUB_SPACE_PATH, body);
  return response?.data?.message ?? response?.data;
}

/**
 * Save or update layout geometry for a sub-space (normalized coordinates).
 *
 * @param {{
 *   space_id: string,
 *   sub_space_row_id?: string,
 *   sub_space_coordinate?:
 *     | { x: number, y: number, width: number, height: number }
 *     | { points: number[][] },
 *   sub_space_id?: string,
 *   layout_coordinate?:
 *     | { x: number, y: number, width: number, height: number }
 *     | { points: number[][] },
 * }} body
 * @returns {Promise<unknown>}
 */
export async function postSaveSubSpaceLayoutCoordinate(body) {
  const space_id = body.space_id;
  const coord = body.sub_space_coordinate ?? body.layout_coordinate;
  const rowId = String(body.sub_space_row_id ?? '').trim();
  const legacyId = String(body.sub_space_id ?? '').trim();

  const payload =
    rowId !== ''
      ? { space_id, sub_space_row_id: rowId, sub_space_coordinate: coord }
      : { space_id, sub_space_id: legacyId, layout_coordinate: coord };

  const response = await apiClient.post(SAVE_SUB_SPACE_PATH, payload);
  return response?.data?.message ?? response?.data;
}

/**
 * Batch save desk coworker coordinates (normalized x/y per desk under a sub-space).
 *
 * @param {{
 *   items: Array<{
 *     space_id: string,
 *     sub_space_id: string,
 *     desk_coordinates: Array<{ desk_id: string, desk_coordinate: { x: number, y: number } }>,
 *   }>,
 * }} body
 * @returns {Promise<unknown>}
 */
export async function postBatchSaveDesksCoworkerCoordinates(body) {
  const response = await apiClient.post(BATCH_DESK_COWORKER_PATH, body);
  return response?.data?.message ?? response?.data;
}

/**
 * Clear one desk's coworker coordinate on the layout.
 *
 * @param {{ space_id: string, sub_space_id: string, desk_id: string }} body
 * @returns {Promise<unknown>}
 */
export async function postClearDeskCoworkerCoordinate(body) {
  const response = await apiClient.post(CLEAR_DESK_COWORKER_PATH, body);
  return response?.data?.message ?? response?.data;
}

/**
 * Delete a sub-space row (server).
 *
 * @param {{ space_id: string, sub_space_id: string }} body
 * @returns {Promise<unknown>}
 */
export async function postDeleteSubSpace(body) {
  const response = await apiClient.post(DELETE_SUB_SPACE_PATH, body);
  return response?.data?.message ?? response?.data;
}

/**
 * Floor layout detail for annotation editor (optional server-side filters).
 *
 * @param {{
 *   floorRef: string,
 *   filters?: {
 *     client?: string[],
 *     inventory_name?: string[],
 *     inventory_type?: string[],
 *     space_status?: string[],
 *     from_date?: string,
 *     to_date?: string,
 *     agreement_date_filter?: string[],
 *   },
 * }} params
 * @returns {Promise<unknown>}
 */
export async function postGetLayoutDetail({ floorRef, filters }) {
  const body = { floor_ref: String(floorRef || '').trim() };
  if (filters && typeof filters === 'object' && Object.keys(filters).length > 0) {
    body.filters = filters;
  }
  const response = await apiClient.post(GET_LAYOUT_DETAIL_PATH, body);
  return response?.data?.message ?? response?.data;
}

/**
 * Floor plan raster for a center + floor (Space detail Layout tab).
 *
 * @param {{ center: string, floor_ref: string }} params
 * @returns {Promise<{
 *   ok?: boolean,
 *   layout_image?: string,
 *   layout_image_url?: string,
 *   has_layout_image?: boolean,
 *   floor_detail?: object,
 * }>}
 */
export async function getCenterFloorLayoutImage({ center, floor_ref }) {
  const response = await apiClient.get(GET_CENTER_FLOOR_LAYOUT_IMAGE_PATH, {
    params: {
      center: String(center || '').trim(),
      floor_ref: String(floor_ref || '').trim(),
    },
  });
  return response?.data?.message ?? response?.data ?? {};
}
