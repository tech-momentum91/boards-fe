import {
  appendProjectTaskFilesToFormData,
  appendProjectTaskMarkerCoordinatesToFormData,
  buildProjectTaskUpdateFormData,
  buildProjectTaskUploadFilesFormData,
  denormalizeProjectTaskPriority,
  denormalizeProjectTaskStatus,
  formatProjectTaskVersionLabel,
  getProjectTaskRowFieldValue,
  mapProjectTaskDetailToRow,
  mapProjectTaskListItemToRow,
  normalizeProjectTaskStatus,
  patchProjectTaskRow,
  projectTaskFieldValuesEqual,
} from '@/components/projects/tasks/project-task-helpers';
import { formatAttachmentNameForCard } from '@/components/projects/shared/project-attachment-display-utils';
import { toAbsoluteAttachmentUrl } from '@/lib/utils';
import { formatDateToYYYYMMDD, formatDisplayDateTime, parseToDate } from '@/utils/date-utils';
import { formatFileSize } from '@/utils/file-utils';
import { normalizeAssignees } from '@/utils/task-utils';

export const PROJECT_THREE_D_GALLERY_PAGE_SIZE = 20;

export const PROJECT_THREE_D_GROUP_BY_API_MAP = {
  floor: 'custom_floor',
  status: 'status',
  priority: 'priority',
};

export function mapProjectThreeDListItemToRow(item, { groupId } = {}) {
  const row = mapProjectTaskListItemToRow(item, { groupId });
  const versions = Array.isArray(item.versions)
    ? item.versions.map((version) => mapProjectThreeDListItemToRow(version, { groupId }))
    : [];

  return {
    ...row,
    status: normalizeProjectTaskStatus(item.status ?? row.status),
    version: formatProjectTaskVersionLabel(item),
    versions,
  };
}

export function mapProjectThreeDDetailToRow(data, listRowFallback = null) {
  const row = mapProjectTaskDetailToRow(data, listRowFallback);

  return {
    ...row,
    status: normalizeProjectTaskStatus(data?.status ?? listRowFallback?.status ?? row.status),
    version: listRowFallback?.version ?? data?.version ?? 'V1',
    groupId: listRowFallback?.groupId ?? data?.custom_floor ?? row.groupId,
  };
}

export function mapProjectThreeDListviewToGroups(data) {
  if (!data) return [];

  if (Array.isArray(data.groups)) {
    return data.groups.map((group) => ({
      id: String(group.group_value ?? 'Unassigned'),
      rows: (group.items ?? []).map((item) =>
        mapProjectThreeDListItemToRow(item, { groupId: group.group_value ?? 'Unassigned' }),
      ),
    }));
  }

  if (Array.isArray(data.results)) {
    return [
      {
        id: 'All',
        rows: data.results.map((item) => mapProjectThreeDListItemToRow(item, { groupId: 'All' })),
      },
    ];
  }

  return [];
}

export function buildProjectThreeDGroupByParam(groupBy, groupOrder = 'asc') {
  const field = PROJECT_THREE_D_GROUP_BY_API_MAP[groupBy];
  if (!field) return '';
  const direction = groupOrder === 'desc' ? 'desc' : 'asc';
  return `${field} ${direction}`;
}

export function buildProjectThreeDListviewFilters(selectedFilters = {}, floorFilter = 'all') {
  const filters = [];

  if (selectedFilters.area?.length) {
    filters.push(['custom_area', 'in', selectedFilters.area]);
  }

  if (selectedFilters.status?.length) {
    filters.push([
      'status',
      'in',
      selectedFilters.status.map((value) => denormalizeProjectTaskStatus(value)),
    ]);
  }

  if (selectedFilters.priority?.length) {
    filters.push([
      'priority',
      'in',
      selectedFilters.priority.map((value) => denormalizeProjectTaskPriority(value)),
    ]);
  }

  if (selectedFilters.assignee?.length) {
    filters.push(['assignee', 'in', selectedFilters.assignee]);
  }

  if (floorFilter && floorFilter !== 'all') {
    filters.push(['custom_floor', '=', floorFilter]);
  }

  return filters;
}

