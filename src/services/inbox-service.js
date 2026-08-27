import apiClient from '@/api/axios';
import { extractErrorMessage, getFrappeResponseError } from '@/utils/error-utils';

const INBOX_API = '/method/devx_tasks.devx_tasks.apis.inbox_';

/** Axios response → Frappe ``message`` body (same pattern as boards-service). */
function unwrap(response, fallbackMessage) {
  const result = response?.data ?? response;
  const responseError = getFrappeResponseError(result, fallbackMessage);
  if (responseError) {
    return { error: responseError };
  }
  return { data: result?.message ?? result };
}

export async function getInboxNotifications({ filters = [], limit = 50, offset = 0 } = {}) {
  try {
    const result = await apiClient.get(`${INBOX_API}.get_notifications`, {
      params: {
        filters: JSON.stringify(filters),
        limit,
        offset,
      },
    });
    const { data, error } = unwrap(result, 'Failed to load notifications.');
    if (error) return { error };
    return {
      notifications: Array.isArray(data?.notifications) ? data.notifications : [],
      count: Number(data?.count) || 0,
      hasMore: Boolean(data?.has_more),
    };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load notifications.'),
    };
  }
}

export async function getTaskInboxNotifications({
  task,
  cleared = false,
  limit = 100,
  offset = 0,
} = {}) {
  try {
    const result = await apiClient.get(`${INBOX_API}.get_task_notifications`, {
      params: {
        task,
        cleared: cleared ? 1 : 0,
        limit,
        offset,
      },
    });
    const { data, error } = unwrap(result, 'Failed to load task activity.');
    if (error) return { error };
    return {
      notifications: Array.isArray(data?.notifications) ? data.notifications : [],
      count: Number(data?.count) || 0,
      hasMore: Boolean(data?.has_more),
      task: data?.task || task || null,
      isMuted:
        data?.is_muted === undefined || data?.is_muted === null
          ? null
          : data?.is_muted === true || data?.is_muted === 1 || data?.is_muted === '1',
      isWatching:
        data?.is_watching === undefined || data?.is_watching === null
          ? null
          : data?.is_watching === true || data?.is_watching === 1 || data?.is_watching === '1',
    };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load task activity.'),
    };
  }
}

export async function getInboxUnreadCount() {
  try {
    const result = await apiClient.get(`${INBOX_API}.get_unread_count`);
    const { data, error } = unwrap(result, 'Failed to load unread count.');
    if (error) return { error };
    return { count: Number(data?.count) || 0 };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load unread count.'),
    };
  }
}

export async function markInboxRead(names) {
  try {
    const result = await apiClient.post(`${INBOX_API}.mark_read`, {
      names: Array.isArray(names) ? names : [names],
    });
    return unwrap(result, 'Failed to mark as read.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to mark as read.'),
    };
  }
}

export async function markInboxUnread(names) {
  try {
    const result = await apiClient.post(`${INBOX_API}.mark_unread`, {
      names: Array.isArray(names) ? names : [names],
    });
    return unwrap(result, 'Failed to mark as unread.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to mark as unread.'),
    };
  }
}

export async function clearInboxNotifications(names) {
  try {
    const result = await apiClient.post(`${INBOX_API}.clear`, {
      names: Array.isArray(names) ? names : [names],
    });
    return unwrap(result, 'Failed to clear notification.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to clear notification.'),
    };
  }
}

export async function unclearInboxNotifications(names) {
  try {
    const result = await apiClient.post(`${INBOX_API}.unclear`, {
      names: Array.isArray(names) ? names : [names],
    });
    return unwrap(result, 'Failed to restore notification.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to restore notification.'),
    };
  }
}

export async function clearAllInboxNotifications() {
  try {
    const result = await apiClient.post(`${INBOX_API}.clear_all`);
    return unwrap(result, 'Failed to clear all notifications.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to clear all notifications.'),
    };
  }
}

export async function snoozeInboxNotification(name, snoozedUntil) {
  try {
    const result = await apiClient.post(`${INBOX_API}.snooze`, {
      name,
      snoozed_until: snoozedUntil,
    });
    return unwrap(result, 'Failed to snooze notification.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to snooze notification.'),
    };
  }
}

export async function unfollowBoardTask(taskId) {
  try {
    const result = await apiClient.post(`${INBOX_API}.unfollow_task`, {
      task_id: taskId,
    });
    return unwrap(result, 'Failed to unfollow task.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to unfollow task.'),
    };
  }
}

export async function followBoardTask(taskId) {
  try {
    const result = await apiClient.post(`${INBOX_API}.follow_task`, {
      task_id: taskId,
    });
    return unwrap(result, 'Failed to follow task.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to follow task.'),
    };
  }
}

export async function muteBoardTask(taskId) {
  try {
    const result = await apiClient.post(`${INBOX_API}.mute_task`, {
      task_id: taskId,
    });
    return unwrap(result, 'Failed to mute task.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to mute task.'),
    };
  }
}

export async function unmuteBoardTask(taskId) {
  try {
    const result = await apiClient.post(`${INBOX_API}.unmute_task`, {
      task_id: taskId,
    });
    return unwrap(result, 'Failed to unmute task.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to unmute task.'),
    };
  }
}

export async function createInboxReminder(taskId, remindAt) {
  try {
    const result = await apiClient.post(`${INBOX_API}.create_reminder`, {
      task_id: taskId,
      remind_at: remindAt,
    });
    return unwrap(result, 'Failed to create reminder.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to create reminder.'),
    };
  }
}

export async function acceptBoardInvite(inviteId) {
  try {
    const result = await apiClient.post(`${INBOX_API}.accept_invite`, {
      invite_id: inviteId,
    });
    return unwrap(result, 'Failed to accept invite.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to accept invite.'),
    };
  }
}

export async function declineBoardInvite(inviteId) {
  try {
    const result = await apiClient.post(`${INBOX_API}.decline_invite`, {
      invite_id: inviteId,
    });
    return unwrap(result, 'Failed to decline invite.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to decline invite.'),
    };
  }
}

export async function getBoardPushPublicKey() {
  try {
    const result = await apiClient.get(`${INBOX_API}.get_vapid_public_key`);
    const { data, error } = unwrap(result, 'Failed to load push key.');
    if (error) return { error };
    return { publicKey: data?.public_key || null };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load push key.'),
    };
  }
}

export async function subscribeBoardPush({ endpoint, p256dh, auth }) {
  try {
    const result = await apiClient.post(`${INBOX_API}.subscribe_push`, {
      endpoint,
      p256dh,
      auth,
    });
    return unwrap(result, 'Failed to save push subscription.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to save push subscription.'),
    };
  }
}

export async function unsubscribeBoardPush(endpoint) {
  try {
    const result = await apiClient.post(`${INBOX_API}.unsubscribe_push`, {
      endpoint,
    });
    return unwrap(result, 'Failed to remove push subscription.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to remove push subscription.'),
    };
  }
}
