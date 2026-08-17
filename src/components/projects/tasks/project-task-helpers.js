import { normalizeProjectAreaValue } from '@/components/projects/shared';
import { normalizeTaskAttachments } from '@/components/client-onboarding/task-view-drawer-utils';
import { toAbsoluteAttachmentUrl, getFileExtension } from '@/lib/utils';
import {
  formatAttachmentNameForCard,
  resolveAttachmentDisplayName,
} from '@/components/projects/shared/project-attachment-display-utils';
import {
  formatDateDisplay,
  formatDateToYYYYMMDD,
  formatDisplayDateTime,
  parseToDate,
} from '@/utils/date-utils';
import { formatFileSize } from '@/utils/file-utils';
import {
  getAssigneeFirstNameInitial,
  joinAssigneeIds,
  normalizeAssignees,
  normalizeTaskAssigneeEntry,
} from '@/utils/task-utils';

const AVATAR_COLORS = ['blue', 'yellow', 'red', 'sky', 'purple', 'green', 'orange'];

export const PROJECT_TASKS_GROUP_BY_API_MAP = {
  stage: 'custom_stage',
  status: 'status',
  priority: 'priority',
};

/**
 * Status Master stores whatever label is configured (kebab or title case).
 * Do not remap through hardcoded legacy maps on read/write — that rewrites
 * values like `yet-to-start` / `Pending` into labels that fail backend validation.
 */
function passThroughStatus(status, fallback = '') {
  const raw = String(status ?? '').trim();
  return raw || fallback;
}

function normalizeProjectTaskStatus(status) {
  return passThroughStatus(status, 'Pending');
}

/** Status set shared by Layouts / GFC / 3D / Graphics / Documents / Snags. */
export function normalizeProjectSectionStatus(status) {
  return passThroughStatus(status, 'yet-to-start');
}

function denormalizeProjectTaskStatus(status) {
  return passThroughStatus(status, 'Pending');
}

export function denormalizeProjectSectionStatus(status) {
  return passThroughStatus(status, 'yet-to-start');
}

function normalizeProjectTaskPriority(priority) {
  return String(priority ?? 'Medium').trim();
}

function denormalizeProjectTaskPriority(priority) {
  return String(priority ?? 'Medium').trim();
}

export { denormalizeProjectTaskStatus, denormalizeProjectTaskPriority, normalizeProjectTaskStatus };