export function collectThreeDAssigneeFilterOptions(rows = []) {
  const seen = new Map();

  (rows ?? []).forEach((row) => {
    (row.assignees ?? []).forEach((assignee) => {
      const value = String(
        assignee.id ?? assignee.value ?? assignee.email ?? assignee.user ?? '',
      ).trim();
      if (!value || seen.has(value)) return;
      seen.set(value, {
        value,
        label: assignee.label ?? assignee.full_name ?? assignee.name ?? value,
      });
    });
  });

  return [...seen.values()].sort((left, right) => left.label.localeCompare(right.label));
}

export function getProjectThreeDRowFieldValue(row, fieldName) {
  if (fieldName === 'title') {
    return row?.title ?? row?.subject ?? '';
  }
  return getProjectTaskRowFieldValue(row, fieldName);
}

export function projectThreeDFieldValuesEqual(fieldName, left, right) {
  return projectTaskFieldValuesEqual(fieldName, left, right);
}

export function buildProjectThreeDUpdateFormData(taskId, fieldName, value) {
  return buildProjectTaskUpdateFormData(taskId, fieldName, value);
}

/** Build multipart FormData for `create_new_version` API (3D / layout version uploads). */
export function buildProjectThreeDNewVersionFormData(taskId, files = []) {
  const formData = new FormData();
  formData.append('task_id', String(taskId ?? '').trim());
  appendProjectTaskFilesToFormData(formData, files);
  return formData;
}

/** @deprecated Use buildProjectTaskUploadFilesFormData */
export function buildProjectThreeDUploadFilesFormData(taskId, files = []) {
  return buildProjectTaskUploadFilesFormData(taskId, files);
}

/** Build multipart FormData for `create_project_task` API (3D Tasks). */
export function buildProjectThreeDCreateFormData(
  projectId,
  values,
  attachments = [],
  markerCoordinates = null,
) {
  const formData = new FormData();
  const project = String(projectId ?? '').trim();

  formData.append('project', project);
  formData.append('type', '3D Tasks');
  formData.append('subject', String(values.title ?? values.subject ?? '').trim());
  formData.append('description', values.description ?? '');
  formData.append('status', denormalizeProjectTaskStatus(values.status ?? 'Pending'));
  formData.append('priority', denormalizeProjectTaskPriority(values.priority ?? 'Low'));
  formData.append('custom_floor', values.floor ?? '');
  formData.append('custom_area', values.area ?? '');

  const dueDate = parseToDate(values.due_date);
  formData.append('exp_end_date', dueDate ? formatDateToYYYYMMDD(dueDate) : '');

  formData.append('assignees', JSON.stringify(normalizeAssignees(values.assignees)));
  formData.append(
    'tags',
    JSON.stringify(Array.isArray(values.tags) ? values.tags.filter(Boolean) : []),
  );

  appendProjectTaskFilesToFormData(formData, attachments);
  appendProjectTaskMarkerCoordinatesToFormData(formData, markerCoordinates);

  return formData;
}

export function patchProjectThreeDRow(row, fieldName, value) {
  return patchProjectTaskRow(row, fieldName, value);
}

export function threeDGroupBadgeColor(groupId) {
  const normalized = String(groupId ?? '').trim();
  if (!normalized || normalized === 'Unassigned') return 'gray';
  return 'blue';
}

function normalizeThreeDVersionLabel(version) {
  const raw = String(version ?? '1').trim();
  if (!raw) return 'V1';
  if (raw.toUpperCase().startsWith('V')) return raw.toUpperCase();
  const numeric = Number.parseInt(raw, 10);
  return Number.isFinite(numeric) && numeric > 0 ? `V${numeric}` : 'V1';
}

function mapThreeDGalleryImageToAttachment(image, version) {
  if (!image?.file_url) return null;

  const { fileName, fileNameFull } = formatAttachmentNameForCard(image.file_name);
  const fileUrl = toAbsoluteAttachmentUrl(image.file_url);

  return {
    id: image.name,
    name: fileName,
    fileName,
    fileNameFull,
    previewUrl: fileUrl,
    fileUrl,
    size: image.file_size ? formatFileSize(image.file_size) : '',
    uploadedAt: formatDisplayDateTime(image.creation) || '—',
    version: normalizeThreeDVersionLabel(version),
    childRowId: image.name,
  };
}

