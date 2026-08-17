import { TASK_PRIORITY_OPTIONS } from '@/components/clients-management/constants';
import {
  findBoardStatusOption,
  flattenBoardStatusOptions,
} from '@/pages/boards/utils/task-statuses-utils';
import { getAssigneeDisplayName } from '@/utils/task-utils';
import { STANDARD_TAB_FIELDS } from '../constants/list-custom-fields-constants';
import { getCustomColumnIcon } from './list-columns';
import { isCheckboxChecked, resolveColumnFieldOption } from './custom-field-utils';
import { getTaskFieldValue, resolveColumnFieldType } from './task-list-filter-utils';

const NON_GROUPABLE_FIELD_TYPES = new Set(['image', 'file-upload', 'long-text']);

const EMPTY_GROUP_KEY = '__empty__';

export { EMPTY_GROUP_KEY };

const PRIORITY_RANK = Object.fromEntries(
  TASK_PRIORITY_OPTIONS.map((option, index) => [option.value, index]),
);

export function isColumnGroupable(column = {}) {
  if (column.key === 'title') {
    return false;
  }

  const fieldType = resolveColumnFieldType(column);
  return !NON_GROUPABLE_FIELD_TYPES.has(fieldType);
}

export function getColumnGroupIcon(column = {}) {
  if (column.custom || !column.builtin) {
    return getCustomColumnIcon(column);
  }

  const standardField = STANDARD_TAB_FIELDS.find((field) => field.key === column.key);
  return standardField?.icon ?? getCustomColumnIcon(column);
}

export function buildGroupByOptions(columns = []) {
  return columns.filter(isColumnGroupable).map((column) => ({
    key: column.key,
    label: column.label,
    icon: getColumnGroupIcon(column),
  }));
}

