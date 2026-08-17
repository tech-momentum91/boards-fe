import apiClient from '@/api/axios';

const UPDATE_CLIENT_SPACE_STATUS_PATH =
  '/method/devx.seat_inventory.api.client_space_layout_api.update_client_space_status';
const GET_SPACE_LAYOUT_WITH_DESKS_PATH =
  '/method/devx.seat_inventory.api.client_space_layout_api.get_space_layout_with_desks';
const GET_ASSIGN_SPACE_DESELECT_LAYOUT_PATH =
  '/method/devx.seat_inventory.api.client_space_layout_api.get_assign_space_deselect_layout';
const ASSIGN_CLIENT_DESK_TO_SPACE_PATH =
  '/method/devx.seat_inventory.api.client_space_layout_api.assign_client_desk_to_space';
const SAVE_CLIENT_MANAGED_OFFICE_ASSIGN_SPACE_PATH =
  '/method/devx.seat_inventory.api.client_space_layout_api.save_client_managed_office_assign_space';

/**
 * @param {{ client_id: string, status: string, space_id: string }} body
 * @returns {Promise<unknown>}
 */
export async function postUpdateClientSpaceStatus(body) {
  const response = await apiClient.post(UPDATE_CLIENT_SPACE_STATUS_PATH, body);
  return response?.data?.message ?? response?.data;
}

/**
 * @param {{ space_id: string, center_id: string, customer_id?: string, client_id?: string }} body
 * @returns {Promise<unknown>}
 */
export async function postGetSpaceLayoutWithDesks(body) {
  const response = await apiClient.post(GET_SPACE_LAYOUT_WITH_DESKS_PATH, body);
  return response?.data?.message ?? response?.data;
}

/**
 * Layout for occupied assignment seat reduction (desks to unselect).
 *
 * @param {{
 *   space_id: string,
 *   assign_space_id: string,
 *   center_id: string,
 *   floor: string,
 * }} body
 * @returns {Promise<unknown>}
 */
export async function postGetAssignSpaceDeselectLayout(body) {
  const response = await apiClient.post(GET_ASSIGN_SPACE_DESELECT_LAYOUT_PATH, body);
  return response?.data?.message ?? response?.data;
}

/**
 * @param {{
 *   customer_id?: string,
 *   client_id?: string,
 *   space_id: string,
 *   center_id?: string,
 *   start_date?: string,
 *   end_date?: string,
 *   desk_ids: string[],
 *   desks?: Array<{ desk_id: string, sub_space_id?: string }>,
 * }} body
 * @returns {Promise<unknown>}
 */
export async function postAssignClientDeskToSpace(body) {
  const response = await apiClient.post(ASSIGN_CLIENT_DESK_TO_SPACE_PATH, body);
  return response?.data?.message ?? response?.data;
}

/**
 * Allocate a Managed Office space to a client (creates Assign Space + desk rows).
 *
 * @param {{
 *   customer_id?: string,
 *   client_id?: string,
 *   space_id: string,
 *   start_date: string,
 *   end_date: string,
 *   center_id?: string,
 *   expected_per_seat_rate?: number,
 *   credit_per_seat?: number,
 *   total_rate?: number,
 *   notes?: string,
 * }} body
 * @returns {Promise<unknown>}
 */
export async function postSaveClientManagedOfficeAssignSpace(body) {
  const response = await apiClient.post(SAVE_CLIENT_MANAGED_OFFICE_ASSIGN_SPACE_PATH, body);
  return response?.data?.message ?? response?.data;
}
