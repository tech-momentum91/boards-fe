import { sanitizeUnsignedIntegerInput } from '@/components/client-onboarding/task-view-drawer-utils';
import {
  joinAssigneeIds,
  normalizeAssignees,
  normalizeTaskAssigneeEntry,
} from '@/utils/task-utils';

export const TASK_MASTER_FILTER_ALL = 'all';

const TASK_MASTER_GROUP_VALUE_API_FIELD = {
  stage: 'stage',
  status: 'status',
  priority: 'priority',
  layout_type: 'layout_type',
  category: 'document_category',
};

export function getTaskMasterRowGroupValue(row, groupBy) {
  switch (groupBy) {
    case 'stage':
      return row?.stage || 'Unassigned';
    case 'status':
      return row?.status || 'Unassigned';
    case 'priority':
      return row?.priority || 'Unassigned';
    case 'layout_type':
      return row?.layout_type || row?.custom_layout_type || 'Unassigned';
    case 'category':
      return row?.document_category || row?.category || 'Unassigned';
    default:
      return 'All';
  }
}

export function groupTaskMasterRows(rows, groupBy, groupOrder = 'asc') {
  if (!groupBy) {
    return [{ id: 'All', rows }];
  }

  const groupMap = new Map();
  for (const row of rows) {
    const key = getTaskMasterRowGroupValue(row, groupBy);
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key).push(row);
  }

  const keys = [...groupMap.keys()].sort((left, right) => {
    const comparison = String(left).localeCompare(String(right), undefined, {
      sensitivity: 'base',
    });
    return groupOrder === 'desc' ? -comparison : comparison;
  });

  return keys.map((key) => ({ id: key, rows: groupMap.get(key) }));
}

export function buildTaskMasterListFilters({
  groupBy = '',
  groupValueFilter = TASK_MASTER_FILTER_ALL,
  selectedFilters = {},
} = {}) {
  const filters = [];

  if (groupBy && groupValueFilter && groupValueFilter !== TASK_MASTER_FILTER_ALL) {
    const apiField = TASK_MASTER_GROUP_VALUE_API_FIELD[groupBy];
    if (apiField) {
      filters.push([apiField, '=', groupValueFilter]);
    }
  }

  for (const [field, values] of Object.entries(selectedFilters)) {
    if (!Array.isArray(values) || values.length === 0) continue;
    if (field === groupBy) continue;

    const apiField = field === 'category' ? 'document_category' : field;
    if (values.length === 1) {
      filters.push([apiField, '=', values[0]]);
    } else {
      filters.push([apiField, 'in', values]);
    }
  }

  return filters;
}

export function buildProjectTaskFieldFormData(taskId, fieldName, value) {
  const form = new FormData();
  form.append('task_id', taskId);
  form.append('task_type', 'Project Tasks');

  if (fieldName === 'assigned_to') {
    const assignees = normalizeAssignees(value).map((assignee) => ({
      assignee_type: 'Role',
      assignee,
    }));
    form.append('assignees', JSON.stringify(assignees));
    return form;
  }

  if (fieldName === 'tags') {
    form.append('tags', JSON.stringify(Array.isArray(value) ? value.filter(Boolean) : []));
    return form;
  }

  if (fieldName === 'duration') {
    form.append('duration', value != null && value !== '' ? String(value) : '');
    return form;
  }

  form.append(fieldName, value ?? '');
  return form;
}

export function buildProjectLayoutFieldFormData(layoutId, fieldName, value) {
  const form = new FormData();
  form.append('task_id', layoutId);
  form.append('type', 'Layout Tasks');

  if (fieldName === 'task_name') {
    form.append('subject', value ?? '');
    return form;
  }

  if (fieldName === 'assignee') {
    const assignees = normalizeAssignees(value).map((assignee) => ({
      assignee_type: 'Role',
      assignee,
    }));
    form.append('assignees', JSON.stringify(assignees));
    return form;
  }

  if (fieldName === 'tags') {
    form.append('tags', JSON.stringify(Array.isArray(value) ? value.filter(Boolean) : []));
    return form;
  }

  if (fieldName === 'duration') {
    form.append('duration', value != null && value !== '' ? String(value) : '');
    return form;
  }

  form.append(fieldName, value ?? '');
  return form;
}

export function getTaskRowFieldValue(task, fieldName) {
  if (!task) return '';

  if (fieldName === 'task_name') return task.task_name ?? task.subject ?? '';

  if (fieldName === 'assigned_to') {
    const rows = task.assignees ?? task.assignee;
    if (!rows) return [];
    const list = Array.isArray(rows) ? rows : [rows];
    return list.map((entry) => normalizeTaskAssigneeEntry(entry)).filter(Boolean);
  }

  if (fieldName === 'duration') {
    return task.duration != null && task.duration !== '' ? String(task.duration) : '';
  }

  if (fieldName === 'tags') {
    if (Array.isArray(task.tags) && task.tags.length > 0) {
      return task.tags.map((tag) => String(tag).trim()).filter(Boolean);
    }
    if (typeof task._user_tags === 'string' && task._user_tags.trim()) {
      return task._user_tags
        .split(',')
        .map((tag) => String(tag).trim())
        .filter(Boolean);
    }
    return [];
  }

  return task[fieldName] ?? '';
}

