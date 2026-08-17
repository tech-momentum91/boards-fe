import apiClient from '@/api/axios';

const LIST_PATH = '/method/devx.center_management.api.api_floor_detail.list_floor_details';
const ADD_PATH = '/method/devx.center_management.api.api_floor_detail.add_floor_with_files';
const EDIT_PATH = '/method/devx.center_management.api.api_floor_detail.edit_floor_with_files';
const DELETE_PATH = '/method/devx.center_management.api.api_floor_detail.delete_floor_detail';
const REMOVE_ATTACHMENT_PATH =
  '/method/devx.center_management.api.api_floor_detail.remove_floor_detail_attachment';
const REMOVE_FLOOR_LAYOUT_PATH =
  '/method/devx.center_management.api.api_floor_detail.remove_floor_layout';

/** Frappe Check field: 1 when checked, 0 when unchecked */
export const toHasParkingFlag = (value) => (value === true || value === 1 || value === '1' ? 1 : 0);

/**
 * @param {string} center — Center name (e.g. CTR-470)
 * @param {Record<string, string|number|boolean>} [extraParams] — e.g. `{ has_parking: 1 }` for list_floor_details
 * @returns {Promise<{ center: string, total: number, floors: object[] }>}
 */
export async function fetchFloorDetailsList(center, extraParams = {}) {
  const params = {
    center: String(center ?? '').trim(),
    ...extraParams,
  };
  const response = await apiClient.get(LIST_PATH, {
    params,
  });
  const msg = response?.data?.message ?? response?.data ?? {};
  return {
    center: msg.center ?? center,
    total: msg.total ?? 0,
    floors: Array.isArray(msg.floors) ? msg.floors : [],
  };
}

/**
 * @param {object} p
 * @param {string} p.center
 * @param {string} p.block
 * @param {string} p.floor
 * @param {string|number} p.carpet_area
 * @param {string|number} p.floor_height
 * @param {File} [p.file]
 */
export function buildAddFloorFormData({
  center,
  block,
  floor,
  carpet_area,
  floor_height,
  has_parking = false,
  file,
}) {
  const fd = new FormData();
  fd.append('center', String(center));
  fd.append('block', String(block ?? '').trim());
  fd.append('floor', String(floor ?? '').trim());
  fd.append('carpet_area', String(carpet_area ?? '').trim());
  fd.append('floor_height', String(floor_height ?? '').trim());
  fd.append('has_parking', String(toHasParkingFlag(has_parking)));
  if (file) {
    fd.append('file', file);
  }
  return fd;
}

/**
 * @param {object} p
 * @param {string} p.floor_ref — Child row name
 * @param {string} [p.block]
 * @param {string} [p.floor]
 * @param {string|number} [p.carpet_area]
 * @param {string|number} [p.floor_height]
 * @param {File} [p.file] — Layout image file (upload or update)
 * @param {'upload'|'update'} [p.layout_action] — `upload` for new layout (default), `update` to replace while preserving coordinates
 */
export function buildEditFloorFormData({
  floor_ref,
  block,
  floor,
  carpet_area,
  floor_height,
  has_parking,
  file,
  layout_action,
}) {
  const fd = new FormData();
  fd.append('floor_ref', String(floor_ref));
  if (block !== undefined) {
    fd.append('block', String(block ?? '').trim());
  }
  if (floor !== undefined) {
    fd.append('floor', String(floor ?? '').trim());
  }
  if (carpet_area !== undefined) {
    fd.append('carpet_area', String(carpet_area ?? '').trim());
  }
  if (floor_height !== undefined) {
    fd.append('floor_height', String(floor_height ?? '').trim());
  }
  if (has_parking !== undefined) {
    fd.append('has_parking', String(toHasParkingFlag(has_parking)));
  }
  if (file) {
    fd.append('file', file);
  }
  if (layout_action) {
    fd.append('layout_action', layout_action);
  }
  return fd;
}

/**
 * @param {string} floor_ref
 * @returns {Promise<unknown>}
 */
export async function postDeleteFloorDetail(floor_ref) {
  const response = await apiClient.post(DELETE_PATH, { floor_ref });
  return response?.data?.message ?? response?.data;
}

/**
 * @param {FormData} formData
 * @returns {Promise<unknown>}
 */
export async function postAddFloorWithFiles(formData) {
  const response = await apiClient.post(ADD_PATH, formData);
  return response?.data?.message ?? response?.data;
}

/**
 * @param {FormData} formData
 * @returns {Promise<unknown>}
 */
export async function postEditFloorWithFiles(formData) {
  const response = await apiClient.post(EDIT_PATH, formData);
  return response?.data?.message ?? response?.data;
}

/**
 * @param {string} file_id — File / attachment row `name` from list floor `attachments[]`
 * @returns {Promise<unknown>}
 */
export async function postRemoveFloorDetailAttachment(file_id) {
  const response = await apiClient.post(REMOVE_ATTACHMENT_PATH, { file_id });
  return response?.data?.message ?? response?.data;
}

/**
 * @param {object} p
 * @param {string} p.center — Center doc name (e.g. CTR-05)
 * @param {string} p.block_floor_id — Floor identifier (e.g. B-1)
 * @param {string} p.file_id — Layout file / attachment row `name`
 * @returns {Promise<unknown>}
 */
export async function postRemoveFloorLayout({ center, block_floor_id, file_id }) {
  const response = await apiClient.post(REMOVE_FLOOR_LAYOUT_PATH, {
    center: String(center ?? '').trim(),
    block_floor_id: String(block_floor_id ?? '').trim(),
    file_id: String(file_id ?? '').trim(),
  });
  return response?.data?.message ?? response?.data;
}
