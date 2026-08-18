import {
  TASK_STATUS_CATEGORY_KEYS,
  TASK_STATUS_CATEGORY_LABELS,
  createDefaultStatusTemplate,
  createStatusItem,
} from '../constants/task-statuses-constants';
import { normalizeBoardColor } from '../sidebar/IconColorPicker';
import type {
  BoardItemRef,
  BoardStatusOption,
  BoardStatusOptionGroup,
} from '../views/shared/types';

type StatusCategoryKey = (typeof TASK_STATUS_CATEGORY_KEYS)[number];
type StatusItem = ReturnType<typeof createStatusItem>;

export interface StatusApiRow {
  name?: string;
  id?: string;
  title?: string;
  name1?: string;
  color?: string;
  is_enabled?: boolean | number;
  isEnabled?: boolean | number;
  is_closed?: boolean | number;
  isClosed?: boolean | number;
  order?: number;
  idx?: number;
  category?: string;
}

export interface StatusTemplate {
  templateId: string | null;
  templateName: string | null;
  spaceId: string | null;
  mode: string;
  otherSourceId: string | null;
  categories: Record<string, StatusItem[]>;
}

const CATEGORY_LABELS = TASK_STATUS_CATEGORY_LABELS as Record<string, string>;

export function getCategoryProgressPercentage(category: string): number {
  switch (category) {
    case 'active':
      return 50;
    case 'done':
    case 'closed':
      return 100;
    default:
      return 0;
  }
}

/** Statuses in Done or Closed lifecycle categories should mark a task as closed. */
export function isClosedStatusCategory(category: unknown): boolean {
  const normalized = String(category ?? '').trim();
  return normalized === 'done' || normalized === 'closed';
}

/** The Closed list filter only includes the Closed category, not Done. */
export function isClosedFilterCategory(category: unknown): boolean {
  return String(category ?? '').trim() === 'closed';
}

export function isTaskInClosedFilter(
  statusId: string,
  statusGroups: BoardStatusOptionGroup[] = [],
  allStatusGroups: BoardStatusOptionGroup[] = [],
  statusCategory: unknown = '',
): boolean {
  const option =
    findBoardStatusOption(statusGroups, statusId) ??
    findBoardStatusOption(allStatusGroups, statusId);

  if (option?.category) {
    return isClosedFilterCategory(option.category);
  }

  return isClosedFilterCategory(statusCategory);
}

export function cloneStatusTemplate(template: StatusTemplate | null | undefined): StatusTemplate {
  return JSON.parse(JSON.stringify(template ?? createDefaultStatusTemplate()));
}

export function isStatusEnabled(value: unknown, defaultValue = true): boolean {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return Number(value) === 1;
}

const DEFAULT_STATUS_SLUG_TITLES: Record<string, string> = {
  open: 'To Do',
  'to-do': 'To Do',
  pending: 'Pending',
  'in-progress': 'In Progress',
  done: 'Done',
  completed: 'Completed',
};

function stripGenericPrefix(value = ''): string {
  return String(value)
    .trim()
    .replace(/^generic\s+/i, '')
    .replaceAll(/\bgeneric\s+/gi, '')
    .trim();
}

export function getStatusTitleFromApiRow(row: StatusApiRow = {}): string {
  if (row.title) {
    return stripGenericPrefix(row.title);
  }

  const name1 = String(row.name1 ?? '').trim();
  if (!name1) {
    return '';
  }

  const segments = name1.split('-').filter((part) => part.toLowerCase() !== 'generic');
  const slug = segments.slice(-2).join('-');
  const single = segments[segments.length - 1] || name1;

  if (DEFAULT_STATUS_SLUG_TITLES[slug]) {
    return DEFAULT_STATUS_SLUG_TITLES[slug];
  }

  if (DEFAULT_STATUS_SLUG_TITLES[single]) {
    return DEFAULT_STATUS_SLUG_TITLES[single];
  }

  return stripGenericPrefix(single.replaceAll('-', ' '));
}

function normalizeStatusItem(raw: StatusApiRow = {}): StatusItem {
  const displayName = getStatusTitleFromApiRow(raw);

  return createStatusItem({
    id: raw.name ?? raw.id ?? null,
    name1: raw.name1 ?? '',
    name: displayName,
    color: normalizeBoardColor(raw.color) || '#94A3B8',
    isEnabled: isStatusEnabled(raw.is_enabled ?? raw.isEnabled, true),
    isClosed: Boolean(raw.is_closed ?? raw.isClosed ?? false),
    order: raw.order ?? raw.idx ?? 0,
    category: raw.category ?? null,
    isDraft: false,
  } as Parameters<typeof createStatusItem>[0]);
}

function normalizeCategoryItems(items: StatusApiRow[] = []): StatusItem[] {
  const list = Array.isArray(items) ? items : [];
  return list.map((item) => normalizeStatusItem(item));
}

