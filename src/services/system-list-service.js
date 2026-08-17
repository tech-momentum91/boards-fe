import apiClient from '@/api/axios';
import { extractErrorMessage, getFrappeResponseError } from '@/utils/error-utils';

const GET_MODULES_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.system_list_.get_modules';
const GET_PRIMARY_COLUMNS_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.system_list_.get_primary_columns';
const GET_FILTERS_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.system_list_.get_filters';
const GET_FILTER_VALUES_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.system_list_.get_filter_values';
const RESOLVE_ERP_COLUMN_VALUES_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.system_list_.resolve_erp_column_values';
const SEARCH_MODULE_RECORDS_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.system_list_.search_module_records';
const LINK_TASK_TO_MODULE_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.system_list_.link_task_to_module';
const UNLINK_TASK_MODULE_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.system_list_.unlink_task_module';
const PREVIEW_SYSTEM_LIST_TASKS_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.system_list_.preview_tasks';
const CREATE_SYSTEM_LIST_TASKS_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.system_list_.create_tasks';

export async function getSystemListModules() {
  try {
    const response = await apiClient.get(GET_MODULES_ENDPOINT);
    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to load modules.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? [] };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load modules.'),
    };
  }
}

export async function getSystemListPrimaryColumns(moduleId) {
  if (!moduleId) {
    return { data: [] };
  }

  try {
    const response = await apiClient.get(GET_PRIMARY_COLUMNS_ENDPOINT, {
      params: { module_id: moduleId },
    });
    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to load primary columns.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? [] };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load primary columns.'),
    };
  }
}

export async function getSystemListFilters(moduleId) {
  if (!moduleId) {
    return { data: [] };
  }

  try {
    const response = await apiClient.get(GET_FILTERS_ENDPOINT, {
      params: { module_id: moduleId },
    });
    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to load filters.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? [] };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load filters.'),
    };
  }
}

export async function getSystemListFilterValues(moduleId, filterId) {
  if (!moduleId || !filterId) {
    return { data: [] };
  }

  try {
    const response = await apiClient.get(GET_FILTER_VALUES_ENDPOINT, {
      params: {
        module_id: moduleId,
        filter_id: filterId,
      },
    });
    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to load filter values.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? [] };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load filter values.'),
    };
  }
}

export async function resolveErpColumnValues({ links = [], columns = [] } = {}) {
  if (
    !Array.isArray(links) ||
    links.length === 0 ||
    !Array.isArray(columns) ||
    columns.length === 0
  ) {
    return { data: {} };
  }

  try {
    const response = await apiClient.post(RESOLVE_ERP_COLUMN_VALUES_ENDPOINT, {
      links: JSON.stringify(links),
      columns: JSON.stringify(columns),
    });
    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to resolve ERP column values.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? {} };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to resolve ERP column values.'),
    };
  }
}

export async function searchModuleRecords(moduleId, { query = '', limit = 50 } = {}) {
  if (!moduleId) {
    return { data: [] };
  }

  try {
    const response = await apiClient.get(SEARCH_MODULE_RECORDS_ENDPOINT, {
      params: {
        module_id: moduleId,
        query,
        limit,
      },
    });
    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to search module records.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? [] };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to search module records.'),
    };
  }
}

export async function linkTaskToModule({ taskId, moduleId, docname, primaryColumnId = '' } = {}) {
  if (!taskId || !moduleId || !docname) {
    return { error: 'Task, module, and record are required.' };
  }

  try {
    const response = await apiClient.post(LINK_TASK_TO_MODULE_ENDPOINT, {
      task_id: taskId,
      module_id: moduleId,
      docname,
      primary_column: primaryColumnId || '',
    });
    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to link task record.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? result };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to link task record.'),
    };
  }
}

export async function unlinkTaskModule(taskId) {
  if (!taskId) {
    return { error: 'Task is required.' };
  }

  try {
    const response = await apiClient.post(UNLINK_TASK_MODULE_ENDPOINT, {
      task_id: taskId,
    });
    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to unlink task record.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? result };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to unlink task record.'),
    };
  }
}

export async function previewSystemListTasks({
  listId,
  moduleId,
  primaryColumnId,
  filterId = '',
  filterValues = [],
} = {}) {
  if (!listId || !moduleId || !primaryColumnId) {
    return { data: { match_count: 0, create_count: 0, skipped_count: 0 } };
  }

  try {
    const response = await apiClient.post(PREVIEW_SYSTEM_LIST_TASKS_ENDPOINT, {
      list_id: listId,
      module_id: moduleId,
      primary_column: primaryColumnId,
      filter_id: filterId || '',
      filter_values: JSON.stringify(filterId ? filterValues : []),
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to preview system list tasks.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? result };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to preview system list tasks.'),
    };
  }
}

export async function createSystemListTasks({
  listId,
  moduleId,
  primaryColumnId,
  filterId = '',
  filterValues = [],
} = {}) {
  if (!listId) {
    return { error: 'List is required.' };
  }

  if (!moduleId) {
    return { error: 'Module is required.' };
  }

  if (!primaryColumnId) {
    return { error: 'Primary column is required.' };
  }

  if (filterId && (!Array.isArray(filterValues) || filterValues.length === 0)) {
    return { error: 'Select at least one filter value.' };
  }

  try {
    const response = await apiClient.post(CREATE_SYSTEM_LIST_TASKS_ENDPOINT, {
      list_id: listId,
      module_id: moduleId,
      primary_column: primaryColumnId,
      filter_id: filterId || '',
      filter_values: JSON.stringify(filterId ? filterValues : []),
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to create system list tasks.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? result };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to create system list tasks.'),
    };
  }
}
