import {
  appendProjectTaskFilesToFormData,
  buildProjectTaskUpdateFormData,
  denormalizeProjectTaskPriority,
  denormalizeProjectTaskStatus,
  getProjectTaskRowFieldValue,
  mapProjectTaskDetailToRow,
  mapProjectTaskListItemToRow,
  normalizeProjectTaskStatus,
  patchProjectTaskRow,
  projectTaskFieldValuesEqual,
} from '@/components/projects/tasks/project-task-helpers';
import { formatDateToYYYYMMDD, parseToDate } from '@/utils/date-utils';

export const PROJECT_DOCUMENT_GROUP_BY_API_MAP = {
  category: 'custom_document_category',
  status: 'status',
  priority: 'priority',
};

export function normalizeProjectDocumentStatus(status) {
  return normalizeProjectTaskStatus(status);
}

export function mapProjectDocumentListItemToRow(item, { groupId } = {}) {
  const row = mapProjectTaskListItemToRow(item, { groupId });

  return {
    ...row,
    status: normalizeProjectDocumentStatus(item.status),
    category: item.custom_document_category ?? '',
    custom_document_category: item.custom_document_category ?? '',
  };
}

export function mapProjectDocumentDetailToRow(data, listRowFallback = null) {
  const row = mapProjectTaskDetailToRow(data, listRowFallback);
  return {
    ...row,
    status: normalizeProjectDocumentStatus(data?.status ?? listRowFallback?.status),
    category: data?.custom_document_category ?? listRowFallback?.category ?? '',
    custom_document_category:
      data?.custom_document_category ?? listRowFallback?.custom_document_category ?? '',
    groupId: listRowFallback?.groupId ?? data?.custom_document_category ?? row.groupId,
  };
}

export function mapProjectDocumentsListviewToGroups(data) {
  if (!data) return [];

  if (Array.isArray(data.groups)) {
    return data.groups.map((group) => ({
      id: String(group.group_value ?? 'Unassigned'),
      rows: (group.items ?? []).map((item) =>
        mapProjectDocumentListItemToRow(item, { groupId: group.group_value ?? 'Unassigned' }),
      ),
    }));
  }

  if (Array.isArray(data.results)) {
    return [
      {
        id: 'All',
        rows: data.results.map((item) => mapProjectDocumentListItemToRow(item, { groupId: 'All' })),
      },
    ];
  }

  return [];
}

export function buildProjectDocumentsGroupByParam(groupBy, groupOrder = 'asc') {
  const field = PROJECT_DOCUMENT_GROUP_BY_API_MAP[groupBy];
  if (!field) return '';
  const direction = groupOrder === 'desc' ? 'desc' : 'asc';
  return `${field} ${direction}`;
}

export function buildProjectDocumentsListviewFilters(selectedFilters = {}) {
  const filters = [];

  if (selectedFilters.category?.length) {
    filters.push(['custom_document_category', 'in', selectedFilters.category]);
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

  return filters;
}

export function getProjectDocumentRowFieldValue(row, fieldName) {
  if (fieldName === 'category' || fieldName === 'custom_document_category') {
    return row.custom_document_category ?? row.category ?? '';
  }
  if (fieldName === 'title') {
    return row.title ?? row.subject ?? '';
  }
  return getProjectTaskRowFieldValue(row, fieldName);
}

export function projectDocumentFieldValuesEqual(fieldName, left, right) {
  return projectTaskFieldValuesEqual(fieldName, left, right);
}

export function buildProjectDocumentUpdateFormData(taskId, fieldName, value) {
  if (fieldName === 'category' || fieldName === 'custom_document_category') {
    const form = new FormData();
    form.append('task_id', taskId);
    form.append('custom_document_category', value ?? '');
    return form;
  }
  return buildProjectTaskUpdateFormData(taskId, fieldName, value);
}

export function patchProjectDocumentRow(row, fieldName, value) {
  const next = patchProjectTaskRow(row, fieldName, value);
  if (fieldName === 'category' || fieldName === 'custom_document_category') {
    next.category = value ?? '';
    next.custom_document_category = value ?? '';
  }
  return next;
}

export function buildProjectDocumentCreateFormData(projectId, values, attachments = []) {
  const formData = new FormData();
  const project = String(projectId ?? '').trim();

  formData.append('project', project);
  formData.append('type', 'Document Tasks');
  formData.append('subject', String(values.title ?? values.subject ?? '').trim());
  formData.append('description', values.description ?? '');
  formData.append('status', denormalizeProjectTaskStatus(values.status ?? 'Pending'));

  const priorityApi =
    values.priority === 'high' ? 'High' : values.priority === 'medium' ? 'Medium' : 'Low';
  formData.append('priority', priorityApi);
  formData.append('custom_document_category', values.category ?? '');

  const dueDate = parseToDate(values.due_date);
  formData.append('exp_end_date', dueDate ? formatDateToYYYYMMDD(dueDate) : '');

  const assignees = values.assignees ?? (values.assigneeId ? [values.assigneeId] : []);
  formData.append('assignees', JSON.stringify(assignees));

  formData.append(
    'tags',
    JSON.stringify(Array.isArray(values.tags) ? values.tags.filter(Boolean) : []),
  );

  appendProjectTaskFilesToFormData(formData, attachments);

  return formData;
}

export function documentGroupBadgeColor(groupId) {
  const normalized = String(groupId ?? '').toLowerCase();
  if (normalized.includes('sales')) return 'blue';
  if (normalized.includes('plan')) return 'purple';
  if (normalized.includes('procure')) return 'orange';
  if (normalized.includes('exec')) return 'green';
  return 'gray';
}
