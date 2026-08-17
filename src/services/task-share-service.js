import apiClient from '@/api/axios';
import { extractErrorMessage, getFrappeResponseError } from '@/utils/error-utils';
import {
  normalizeBoardTaskComment,
  normalizeBoardTaskDetail,
  normalizeBoardSearchTask,
} from './tasks-service';

const GET_SHARE_LINK_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_share.get_share_link';
const CREATE_SHARE_LINK_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.task_share.create_share_link';
const DISABLE_SHARE_LINK_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.task_share.disable_share_link';
const GET_PUBLIC_TASK_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_share.get_public_task';

export function buildAbsolutePublicTaskUrl(pathOrUrl = '') {
  const value = String(pathOrUrl ?? '').trim();
  if (!value) {
    return '';
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${value.startsWith('/') ? value : `/${value}`}`;
}

function normalizeShareLink(row = {}) {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const urlPath = row.url ?? '';
  return {
    name: row.name ?? '',
    taskId: row.task ?? row.task_id ?? '',
    enabled: Boolean(row.enabled),
    expiresOn: row.expires_on ?? row.expiresOn ?? '',
    expired: Boolean(row.expired),
    accessCount: row.access_count ?? row.accessCount ?? 0,
    url: buildAbsolutePublicTaskUrl(urlPath),
    urlPath,
  };
}

export async function getTaskShareLink(taskId) {
  if (!taskId) {
    return { error: 'Task is required.' };
  }

  try {
    const response = await apiClient.get(GET_SHARE_LINK_ENDPOINT, {
      params: { task_id: taskId },
    });
    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to load public link.');
    if (responseError) {
      return { error: responseError };
    }

    const message = result?.message;
    if (!message) {
      return { data: null };
    }

    return { data: normalizeShareLink(message) };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load public link.'),
    };
  }
}

export async function createTaskShareLink(taskId) {
  if (!taskId) {
    return { error: 'Task is required.' };
  }

  try {
    const response = await apiClient.post(CREATE_SHARE_LINK_ENDPOINT, {
      task_id: taskId,
    });
    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to create public link.');
    if (responseError) {
      return { error: responseError };
    }

    return { data: normalizeShareLink(result?.message ?? result) };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to create public link.'),
    };
  }
}

export async function disableTaskShareLink(taskId) {
  if (!taskId) {
    return { error: 'Task is required.' };
  }

  try {
    const response = await apiClient.post(DISABLE_SHARE_LINK_ENDPOINT, {
      task_id: taskId,
    });
    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to remove public link.');
    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? { success: true } };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to remove public link.'),
    };
  }
}

export async function getPublicTask({ taskId, key } = {}) {
  if (!taskId || !key) {
    return { error: 'This link is invalid or has expired.' };
  }

  try {
    const response = await apiClient.get(GET_PUBLIC_TASK_ENDPOINT, {
      params: {
        task_id: taskId,
        key,
      },
    });
    const result = response.data;
    const responseError = getFrappeResponseError(result, 'This link is invalid or has expired.');
    if (responseError) {
      return { error: responseError };
    }

    const payload = result?.message ?? result ?? {};
    const rawTask = payload.task ?? {};
    const searchShape = normalizeBoardSearchTask(rawTask);
    const detail = normalizeBoardTaskDetail(rawTask);
    const comments = Array.isArray(payload.comments)
      ? payload.comments.map(normalizeBoardTaskComment)
      : [];

    return {
      data: {
        task: {
          ...detail,
          statusColor: searchShape.statusColor,
          statusCategory: searchShape.statusCategory,
          statusTitle: searchShape.statusTitle,
          listTitle: searchShape.listTitle,
          spaceId: searchShape.spaceId,
          folderId: searchShape.folderId,
          spaceTitle: searchShape.spaceTitle,
          folderTitle: searchShape.folderTitle,
          assigneeDetails: searchShape.assigneeDetails,
        },
        comments,
        viewerIsMember: Boolean(payload.viewer_is_member),
        listId: payload.list_id ?? detail.listId ?? '',
        spaceId: payload.space_id ?? searchShape.spaceId ?? '',
        folderId: payload.folder_id ?? searchShape.folderId ?? '',
      },
    };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'This link is invalid or has expired.'),
    };
  }
}
