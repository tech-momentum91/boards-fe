import { resolveBadgeColor } from '@/components/ui/circular-progress';
import {
  PROJECT_GLOBAL_LAYOUT_STATUS_FILTER_FALLBACK,
  PROJECT_GLOBAL_LAYOUT_STATUS_FILTER_GROUPS,
  PROJECT_GLOBAL_LAYOUT_STATUS_FILTER_SCOPE,
} from '@/components/projects/global-layout/project-global-layout-status-filter-config';

/**
 * Resolve API / client filters from applied multi-status selections.
 *
 * @param {Record<string, string[]>} filtersByTaskType
 * @returns {{
 *   task_type: string,
 *   statuses: string[],
 *   useClientFilter: boolean,
 *   clientFilters: Record<string, string[]>,
 * }}
 */
export function resolveGlobalLayoutBundleRequestFilters(filtersByTaskType = {}) {
  const clientFilters = Object.fromEntries(
    Object.entries(filtersByTaskType || {}).filter(
      ([taskType, statuses]) =>
        String(taskType ?? '').trim() && Array.isArray(statuses) && statuses.length > 0,
    ),
  );

  const entries = Object.entries(clientFilters);
  if (entries.length === 0) {
    return {
      task_type: '',
      statuses: [],
      useClientFilter: false,
      clientFilters: {},
    };
  }

  // Single task type → server can filter with status IN [...].
  if (entries.length === 1) {
    const [taskType, statuses] = entries[0];
    return {
      task_type: String(taskType).trim(),
      statuses: statuses.map((status) => String(status ?? '').trim()).filter(Boolean),
      useClientFilter: false,
      clientFilters,
    };
  }

  // Multiple task types → fetch unfiltered and filter client-side.
  return {
    task_type: '',
    statuses: [],
    useClientFilter: true,
    clientFilters,
  };
}

/** @deprecated Use resolveGlobalLayoutBundleRequestFilters */
export function resolveGlobalLayoutApiStatusFilter(filtersByTaskType = {}) {
  const { statuses } = resolveGlobalLayoutBundleRequestFilters(filtersByTaskType);
  return statuses[0] || '';
}

/**
 * @param {Record<string, string[]>} left
 * @param {Record<string, string[]>} right
 */
export function areGlobalLayoutStatusFiltersEqual(left = {}, right = {}) {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) return false;

  return leftKeys.every((key, index) => {
    if (rightKeys[index] !== key) return false;
    const leftStatuses = [...(left[key] ?? [])].sort();
    const rightStatuses = [...(right[key] ?? [])].sort();
    return (
      leftStatuses.length === rightStatuses.length &&
      leftStatuses.every((status, statusIndex) => status === rightStatuses[statusIndex])
    );
  });
}

/**
 * @param {Record<string, string[]>} filtersByTaskType
 */
export function countGlobalLayoutStatusSelections(filtersByTaskType = {}) {
  return Object.values(filtersByTaskType).reduce(
    (total, statuses) => total + (Array.isArray(statuses) ? statuses.length : 0),
    0,
  );
}

/**
 * Multi-select toggle: add/remove a status within a task-type group.
 * When `activeTaskType` is set (typed tab), other task-type selections are cleared.
 *
 * @param {Record<string, string[]>} filtersByTaskType
 * @param {string} taskType
 * @param {string} status
 * @param {boolean} checked
 * @param {string} [activeTaskType]
 */
export function toggleGlobalLayoutStatusFilter(
  filtersByTaskType,
  taskType,
  status,
  checked,
  activeTaskType = '',
) {
  const normalizedTaskType = String(taskType ?? '').trim();
  const normalizedStatus = String(status ?? '').trim();
  if (!normalizedTaskType || !normalizedStatus) return filtersByTaskType;

  const scopedActiveTaskType = String(activeTaskType ?? '').trim();
  const base =
    scopedActiveTaskType && scopedActiveTaskType !== normalizedTaskType
      ? {}
      : scopedActiveTaskType
        ? { [normalizedTaskType]: filtersByTaskType[normalizedTaskType] ?? [] }
        : { ...filtersByTaskType };

  const current = Array.isArray(base[normalizedTaskType]) ? [...base[normalizedTaskType]] : [];

  if (checked) {
    if (!current.includes(normalizedStatus)) {
      current.push(normalizedStatus);
    }
    return { ...base, [normalizedTaskType]: current };
  }

  const nextStatuses = current.filter((value) => value !== normalizedStatus);
  const next = { ...base };
  if (nextStatuses.length === 0) {
    delete next[normalizedTaskType];
  } else {
    next[normalizedTaskType] = nextStatuses;
  }
  return next;
}

/**
 * Map Status Master options into global-layout filter status rows.
 * @param {Array<{ value?: string, label?: string, color?: string }>} options
 */
