import apiClient from '@/api/axios';
import { getApiBaseUrl, resolveApiOrigin } from '@/api/api-origin';
import { isClosedStatusCategory } from '@/pages/boards/utils/task-statuses-utils';
import { extractErrorMessage, getFrappeResponseError } from '@/utils/error-utils';

const GET_LIST_TASKS_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_.get_list';
const GET_LIST_GROUPS_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_.get_groups';
const SEARCH_TASKS_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_.search';
const GET_TASK_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_.get';
const CREATE_TASK_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_.create';
const MOVE_TASK_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_.move';
const REORDER_TASKS_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_.reorder';
const DUPLICATE_TASK_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_.duplicate';
const UPDATE_TASK_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_.update';
const DELETE_TASK_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_.delete';
const GET_FAVORITE_TASKS_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_.get_favorites';
const GET_TASK_COMMENTS_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_.get_comments';
const ADD_TASK_COMMENT_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.task_.add_comment';
const TOGGLE_TASK_COMMENT_REACTION_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.task_.toggle_comment_reaction';
const UPLOAD_ATTACHMENT_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.attachment_.upload_attachment';
const LIST_ATTACHMENTS_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.attachment_.list_attachments';
const DELETE_ATTACHMENT_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.attachment_.delete_attachment';
const DOWNLOAD_ATTACHMENT_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.attachment_.download_attachment';

// Board attachment endpoints (generic, boards-specific)
const BOARD_UPLOAD_TASK_ATTACHMENT_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.board_attachment_.upload_task_attachment';
const BOARD_LIST_TASK_ATTACHMENTS_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.board_attachment_.list_task_attachments';
const BOARD_DELETE_TASK_ATTACHMENT_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.board_attachment_.delete_task_attachment';
const BOARD_DOWNLOAD_TASK_ATTACHMENT_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.board_attachment_.download_task_attachment';
const BOARD_UPLOAD_COMMENT_ATTACHMENT_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.board_attachment_.upload_comment_attachment';
const BOARD_LIST_COMMENT_ATTACHMENTS_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.board_attachment_.list_comment_attachments';
const BOARD_DELETE_COMMENT_ATTACHMENT_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.board_attachment_.delete_comment_attachment';
const BOARD_DOWNLOAD_COMMENT_ATTACHMENT_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.board_attachment_.download_comment_attachment';

function extractAssigneesRaw(task = {}) {
  if (Array.isArray(task.assignees) && task.assignees.length > 0) {
    return task.assignees;
  }

  if (Array.isArray(task.assigned_to) && task.assigned_to.length > 0) {
    return task.assigned_to;
  }

  if (typeof task.assigned_to === 'string' && task.assigned_to.trim()) {
    return task.assigned_to
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  const singleAssignee = extractAssignee(task);
  return singleAssignee ? [singleAssignee] : [];
}

function extractAssigneeIds(task = {}) {
  return extractAssigneesRaw(task)
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry.trim();
      }

      return (entry?.user ?? entry?.email ?? entry?.assignee ?? entry?.value ?? entry?.name ?? '')
        .toString()
        .trim();
    })
    .filter(Boolean);
}

export function buildDueDateUpdatePayload(dueDate = '') {
  const normalized = String(dueDate ?? '').trim();
  return { due_date: normalized };
}

export function buildStartDateUpdatePayload(startDate = '') {
  const normalized = String(startDate ?? '').trim();
  return { start_date: normalized };
}

export function buildAssigneeUpdatePayload(assigneeIds = []) {
  const ids = assigneeIds.map((value) => String(value ?? '').trim()).filter(Boolean);

  return { assignees: ids };
}

export function buildTagsUpdatePayload(tags = []) {
  const normalized = (Array.isArray(tags) ? tags : tags ? [tags] : [])
    .map((tag) => String(tag ?? '').trim())
    .filter(Boolean);

  const unique = [];
  const seen = new Set();

  normalized.forEach((tag) => {
    const key = tag.toLowerCase();
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    unique.push(tag);
  });

  return { tags: unique };
}

export function buildTaskFieldUpdatePayload(fieldKey, value) {
  switch (fieldKey) {
    case 'dueDate':
      return buildDueDateUpdatePayload(value);
    case 'title':
      return { title: value };
    case 'status':
      return { status: value };
    case 'priority':
      return { priority: value };
    default:
      return { [fieldKey]: value };
  }
}

/**
 * Build status update payload, optionally syncing Task Item.is_closed when the
 * selected status belongs to a closed lifecycle category (done/closed).
 */
export function buildStatusUpdatePayload(status, { isClosed } = {}) {
  const payload = { status };

  if (typeof isClosed === 'boolean') {
    payload.is_closed = isClosed ? 1 : 0;
  }

  return payload;
}

export function buildCustomFieldsUpdatePayload(customFields = {}) {
  return { custom_fields: customFields };
}

