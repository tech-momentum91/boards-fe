import { RiCalendarLine, RiListCheck3, RiTableLine } from 'react-icons/ri';
import type { NormalizedTaskView, TaskViewRecord, TaskViewType } from '../views/shared/types';

export const TASK_VIEW_TYPES = {
  LIST: 'List',
  TABLE: 'Table',
  CALENDAR: 'Calendar',
} as const;

export const ADDABLE_VIEW_TYPES = [TASK_VIEW_TYPES.TABLE, TASK_VIEW_TYPES.CALENDAR];

export const TASK_VIEW_TYPE_META = {
  [TASK_VIEW_TYPES.LIST]: {
    id: 'list',
    label: 'List',
    icon: RiListCheck3,
    description: 'Organize tasks in a flexible list.',
  },
  [TASK_VIEW_TYPES.TABLE]: {
    id: 'table',
    label: 'Table',
    icon: RiTableLine,
    description: 'View tasks in a spreadsheet-style table.',
  },
  [TASK_VIEW_TYPES.CALENDAR]: {
    id: 'calendar',
    label: 'Calendar',
    icon: RiCalendarLine,
    description: 'See tasks on a calendar by created, start, or due date.',
  },
} as const;

export function normalizeTaskViewType(viewType: unknown): TaskViewType | string {
  const normalized = String(viewType ?? '').trim();

  if (normalized.toLowerCase() === 'list') {
    return TASK_VIEW_TYPES.LIST;
  }

  if (normalized.toLowerCase() === 'table') {
    return TASK_VIEW_TYPES.TABLE;
  }

  if (normalized.toLowerCase() === 'calendar') {
    return TASK_VIEW_TYPES.CALENDAR;
  }

  return normalized;
}

export function sortTaskViews(views: Array<{ sortOrder?: number }> = []): NormalizedTaskView[] {
  return [...(views as NormalizedTaskView[])].sort(
    (left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0),
  );
}

export function normalizeTaskView(view: TaskViewRecord = {}): NormalizedTaskView | null {
  const viewType = normalizeTaskViewType(view.view_type ?? view.viewType) as TaskViewType;
  const id = view.name ?? view.id;

  if (!id) {
    return null;
  }

  return {
    id,
    name: id,
    title: view.title ?? TASK_VIEW_TYPE_META[viewType]?.label ?? 'View',
    viewType,
    list: view.list,
    isDefault: Boolean(view.is_default ?? view.isDefault),
    sortOrder: Number(view.sort_order ?? view.sortOrder ?? 0),
    favorite: Boolean(view.favorite),
    archived: Boolean(view.archived),
    isPersonal: Boolean(view.is_personal ?? view.isPersonal),
    filtersJson: view.filters_json ?? view.filtersJson ?? null,
    columnsJson: view.columns_json ?? view.columnsJson ?? null,
    groupingJson: view.grouping_json ?? view.groupingJson ?? null,
    sortingJson: view.sorting_json ?? view.sortingJson ?? null,
    permissionsJson: view.permissions_json ?? view.permissionsJson ?? null,
    settingsJson: view.settings_json ?? view.settingsJson ?? null,
  };
}