export function mapGlobalLayoutStatusFilterOptions(options = []) {
  const source =
    Array.isArray(options) && options.length > 0
      ? options
      : PROJECT_GLOBAL_LAYOUT_STATUS_FILTER_FALLBACK;

  return source
    .map((option) => {
      const value = String(option?.value ?? option?.label ?? '').trim();
      if (!value) return null;
      const label = String(option?.label ?? option?.value ?? value).trim() || value;
      const color = option?.color || 'blue';
      return {
        value,
        label,
        color,
        dotColor: resolveBadgeColor(color) || color,
      };
    })
    .filter(Boolean);
}

/**
 * Select every status in every group (or only the active task-type group).
 *
 * @param {Array<{ id: string, label: string, taskType: string, statuses?: Array }>} groups
 * @param {string} [activeTaskType]
 * @returns {Record<string, string[]>}
 */
export function buildGlobalLayoutSelectAllStatusFilters(
  groups = PROJECT_GLOBAL_LAYOUT_STATUS_FILTER_GROUPS,
  activeTaskType = '',
) {
  const scopedActiveTaskType = String(activeTaskType ?? '').trim();
  return (groups ?? []).reduce((accumulator, group) => {
    if (!group?.taskType) return accumulator;
    if (scopedActiveTaskType && group.taskType !== scopedActiveTaskType) return accumulator;
    const values = (group.statuses ?? [])
      .map((status) => String(status?.value ?? '').trim())
      .filter(Boolean);
    if (values.length > 0) {
      accumulator[group.taskType] = values;
    }
    return accumulator;
  }, {});
}

/**
 * @param {Record<string, string[]>} filtersByTaskType
 * @param {Array<{ taskType: string, statuses?: Array }>} groups
 * @param {string} [activeTaskType]
 */
export function isGlobalLayoutStatusSelectAll(
  filtersByTaskType = {},
  groups = PROJECT_GLOBAL_LAYOUT_STATUS_FILTER_GROUPS,
  activeTaskType = '',
) {
  const scopedActiveTaskType = String(activeTaskType ?? '').trim();
  const list = (groups ?? []).filter(
    (group) =>
      group?.taskType && (!scopedActiveTaskType || group.taskType === scopedActiveTaskType),
  );
  if (list.length === 0) return false;

  return list.every((group) => {
    const selected = new Set(filtersByTaskType[group.taskType] ?? []);
    const available = (group.statuses ?? [])
      .map((status) => String(status?.value ?? '').trim())
      .filter(Boolean);
    return available.length > 0 && available.every((value) => selected.has(value));
  });
}

/**
 * @param {Record<string, string[]>} filtersByTaskType
 * @param {Array<{ taskType: string, statuses?: Array }>} groups
 * @param {string} [activeTaskType]
 */
export function getGlobalLayoutStatusSelectAllState(
  filtersByTaskType = {},
  groups = PROJECT_GLOBAL_LAYOUT_STATUS_FILTER_GROUPS,
  activeTaskType = '',
) {
  const scopedActiveTaskType = String(activeTaskType ?? '').trim();
  const list = (groups ?? []).filter(
    (group) =>
      group?.taskType && (!scopedActiveTaskType || group.taskType === scopedActiveTaskType),
  );
  const selectedGroupCount = list.filter(
    (group) => (filtersByTaskType[group.taskType] ?? []).length > 0,
  ).length;

  if (selectedGroupCount === 0) return 'unchecked';
  if (
    selectedGroupCount === list.length &&
    isGlobalLayoutStatusSelectAll(filtersByTaskType, list, scopedActiveTaskType)
  ) {
    return 'checked';
  }
  return 'indeterminate';
}

export function getGlobalLayoutStatusFilterScope(taskType) {
  return {
    ...PROJECT_GLOBAL_LAYOUT_STATUS_FILTER_SCOPE,
    context: String(taskType ?? '').trim(),
    enabled: Boolean(String(taskType ?? '').trim()),
  };
}

/**
 * Client-side task filter for multi task-type status selections.
 * @param {Array<object>} tasks
 * @param {Record<string, string[]>} filtersByTaskType
 */
export function filterTasksByGlobalLayoutStatusFilters(tasks = [], filtersByTaskType = {}) {
  const entries = Object.entries(filtersByTaskType || {}).filter(
    ([, statuses]) => Array.isArray(statuses) && statuses.length > 0,
  );
  if (entries.length === 0) return tasks;

  const allowedByType = Object.fromEntries(
    entries.map(([taskType, statuses]) => [
      String(taskType).trim(),
      new Set(statuses.map((status) => String(status ?? '').trim()).filter(Boolean)),
    ]),
  );

  return (tasks ?? []).filter((task) => {
    const taskType = String(task?.type ?? task?.task_type ?? '').trim();
    const status = String(task?.status ?? '').trim();
    const allowed = allowedByType[taskType];
    if (!allowed) return false;
    return allowed.has(status);
  });
}
