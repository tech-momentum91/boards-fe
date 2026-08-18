import apiClient from '@/api/axios';
import { extractErrorMessage, getFrappeResponseError } from '@/utils/error-utils';

const STATUS_TEMPLATE_BASE = '/method/devx_tasks.devx_tasks.apis.status_template_';

async function callStatusTemplateMethod(method, params = {}, defaultError) {
  try {
    const response = await apiClient.post(`${STATUS_TEMPLATE_BASE}.${method}`, params);
    const result = response.data;
    const responseError = getFrappeResponseError(result, defaultError);

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? result };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, defaultError),
    };
  }
}

async function callStatusTemplateGet(method, params = {}, defaultError) {
  try {
    const response = await apiClient.get(`${STATUS_TEMPLATE_BASE}.${method}`, {
      params,
    });
    const result = response.data;
    const responseError = getFrappeResponseError(result, defaultError);

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? result };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, defaultError),
    };
  }
}

export function resolveStatusTemplateContext(item) {
  if (!item?.id) {
    return null;
  }

  if (item.type === 'list') {
    return { scope: 'list', entityId: item.id };
  }

  if (item.type === 'folder') {
    return { scope: 'folder', entityId: item.id };
  }

  return { scope: 'space', entityId: item.id };
}

export async function getStatusTemplate(templateId) {
  if (!templateId) {
    return { error: 'Status template is required.' };
  }

  return callStatusTemplateGet('get', { template_id: templateId }, 'Failed to load task statuses.');
}

export async function getStatusTemplateForSpace(spaceId) {
  if (!spaceId) {
    return { error: 'Space is required.' };
  }

  return callStatusTemplateGet(
    'get_for_space',
    { space_id: spaceId },
    'Failed to load task statuses.',
  );
}

export async function getStatusTemplateForFolder(folderId) {
  if (!folderId) {
    return { error: 'Folder is required.' };
  }

  return callStatusTemplateGet(
    'get_for_folder',
    { folder_id: folderId },
    'Failed to load task statuses.',
  );
}

export async function getStatusTemplateForList(listId) {
  if (!listId) {
    return { error: 'List is required.' };
  }

  return callStatusTemplateGet(
    'get_for_list',
    { list_id: listId },
    'Failed to load task statuses.',
  );
}

export async function fetchTaskStatusTemplate(item) {
  const context = resolveStatusTemplateContext(item);

  if (!context) {
    return { error: 'Unable to resolve status template for this item.' };
  }

  if (context.scope === 'list') {
    return getStatusTemplateForList(context.entityId);
  }

  if (context.scope === 'folder') {
    return getStatusTemplateForFolder(context.entityId);
  }

  return getStatusTemplateForSpace(context.entityId);
}

export async function listStatusTemplates(spaceId = null) {
  const params = {};

  if (spaceId) {
    params.space_id = spaceId;
  }

  return callStatusTemplateGet('list_templates', params, 'Failed to load status templates.');
}

export async function createFolderStatusTemplate(folderId, copyFromSpace = true) {
  if (!folderId) {
    return { error: 'Folder is required.' };
  }

  return callStatusTemplateMethod(
    'create_folder_template',
    {
      folder_id: folderId,
      copy_from_space: copyFromSpace ? 1 : 0,
    },
    'Failed to create folder status template.',
  );
}

export async function createStatusTemplateStatus({
  title,
  category = 'not_started',
  color = null,
  templateId = null,
  folderId = null,
  isEnabled = true,
} = {}) {
  return callStatusTemplateMethod(
    'create_status',
    {
      title,
      category,
      color,
      template_id: templateId,
      folder_id: folderId,
      is_enabled: isEnabled ? 1 : 0,
    },
    'Failed to create status.',
  );
}

export async function updateStatusTemplateStatus(templateId, statusId, data) {
  if (!templateId || !statusId) {
    return { error: 'Template and status are required.' };
  }

  return callStatusTemplateMethod(
    'update_status',
    {
      template_id: templateId,
      status_id: statusId,
      data: typeof data === 'string' ? data : JSON.stringify(data),
    },
    'Failed to update status.',
  );
}

