import apiClient from './axios';

/**
 * Fetch CRM entity activities (Account, Contact, or Lead) including linked task activities.
 * @see DevX_BE/devx-bench/apps/devx/devx/devx_crm/api/crm_activity.py
 *
 * @param {Object} params
 * @param {string} params.activityType - "account" | "contact" | "lead"
 * @param {string} params.activityId - CRM Account / Contact / Lead document name
 * @param {string} [params.activityFilter="all"] - "all" | "account" | "contact" | "lead" | "task"
 * @param {string} [params.timeFrame="all"] - "all" | "today" | "yesterday" | "last7" | "thisMonth" | "older"
 * @returns {Promise<{ groups, activity_filter_options, time_frame_options }>}
 */
export async function getCrmEntityActivities({
  activityType,
  activityId,
  activityFilter = 'all',
  timeFrame = 'all',
}) {
  if (!activityType || !activityId) {
    return { groups: [], activity_filter_options: [], time_frame_options: [] };
  }

  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_activity.get_crm_entity_activities',
    {
      params: {
        activity_type: activityType,
        activity_id: activityId,
        activity_filter: activityFilter,
        time_frame: timeFrame,
      },
    },
  );

  const result = data?.message ?? data;
  return result ?? { groups: [], activity_filter_options: [], time_frame_options: [] };
}

/**
 * Add a comment to a CRM entity activity feed (Account/Contact/Lead) with optional attachments.
 * Backend: devx.devx_crm.api.crm_activity.add_crm_entity_comment
 *
 * @param {Object} params
 * @param {string} params.activityType - "account" | "contact" | "lead" | "cp_account" | "cp_contact"
 * @param {string} params.activityId - entity document name
 * @param {string} params.content - HTML string
 * @param {Array} [params.attachments] - [{ file: File, ... }]
 */
export async function addCrmEntityComment({ activityType, activityId, content, attachments = [] }) {
  if (!activityType || !activityId) {
    throw new Error('activityType and activityId are required');
  }

  const formData = new FormData();
  formData.append(
    'doc',
    JSON.stringify({
      activity_type: activityType,
      activity_id: activityId,
      content: content ?? '',
    }),
  );

  if (Array.isArray(attachments) && attachments.length > 0) {
    attachments.forEach((att) => {
      if (att?.file && att.file instanceof File) {
        formData.append('files[]', att.file);
      }
    });
  }

  const { data } = await apiClient.post(
    '/method/devx.devx_crm.api.crm_activity.add_crm_entity_comment',
    formData,
  );
  return data?.message ?? data;
}
