import apiClient from '@/api/axios';

const GET_COORDINATES_PATH = '/method/devx.coworker.api.get_client_floor_layout_coordinates';
const ASSIGN_COWORKER_SUB_SPACE_PATH = '/method/devx.coworker.api.assign_coworker_to_sub_space';
const SAVE_CLIENT_COWORKING_ASSIGN_SPACE_PATH =
  '/method/devx.coworker.api.save_client_coworking_assign_space';
const SAVE_CLIENT_COWORKING_LAYOUT_MARKER_PATH =
  '/method/devx.coworker.api.save_client_coworking_layout_marker';
const CHECK_CLIENT_CENTER_FLOOR_ASSIGNMENT_PATH =
  '/method/devx.coworker.api.check_client_center_floor_assignment';
const ASSIGN_CLIENT_DEPARTMENT_SUB_SPACE_PATH =
  '/method/devx.coworker.api.assign_client_department_to_sub_space';
const DEASSIGN_CLIENT_DEPARTMENT_SUB_SPACE_PATH =
  '/method/devx.coworker.api.deassign_client_department_from_sub_space';
const REMOVE_COWORKER_FROM_DESK_PATH = '/method/devx.coworker.api.remove_coworker_from_desk';
const GET_DESK_COWORKER_SCHEDULE_PATH = '/method/devx.coworker.api.get_desk_coworker_schedule';

/**
 * Client-specific floor layout with space polygons (normalized coordinates).
 *
 * Optional `filters` object is forwarded to the backend so it can scope the
 * returned spaces/desks/coworkers. Shape:
 *   { work_mode?: string[], department?: string[], coworker_ids?: string[] | null }
 *
 * @param {{
 *   center_id: string,
 *   customer_id: string,
 *   block_floor_id: string,
 *   filters?: {
 *     work_mode?: string[] | null,
 *     department?: string[] | null,
 *     coworker_ids?: string[] | null,
 *   },
 * }} body
 * @returns {Promise<unknown>}
 */
export async function postGetClientFloorLayoutCoordinates(body) {
  const response = await apiClient.post(GET_COORDINATES_PATH, body);
  return response?.data?.message ?? response?.data;
}

/**
 * Assign a client co-worker to a sub-space (seat) on the floor layout.
 *
 * Permanent (non–hot-desk): `permanent: 1`, `recurring: 0`, `start_date`.
 * Recurring hot-desk: `permanent: 0`, `recurring: 1`, `recurring_period`, times, `occurrence` or `recurrence_end_date`.
 * One-time hot-desk: `permanent: 0`, `recurring: 0`, `start_date`, `end_date`, times.
 *
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export async function postAssignCoworkerToSubSpace(body) {
  const response = await apiClient.post(ASSIGN_COWORKER_SUB_SPACE_PATH, body);
  return response?.data?.message ?? response?.data;
}

/**
 * Allocate co-working space from layout (Assign Space + Assign Sub Spaces rows; no layout pin).
 *
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export async function postSaveClientCoworkingAssignSpace(body) {
  const response = await apiClient.post(SAVE_CLIENT_COWORKING_ASSIGN_SPACE_PATH, body);
  return response?.data?.message ?? response?.data;
}

/**
 * Save a client co-working layout marker on the center floor plan (Mark CoWorkers flow).
 *
 * @param {{
 *   customer_id: string,
 *   space_id: string,
 *   sub_space_id: string,
 *   center_id: string,
 *   start_date: string,
 *   end_date: string,
 *   desk_coordinate: { x: number, y: number },
 * }} body
 * @returns {Promise<unknown>}
 */
export async function postSaveClientCoworkingLayoutMarker(body) {
  const response = await apiClient.post(SAVE_CLIENT_COWORKING_LAYOUT_MARKER_PATH, body);
  return response?.data?.message ?? response?.data;
}