function parseCustomFields(task = {}) {
  const raw = task.custom_fields ?? task.customFields;

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw;
  }

  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
}

function extractAssignee(task = {}) {
  if (typeof task.assignee === 'string' && task.assignee.trim()) {
    return task.assignee.trim();
  }

  if (typeof task.assignee_name === 'string' && task.assignee_name.trim()) {
    return task.assignee_name.trim();
  }

  if (typeof task.assigned_to_name === 'string' && task.assigned_to_name.trim()) {
    return task.assigned_to_name.trim();
  }

  if (typeof task.assigned_to === 'string' && task.assigned_to.trim()) {
    return task.assigned_to.trim();
  }

  if (Array.isArray(task.assignees) && task.assignees.length > 0) {
    const first = task.assignees[0];
    return first?.full_name ?? first?.name ?? first?.user ?? '';
  }

  return '';
}

function parseIsClosed(value) {
  return value === true || value === 1 || value === '1';
}

function parseIsArchived(value) {
  return value === true || value === 1 || value === '1';
}

function parseIsFavorite(value) {
  return value === true || value === 1 || value === '1';
}

function parseIsDraft(value) {
  return value === true || value === 1 || value === '1';
}

export function isTaskClosed(task = {}) {
  if (typeof task.isClosed === 'boolean') {
    return task.isClosed;
  }

  if (parseIsClosed(task.is_closed ?? task.isClosed)) {
    return true;
  }

  return isClosedStatusCategory(task.status_category ?? task.statusCategory);
}

export function isTaskArchived(task = {}) {
  if (typeof task.isArchived === 'boolean') {
    return task.isArchived;
  }

  return parseIsArchived(task.is_archived ?? task.isArchived);
}

export function buildArchiveUpdatePayload() {
  return { is_archived: 1 };
}

export function buildFavoriteUpdatePayload(isFavorite = true) {
  return { is_favorite: isFavorite ? 1 : 0 };
}

export function normalizeListTask(task = {}) {
  const assigneeDetails = Array.isArray(task.assignee_details)
    ? task.assignee_details
    : Array.isArray(task.assigneeDetails)
      ? task.assigneeDetails
      : extractAssigneesRaw(task);
  const assignees = extractAssigneeIds(task);
  const creation = task.creation ?? task.createdAt ?? task.created_at ?? '';
  const modified = task.modified ?? task.dateUpdated ?? task.updated_at ?? '';
  const createdBy = task.created_by ?? task.createdBy ?? '';
  const createdByName = task.created_by_name ?? task.createdByName ?? '';
  const createdByImage = task.created_by_image ?? task.createdByImage ?? '';
  const createdByDetails =
    task.created_by_details ??
    task.createdByDetails ??
    (createdBy && (createdByName || createdByImage)
      ? {
          user: createdBy,
          email: createdBy,
          full_name: createdByName || createdBy,
          user_image: createdByImage || '',
        }
      : null);
  const statusCategory = task.status_category ?? task.statusCategory ?? '';

  return {
    id: task.name ?? task.id ?? task.task_id,
    title: task.title ?? task.subject ?? task.task_name ?? '',
    assignee: extractAssignee(task),
    assignees,
    assigneeDetails,
    dueDate: task.due_date ?? task.dueDate ?? '',
    startDate: task.start_date ?? task.startDate ?? '',
    status: task.status ?? '',
    statusCategory,
    priority: task.priority ?? '',
    isClosed:
      parseIsClosed(task.is_closed ?? task.isClosed) || isClosedStatusCategory(statusCategory),
    isArchived: parseIsArchived(task.is_archived ?? task.isArchived),
    isFavorite: parseIsFavorite(task.is_favorite ?? task.isFavorite),
    isDraft: parseIsDraft(task.is_draft ?? task.isDraft),
    listId: task.list_id ?? task.listId ?? task.list ?? '',
    createdBy,
    createdByDetails,
    dateCreated: creation,
    dateUpdated: modified,
    creation,
    modified,
    customFields: parseCustomFields(task),
    tags: normalizeTagsFromTask(task.tags),
    commentCount: (() => {
      const count = Number(task.comment_count ?? task.commentCount ?? 0);
      return Number.isFinite(count) ? count : 0;
    })(),
    latestComment: task.latest_comment ?? task.latestComment ?? '',
  };
}

function normalizeTagsFromTask(tags) {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return tags
      .map((entry) => {
        if (typeof entry === 'string') {
          return entry.trim();
        }

        return String(entry?.tag ?? entry?.name ?? entry?.label ?? '').trim();
      })
      .filter(Boolean);
  }

  return normalizeTags(tags);
}

