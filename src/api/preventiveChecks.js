import apiClient from '@/api/axios';
import { AUM_LIST_PAGE_SIZE } from '@/components/aum/constants';
import { mapPreventiveCheckRowFromApi } from '@/components/aum/maintenance-work-queue/maintenance-work-queue-api-mapper';

const GET_PREVENTIVE_CHECKS_PATH =
  '/method/devx.asset_module.api.api_preventive_checks.get_preventive_checks';

const UPDATE_PREVENTIVE_CHECK_PATH =
  '/method/devx.asset_module.api.api_preventive_checks.update_preventive_check';

const GET_PREVENTIVE_CHECK_ASSIGNEE_OPTIONS_PATH =
  '/method/devx.asset_module.api.api_preventive_checks.get_preventive_check_assignee_options';

const GET_MWQ_FILTER_OPTIONS_PATH =
  '/method/devx.asset_module.api.api_mwq_filter_options.get_mwq_filter_options';

function unwrapMessage(response) {
  return response?.data?.message ?? response?.data ?? {};
}

/**
 * @param {{
 *   search?: string,
 *   center?: string,
 *   month?: string,
 *   status?: string,
 *   condition?: string,
 *   filters?: string,
 *   page?: number,
 *   page_size?: number,
 * }} [params]
 */
export async function fetchPreventiveChecks(params = {}) {
  const response = await apiClient.get(GET_PREVENTIVE_CHECKS_PATH, {
    params: {
      search: params.search ?? '',
      center: params.center ?? '',
      month: params.month ?? '',
      status: params.status ?? '',
      condition: params.condition ?? '',
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
    rows: rows.map(mapPreventiveCheckRowFromApi),
    totalCount: message.total_count ?? rows.length,
    page: message.page ?? params.page ?? 1,
  };
}

/**
 * @param {string} name AML name
 * @param {{ condition?: string, status?: string, priority?: string, assignee?: string }} patch
 */
export async function updatePreventiveCheck(name, patch) {
  const response = await apiClient.post(UPDATE_PREVENTIVE_CHECK_PATH, {
    name,
    data: JSON.stringify(patch),
  });
  const message = unwrapMessage(response);
  return mapPreventiveCheckRowFromApi(message.data ?? message);
}

export async function fetchPreventiveCheckAssigneeOptions(name) {
  const response = await apiClient.get(GET_PREVENTIVE_CHECK_ASSIGNEE_OPTIONS_PATH, {
    params: { name },
  });
  const message = unwrapMessage(response);
  return {
    options: Array.isArray(message.options) ? message.options : [],
    primaryAssigneeEmail: message.primaryAssigneeEmail || '',
  };
}

/**
 * @param {{ variant?: 'preventive' | 'task', center?: string }} [params]
 */
export async function fetchMwqFilterOptions(params = {}) {
  const response = await apiClient.get(GET_MWQ_FILTER_OPTIONS_PATH, {
    params: {
      variant: params.variant ?? 'preventive',
      center: params.center ?? '',
    },
  });
  return unwrapMessage(response);
}