/**
 * Whether the client already has a space assignment on this center floor.
 *
 * @param {{ customer: string, center: string, block_floor_id: string, space_id: string }} params
 * @returns {Promise<{
 *   exists: boolean,
 *   customer?: string,
 *   center_id?: string,
 *   center?: string,
 *   floor?: string,
 *   assignment?: Record<string, unknown>,
 *   assignments?: Record<string, unknown>[],
 * }>}
 */
export async function getCheckClientCenterFloorAssignment({
  customer,
  center,
  block_floor_id,
  space_id,
}) {
  const response = await apiClient.get(CHECK_CLIENT_CENTER_FLOOR_ASSIGNMENT_PATH, {
    params: {
      customer: String(customer || '').trim(),
      center: String(center || '').trim(),
      block_floor_id: String(block_floor_id || '').trim(),
      space_id: String(space_id || '').trim(),
    },
  });
  const message = response?.data?.message ?? response?.data ?? {};
  return {
    exists: Boolean(message.exists),
    customer: message.customer,
    center_id: message.center_id ?? message.center,
    center: message.center,
    floor: message.floor,
    count: message.count,
    assignment: message.assignment ?? null,
    assignments: message.assignments ?? [],
    floor_ref: message.floor_ref,
    block: message.block,
    block_floor_id: message.block_floor_id,
    floor_label: message.floor_label,
  };
}

/**
 * Assign or update client department on a sub-space.
 *
 * @param {{
 *   customer_id: string,
 *   center_id: string,
 *   space_id: string,
 *   sub_space_id: string,
 *   client_department: string,
 * }} body
 * @returns {Promise<unknown>}
 */
export async function postAssignClientDepartmentToSubSpace(body) {
  const response = await apiClient.post(ASSIGN_CLIENT_DEPARTMENT_SUB_SPACE_PATH, body);
  return response?.data?.message ?? response?.data;
}

/**
 * Remove client department from a sub-space.
 *
 * @param {{
 *   customer_id: string,
 *   space_id: string,
 *   sub_space_id: string,
 *   center_id?: string,
 * }} body
 * @returns {Promise<unknown>}
 */
export async function postDeassignClientDepartmentFromSubSpace(body) {
  const response = await apiClient.post(DEASSIGN_CLIENT_DEPARTMENT_SUB_SPACE_PATH, body);
  return response?.data?.message ?? response?.data;
}

/**
 * Remove a co-worker assignment from a desk on the client floor layout.
 *
 * @param {{
 *   customer_id: string,
 *   space_id: string,
 *   sub_space_id: string,
 *   desk_id: string,
 *   coworker_id: string,
 *   center_id: string,
 * }} body
 * @returns {Promise<unknown>}
 */
export async function postRemoveCoworkerFromDesk(body) {
  const response = await apiClient.post(REMOVE_COWORKER_FROM_DESK_PATH, body);
  return response?.data?.message ?? response?.data;
}

/**
 * Coworker bookings for a desk on a date (default today on server).
 *
 * @param {{
 *   desk_id: string,
 *   space_id?: string,
 *   assign_space?: string,
 *   on_date?: string,
 *   date?: string,
 * }} body
 * @returns {Promise<{
 *   space_id?: string,
 *   desk_id?: string,
 *   assign_space?: string,
 *   date?: string,
 *   client_desk_status?: string,
 *   assignment_count?: number,
 *   assignments?: object[],
 * }>}
 */
export async function getDeskCoworkerSchedule(body) {
  const deskId = String(body?.desk_id || '').trim();
  const payload = {
    desk_id: deskId,
    ...(body?.space_id ? { space_id: String(body.space_id).trim() } : {}),
    ...(body?.assign_space ? { assign_space: String(body.assign_space).trim() } : {}),
  };
  const onDate = String(body?.on_date || body?.date || '').trim();
  if (onDate) {
    payload.on_date = onDate;
    payload.date = onDate;
  }
  const response = await apiClient.post(GET_DESK_COWORKER_SCHEDULE_PATH, payload);
  return response?.data?.message ?? response?.data ?? {};
}