function normalizeBoardTaskAttachments(attachments = []) {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .map((attachment, index) => {
      const fileUrl =
        attachment?.download_url ??
        attachment?.fileUrl ??
        attachment?.file ??
        attachment?.file_url ??
        '';
      if (!fileUrl) {
        return null;
      }

      const fileName =
        attachment?.file_name ??
        attachment?.fileName ??
        attachment?.original_name ??
        attachment?.filename ??
        (fileUrl.split('/').at(-1) || '').split('?')[0] ??
        `attachment-${index}`;

      return {
        id: attachment?.name ?? attachment?.id ?? `${fileName}-${index}`,
        fileName,
        fileUrl,
        mimeType: attachment?.mime_type ?? attachment?.mimeType ?? '',
        size: attachment?.size ?? 0,
        uploadedBy: attachment?.uploaded_by ?? attachment?.uploadedBy ?? '',
        uploadedOn: attachment?.uploaded_on ?? attachment?.uploadedOn ?? '',
      };
    })
    .filter(Boolean);
}

export function normalizeBoardTaskDetail(task = {}) {
  const base = normalizeListTask(task);

  return {
    ...base,
    description: task.description ?? '',
    content: task.content ?? '',
    tags: normalizeTagsFromTask(task.tags),
    attachments: normalizeBoardTaskAttachments(task.attachments),
    ownedBy: task.owned_by ?? task.ownedBy ?? '',
  };
}

export function applyBoardTaskDetailToListTask(detail = {}, listTask = {}) {
  return {
    ...listTask,
    id: detail.id ?? listTask.id,
    title: detail.title ?? listTask.title,
    assignee: detail.assignee ?? listTask.assignee,
    assignees: detail.assignees ?? listTask.assignees,
    assigneeDetails: detail.assigneeDetails ?? listTask.assigneeDetails,
    dueDate: detail.dueDate ?? listTask.dueDate,
    startDate: detail.startDate ?? listTask.startDate,
    status: detail.status ?? listTask.status,
    priority: detail.priority ?? listTask.priority,
    isArchived: detail.isArchived ?? listTask.isArchived,
    isClosed: detail.isClosed ?? listTask.isClosed,
    isFavorite: detail.isFavorite ?? listTask.isFavorite,
    isDraft: detail.isDraft ?? listTask.isDraft,
    createdBy: detail.createdBy ?? listTask.createdBy,
    createdByDetails: detail.createdByDetails ?? listTask.createdByDetails,
    dateCreated: detail.dateCreated ?? detail.creation ?? listTask.dateCreated ?? listTask.creation,
    dateUpdated: detail.dateUpdated ?? detail.modified ?? listTask.dateUpdated ?? listTask.modified,
    creation: detail.creation ?? detail.dateCreated ?? listTask.creation ?? listTask.dateCreated,
    modified: detail.modified ?? detail.dateUpdated ?? listTask.modified ?? listTask.dateUpdated,
    customFields: detail.customFields ?? listTask.customFields,
    tags: detail.tags ?? listTask.tags,
    commentCount: detail.commentCount ?? listTask.commentCount ?? 0,
    latestComment: detail.latestComment ?? listTask.latestComment ?? '',
  };
}

export function normalizeBoardTaskComment(comment = {}) {
  const authorName = comment.author_name ?? comment.author ?? '';
  const reactions = Array.isArray(comment.reactions)
    ? comment.reactions.map((reaction) => ({
        emoji: reaction.emoji ?? '',
        count:
          Number(reaction.count) || (Array.isArray(reaction.users) ? reaction.users.length : 0),
        current_user_reacted: Boolean(reaction.current_user_reacted),
        users: Array.isArray(reaction.users)
          ? reaction.users.map((user) => ({
              user: user.user ?? user.name ?? '',
              full_name: user.full_name ?? user.fullName ?? user.user ?? '',
            }))
          : [],
      }))
    : [];

  return {
    name: comment.name,
    content: comment.message ?? comment.content ?? '',
    creation: comment.creation ?? comment.modified ?? '',
    commented_by: authorName,
    user: authorName ? { name: authorName } : undefined,
    attachments: comment.attachments ?? [],
    reactions,
  };
}

export function normalizeFavoriteSidebarTask(task = {}) {
  const normalized = normalizeListTask(task);

  return {
    ...normalized,
    type: 'task',
    label: normalized.title || 'Untitled',
    listTitle: task.list_title ?? task.listTitle ?? '',
    spaceId: task.space ?? task.spaceId ?? '',
    folderId: task.folder ?? task.folderId ?? '',
    spaceTitle: task.space_title ?? task.spaceTitle ?? '',
    folderTitle: task.folder_title ?? task.folderTitle ?? '',
    statusColor: task.status_color ?? task.statusColor ?? '',
    statusCategory: task.status_category ?? task.statusCategory ?? '',
    statusTitle: task.status_title ?? task.statusTitle ?? normalized.status ?? '',
  };
}

