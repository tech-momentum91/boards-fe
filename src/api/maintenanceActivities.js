import apiClient from '@/api/axios';

const GET_ACTIVITIES_PATH =
  '/method/devx.asset_module.api.api_maintenance_activities.get_asset_maintenance_log_activities';

const ADD_COMMENT_PATH =
  '/method/devx.asset_module.doctype.asset_maintenance_log_comment.asset_maintenance_log_comment.add_asset_maintenance_log_comment_with_files';

function unwrapMessage(response) {
  return response?.data?.message ?? response?.data ?? {};
}

/**
 * @param {string} amlId Asset Maintenance Log name
 */
export async function fetchMaintenanceLogActivities(amlId) {
  if (!amlId) {
    return { comments: [], history: [] };
  }

  const response = await apiClient.get(GET_ACTIVITIES_PATH, {
    params: { name: amlId },
  });

  const message = unwrapMessage(response);
  return {
    comments: message.comments ?? [],
    history: message.history ?? [],
  };
}

/**
 * @param {string} amlId
 * @param {{ content?: string, attachments?: Array<{ file?: File }>, parentCommentId?: string|null }} payload
 */
export async function addMaintenanceLogComment(amlId, payload = {}) {
  if (!amlId) {
    throw new Error('Asset Maintenance Log id is required');
  }

  const { content = '', attachments = [], parentCommentId = null } = payload;
  const hasContent = Boolean(String(content).trim());
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

  if (!hasContent && !hasAttachments) {
    throw new Error('Comment content or attachments are required');
  }

  const formData = new FormData();
  formData.append('name', String(amlId));
  formData.append('content', content || '');
  formData.append('parent_comment', parentCommentId ? String(parentCommentId) : '');

  attachments.forEach((attachment) => {
    if (attachment?.file) {
      formData.append('files[]', attachment.file);
    }
  });

  const response = await apiClient.post(ADD_COMMENT_PATH, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return unwrapMessage(response);
}
