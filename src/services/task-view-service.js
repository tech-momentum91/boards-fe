import apiClient from '@/api/axios';
import { extractErrorMessage, getFrappeResponseError } from '@/utils/error-utils';
import { normalizeTaskView, sortTaskViews } from '@/pages/boards/constants/task-view-constants';

const GET_LIST_VIEWS_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_view_.get_for_list';
const CREATE_TASK_VIEW_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_view_.create';
const UPDATE_TASK_VIEW_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_view_.update';
const TOGGLE_FAVORITE_TASK_VIEW_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.task_view_.toggle_favorite';
const DUPLICATE_TASK_VIEW_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_view_.duplicate';
const DELETE_TASK_VIEW_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_view_.delete';
const REORDER_TASK_VIEWS_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_view_.reorder';
const RESET_TASK_VIEW_TO_DEFAULT_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.task_view_.reset_to_default';

function normalizeViewsResponse(views = []) {
  return sortTaskViews(views.map(normalizeTaskView).filter(Boolean));
}

export async function getListTaskViews(listId) {
  if (!listId) {
    return { data: [] };
  }

  try {
    const response = await apiClient.get(GET_LIST_VIEWS_ENDPOINT, {
      params: { list_id: listId },
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to load views.');

    if (responseError) {
      return { error: responseError };
    }

    const views = Array.isArray(result?.message) ? result.message : [];
    return { data: normalizeViewsResponse(views) };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load views.'),
    };
  }
}

export async function createTaskView({ listId, viewType, title = null }) {
  if (!listId || !viewType) {
    return { error: 'List and view type are required.' };
  }

  try {
    const response = await apiClient.post(CREATE_TASK_VIEW_ENDPOINT, {
      list: listId,
      view_type: viewType,
      title,
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to create view.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: normalizeTaskView(result?.message ?? {}) };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to create view.'),
    };
  }
}

export async function updateTaskView(viewId, data, { scope = 'me' } = {}) {
  if (!viewId) {
    return { error: 'View is required.' };
  }

  const normalizedScope = scope === 'all' ? 'all' : 'me';

  try {
    const response = await apiClient.put(UPDATE_TASK_VIEW_ENDPOINT, {
      view_id: viewId,
      data: JSON.stringify(data ?? {}),
      scope: normalizedScope,
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to update view.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: normalizeTaskView(result?.message ?? {}) };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to update view.'),
    };
  }
}

export async function toggleTaskViewFavorite(viewId) {
  if (!viewId) {
    return { error: 'View is required.' };
  }

  try {
    const response = await apiClient.put(TOGGLE_FAVORITE_TASK_VIEW_ENDPOINT, {
      view_id: viewId,
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to pin view.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: normalizeTaskView(result?.message ?? {}) };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to pin view.'),
    };
  }
}

export async function duplicateTaskView(viewId) {
  if (!viewId) {
    return { error: 'View is required.' };
  }

  try {
    const response = await apiClient.post(DUPLICATE_TASK_VIEW_ENDPOINT, {
      view_id: viewId,
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to duplicate view.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: normalizeTaskView(result?.message ?? {}) };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to duplicate view.'),
    };
  }
}

export async function deleteTaskView(viewId) {
  if (!viewId) {
    return { error: 'View is required.' };
  }

  try {
    const response = await apiClient.delete(DELETE_TASK_VIEW_ENDPOINT, {
      data: { view_id: viewId },
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to delete view.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? { success: true, viewId } };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to delete view.'),
    };
  }
}

export async function reorderTaskViews(listId, viewIds = []) {
  if (!listId) {
    return { error: 'List is required.' };
  }

  try {
    const response = await apiClient.put(REORDER_TASK_VIEWS_ENDPOINT, {
      list_id: listId,
      view_ids: JSON.stringify(viewIds),
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to reorder views.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? { success: true } };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to reorder views.'),
    };
  }
}

export async function resetTaskViewToDefault(viewId, { scope = 'me' } = {}) {
  if (!viewId) {
    return { error: 'View is required.' };
  }

  const normalizedScope = scope === 'all' ? 'all' : 'me';

  try {
    const response = await apiClient.put(RESET_TASK_VIEW_TO_DEFAULT_ENDPOINT, {
      view_id: viewId,
      scope: normalizedScope,
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to reset view.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: normalizeTaskView(result?.message ?? {}) };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to reset view.'),
    };
  }
}