function extractTasksFromMessage(message) {
  if (Array.isArray(message)) {
    return message;
  }

  if (Array.isArray(message?.tasks)) {
    return message.tasks;
  }

  if (Array.isArray(message?.data)) {
    return message.data;
  }

  if (Array.isArray(message?.items)) {
    return message.items;
  }

  return [];
}

function normalizeTags(tags) {
  if (!tags) return [];

  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof tags === 'string') {
    const trimmed = tags.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed)
        ? parsed.map((tag) => String(tag).trim()).filter(Boolean)
        : [trimmed];
    } catch {
      return [trimmed];
    }
  }

  return [];
}

export async function createBoardTask({
  listId,
  title,
  description = '',
  status = '',
  priority = 'Low',
  startDate = '',
  dueDate = '',
  assignedTo = '',
  assignees = [],
  tags = [],
  customFields = {},
  isDraft = false,
} = {}) {
  if (!listId) {
    return { error: 'List is required.' };
  }

  if (!title?.trim()) {
    return { error: 'Task title is required.' };
  }

  try {
    const payload = {
      title: title.trim(),
      list_id: listId,
      description: description ?? '',
      priority: priority || 'Low',
      is_draft: isDraft ? 1 : 0,
    };

    if (status) {
      payload.status = status;
    }

    if (startDate) {
      payload.start_date = startDate;
    }

    if (dueDate) {
      payload.due_date = dueDate;
    }

    const resolvedAssignees = (
      Array.isArray(assignees) ? assignees : assignedTo ? [assignedTo] : []
    )
      .map((value) => String(value ?? '').trim())
      .filter(Boolean);

    if (resolvedAssignees.length > 0) {
      payload.assignees = JSON.stringify(resolvedAssignees);
    }

    const normalizedTags = normalizeTags(tags);
    if (normalizedTags.length > 0) {
      payload.tags = JSON.stringify(normalizedTags);
    }

    const normalizedCustomFields =
      customFields && typeof customFields === 'object' && !Array.isArray(customFields)
        ? customFields
        : {};

    if (Object.keys(normalizedCustomFields).length > 0) {
      payload.custom_fields = JSON.stringify(normalizedCustomFields);
    }

    const response = await apiClient.post(CREATE_TASK_ENDPOINT, payload);

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to create task.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? result };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to create task.'),
    };
  }
}

export async function moveBoardTask({ taskId, listId, status } = {}) {
  if (!taskId) {
    return { error: 'Task is required.' };
  }

  if (!listId) {
    return { error: 'Destination list is required.' };
  }

  try {
    const response = await apiClient.post(MOVE_TASK_ENDPOINT, {
      task_id: taskId,
      list_id: listId,
      status,
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to move task.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? result };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to move task.'),
    };
  }
}

export async function reorderTasks(taskIds = []) {
  const ids = (Array.isArray(taskIds) ? taskIds : [])
    .map((id) => String(id ?? '').trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return { data: { success: true } };
  }

  try {
    const response = await apiClient.post(REORDER_TASKS_ENDPOINT, {
      task_ids: JSON.stringify(ids),
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to reorder tasks.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? result };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to reorder tasks.'),
    };
  }
}

export async function duplicateBoardTask({ taskId, listId, status } = {}) {
  if (!taskId) {
    return { error: 'Task is required.' };
  }

  if (!listId) {
    return { error: 'Destination list is required.' };
  }

  try {
    const response = await apiClient.post(DUPLICATE_TASK_ENDPOINT, {
      task_id: taskId,
      list_id: listId,
      status,
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to add task.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? result };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to add task.'),
    };
  }
}

export async function updateBoardTask({ taskId, data = {} } = {}) {
  if (!taskId) {
    return { error: 'Task is required.' };
  }

  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    return { error: 'Update data is required.' };
  }

  try {
    const response = await apiClient.post(UPDATE_TASK_ENDPOINT, {
      task_id: taskId,
      data,
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to update task.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? result };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to update task.'),
    };
  }
}

export async function archiveBoardTask({ taskId } = {}) {
  if (!taskId) {
    return { error: 'Task is required.' };
  }

  return updateBoardTask({
    taskId,
    data: buildArchiveUpdatePayload(),
  });
}

export async function updateTaskFavorite({ taskId, isFavorite = true } = {}) {
  if (!taskId) {
    return { error: 'Task is required.' };
  }

  return updateBoardTask({
    taskId,
    data: buildFavoriteUpdatePayload(isFavorite),
  });
}

export async function getFavoriteTasks() {
  try {
    const response = await apiClient.get(GET_FAVORITE_TASKS_ENDPOINT);
    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to load favorite tasks.');

    if (responseError) {
      return { error: responseError };
    }

    const rawTasks = extractTasksFromMessage(result?.message);
    return {
      data: rawTasks.map(normalizeFavoriteSidebarTask).filter((task) => !task.isArchived),
    };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load favorite tasks.'),
    };
  }
}