export function normalizeStatusTemplate(raw: unknown): StatusTemplate {
  if (!raw || typeof raw !== 'object') {
    return createDefaultStatusTemplate() as StatusTemplate;
  }

  const record = raw as Record<string, unknown>;
  const categoriesInput = (record.categories ?? {}) as Partial<
    Record<StatusCategoryKey, StatusApiRow[]>
  >;
  const categories: Record<string, StatusItem[]> = {};

  TASK_STATUS_CATEGORY_KEYS.forEach((key) => {
    categories[key] = normalizeCategoryItems(categoriesInput[key] ?? []);
  });

  return {
    templateId: (record.name as string | undefined) ?? null,
    templateName: (record.name1 as string | undefined) ?? null,
    spaceId: (record.space as string | undefined) ?? null,
    mode: record.mode === 'other' ? 'other' : 'custom',
    otherSourceId:
      (record.other_source_id as string | undefined) ??
      (record.otherSourceId as string | undefined) ??
      null,
    categories,
  };
}

export function serializeStatusesForBulkSave(template: StatusTemplate) {
  const statuses: Array<{
    title: string;
    name1?: string;
    color: string;
    category: string;
    is_enabled: number;
    is_closed: number;
    order: number;
  }> = [];

  TASK_STATUS_CATEGORY_KEYS.forEach((category) => {
    (template.categories[category] ?? []).forEach((item, index) => {
      const title = item.name?.trim();
      if (!title) {
        return;
      }

      statuses.push({
        title,
        name1: item.name1 || undefined,
        color: normalizeBoardColor(item.color) || '#94A3B8',
        category,
        is_enabled: isStatusEnabled(item.isEnabled, true) ? 1 : 0,
        is_closed: isStatusEnabled(item.isClosed, true) || isClosedStatusCategory(category) ? 1 : 0,
        order: index + 1,
      });
    });
  });

  return statuses;
}

export function getBoardItemTypeForStatusApi(item: BoardItemRef): string {
  if (!item?.type) {
    return 'space';
  }

  if (item.type === 'space' || item.type === 'board' || item.type === 'group') {
    return 'space';
  }

  return item.type;
}

export function buildBoardStatusOptionGroups(
  apiTemplate: unknown,
  { enabledOnly = true }: { enabledOnly?: boolean } = {},
): BoardStatusOptionGroup[] {
  const normalized = normalizeStatusTemplate(apiTemplate);

  return TASK_STATUS_CATEGORY_KEYS.map((categoryKey) => ({
    key: categoryKey,
    label: CATEGORY_LABELS[categoryKey] ?? categoryKey,
    options: (normalized.categories[categoryKey] ?? [])
      .filter((item) => !enabledOnly || isStatusEnabled(item.isEnabled, true))
      .map((item) => ({
        value: item.id,
        label: item.name,
        color: item.color,
        category: categoryKey,
        isClosed: Boolean(item.isClosed) || isClosedStatusCategory(categoryKey),
        percentage: getCategoryProgressPercentage(categoryKey),
      })),
  })).filter((group) => group.options.length > 0);
}

export function flattenBoardStatusOptions(groups: BoardStatusOptionGroup[] = []): BoardStatusOption[] {
  return groups.flatMap((group) => group.options);
}

export function getDefaultBoardStatusValue(groups: BoardStatusOptionGroup[] = []): string {
  const notStartedGroup = groups.find((group) => group.key === 'not_started');
  if (notStartedGroup?.options?.[0]?.value) {
    return notStartedGroup.options[0].value ?? '';
  }

  for (const group of groups) {
    if (group.options?.[0]?.value) {
      return group.options[0].value ?? '';
    }
  }

  return '';
}

export function findBoardStatusOption(
  groups: BoardStatusOptionGroup[] = [],
  value = '',
): BoardStatusOption | null {
  if (!value) {
    return null;
  }

  return flattenBoardStatusOptions(groups).find((option) => option.value === value) ?? null;
}

function normalizeStatusLabel(label: unknown): string {
  return String(label ?? '')
    .trim()
    .toLowerCase();
}

/**
 * Match a source status onto a destination template by display name + category.
 * Returns the destination status id, or null when no equivalent exists.
 */
export function findMatchingDestinationStatus(
  sourceStatusId: string,
  sourceGroups: BoardStatusOptionGroup[] = [],
  destinationGroups: BoardStatusOptionGroup[] = [],
  fallbackSourceGroups: BoardStatusOptionGroup[] = [],
): string | null {
  if (!sourceStatusId) {
    return null;
  }

  const sourceOption =
    findBoardStatusOption(sourceGroups, sourceStatusId) ??
    findBoardStatusOption(fallbackSourceGroups, sourceStatusId);

  if (!sourceOption?.label || !sourceOption?.category) {
    return null;
  }

  const sourceLabel = normalizeStatusLabel(sourceOption.label);
  const sourceCategory = String(sourceOption.category);

  const match = flattenBoardStatusOptions(destinationGroups).find(
    (option) =>
      String(option.category) === sourceCategory &&
      normalizeStatusLabel(option.label) === sourceLabel,
  );

  return match?.value ?? null;
}

export function resolveIsClosedFromStatusOption(option: BoardStatusOption | null): boolean {
  if (!option) {
    return false;
  }

  if (typeof option.isClosed === 'boolean') {
    return option.isClosed;
  }

  return isClosedStatusCategory(option.category);
}

export function resolveTaskIsClosedFromStatus(
  statusId: string,
  statusGroups: BoardStatusOptionGroup[] = [],
  allStatusGroups: BoardStatusOptionGroup[] = [],
): boolean {
  const option =
    findBoardStatusOption(statusGroups, statusId) ??
    findBoardStatusOption(allStatusGroups, statusId);

  return resolveIsClosedFromStatusOption(option);
}