export function getLayoutRowFieldValue(layout, fieldName) {
  if (!layout) return fieldName === 'tags' || fieldName === 'assignee' ? [] : '';

  if (fieldName === 'tags') {
    if (Array.isArray(layout.tags)) {
      return layout.tags.map((tag) => String(tag).trim()).filter(Boolean);
    }
    if (typeof layout._user_tags === 'string' && layout._user_tags.trim()) {
      return layout._user_tags
        .split(',')
        .map((tag) => String(tag).trim())
        .filter(Boolean);
    }
    return [];
  }

  if (fieldName === 'assignee') {
    if (!layout.assignee) return [];
    const list = Array.isArray(layout.assignee) ? layout.assignee : [layout.assignee];
    return list.map((entry) => normalizeTaskAssigneeEntry(entry)).filter(Boolean);
  }

  if (fieldName === 'duration') {
    return layout.duration != null && layout.duration !== '' ? String(layout.duration) : '';
  }

  return layout[fieldName] ?? '';
}

function tagsKey(tags) {
  return (Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .sort()
    .join('|');
}

export function taskFieldValuesEqual(fieldName, left, right) {
  if (fieldName === 'assigned_to') {
    return joinAssigneeIds(normalizeAssignees(left)) === joinAssigneeIds(normalizeAssignees(right));
  }

  if (fieldName === 'tags') {
    return tagsKey(left) === tagsKey(right);
  }

  if (fieldName === 'duration') {
    return (
      sanitizeUnsignedIntegerInput(String(left ?? '').trim()) ===
      sanitizeUnsignedIntegerInput(String(right ?? '').trim())
    );
  }

  return String(left ?? '').trim() === String(right ?? '').trim();
}

export function layoutFieldValuesEqual(fieldName, left, right) {
  if (fieldName === 'assignee') {
    return joinAssigneeIds(normalizeAssignees(left)) === joinAssigneeIds(normalizeAssignees(right));
  }

  if (fieldName === 'tags') {
    return tagsKey(left) === tagsKey(right);
  }

  if (fieldName === 'duration') {
    return (
      sanitizeUnsignedIntegerInput(String(left ?? '').trim()) ===
      sanitizeUnsignedIntegerInput(String(right ?? '').trim())
    );
  }

  return String(left ?? '').trim() === String(right ?? '').trim();
}

export function buildProjectDocumentUpdatePayload(documentId, fieldName, value) {
  const payload = {
    task_id: documentId,
    type: 'Document Tasks',
  };

  if (fieldName === 'task_name') {
    payload.subject = value ?? '';
    return payload;
  }

  if (fieldName === 'document_category') {
    payload.document_category = value ?? '';
    return payload;
  }

  if (fieldName === 'assignee') {
    payload.assignees = normalizeAssignees(value).map((assignee) => ({
      assignee_type: 'Role',
      assignee,
    }));
    return payload;
  }

  if (fieldName === 'tags') {
    payload.tags = Array.isArray(value) ? value.filter(Boolean) : [];
    return payload;
  }

  if (fieldName === 'duration') {
    payload.duration =
      value != null && value !== '' ? Number(sanitizeUnsignedIntegerInput(String(value))) : '';
    return payload;
  }

  payload[fieldName] = value ?? '';
  return payload;
}

export function getDocumentRowFieldValue(document, fieldName) {
  if (!document) return fieldName === 'tags' || fieldName === 'assignee' ? [] : '';

  if (fieldName === 'task_name') return document.task_name ?? document.subject ?? '';

  if (fieldName === 'document_category') {
    return document.document_category ?? document.category ?? '';
  }

  if (fieldName === 'tags') {
    if (Array.isArray(document.tags)) {
      return document.tags.map((tag) => String(tag).trim()).filter(Boolean);
    }
    if (typeof document._user_tags === 'string' && document._user_tags.trim()) {
      return document._user_tags
        .split(',')
        .map((tag) => String(tag).trim())
        .filter(Boolean);
    }
    return [];
  }

  if (fieldName === 'assignee') {
    const rows = document.assignees ?? document.assignee;
    if (!rows) return [];
    const list = Array.isArray(rows) ? rows : [rows];
    return list.map((entry) => normalizeTaskAssigneeEntry(entry)).filter(Boolean);
  }

  if (fieldName === 'duration') {
    return document.duration != null && document.duration !== '' ? String(document.duration) : '';
  }

  return document[fieldName] ?? '';
}

export function documentFieldValuesEqual(fieldName, left, right) {
  if (fieldName === 'assignee') {
    return joinAssigneeIds(normalizeAssignees(left)) === joinAssigneeIds(normalizeAssignees(right));
  }

  if (fieldName === 'tags') {
    return tagsKey(left) === tagsKey(right);
  }

  if (fieldName === 'duration') {
    return (
      sanitizeUnsignedIntegerInput(String(left ?? '').trim()) ===
      sanitizeUnsignedIntegerInput(String(right ?? '').trim())
    );
  }

  return String(left ?? '').trim() === String(right ?? '').trim();
}

export function getDocumentCategoryRowValue(category, fieldName) {
  if (!category) return '';

  if (fieldName === 'category') return category.category ?? category.name ?? '';
  if (fieldName === 'description') return category.description ?? '';

  return category[fieldName] ?? '';
}

export function documentCategoryFieldValuesEqual(fieldName, left, right) {
  return String(left ?? '').trim() === String(right ?? '').trim();
}

export function mapDocumentCategoryResultsToOptions(results = []) {
  return (Array.isArray(results) ? results : []).map((item) => ({
    value: item.name,
    label: item.category ?? item.name,
  }));
}

export function buildDocumentCategorySelectOptions(results = [], currentValue) {
  const options = mapDocumentCategoryResultsToOptions(results);
  const value = String(currentValue ?? '').trim();
  if (!value) return options;
  if (options.some((opt) => opt.value === value)) return options;
  return [{ value, label: value }, ...options];
}