export async function deleteBoardTask({ taskId } = {}) {
  if (!taskId) {
    return { error: 'Task is required.' };
  }

  try {
    const response = await apiClient.post(DELETE_TASK_ENDPOINT, {
      task_id: taskId,
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to delete task.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? result };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to delete task.'),
    };
  }
}

export function normalizeBoardSearchTask(task = {}) {
  const normalized = normalizeListTask(task);

  return {
    ...normalized,
    listTitle: task.list_title ?? task.listTitle ?? '',
    spaceId: task.space ?? task.spaceId ?? '',
    folderId: task.folder ?? task.folderId ?? '',
    spaceTitle: task.space_title ?? task.spaceTitle ?? '',
    folderTitle: task.folder_title ?? task.folderTitle ?? '',
    assigneeNames: Array.isArray(task.assignee_names)
      ? task.assignee_names
      : Array.isArray(task.assigneeNames)
        ? task.assigneeNames
        : [],
    assigneeDetails: Array.isArray(task.assignee_details)
      ? task.assignee_details
      : Array.isArray(task.assigneeDetails)
        ? task.assigneeDetails
        : normalized.assigneeDetails,
    statusColor: task.status_color ?? task.statusColor ?? '',
    statusCategory: task.status_category ?? task.statusCategory ?? '',
    statusTitle: task.status_title ?? task.statusTitle ?? task.status ?? '',
    modified: task.modified ?? '',
  };
}

export async function searchBoardTasks(query, limit = 50) {
  const normalizedQuery = String(query ?? '').trim();
  if (!normalizedQuery) {
    return { data: [] };
  }

  try {
    const response = await apiClient.get(SEARCH_TASKS_ENDPOINT, {
      params: {
        query: normalizedQuery,
        limit,
      },
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to search tasks.');

    if (responseError) {
      return { error: responseError };
    }

    const rawTasks = extractTasksFromMessage(result?.message);
    return { data: rawTasks.map(normalizeBoardSearchTask) };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to search tasks.'),
    };
  }
}

export async function getListTasks(listId, {
  page = 1,
  pageSize = 50,
  groupBy = null,
  groupValue = null,
  search = '',
  assignedTo = '',
  closedOnly = null,
} = {}) {
  if (!listId) {
    return { error: 'List is required.' };
  }

  try {
    const params = {
      list_id: listId,
      page,
      page_size: pageSize,
    };

    if (groupBy) {
      params.group_by = groupBy;
      params.group_value = groupValue === '__empty__' ? '' : (groupValue ?? '');
    }

    if (search) {
      params.search = search;
    }

    if (assignedTo) {
      params.assigned_to = assignedTo;
    }

    if (closedOnly !== null && closedOnly !== undefined) {
      params.closed_only = closedOnly ? 1 : 0;
    }

    const response = await apiClient.get(GET_LIST_TASKS_ENDPOINT, { params });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to load tasks.');

    if (responseError) {
      return { error: responseError };
    }

    const message = result?.message ?? {};
    const rawTasks = extractTasksFromMessage(message);
    const resolvedPage = Number(message?.page) || page;
    const resolvedPageSize = Number(message?.page_size) || pageSize;
    const totalCount = Number(message?.total_count);
    const totalPages = Number(message?.total_pages);
    const hasMore = Boolean(
      message?.has_more ??
      (totalPages ? resolvedPage < totalPages : rawTasks.length >= resolvedPageSize),
    );

    return {
      data: rawTasks.map(normalizeListTask),
      pagination: {
        page: resolvedPage,
        pageSize: resolvedPageSize,
        totalCount: Number.isFinite(totalCount) ? totalCount : rawTasks.length,
        totalPages: Number.isFinite(totalPages)
          ? totalPages
          : hasMore
            ? resolvedPage + 1
            : resolvedPage,
        hasMore,
      },
    };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load tasks.'),
    };
  }
}

export async function getListGroups(listId, {
  groupBy,
  search = '',
  assignedTo = '',
  closedOnly = null,
} = {}) {
  if (!listId) {
    return { error: 'List is required.' };
  }

  if (!groupBy) {
    return { error: 'Group field is required.' };
  }

  try {
    const params = {
      list_id: listId,
      group_by: groupBy,
    };

    if (search) {
      params.search = search;
    }

    if (assignedTo) {
      params.assigned_to = assignedTo;
    }

    if (closedOnly !== null && closedOnly !== undefined) {
      params.closed_only = closedOnly ? 1 : 0;
    }

    const response = await apiClient.get(GET_LIST_GROUPS_ENDPOINT, { params });
    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to load groups.');

    if (responseError) {
      return { error: responseError };
    }

    const message = result?.message ?? {};
    const groups = Array.isArray(message?.groups) ? message.groups : [];

    return {
      data: groups.map((group) => ({
        key: group.key || '__empty__',
        count: Number(group.count) || 0,
      })),
    };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load groups.'),
    };
  }
}