function formatDateGroupLabel(value) {
  if (!value) {
    return 'No due date';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getAssigneeGroupLabel(task) {
  const details = task.assigneeDetails ?? [];

  if (details.length > 0) {
    return getAssigneeDisplayName(details[0]);
  }

  const assignees = task.assignees ?? [];

  if (assignees.length > 0) {
    return String(assignees[0]);
  }

  return 'Unassigned';
}

function getAssigneeGroupKey(task) {
  const details = task.assigneeDetails ?? [];

  if (details.length > 0) {
    const first = details[0];
    return String(
      first?.user ?? first?.email ?? first?.name ?? first?.value ?? first ?? EMPTY_GROUP_KEY,
    );
  }

  const assignees = task.assignees ?? [];

  if (assignees.length > 0) {
    return String(assignees[0]);
  }

  return EMPTY_GROUP_KEY;
}

function getTaskGroupKey(task, column) {
  const fieldType = resolveColumnFieldType(column);
  const rawValue = getTaskFieldValue(task, column);

  switch (fieldType) {
    case 'people': {
      if (column.key === 'assignee') {
        return getAssigneeGroupKey(task);
      }

      if (Array.isArray(rawValue)) {
        return rawValue.length > 0 ? String(rawValue[0]) : EMPTY_GROUP_KEY;
      }

      return rawValue ? String(rawValue) : EMPTY_GROUP_KEY;
    }
    case 'tags':
    case 'labels': {
      const tags = Array.isArray(rawValue) ? rawValue : rawValue ? [rawValue] : [];
      return tags.length > 0 ? String(tags[0]) : EMPTY_GROUP_KEY;
    }
    case 'date':
      return rawValue ? String(rawValue).slice(0, 10) : EMPTY_GROUP_KEY;
    case 'priority':
      return rawValue ? String(rawValue) : EMPTY_GROUP_KEY;
    case 'status':
      return rawValue ? String(rawValue) : EMPTY_GROUP_KEY;
    case 'checkbox':
      return isCheckboxChecked(rawValue) ? 'checked' : 'unchecked';
    default:
      if (rawValue == null || rawValue === '') {
        return EMPTY_GROUP_KEY;
      }

      if (Array.isArray(rawValue)) {
        return rawValue.length > 0 ? String(rawValue[0]) : EMPTY_GROUP_KEY;
      }

      return String(rawValue);
  }
}

function resolveStatusOption(groupKey, context = {}, sampleTask = null) {
  if (!groupKey || groupKey === EMPTY_GROUP_KEY) {
    return null;
  }

  const groupPools = [context.allStatusGroups, context.statusGroups].filter(Boolean);

  for (const groups of groupPools) {
    const match = findBoardStatusOption(groups, groupKey);
    if (match) {
      return match;
    }
  }

  const statusValue = sampleTask?.status;
  if (statusValue && statusValue !== groupKey) {
    for (const groups of groupPools) {
      const match = findBoardStatusOption(groups, statusValue);
      if (match) {
        return match;
      }
    }
  }

  const normalizedKey = String(groupKey).trim().toLowerCase();
  const flatOptions = flattenBoardStatusOptions(
    context.allStatusGroups?.length ? context.allStatusGroups : (context.statusGroups ?? []),
  );

  return (
    flatOptions.find(
      (option) =>
        String(option.value).toLowerCase() === normalizedKey ||
        String(option.label ?? '')
          .trim()
          .toLowerCase() === normalizedKey,
    ) ?? null
  );
}

function buildGroupMeta(fieldType, group, column, context = {}, sampleTask = null) {
  if (group.key === EMPTY_GROUP_KEY) {
    return { type: 'empty', label: group.label };
  }

  if (fieldType === 'status') {
    const option = resolveStatusOption(group.key, context, sampleTask);

    if (option) {
      return { type: 'status', label: option.label, option };
    }

    return { type: 'text', label: group.label };
  }

  if (fieldType === 'priority') {
    const option = TASK_PRIORITY_OPTIONS.find((entry) => entry.value === group.key);

    return {
      type: 'priority',
      label: option?.label ?? group.label,
      value: group.key,
    };
  }

  if (fieldType === 'dropdown' || fieldType === 'labels' || fieldType === 'tags') {
    const option = resolveColumnFieldOption(group.key, column);

    if (option) {
      return {
        type: 'option',
        label: option.label,
        color: option.color,
        value: option.id,
      };
    }

    if (fieldType === 'tags' && column.key === 'tags') {
      return { type: 'tag', label: group.label };
    }

    return { type: 'text', label: group.label };
  }

  return { type: 'text', label: group.label };
}

function finalizeGroup(group, column, context = {}) {
  const fieldType = resolveColumnFieldType(column);
  const sampleTask = group.tasks[0];
  const meta = buildGroupMeta(fieldType, group, column, context, sampleTask);

  if (fieldType === 'people' && column.key === 'assignee' && sampleTask) {
    return {
      ...group,
      label: getAssigneeGroupLabel(sampleTask),
      meta: { type: 'text', label: getAssigneeGroupLabel(sampleTask) },
    };
  }

  if (fieldType === 'status' && meta.type === 'status') {
    return {
      ...group,
      key: meta.option.value,
      label: meta.label,
      meta,
    };
  }

  return {
    ...group,
    label: meta.label ?? group.label,
    meta,
  };
}

export function getGroupCreateDefaults(group, column) {
  if (!group || !column || group.key === EMPTY_GROUP_KEY) {
    return {};
  }

  const fieldType = resolveColumnFieldType(column);
  const storedValue = getGroupStoredValue(group);
  const isBuiltinColumn = Boolean(column.builtin && !column.custom);

  if (column.key === 'status' && fieldType === 'status') {
    return { defaultStatusId: storedValue };
  }

  if (column.key === 'priority' && fieldType === 'priority') {
    return { defaultPriority: group.key };
  }

  if (column.key === 'assignee' && fieldType === 'people') {
    return { defaultAssignees: [group.key] };
  }

  if (column.key === 'dueDate' && fieldType === 'date') {
    return { defaultDueDate: group.key };
  }

  if (column.key === 'tags' && fieldType === 'tags' && isBuiltinColumn) {
    return { defaultTags: [group.label ?? group.key] };
  }

  if (column.custom || !isBuiltinColumn) {
    return {
      defaultCustomFields: {
        [column.key]: getGroupCustomFieldCreateValue(group, column, storedValue),
      },
    };
  }

  return {};
}

function getGroupStoredValue(group) {
  return group.meta?.value ?? group.meta?.option?.value ?? group.key;
}

function getGroupCustomFieldCreateValue(group, column, storedValue = getGroupStoredValue(group)) {
  const fieldType = resolveColumnFieldType(column);

  switch (fieldType) {
    case 'checkbox':
      return group.key === 'checked';
    case 'tags':
      return [String(storedValue)];
    case 'labels':
    case 'dropdown':
      return String(storedValue);
    case 'people':
      return [String(storedValue)];
    case 'number': {
      const numericValue = Number(storedValue);
      return Number.isNaN(numericValue) ? storedValue : numericValue;
    }
    default:
      return storedValue;
  }
}
function getTaskGroupLabel(task, column, groupKey, context = {}) {
  const fieldType = resolveColumnFieldType(column);

  if (groupKey === EMPTY_GROUP_KEY) {
    switch (fieldType) {
      case 'people':
        return 'Unassigned';
      case 'tags':
      case 'labels':
        return 'No tags';
      case 'date':
        return 'No due date';
      case 'priority':
        return 'No priority';
      case 'status':
        return 'No status';
      default:
        return 'Empty';
    }
  }

  if (fieldType === 'status') {
    return resolveStatusOption(groupKey, context, task)?.label ?? groupKey;
  }

  if (fieldType === 'people' && column.key === 'assignee') {
    return getAssigneeGroupLabel(task);
  }

  if (fieldType === 'date') {
    return formatDateGroupLabel(groupKey);
  }

  if (fieldType === 'priority') {
    return TASK_PRIORITY_OPTIONS.find((entry) => entry.value === groupKey)?.label ?? groupKey;
  }

  if (fieldType === 'dropdown' || fieldType === 'labels' || fieldType === 'tags') {
    return resolveColumnFieldOption(groupKey, column)?.label ?? String(groupKey);
  }

  if (fieldType === 'checkbox') {
    return groupKey === 'checked' ? 'Checked' : 'Unchecked';
  }

  return String(groupKey);
}

function getTaskGroupMeta(groupKey, column, context = {}, sampleTask = null) {
  if (groupKey === EMPTY_GROUP_KEY) {
    return { type: 'empty', label: getTaskGroupLabel(sampleTask, column, groupKey, context) };
  }

  const fieldType = resolveColumnFieldType(column);
  const label = getTaskGroupLabel(sampleTask, column, groupKey, context);

  if (fieldType === 'status') {
    const option = resolveStatusOption(groupKey, context, sampleTask);
    return option ? { type: 'status', label: option.label, option } : { type: 'text', label };
  }

  if (fieldType === 'priority') {
    return { type: 'priority', label, value: groupKey };
  }

  if (fieldType === 'dropdown' || fieldType === 'labels' || fieldType === 'tags') {
    const option = resolveColumnFieldOption(groupKey, column);
    return option
      ? { type: 'option', label: option.label, color: option.color, value: option.id }
      : { type: 'text', label };
  }

  return { type: 'text', label };
}

function compareGroups(left, right, column, direction, context = {}) {
  const fieldType = resolveColumnFieldType(column);
  const multiplier = direction === 'desc' ? -1 : 1;

  if (fieldType === 'status') {
    const order = flattenBoardStatusOptions(context.allStatusGroups ?? context.statusGroups ?? []);
    const leftIndex = order.findIndex((entry) => entry.value === left.key);
    const rightIndex = order.findIndex((entry) => entry.value === right.key);
    const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

    if (normalizedLeft !== normalizedRight) {
      return (normalizedLeft - normalizedRight) * multiplier;
    }
  }

  if (fieldType === 'priority') {
    const leftRank = PRIORITY_RANK[left.key] ?? Number.MAX_SAFE_INTEGER;
    const rightRank = PRIORITY_RANK[right.key] ?? Number.MAX_SAFE_INTEGER;

    if (leftRank !== rightRank) {
      return (leftRank - rightRank) * multiplier;
    }
  }

  if (fieldType === 'date') {
    if (left.key === EMPTY_GROUP_KEY && right.key !== EMPTY_GROUP_KEY) {
      return 1;
    }

    if (right.key === EMPTY_GROUP_KEY && left.key !== EMPTY_GROUP_KEY) {
      return -1;
    }

    const leftTime = new Date(left.key).getTime();
    const rightTime = new Date(right.key).getTime();

    if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime) && leftTime !== rightTime) {
      return (leftTime - rightTime) * multiplier;
    }
  }

  if (left.key === EMPTY_GROUP_KEY && right.key !== EMPTY_GROUP_KEY) {
    return 1;
  }

  if (right.key === EMPTY_GROUP_KEY && left.key !== EMPTY_GROUP_KEY) {
    return -1;
  }

  return left.label.localeCompare(right.label) * multiplier;
}

export function groupTasksByColumn(tasks = [], groupBy = null, columns = [], context = {}) {
  if (!groupBy?.columnKey) {
    return null;
  }

  const column = columns.find((entry) => entry.key === groupBy.columnKey);

  if (!column) {
    return null;
  }

  const buckets = new Map();

  tasks.forEach((task) => {
    const groupKey = getTaskGroupKey(task, column);

    if (!buckets.has(groupKey)) {
      buckets.set(groupKey, {
        key: groupKey,
        label: getTaskGroupLabel(task, column, groupKey, context),
        meta: getTaskGroupMeta(groupKey, column, context, task),
        tasks: [],
      });
    }

    buckets.get(groupKey).tasks.push(task);
  });

  const groups = [...buckets.values()].map((group) => finalizeGroup(group, column, context));
  groups.sort((left, right) =>
    compareGroups(left, right, column, groupBy.direction ?? 'asc', context),
  );

  return groups;
}