/** Map a gallery listview row (latest version + cover image) to a gallery card task. */
export function mapProjectThreeDGalleryListItem(item) {
  const version = normalizeThreeDVersionLabel(item?.custom_layout_version);
  const coverAttachment = mapThreeDGalleryImageToAttachment(
    item?.image,
    item?.custom_layout_version,
  );

  return {
    taskId: item?.name ?? '',
    title: item?.subject ?? '',
    floor: item?.custom_floor ?? '',
    area: item?.custom_area ?? '',
    status: normalizeProjectTaskStatus(item?.status),
    latestVersion: version,
    totalVersions: item?.total_versions ?? 1,
    coverAttachment,
    latestVersionAttachmentCount: coverAttachment ? 1 : 0,
    showWarning: item?.show_warning === true,
    canAcknowledge: item?.can_acknowledge === true,
    floorVersionOptions: Array.isArray(item?.floor_version_options)
      ? item.floor_version_options
      : [],
    tags: Array.isArray(item?.tags) ? item.tags : [],
    assignees: Array.isArray(item?.assignee) ? item.assignee : [],
  };
}

/** Map gallery listview API payload to card tasks + pagination meta. */
export function mapProjectThreeDGalleryListResponse(data) {
  const results = Array.isArray(data?.results) ? data.results : [];

  return {
    tasks: results.map(mapProjectThreeDGalleryListItem),
    page: data?.page ?? 1,
    totalPages: Math.max(1, data?.total_pages ?? 1),
    totalCount: data?.total_count ?? results.length,
    hasMore: Boolean(data?.has_more),
  };
}

/** Map versioned images API payload to gallery preview task shape. */
export function mapProjectThreeDVersionedImagesToGalleryTask(data, summary = {}) {
  const versions = Array.isArray(data?.versions) ? data.versions : [];
  let versionGroups = versions.map((entry) => ({
    taskId: entry?.task_id ?? '',
    version: normalizeThreeDVersionLabel(entry?.version),
    status: normalizeProjectTaskStatus(entry?.status),
    attachments: (entry?.images ?? [])
      .map((image) => mapThreeDGalleryImageToAttachment(image, entry?.version))
      .filter(Boolean),
  }));

  const focusTaskId = String(summary.focusVersionTaskId ?? summary.taskId ?? '').trim();
  const lockToMatchedVersion = Boolean(summary.lockToMatchedVersion && focusTaskId);
  if (lockToMatchedVersion) {
    const matched = versionGroups.filter((group) => group.taskId === focusTaskId);
    if (matched.length > 0) {
      versionGroups = matched;
    }
  } else if (Array.isArray(summary.statusFilter) && summary.statusFilter.length > 0) {
    const allowed = new Set(
      summary.statusFilter.map((status) => normalizeProjectTaskStatus(status)),
    );
    const matched = versionGroups.filter((group) => allowed.has(group.status));
    if (matched.length > 0) {
      versionGroups = matched;
    }
  }

  const latestGroup = versionGroups[versionGroups.length - 1];
  const allAttachments = versionGroups.flatMap((group) => group.attachments);

  return {
    taskId: data?.task_id ?? summary.taskId ?? '',
    title: summary.title ?? '',
    floor: summary.floor ?? '',
    area: summary.area ?? '',
    status: summary.status ?? latestGroup?.status ?? '',
    latestVersion: latestGroup?.version ?? summary.latestVersion ?? 'V1',
    totalVersions: data?.total_versions ?? versionGroups.length,
    versionGroups,
    attachments: allAttachments,
    coverAttachment: latestGroup?.attachments?.[0] ?? summary.coverAttachment ?? null,
    latestVersionAttachmentCount: latestGroup?.attachments?.length ?? 0,
    focusVersionTaskId: focusTaskId || null,
    lockToMatchedVersion,
  };
}
