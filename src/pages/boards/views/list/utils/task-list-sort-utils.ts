import { TASK_PRIORITY_OPTIONS } from '@/components/clients-management/constants';
import { getAssigneeDisplayName } from '@/utils/task-utils';
import { getTaskFieldValue, resolveColumnFieldType } from './task-list-filter-utils';

const NON_SORTABLE_FIELD_TYPES = new Set(['image', 'file-upload']);

const PRIORITY_RANK = Object.fromEntries(
  TASK_PRIORITY_OPTIONS.map((option, index) => [option.value, index]),
);

export function isColumnSortable(column = {}) {
  if (column.sortable === false) {
    return false;
  }

  if (column.sortable === true) {
    return true;
  }

  const fieldType = resolveColumnFieldType(column);
  return !NON_SORTABLE_FIELD_TYPES.has(fieldType);
}

export function normalizeColumnSort(sortRules = [], columns = []) {
  if (!Array.isArray(sortRules)) {
    return [];
  }

  const sortableKeys = new Set(columns.filter(isColumnSortable).map((column) => column.key));
  const seen = new Set();
  const normalized = [];

  sortRules.forEach((rule) => {
    const key = rule?.key;
    const direction =
      rule?.direction === 'desc' ? 'desc' : rule?.direction === 'asc' ? 'asc' : null;

    if (!key || !direction || !sortableKeys.has(key) || seen.has(key)) {
      return;
    }

    normalized.push({ key, direction });
    seen.add(key);
  });

  return normalized;
}

function isEmptySortValue(value) {
  if (value == null || value === '') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
}

function getPeopleSortKey(task, column, rawValue) {
  if (column.key === 'assignee') {
    const details = task.assigneeDetails ?? [];

    if (details.length > 0) {
      return getAssigneeDisplayName(details[0]).toLowerCase();
    }
  }

  const people = Array.isArray(rawValue) ? rawValue : rawValue ? [rawValue] : [];

  if (people.length === 0) {
    return '';
  }

  const first = people[0];

  if (typeof first === 'string') {
    return first.toLowerCase();
  }

  return getAssigneeDisplayName(first).toLowerCase();
}

function getTagsSortKey(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return '';
  }

  return [...value]
    .map((entry) => String(entry ?? '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .join(',')
    .toLowerCase();
}

function getSortableValue(task, column) {
  const rawValue = getTaskFieldValue(task, column);
  const fieldType = resolveColumnFieldType(column);

  switch (fieldType) {
    case 'people':
      return getPeopleSortKey(task, column, rawValue);
    case 'tags':
    case 'labels':
      return getTagsSortKey(Array.isArray(rawValue) ? rawValue : [rawValue]);
    case 'checkbox':
      return rawValue ? 1 : 0;
    case 'number': {
      const parsed = Number(rawValue);
      return Number.isFinite(parsed) ? parsed : null;
    }
    case 'date': {
      if (!rawValue) {
        return null;
      }

      const timestamp = new Date(rawValue).getTime();
      return Number.isNaN(timestamp) ? null : timestamp;
    }
    case 'priority':
      return PRIORITY_RANK[rawValue] ?? Number.MAX_SAFE_INTEGER;
    default:
      if (Array.isArray(rawValue)) {
        return getTagsSortKey(rawValue);
      }

      return String(rawValue ?? '')
        .trim()
        .toLowerCase();
  }
}

function compareSortValues(leftValue, rightValue, fieldType) {
  if (
    fieldType === 'number' ||
    fieldType === 'date' ||
    fieldType === 'priority' ||
    fieldType === 'checkbox'
  ) {
    if (leftValue === rightValue) {
      return 0;
    }

    return leftValue < rightValue ? -1 : 1;
  }

  return String(leftValue).localeCompare(String(rightValue));
}

function compareTasksByColumn(taskA, taskB, column, direction) {
  const fieldType = resolveColumnFieldType(column);
  const leftValue = getSortableValue(taskA, column);
  const rightValue = getSortableValue(taskB, column);
  const leftEmpty = isEmptySortValue(leftValue);
  const rightEmpty = isEmptySortValue(rightValue);

  if (leftEmpty && rightEmpty) {
    return 0;
  }

  if (leftEmpty) {
    return direction === 'asc' ? 1 : -1;
  }

  if (rightEmpty) {
    return direction === 'asc' ? -1 : 1;
  }

  const result = compareSortValues(leftValue, rightValue, fieldType);
  return direction === 'desc' ? -result : result;
}

export function sortTasksByColumns(tasks = [], sortRules = [], columns = []) {
  if (!Array.isArray(sortRules) || sortRules.length === 0) {
    return tasks;
  }

  const columnMap = new Map(columns.map((column) => [column.key, column]));
  const activeRules = sortRules.filter((rule) => columnMap.has(rule.key));

  if (activeRules.length === 0) {
    return tasks;
  }

  const indexed = tasks.map((task, index) => ({ task, index }));

  indexed.sort((left, right) => {
    for (const rule of activeRules) {
      const column = columnMap.get(rule.key);
      const result = compareTasksByColumn(left.task, right.task, column, rule.direction);

      if (result !== 0) {
        return result;
      }
    }

    return left.index - right.index;
  });

  return indexed.map((entry) => entry.task);
}

export function getColumnSortState(columnSort = [], columnKey) {
  const index = columnSort.findIndex((rule) => rule.key === columnKey);

  if (index === -1) {
    return { direction: undefined, priority: null };
  }

  return {
    direction: columnSort[index].direction,
    priority: columnSort.length > 1 ? index + 1 : null,
  };
}

export function toggleColumnSort(previous = [], columnKey, { multi = false } = {}) {
  const existingIndex = previous.findIndex((rule) => rule.key === columnKey);

  if (multi) {
    if (existingIndex === -1) {
      return [...previous, { key: columnKey, direction: 'asc' }];
    }

    const current = previous[existingIndex];

    if (current.direction === 'asc') {
      return previous.map((rule, index) =>
        index === existingIndex ? { ...rule, direction: 'desc' } : rule,
      );
    }

    return previous.filter((_, index) => index !== existingIndex);
  }

  if (existingIndex === 0 && previous.length === 1) {
    if (previous[0].direction === 'asc') {
      return [{ key: columnKey, direction: 'desc' }];
    }

    return [];
  }

  return [{ key: columnKey, direction: 'asc' }];
}
