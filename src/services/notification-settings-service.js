import apiClient from '@/api/axios';
import { extractErrorMessage, getFrappeResponseError } from '@/utils/error-utils';

const NOTIFICATION_SETTINGS_API =
  '/method/devx_tasks.devx_tasks.apis.notification_settings_';

function unwrap(response, fallbackMessage) {
  const result = response?.data ?? response;
  const responseError = getFrappeResponseError(result, fallbackMessage);
  if (responseError) {
    return { error: responseError };
  }
  return { data: result?.message ?? result };
}

export async function getNotificationSettings() {
  try {
    const result = await apiClient.get(`${NOTIFICATION_SETTINGS_API}.get_notification_settings`);
    const { data, error } = unwrap(result, 'Failed to load notification settings.');
    if (error) return { error };
    return { data };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load notification settings.'),
    };
  }
}

export async function saveNotificationSettings(settings) {
  try {
    const result = await apiClient.post(
      `${NOTIFICATION_SETTINGS_API}.save_notification_settings`,
      { settings: JSON.stringify(settings) },
    );
    const { data, error } = unwrap(result, 'Failed to save notification settings.');
    if (error) return { error };
    return { data };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to save notification settings.'),
    };
  }
}

export async function pingDesktopPresence() {
  try {
    const result = await apiClient.post(`${NOTIFICATION_SETTINGS_API}.ping_desktop_presence`);
    const { data, error } = unwrap(result, 'Failed to update desktop presence.');
    if (error) return { error };
    return { data };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to update desktop presence.'),
    };
  }
}
