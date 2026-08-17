import {
  appendProjectTaskFilesToFormData,
  appendProjectTaskMarkerCoordinatesToFormData,
  buildProjectTaskUpdateFormData,
  denormalizeProjectTaskPriority,
  denormalizeProjectTaskStatus,
  getProjectTaskRowFieldValue,
  formatProjectTaskVersionLabel,
  mapProjectTaskDetailToRow,
  mapProjectTaskListItemToRow,
  normalizeProjectTaskStatus,
  patchProjectTaskRow,
  projectTaskFieldValuesEqual,
} from '@/components/projects/tasks/project-task-helpers';
import { formatDateToYYYYMMDD, parseToDate } from '@/utils/date-utils';
import { normalizeAssignees } from '@/utils/task-utils';

export const PROJECT_GFC_GROUP_BY_API_MAP = {
  floor: 'custom_floor',
  status: 'status',
  priority: 'priority',
};

export function mapProjectGfcListItemToRow(item, { groupId } = {}) {
  const row = mapProjectTaskListItemToRow(item, { groupId });
  const versions = Array.isArray(item.versions)
    ? item.versions.map((version) => mapProjectGfcListItemToRow(version, { groupId }))
    : [];

  return {
    ...row,
    status: normalizeProjectTaskStatus(item.status ?? row.status),
    version: formatProjectTaskVersionLabel(item),
    versions,
  };
}

export function mapProjectGfcDetailToRow(data, listRowFallback = null) {
  const row = mapProjectTaskDetailToRow(data, listRowFallback);

  return {
    ...row,
    status: normalizeProjectTaskStatus(data?.status ?? listRowFallback?.status ?? row.status),
    version: formatProjectTaskVersionLabel(data),
    groupId: listRowFallback?.groupId ?? data?.custom_floor ?? row.groupId,
  };
}

export function mapProjectGfcListviewToGroups(data) {
  if (!data) return [];

  if (Array.isArray(data.groups)) {
    return data.groups.map((group) => ({
      id: String(group.group_value ?? 'Unassigned'),
      rows: (group.items ?? []).map((item) =>
        mapProjectGfcListItemToRow(item, { groupId: group.group_value ?? 'Unassigned' }),
      ),
    }));
  }

  if (Array.isArray(data.results)) {
    return [
      {
        id: 'All',
        rows: data.results.map((item) => mapProjectGfcListItemToRow(item, { groupId: 'All' })),
      },
    ];
  }

  return [];
}

export function buildProjectGfcGroupByParam(groupBy, groupOrder = 'asc') {
  const field = PROJECT_GFC_GROUP_BY_API_MAP[groupBy];
  if (!field) return '';
  const direction = groupOrder === 'desc' ? 'desc' : 'asc';
  return `${field} ${direction}`;
}

export function buildProjectGfcListviewFilters(selectedFilters = {}, floorFilter = 'all') {
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

export function getProjectGfcRowFieldValue(row, fieldName) {
  if (fieldName === 'title') {
    return row?.title ?? row?.subject ?? '';
  }
  return getProjectTaskRowFieldValue(row, fieldName);
}

export function projectGfcFieldValuesEqual(fieldName, left, right) {
  return projectTaskFieldValuesEqual(fieldName, left, right);
}

export function buildProjectGfcUpdateFormData(taskId, fieldName, value) {
  return buildProjectTaskUpdateFormData(taskId, fieldName, value);
}

/** Build multipart FormData for `create_project_task` API (GFC Tasks). */
export function buildProjectGfcCreateFormData(
  projectId,
  values,
  attachments = [],
  markerCoordinates = null,
) {
  const formData = new FormData();
  const project = String(projectId ?? '').trim();

  formData.append('project', project);
  formData.append('type', 'GFC Tasks');
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

export function patchProjectGfcRow(row, fieldName, value) {
  return patchProjectTaskRow(row, fieldName, value);
}

export function gfcGroupBadgeColor(groupId) {
  const normalized = String(groupId ?? '').trim();
  if (!normalized || normalized === 'Unassigned') return 'gray';
  return 'blue';
}
