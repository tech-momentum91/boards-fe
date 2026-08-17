import apiClient from '@/api/axios';

/**
 * Reusable Activities service.
 * Fetches activity feeds for entities (e.g. CP Account, CP Contact) via
 * devx.devx_crm.api.crm_activity.get_crm_entity_activities.
 */

/** Map frontend time period to API value. get_crm_entity_activities expects: all|today|yesterday|last7|thisMonth|older */
const timePeriodToApi = (p) => p;

/**
 * Fetch activities for a CP account using the CRM activities API.
 * Returns data in mock shape: activityGroups (grouped by today/yesterday/last 7 days).
 *
 * Maps to:
 *   devx.devx_crm.api.crm_activity.get_crm_entity_activities
 *
 * @param {string} cpAccountId - CP Account / CRM Account id
 * @param {Object} [filters] - { activityType, timePeriod }
 * @returns {Promise<{ data: { activityGroups: Array } } | { error: string }>}
 */
export async function getCpAccountActivities(cpAccountId, filters = {}) {
  if (!cpAccountId) return { data: { activityGroups: [] } };
  try {
    const activityFilter = filters.activityType || 'all';
    const timeFrame = filters.timePeriod ? timePeriodToApi(filters.timePeriod) : 'all';

    const response = await apiClient.get(
      '/method/devx.devx_crm.api.crm_activity.get_crm_entity_activities',
      {
        params: {
          activity_type: 'cp_account',
          activity_id: cpAccountId,
          activity_filter: activityFilter,
          time_frame: timeFrame,
        },
      },
    );

    const payload = response?.data?.message ?? response?.data ?? {};
    // crm_activity.get_crm_entity_activities returns `groups`, `activity_filter_options`, `time_frame_options`
    const groups = Array.isArray(payload?.groups) ? payload.groups : [];
    const activity_filter_options = Array.isArray(payload?.activity_filter_options)
      ? payload.activity_filter_options
      : [];
    const time_frame_options = Array.isArray(payload?.time_frame_options)
      ? payload.time_frame_options
      : [];

    return {
      data: {
        activityGroups: groups,
        activityFilterOptions: activity_filter_options,
        timeFrameOptions: time_frame_options,
      },
    };
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch activities.';
    return { error: message };
  }
}

/**
 * Fetch activities for a CP contact using the same CRM entity activities API as account.
 * devx.devx_crm.api.crm_activity.get_crm_entity_activities
 *
 * @param {string} cpContactId - CP Contact document id
 * @param {Object} [filters] - { activityType, timePeriod }
 * @returns {Promise<{ data: { activityGroups, activityFilterOptions?, timeFrameOptions? } } | { error: string }>}
 */
export async function getCpContactActivities(cpContactId, filters = {}) {
  if (!cpContactId) return { data: { activityGroups: [] } };
  try {
    const activityFilter = filters.activityType || 'all';
    const timeFrame = filters.timePeriod ? timePeriodToApi(filters.timePeriod) : 'all';

    const response = await apiClient.get(
      '/method/devx.devx_crm.api.crm_activity.get_crm_entity_activities',
      {
        params: {
          activity_type: 'cp_contact',
          activity_id: cpContactId,
          activity_filter: activityFilter,
          time_frame: timeFrame,
        },
      },
    );

    const payload = response?.data?.message ?? response?.data ?? {};
    const groups = Array.isArray(payload?.groups) ? payload.groups : [];
    const activity_filter_options = Array.isArray(payload?.activity_filter_options)
      ? payload.activity_filter_options
      : [];
    const time_frame_options = Array.isArray(payload?.time_frame_options)
      ? payload.time_frame_options
      : [];

    return {
      data: {
        activityGroups: groups,
        activityFilterOptions: activity_filter_options,
        timeFrameOptions: time_frame_options,
      },
    };
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch activities.';
    return { error: message };
  }
}

/**
 * Generic entry point: fetch activities by entity type and id.
 * @param {string} entityType - e.g. 'cp_account', 'cp_contact'
 * @param {string} entityId - entity document id
 * @param {Object} [filters] - optional filters
 * @returns {Promise<{ data: { activityGroups: Array } } | { error: string }>}
 */
export async function getActivities(entityType, entityId, filters = {}) {
  if (entityType === 'cp_account') {
    return getCpAccountActivities(entityId, filters);
  }
  if (entityType === 'cp_contact') {
    return getCpContactActivities(entityId, filters);
  }
  return { data: { activityGroups: [] } };
}