export async function getBoardTask(taskId) {
  if (!taskId) {
    return { error: 'Task is required.' };
  }

  try {
    const response = await apiClient.get(GET_TASK_ENDPOINT, {
      params: { task_id: taskId },
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to load task.');

    if (responseError) {
      return { error: responseError };
    }

    const rawTask = result?.message ?? result;
    return { data: normalizeBoardTaskDetail(rawTask) };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load task.'),
    };
  }
}

export async function getBoardTaskComments(taskId) {
  if (!taskId) {
    return { error: 'Task is required.' };
  }

  try {
    const response = await apiClient.get(GET_TASK_COMMENTS_ENDPOINT, {
      params: { task_id: taskId },
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to load comments.');

    if (responseError) {
      return { error: responseError };
    }

    const payload = result?.message ?? result ?? {};
    const comments = Array.isArray(payload.comments)
      ? payload.comments.map(normalizeBoardTaskComment)
      : [];

    return {
      data: {
        comments,
        history: Array.isArray(payload.history) ? payload.history : [],
      },
    };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load comments.'),
    };
  }
}

export async function addBoardTaskComment({ taskId, message } = {}) {
  if (!taskId) {
    return { error: 'Task is required.' };
  }

  if (!String(message ?? '').trim()) {
    return { error: 'Comment is required.' };
  }

  try {
    const response = await apiClient.post(ADD_TASK_COMMENT_ENDPOINT, {
      task_id: taskId,
      message: String(message).trim(),
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to add comment.');

    if (responseError) {
      return { error: responseError };
    }

    const rawComment = result?.message ?? result;
    return { data: normalizeBoardTaskComment(rawComment) };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to add comment.'),
    };
  }
}

export async function toggleBoardTaskCommentReaction({ commentId, emoji } = {}) {
  if (!commentId) {
    return { error: 'Comment is required.' };
  }

  if (!String(emoji ?? '').trim()) {
    return { error: 'Emoji is required.' };
  }

  try {
    const response = await apiClient.post(TOGGLE_TASK_COMMENT_REACTION_ENDPOINT, {
      comment_id: commentId,
      emoji: String(emoji).trim(),
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to update reaction.');

    if (responseError) {
      return { error: responseError };
    }

    const payload = result?.message ?? result ?? {};
    return {
      data: {
        action: payload.action,
        emoji: payload.emoji,
        commentId: payload.comment_id,
        reactions: Array.isArray(payload.reactions) ? payload.reactions : [],
      },
    };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to update reaction.'),
    };
  }
}

const UPLOAD_FILE_ENDPOINT = '/method/upload_file';

function extractAttachmentPayload(result) {
  const message = result?.message ?? result ?? {};
  if (message.success === false) {
    return { error: message.message || 'Attachment request failed.' };
  }

  return { data: message.attachment ?? message };
}

export async function uploadTaskAttachment({ taskId, file, createRecord = true } = {}) {
  if (!taskId) {
    return { error: 'Task is required.' };
  }

  if (!file) {
    return { error: 'File is required.' };
  }

  try {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('task_id', taskId);
    formData.append('create_record', createRecord ? '1' : '0');

    const response = await apiClient.post(UPLOAD_ATTACHMENT_ENDPOINT, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to upload attachment.');

    if (responseError) {
      return { error: responseError };
    }

    const payload = extractAttachmentPayload(result);
    if (payload.error) {
      return payload;
    }

    const attachment = payload.data;
    return {
      data: {
        id: attachment?.name ?? attachment?.id,
        fileName: attachment?.file_name ?? attachment?.original_name ?? file.name,
        fileUrl: attachment?.download_url ?? attachment?.fileUrl ?? '',
        objectKey: attachment?.object_key ?? '',
        fileId: attachment?.file_id ?? '',
        mimeType: attachment?.mime_type ?? file.type ?? '',
        size: attachment?.size ?? file.size ?? 0,
      },
    };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to upload attachment.'),
    };
  }
}

export async function uploadTaskAttachments({ taskId, files = [] } = {}) {
  const fileList = (Array.isArray(files) ? files : [])
    .map((entry) => entry?.file ?? entry)
    .filter(Boolean);

  if (!taskId) {
    return { error: 'Task is required.' };
  }

  if (fileList.length === 0) {
    return { data: [] };
  }

  const uploaded = [];
  const errors = [];

  for (const file of fileList) {
    const result = await uploadTaskAttachment({ taskId, file, createRecord: true });
    if (result.error) {
      errors.push(result.error);
      continue;
    }

    uploaded.push(result.data);
  }

  if (errors.length > 0 && uploaded.length === 0) {
    return { error: errors[0] };
  }

  return {
    data: uploaded,
    partialErrors: errors.length > 0 ? errors : undefined,
  };
}

export async function uploadTaskCustomFieldFile({ taskId, file } = {}) {
  return uploadTaskAttachment({ taskId, file, createRecord: false });
}

export async function listTaskAttachments(taskId) {
  if (!taskId) {
    return { error: 'Task is required.' };
  }

  try {
    const response = await apiClient.get(LIST_ATTACHMENTS_ENDPOINT, {
      params: { task_id: taskId },
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to load attachments.');

    if (responseError) {
      return { error: responseError };
    }

    const message = result?.message ?? result ?? {};
    const attachments = normalizeBoardTaskAttachments(message.attachments ?? []);
    return { data: attachments };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load attachments.'),
    };
  }
}

export async function deleteTaskAttachment(attachmentId) {
  if (!attachmentId) {
    return { error: 'Attachment is required.' };
  }

  try {
    const response = await apiClient.post(DELETE_ATTACHMENT_ENDPOINT, {
      attachment_id: attachmentId,
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to delete attachment.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? result };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to delete attachment.'),
    };
  }
}

export function getTaskAttachmentDownloadUrl(attachmentId) {
  if (!attachmentId) {
    return '';
  }

  return `${DOWNLOAD_ATTACHMENT_ENDPOINT}?attachment_id=${encodeURIComponent(attachmentId)}`;
}

// ── Board attachment helpers ───────────────────────────────────────────────────

/**
 * Convert a potentially relative Frappe URL (e.g. /api/method/...) to an
 * absolute URL using the resolved API origin.  Absolute URLs are returned
 * unchanged.  Empty strings are returned as-is.
 */
function _toAbsoluteUrl(url) {
  if (!url || !url.startsWith('/')) return url;
  const origin = resolveApiOrigin();
  return origin ? `${origin}${url}` : url;
}

/**
 * Normalize an attachment record returned by the new board_attachment_ APIs.
 * Returns a stable shape consumed by all board attachment components.
 */
export function normalizeBoardAttachment(raw = {}) {
  return {
    id: raw.id ?? raw.name ?? '',
    originalName: raw.original_name ?? raw.originalName ?? '',
    extension: (raw.extension ?? '').toLowerCase(),
    mimeType: raw.mime_type ?? raw.mimeType ?? '',
    size: Number(raw.size) || 0,
    checksum: raw.checksum ?? '',
    previewType: raw.preview_type ?? raw.previewType ?? 'other',
    uploadedBy: raw.uploaded_by ?? raw.uploadedBy ?? '',
    uploadedOn: raw.uploaded_on ?? raw.uploadedOn ?? '',
    downloadUrl: _toAbsoluteUrl(raw.download_url ?? raw.downloadUrl ?? ''),
    objectKey: raw.object_key ?? raw.objectKey ?? '',
  };
}

/**
 * Axios-based upload with per-file progress and AbortController cancel support.
 *
 * Axios supports onUploadProgress and signal natively — no XHR boilerplate needed.
 *
 * @param {string}      endpoint  - API method path (e.g. '/method/devx_tasks...')
 * @param {FormData}    formData
 * @param {object}      options
 * @param {Function}    [options.onProgress]  - called with 0–100 number
 * @param {AbortSignal} [options.signal]       - AbortController signal for cancel
 * @returns {Promise<{data}|{error}>}
 */
async function _axiosUpload(endpoint, formData, { onProgress, signal } = {}) {
  try {
    const response = await apiClient.post(endpoint, formData, {
      onUploadProgress: onProgress
        ? (e) => {
            if (e.total) onProgress(Math.round((e.loaded / e.total) * 100));
          }
        : undefined,
      signal,
    });

    const result = response.data;
    const err = getFrappeResponseError(result, 'Upload failed.');
    if (err) return { error: err };

    return { data: result?.message ?? result ?? {} };
  } catch (error) {
    const name = error?.name ?? error?.code ?? '';
    if (name === 'CanceledError' || name === 'ERR_CANCELED' || name === 'AbortError') {
      return { error: 'Upload cancelled.' };
    }
    return { error: extractErrorMessage(error.serialized || error, 'Upload failed.') };
  }
}

// ── Task attachment service functions ──────────────────────────────────────────

/**
 * Upload a single file to a task with per-file progress and cancel support.
 * Returns { data: normalizeBoardAttachment } or { error }.
 */
export async function uploadBoardTaskAttachment(taskId, file, { onProgress, signal } = {}) {
  if (!taskId) return { error: 'Task is required.' };
  if (!file) return { error: 'File is required.' };

  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('task_id', taskId);

  const result = await _axiosUpload(BOARD_UPLOAD_TASK_ATTACHMENT_ENDPOINT, formData, {
    onProgress,
    signal,
  });

  if (result.error) return result;

  const attachments = result.data?.attachments ?? [];
  const errors = result.data?.errors ?? [];

  if (attachments.length === 0 && errors.length > 0) {
    return { error: errors[0]?.error ?? 'Upload failed.' };
  }

  return { data: normalizeBoardAttachment(attachments[0] ?? {}), errors };
}

export async function listBoardTaskAttachments(taskId) {
  if (!taskId) return { error: 'Task is required.' };

  try {
    const response = await apiClient.get(BOARD_LIST_TASK_ATTACHMENTS_ENDPOINT, {
      params: { task_id: taskId },
    });

    const result = response.data;
    const err = getFrappeResponseError(result, 'Failed to load attachments.');
    if (err) return { error: err };

    const message = result?.message ?? result ?? {};
    const attachments = (message.attachments ?? []).map(normalizeBoardAttachment);
    return { data: attachments };
  } catch (error) {
    return { error: extractErrorMessage(error.serialized || error, 'Failed to load attachments.') };
  }
}

export async function deleteBoardTaskAttachment(attachmentId) {
  if (!attachmentId) return { error: 'Attachment is required.' };

  try {
    const response = await apiClient.post(BOARD_DELETE_TASK_ATTACHMENT_ENDPOINT, {
      attachment_id: attachmentId,
    });

    const result = response.data;
    const err = getFrappeResponseError(result, 'Failed to delete attachment.');
    if (err) return { error: err };

    return { data: { attachmentId } };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to delete attachment.'),
    };
  }
}

export function getBoardTaskAttachmentDownloadUrl(attachmentId) {
  if (!attachmentId) return '';
  return `${getApiBaseUrl()}${BOARD_DOWNLOAD_TASK_ATTACHMENT_ENDPOINT}?attachment_id=${encodeURIComponent(attachmentId)}`;
}

// ── Comment attachment service functions ───────────────────────────────────────

/**
 * Upload a single file to a comment with per-file progress and cancel support.
 */
export async function uploadBoardCommentAttachment(commentId, file, { onProgress, signal } = {}) {
  if (!commentId) return { error: 'Comment is required.' };
  if (!file) return { error: 'File is required.' };

  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('comment_id', commentId);

  const result = await _axiosUpload(BOARD_UPLOAD_COMMENT_ATTACHMENT_ENDPOINT, formData, {
    onProgress,
    signal,
  });

  if (result.error) return result;

  const attachments = result.data?.attachments ?? [];
  const errors = result.data?.errors ?? [];

  if (attachments.length === 0 && errors.length > 0) {
    return { error: errors[0]?.error ?? 'Upload failed.' };
  }

  return { data: normalizeBoardAttachment(attachments[0] ?? {}), errors };
}

export async function listBoardCommentAttachments(commentId) {
  if (!commentId) return { error: 'Comment is required.' };

  try {
    const response = await apiClient.get(BOARD_LIST_COMMENT_ATTACHMENTS_ENDPOINT, {
      params: { comment_id: commentId },
    });

    const result = response.data;
    const err = getFrappeResponseError(result, 'Failed to load attachments.');
    if (err) return { error: err };

    const message = result?.message ?? result ?? {};
    const attachments = (message.attachments ?? []).map(normalizeBoardAttachment);
    return { data: attachments };
  } catch (error) {
    return { error: extractErrorMessage(error.serialized || error, 'Failed to load attachments.') };
  }
}

export async function deleteBoardCommentAttachment(attachmentId) {
  if (!attachmentId) return { error: 'Attachment is required.' };

  try {
    const response = await apiClient.post(BOARD_DELETE_COMMENT_ATTACHMENT_ENDPOINT, {
      attachment_id: attachmentId,
    });

    const result = response.data;
    const err = getFrappeResponseError(result, 'Failed to delete attachment.');
    if (err) return { error: err };

    return { data: { attachmentId } };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to delete attachment.'),
    };
  }
}

export function getBoardCommentAttachmentDownloadUrl(attachmentId) {
  if (!attachmentId) return '';
  return `${getApiBaseUrl()}${BOARD_DOWNLOAD_COMMENT_ATTACHMENT_ENDPOINT}?attachment_id=${encodeURIComponent(attachmentId)}`;
}

// ── Generic file upload (unchanged) ───────────────────────────────────────────

export async function uploadFile(file, { isPrivate = false } = {}) {
  if (!file) {
    return { error: 'File is required.' };
  }

  try {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('is_private', isPrivate ? '1' : '0');
    formData.append('folder', 'Home');

    const response = await apiClient.post(UPLOAD_FILE_ENDPOINT, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to upload file.');

    if (responseError) {
      return { error: responseError };
    }

    const fileDoc = result?.message ?? result ?? {};

    return {
      data: {
        fileUrl: fileDoc.file_url ?? fileDoc.file ?? '',
        fileName: fileDoc.file_name ?? file.name,
      },
    };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to upload file.'),
    };
  }
}