export async function getStatusTemplateStatusUsage(templateId, statusId) {
  if (!templateId || !statusId) {
    return { error: 'Template and status are required.' };
  }

  return callStatusTemplateMethod(
    'get_status_usage',
    {
      template_id: templateId,
      status_id: statusId,
    },
    'Failed to check status usage.',
  );
}

export async function deleteStatusTemplateStatus(templateId, statusId) {
  if (!templateId || !statusId) {
    return { error: 'Template and status are required.' };
  }

  return callStatusTemplateMethod(
    'delete_status',
    {
      template_id: templateId,
      status_id: statusId,
    },
    'Failed to delete status.',
  );
}

export async function deleteStatusForScope(item, statusId) {
  const context = resolveStatusTemplateContext(item);

  if (!context || !statusId) {
    return { error: 'Item and status are required.' };
  }

  return callStatusTemplateMethod(
    'delete_status_for_scope',
    {
      scope: context.scope,
      entity_id: context.entityId,
      status_id: statusId,
    },
    'Failed to delete status.',
  );
}

export async function getStatusUsageForScope(item, statusId) {
  const context = resolveStatusTemplateContext(item);

  if (!context || !statusId) {
    return { error: 'Item and status are required.' };
  }

  return callStatusTemplateMethod(
    'get_status_usage_for_scope',
    {
      scope: context.scope,
      entity_id: context.entityId,
      status_id: statusId,
    },
    'Failed to check status usage.',
  );
}

export async function reorderStatusTemplateStatuses(templateId, category, statusIds) {
  if (!templateId || !category) {
    return { error: 'Template and category are required.' };
  }

  return callStatusTemplateMethod(
    'reorder',
    {
      template_id: templateId,
      category,
      status_ids: statusIds,
    },
    'Failed to reorder statuses.',
  );
}

export async function toggleStatusTemplateStatus(templateId, statusId) {
  if (!templateId || !statusId) {
    return { error: 'Template and status are required.' };
  }

  return callStatusTemplateMethod(
    'toggle_status',
    {
      template_id: templateId,
      status_id: statusId,
    },
    'Failed to toggle status.',
  );
}

export async function toggleStatusForScope(item, statusId) {
  const context = resolveStatusTemplateContext(item);

  if (!context || !statusId) {
    return { error: 'Item and status are required.' };
  }

  return callStatusTemplateMethod(
    'toggle_status_for_scope',
    {
      scope: context.scope,
      entity_id: context.entityId,
      status_id: statusId,
    },
    'Failed to toggle status.',
  );
}

export async function bulkSaveStatusTemplate(templateId, statuses) {
  if (!templateId) {
    return { error: 'Status template is required.' };
  }

  return callStatusTemplateMethod(
    'bulk_save',
    {
      template_id: templateId,
      statuses,
    },
    'Failed to save task statuses.',
  );
}

export async function saveTaskStatusTemplate(item, template, statusesPayload) {
  const context = resolveStatusTemplateContext(item);

  if (!context) {
    return { error: 'Unable to resolve status template for this item.' };
  }

  const params = {
    scope: context.scope,
    entity_id: context.entityId,
    statuses: statusesPayload,
    mode: template?.mode === 'other' ? 'other' : 'custom',
  };

  if (template?.mode === 'other' && template?.otherSourceId) {
    params.other_source_id = template.otherSourceId;
  }

  return callStatusTemplateMethod('save_for_scope', params, 'Failed to save task statuses.');
}

function _buildBulkSavePayloadFromApiTemplate(apiTemplate) {
  const statuses = [];

  if (Array.isArray(apiTemplate?.statuses)) {
    apiTemplate.statuses.forEach((row, index) => {
      const title = getStatusTitleFromApiRow(row);
      if (!title) {
        return;
      }

      statuses.push({
        title,
        name1: row.name1,
        color: row.color || '#94A3B8',
        category: row.category || 'active',
        is_enabled: row.is_enabled ?? 1,
        is_closed: row.is_closed ?? 0,
        order: row.order ?? index + 1,
      });
    });

    return statuses;
  }

  return statuses;
}

function getStatusTitleFromApiRow(row) {
  if (row?.title) {
    return String(row.title).trim();
  }

  const name1 = String(row?.name1 ?? '').trim();
  if (!name1) {
    return '';
  }

  const segment = name1.split('-').pop() || name1;
  return segment.replaceAll('-', ' ');
}
