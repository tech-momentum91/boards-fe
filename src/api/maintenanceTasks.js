import apiClient from '@/api/axios';
import { AUM_LIST_PAGE_SIZE } from '@/components/aum/constants';
import { mapMaintenanceTaskRowFromApi } from '@/components/aum/maintenance-work-queue/maintenance-work-queue-api-mapper';

const GET_MAINTENANCE_TASKS_PATH =
  '/method/devx.asset_module.api.api_maintenance_tasks.get_maintenance_tasks';

const UPDATE_MAINTENANCE_TASK_PATH =
  '/method/devx.asset_module.api.api_maintenance_tasks.update_maintenance_task';

function unwrapMessage(response) {
  return response?.data?.message ?? response?.data ?? {};
}

/**
 * @param {{
 *   search?: string,
 *   center?: string,
 *   month?: string,
 *   filters?: string,
 *   page?: number,
 *   page_size?: number,
 * }} [params]
 */
export async function fetchMaintenanceTasks(params = {}) {
  const response = await apiClient.get(GET_MAINTENANCE_TASKS_PATH, {
    params: {
      search: params.search ?? '',
      center: params.center ?? '',
      month: params.month ?? '',
      filters: params.filters ?? '',
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
    rows: rows.map(mapMaintenanceTaskRowFromApi),
    totalCount: message.total_count ?? rows.length,
    page: message.page ?? params.page ?? 1,
  };
}

/**
 * @param {string} amlName Preventive check / AML name
 * @param {{ status?: string, rmImpactValue?: string, repair_cost?: number }} patch
 */
export async function updateMaintenanceTask(amlName, patch) {
  const response = await apiClient.post(UPDATE_MAINTENANCE_TASK_PATH, {
    aml_name: amlName,
    data: JSON.stringify(patch),
  });
  const message = unwrapMessage(response);
  return {
    ...mapMaintenanceTaskRowFromApi(message.data ?? message),
    assetOutId: message.assetOutId,
  };
}