function mapAssignees(assigneeList) {
  const seen = new Set();
  const uniqueList = (assigneeList ?? []).filter((raw) => {
    const key = String(
      typeof raw === 'string'
        ? raw
        : (raw?.id ?? raw?.value ?? raw?.user ?? raw?.email ?? raw ?? ''),
    ).trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return uniqueList.map((raw, index) => {
    const normalized = normalizeTaskAssigneeEntry(typeof raw === 'string' ? { user: raw } : raw);
    const id =
      typeof normalized === 'string'
        ? normalized
        : (normalized?.value ?? raw?.id ?? String(raw ?? `assignee-${index}`));

    const displaySource =
      typeof normalized === 'object' && normalized
        ? normalized
        : { value: id, label: id, name: id };

    return {
      id,
      value: id,
      label: displaySource.label ?? displaySource.full_name ?? id,
      full_name: displaySource.full_name ?? displaySource.label,
      email: displaySource.email,
      name: displaySource.name ?? id,
      initials: getAssigneeFirstNameInitial(displaySource),
      color: AVATAR_COLORS[index % AVATAR_COLORS.length],
    };
  });
}

/** Project task rows store `{ id, label, ... }`; map to AssigneeMultiSelect value shape. */
export function normalizeProjectTaskAssigneeForSelect(entry) {
  if (entry == null || entry === '') return null;
  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    return trimmed || null;
  }

  const value = String(
    entry.id ?? entry.value ?? entry.assignee ?? entry.user ?? entry.email ?? entry.name ?? '',
  ).trim();
  if (!value) return null;

  const label = entry.full_name ?? entry.label ?? entry.name ?? value;

  return {
    value,
    label,
    email: entry.email ?? entry.user,
    full_name: entry.full_name ?? entry.label,
    name: entry.name ?? value,
    image: entry.image ?? entry.user_image ?? entry.avatar ?? null,
  };
}

export function parseResourceTaskTags(data) {
  if (Array.isArray(data?.tags) && data.tags.length > 0) {
    return data.tags.filter(Boolean);
  }

  const raw = data?._user_tags;
  if (!raw) return [];

  return String(raw)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

const PROJECT_ATTACHMENT_IMAGE_EXTENSIONS = new Set([
  'PNG',
  'JPG',
  'JPEG',
  'WEBP',
  'GIF',
  'SVG',
  'BMP',
]);

function inferProjectAttachmentIsImage(fileName = '', fileUrl = '', isImage = false) {
  if (isImage) return true;
  const extension = (getFileExtension(fileName) || getFileExtension(fileUrl)).toUpperCase();
  return PROJECT_ATTACHMENT_IMAGE_EXTENSIONS.has(extension);
}

/** Normalize task attachments for UI display using shared file/date utils. */
export function mapProjectTaskAttachments(source) {
  return normalizeTaskAttachments(source).map((attachment) => {
    const fileUrl = attachment.fileUrl ?? '';
    const absoluteFileUrl = fileUrl ? toAbsoluteAttachmentUrl(fileUrl) : '';
    const isImage = inferProjectAttachmentIsImage(
      attachment.fileNameFull || attachment.fileName,
      fileUrl,
      attachment.isImage,
    );

    return {
      id: attachment.id,
      name: attachment.fileName,
      fileName: attachment.fileName,
      fileNameFull: attachment.fileNameFull ?? attachment.fileName,
      size: attachment.size > 0 ? formatFileSize(attachment.size) : '',
      file_size: attachment.size,
      uploadedAt: formatDisplayDateTime(attachment.createdAt) || '—',
      createdAt: attachment.createdAt,
      fileUrl: absoluteFileUrl,
      previewUrl: absoluteFileUrl,
      extension: attachment.extension,
      isImage,
      childRowId: attachment.childRowId,
    };
  });
}

/** Version label from API `display_version`, else legacy numeric fields. */
export function formatProjectTaskVersionLabel(item) {
  const display = String(item?.display_version ?? '').trim();
  if (display) return display;

  const raw = item?.custom_layout_version ?? item?.version;
  if (raw == null || raw === '') return 'V0';
  const normalized = String(raw).trim();
  if (!normalized) return 'V0';
  if (/^v/i.test(normalized)) return normalized;
  return `V${normalized}`;
}

export function sortProjectTaskRowsByRecency(rows = []) {
  return [...(rows ?? [])].sort((left, right) => {
    const leftKey = String(left?.creation ?? left?.modified ?? '');
    const rightKey = String(right?.creation ?? right?.modified ?? '');
    const comparison = rightKey.localeCompare(leftKey);
    if (comparison !== 0) return comparison;
    return String(right?.id ?? '').localeCompare(String(left?.id ?? ''));
  });
}

export function mapProjectTaskListItemToRow(item, { groupId } = {}) {
  const assigneeSource = item.assignee ?? item.assignees ?? [];

  return {
    id: item.name ?? item.layout_id ?? item.id,
    name: item.name ?? item.layout_id ?? item.id,
    title: item.subject ?? '',
    assignees: mapAssignees(assigneeSource),
    floor: item.custom_floor ?? '',
    area: normalizeProjectAreaValue(item.custom_area ?? ''),
    tags: Array.isArray(item.tags) ? item.tags : parseResourceTaskTags(item),
    due_date: formatDateDisplay(item.exp_end_date, '—'),
    exp_end_date: item.exp_end_date ?? '',
    status: normalizeProjectTaskStatus(item.status),
    priority: normalizeProjectTaskPriority(item.priority),
    custom_stage: item.custom_stage ?? null,
    groupId: groupId ?? item.custom_stage ?? null,
    description: item.description ?? '',
    show_warning: item?.show_warning ?? false,
    display_version: item?.display_version ?? '',
    list_display_version: item?.list_display_version ?? item?.display_version ?? '',
    can_acknowledge: item?.can_acknowledge ?? false,
    floor_version_options: Array.isArray(item?.floor_version_options)
      ? item.floor_version_options
      : [],
    warning_reason: item?.warning_reason ?? '',
    parent_version: item?.parent_version ?? null,
    floor_sync: item?.floor_sync ?? item?.custom_floor_sync ?? 0,
    locked_version: item?.locked_version ?? 0,
    creation: item.creation ?? '',
    modified: item.modified ?? '',
  };
}

export function mapProjectTaskDetailToRow(data, listRowFallback = null) {
  const assigneeSource =
    Array.isArray(data?.assignee) && data.assignee.length > 0
      ? data.assignee
      : (listRowFallback?.assignees ?? []).map((entry) => entry.id);

  const merged = {
    ...data,
    assignee: assigneeSource,
    tags: parseResourceTaskTags(data),
  };

  const row = mapProjectTaskListItemToRow(merged, {
    groupId: listRowFallback?.groupId ?? data?.custom_stage ?? null,
  });

  const layout = data?.layout ?? data?.layout_bundle ?? null;

  return {
    ...row,
    description: data?.description ?? '',
    attachments: mapProjectTaskAttachments(data),
    layout,
    layout_bundle: data?.layout_bundle ?? layout,
    marker_coordinates: resolveProjectTaskMarkerCoordinates(data),
    area_label: data?.area_label ?? '',
    area_type: data?.area_type ?? '',
    area_color: data?.area_color ?? '',
    groupId: listRowFallback?.groupId ?? row.custom_stage ?? row.groupId,
  };
}

/** Resolve `{ x, y }` marker coordinates from task detail payload. */
export function resolveProjectTaskMarkerCoordinates(task) {
  const raw = task?.marker_coordinates ?? task?.custom_marker_coordinates ?? null;
  if (!raw || typeof raw !== 'object') return null;
  const x = Number(raw.x);
  const y = Number(raw.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

/** Build floor layout preview object from task detail `layout` / `layout_bundle`. */
export function buildProjectTaskLayoutPreview(task) {
  const layoutSource = task?.layout ?? task?.layout_bundle ?? null;
  if (!layoutSource || typeof layoutSource !== 'object') return null;

  const layoutImage = String(layoutSource.layout_image ?? '').trim();
  if (!layoutImage) return null;

  const layoutId = String(layoutSource.layout_id ?? '').trim();
  const floor = String(layoutSource.floor ?? task?.floor ?? '').trim();

  return {
    name: layoutId || floor,
    id: layoutId || floor,
    floor,
    layout_id: layoutId,
    layout_image: layoutImage,
    layout_type: layoutSource.layout_type ?? '',
    subject: layoutSource.subject ?? '',
    areas: Array.isArray(layoutSource.areas) ? layoutSource.areas : [],
  };
}

export function mapProjectTasksListviewToGroups(data) {
  if (!data) return [];

  if (Array.isArray(data.groups)) {
    return data.groups.map((group) => ({
      id: String(group.group_value ?? 'Unassigned'),
      rows: sortProjectTaskRowsByRecency(
        (group.items ?? []).map((item) =>
          mapProjectTaskListItemToRow(item, { groupId: group.group_value ?? 'Unassigned' }),
        ),
      ),
    }));
  }

  if (Array.isArray(data.results)) {
    return [
      {
        id: 'All',
        rows: sortProjectTaskRowsByRecency(
          data.results.map((item) => mapProjectTaskListItemToRow(item, { groupId: 'All' })),
        ),
      },
    ];
  }

  return [];
}

export function buildProjectTasksGroupByParam(groupBy, groupOrder = 'asc') {
  const field = PROJECT_TASKS_GROUP_BY_API_MAP[groupBy];
  if (!field) return '';
  const direction = groupOrder === 'desc' ? 'desc' : 'asc';
  return `${field} ${direction}`;
}

export function buildProjectTasksListviewFilters(selectedFilters = {}) {
  const filters = [];

  if (selectedFilters.stage?.length) {
    filters.push(['custom_stage', 'in', selectedFilters.stage]);
  }

  if (selectedFilters.status?.length) {
    filters.push(['status', 'in', selectedFilters.status]);
  }

  if (selectedFilters.assignee?.length) {
    filters.push(['assignee', 'in', selectedFilters.assignee]);
  }

  return filters;
}

export function getProjectTaskRowFieldValue(row, fieldName) {
  if (!row) return '';

  switch (fieldName) {
    case 'title':
    case 'subject':
      return row.title ?? row.subject ?? '';
    case 'description':
      return row.description ?? '';
    case 'status':
      return row.status ?? '';
    case 'priority':
      return row.priority ?? '';
    case 'floor':
    case 'custom_floor':
      return row.floor ?? row.custom_floor ?? '';
    case 'area':
    case 'custom_area':
      return row.area ?? row.custom_area ?? '';
    case 'custom_stage':
    case 'groupId':
      return row.custom_stage ?? row.groupId ?? '';
    case 'layout_type':
    case 'custom_layout_type':
      return row.layout_type ?? row.custom_layout_type ?? '';
    case 'due_date':
    case 'exp_end_date':
      return row.exp_end_date ?? row.due_date ?? '';
    case 'assigned_to':
    case 'assignees':
      return joinAssigneeIds(
        (row.assignees ?? []).map((entry) => entry.id ?? entry.value ?? entry),
      );
    case 'tags':
      return JSON.stringify(row.tags ?? []);
    default:
      return row[fieldName] ?? '';
  }
}

export function projectTaskFieldValuesEqual(fieldName, left, right) {
  if (fieldName === 'assigned_to' || fieldName === 'assignees') {
    const leftIds = joinAssigneeIds(Array.isArray(left) ? left : left ? [left] : []);
    const rightIds = joinAssigneeIds(Array.isArray(right) ? right : right ? [right] : []);
    return leftIds === rightIds;
  }

  if (fieldName === 'tags') {
    const leftTags = Array.isArray(left) ? left : JSON.parse(left || '[]');
    const rightTags = Array.isArray(right) ? right : JSON.parse(right || '[]');
    return JSON.stringify(leftTags) === JSON.stringify(rightTags);
  }

  if (fieldName === 'due_date' || fieldName === 'exp_end_date') {
    return formatDateToYYYYMMDD(left) === formatDateToYYYYMMDD(right);
  }

  return String(left ?? '') === String(right ?? '');
}

export function buildProjectTaskUpdateFormData(taskId, fieldName, value) {
  const form = new FormData();
  form.append('task_id', taskId);

  switch (fieldName) {
    case 'title':
    case 'subject':
      form.append('subject', String(value ?? '').trim());
      break;
    case 'description':
      form.append('description', value ?? '');
      break;
    case 'status':
      form.append('status', denormalizeProjectTaskStatus(value));
      break;
    case 'priority':
      form.append('priority', denormalizeProjectTaskPriority(value));
      break;
    case 'floor':
    case 'custom_floor':
      form.append('custom_floor', value ?? '');
      break;
    case 'area':
    case 'custom_area':
      form.append('custom_area', value ?? '');
      break;
    case 'custom_stage':
    case 'groupId':
      form.append('custom_stage', value ?? '');
      break;
    case 'layout_type':
    case 'custom_layout_type':
      form.append('custom_layout_type', value ?? '');
      break;
    case 'due_date':
    case 'exp_end_date': {
      const date = parseToDate(value);
      form.append('exp_end_date', date ? formatDateToYYYYMMDD(date) : '');
      break;
    }
    case 'assigned_to':
    case 'assignees':
      form.append('assignees', JSON.stringify(normalizeAssignees(value)));
      break;
    case 'tags':
      form.append('tags', JSON.stringify(Array.isArray(value) ? value.filter(Boolean) : []));
      break;
    default:
      form.append(fieldName, value ?? '');
  }

  return form;
}

export function patchProjectTaskRow(row, fieldName, value) {
  if (!row) return row;

  const next = { ...row };

  switch (fieldName) {
    case 'title':
    case 'subject':
      next.title = String(value ?? '').trim();
      break;
    case 'description':
      next.description = value ?? '';
      break;
    case 'status':
      next.status = normalizeProjectTaskStatus(value);
      break;
    case 'priority':
      next.priority = normalizeProjectTaskPriority(value);
      break;
    case 'floor':
    case 'custom_floor':
      next.floor = value ?? '';
      break;
    case 'area':
    case 'custom_area':
      next.area = value ?? '';
      break;
    case 'custom_stage':
    case 'groupId':
      next.custom_stage = value ?? '';
      next.groupId = value ?? '';
      break;
    case 'layout_type':
    case 'custom_layout_type':
      next.layout_type = value ?? '';
      next.custom_layout_type = value ?? '';
      break;
    case 'due_date':
    case 'exp_end_date': {
      const date = parseToDate(value);
      next.exp_end_date = date ? formatDateToYYYYMMDD(date) : '';
      next.due_date = formatDateDisplay(next.exp_end_date, '—');
      break;
    }
    case 'assigned_to':
    case 'assignees': {
      const ids = normalizeAssignees(value);
      next.assignees = mapAssignees(ids);
      break;
    }
    case 'tags':
      next.tags = Array.isArray(value) ? value.filter(Boolean) : [];
      break;
    default:
      next[fieldName] = value;
  }

  return next;
}

const PROJECT_TASK_CREATE_PRIORITY_TO_API = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** Multipart field name for task file uploads (create/update). Responses use `attachments`. */
export const PROJECT_TASK_UPLOAD_FIELD = 'files';

export function appendProjectTaskFilesToFormData(formData, attachments = []) {
  (attachments ?? []).forEach((attachment) => {
    if (attachment?.file) {
      formData.append(PROJECT_TASK_UPLOAD_FIELD, attachment.file);
    }
  });
}

/** Append `{ x, y }` marker payload for project task create APIs. */
export function appendProjectTaskMarkerCoordinatesToFormData(formData, markerCoordinates) {
  if (!markerCoordinates || typeof markerCoordinates !== 'object') return;
  const x = Number(markerCoordinates.x);
  const y = Number(markerCoordinates.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  formData.append('marker_coordinates', JSON.stringify({ x, y }));
}

/** Build multipart FormData to append files to an existing project task. */
export function buildProjectTaskUploadFilesFormData(taskId, files = []) {
  const formData = new FormData();
  formData.append('task_id', String(taskId ?? '').trim());
  appendProjectTaskFilesToFormData(formData, files);
  return formData;
}

/** Build multipart FormData for `create_project_task` API. */
export function buildProjectTaskCreateFormData(
  projectId,
  values,
  attachments = [],
  markerCoordinates = null,
) {
  const formData = new FormData();
  const project = String(projectId ?? '').trim();

  formData.append('project', project);
  formData.append('type', 'Project Tasks');
  formData.append('subject', String(values.subject ?? '').trim());
  formData.append('description', values.description ?? '');
  formData.append('status', denormalizeProjectTaskStatus(values.status ?? 'Pending'));
  formData.append(
    'priority',
    PROJECT_TASK_CREATE_PRIORITY_TO_API[values.priority] ?? values.priority ?? 'Medium',
  );
  formData.append('custom_floor', values.floor ?? '');
  formData.append('custom_area', values.area ?? '');
  formData.append('custom_stage', values.custom_stage ?? '');

  const dueDate = parseToDate(values.due_date);
  formData.append('exp_end_date', dueDate ? formatDateToYYYYMMDD(dueDate) : '');

  const assigneeIds = normalizeAssignees(values.assignees);
  formData.append('assignees', JSON.stringify(assigneeIds));
  formData.append(
    'tags',
    JSON.stringify(Array.isArray(values.tags) ? values.tags.filter(Boolean) : []),
  );

  appendProjectTaskFilesToFormData(formData, attachments);
  appendProjectTaskMarkerCoordinatesToFormData(formData, markerCoordinates);

  return formData;
}
