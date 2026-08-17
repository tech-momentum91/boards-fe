import apiClient from '@/api/axios';
import {
  mapApiTreeToSchedulerRows,
  mapSchedulerRowToApiPayload,
} from '@/components/aum/maintenance-scheduler/maintenance-scheduler-api-mapper';

const GET_MASTER_TREE_PATH =
  '/method/devx.asset_module.api.api_maintenance_scheduler.get_maintenance_schedule_master_tree';

const SAVE_MASTER_PATH =
  '/method/devx.asset_module.api.api_maintenance_scheduler.save_maintenance_schedule_master';

const GET_CENTER_SCHEDULE_PATH =
  '/method/devx.asset_module.api.api_maintenance_scheduler.get_center_maintenance_schedule';

const SAVE_CENTER_SCHEDULE_PATH =
  '/method/devx.asset_module.api.api_maintenance_scheduler.save_center_maintenance_schedule';

function unwrapMessage(response) {
  return response?.data?.message ?? response?.data ?? {};
}

/**
 * @returns {Promise<import('@/components/aum/maintenance-scheduler/maintenance-scheduler-constants').MsSchedulerRow[]>}
 */
export async function fetchMasterScheduleTree() {
  const response = await apiClient.get(GET_MASTER_TREE_PATH, { params: { active_only: 1 } });
  const message = unwrapMessage(response);
  return mapApiTreeToSchedulerRows(message.tree ?? []);
}

/**
 * @param {import('@/components/aum/maintenance-scheduler/maintenance-scheduler-constants').MsSchedulerRow} row
 */
export async function saveMasterScheduleLine(row) {
  const payload = mapSchedulerRowToApiPayload(row);
  const response = await apiClient.post(SAVE_MASTER_PATH, { data: JSON.stringify(payload) });
  return unwrapMessage(response);
}

/**
 * @param {string} center
 * @returns {Promise<import('@/components/aum/maintenance-scheduler/maintenance-scheduler-constants').MsSchedulerRow[]>}
 */
export async function fetchCenterSchedule(center) {
  if (!center) return [];
  const response = await apiClient.get(GET_CENTER_SCHEDULE_PATH, {
    params: { center, active_only: 1 },
  });
  const message = unwrapMessage(response);
  return mapApiTreeToSchedulerRows(message.tree ?? []);
}

/**
 * @param {string} center
 * @param {import('@/components/aum/maintenance-scheduler/maintenance-scheduler-constants').MsSchedulerRow} row
 */
export async function saveCenterScheduleLine(center, row) {
  const payload = mapSchedulerRowToApiPayload(row);
  const scheduleMaster = row.apiMeta?.scheduleMaster || payload.name;
  if (!center || !scheduleMaster) {
    throw new Error('Center and schedule master are required to save.');
  }

  const response = await apiClient.post(SAVE_CENTER_SCHEDULE_PATH, {
    center,
    schedule_master: scheduleMaster,
    data: JSON.stringify(payload),
  });
  return unwrapMessage(response);
}
