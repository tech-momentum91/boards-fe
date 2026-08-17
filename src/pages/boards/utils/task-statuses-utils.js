import {
  TASK_STATUS_CATEGORY_KEYS,
  TASK_STATUS_CATEGORY_LABELS,
  createDefaultStatusTemplate,
  createStatusItem,
} from '../constants/task-statuses-constants';
import { normalizeBoardColor } from '../sidebar/IconColorPicker';

export function getCategoryProgressPercentage(category) {
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
export function isClosedStatusCategory(category) {
  const normalized = String(category ?? '').trim();
  return normalized === 'done' || normalized === 'closed';
}

export function cloneStatusTemplate(template) {
  return JSON.parse(JSON.stringify(template ?? createDefaultStatusTemplate()));
}

export function isStatusEnabled(value, defaultValue = true) {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return Number(value) === 1;
}

const DEFAULT_STATUS_SLUG_TITLES = {
  open: 'To Do',
  'to-do': 'To Do',
  pending: 'Pending',
  'in-progress': 'In Progress',
  done: 'Done',
  completed: 'Completed',
};

function stripGenericPrefix(value = '') {
  return String(value)
    .trim()
    .replace(/^generic\s+/i, '')
    .replaceAll(/\bgeneric\s+/gi, '')
    .trim();
}

export function getStatusTitleFromApiRow(row = {}) {
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

function normalizeStatusItem(raw = {}) {
  const displayName = getStatusTitleFromApiRow(raw);

  return createStatusItem({
    id: raw.name ?? raw.id,
    name1: raw.name1 ?? '',
    name: displayName,
    color: normalizeBoardColor(raw.color) || '#94A3B8',
    isEnabled: isStatusEnabled(raw.is_enabled ?? raw.isEnabled, true),
    isClosed: raw.is_closed ?? raw.isClosed ?? false,
    order: raw.order ?? raw.idx ?? 0,
    category: raw.category,
    isDraft: false,
  });
}

function normalizeCategoryItems(items = []) {
  const list = Array.isArray(items) ? items : [];
  return list.map((item) => normalizeStatusItem(item));
}

export function normalizeStatusTemplate(raw) {
  if (!raw || typeof raw !== 'object') {
    return createDefaultStatusTemplate();
  }

  const categoriesInput = raw.categories ?? {};
  const categories = {};

  TASK_STATUS_CATEGORY_KEYS.forEach((key) => {
    categories[key] = normalizeCategoryItems(categoriesInput[key] ?? []);
  });

  return {
    templateId: raw.name ?? null,
    templateName: raw.name1 ?? null,
    spaceId: raw.space ?? null,
    mode: raw.mode === 'other' ? 'other' : 'custom',
    otherSourceId: raw.other_source_id ?? raw.otherSourceId ?? null,
    categories,
  };
}

export function serializeStatusesForBulkSave(template) {
  const statuses = [];

  TASK_STATUS_CATEGORY_KEYS.forEach((category) => {
    (template.categories?.[category] ?? []).forEach((item, index) => {
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
        is_closed: item.isClosed ?? (isClosedStatusCategory(category) ? 1 : 0),
        order: index + 1,
      });
    });
  });

  return statuses;
}

export function getBoardItemTypeForStatusApi(item) {
  if (!item?.type) {
    return 'space';
  }

  if (item.type === 'space' || item.type === 'board' || item.type === 'group') {
    return 'space';
  }

  return item.type;
}

export function buildBoardStatusOptionGroups(apiTemplate, { enabledOnly = true } = {}) {
  const normalized = normalizeStatusTemplate(apiTemplate);

  return TASK_STATUS_CATEGORY_KEYS.map((categoryKey) => ({
    key: categoryKey,
    label: TASK_STATUS_CATEGORY_LABELS[categoryKey],
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

export function flattenBoardStatusOptions(groups = []) {
  return groups.flatMap((group) => group.options);
}

export function getDefaultBoardStatusValue(groups = []) {
  const notStartedGroup = groups.find((group) => group.key === 'not_started');
  if (notStartedGroup?.options?.[0]?.value) {
    return notStartedGroup.options[0].value;
  }

  for (const group of groups) {
    if (group.options?.[0]?.value) {
      return group.options[0].value;
    }
  }

  return '';
}

export function findBoardStatusOption(groups = [], value = '') {
  if (!value) {
    return null;
  }

  return flattenBoardStatusOptions(groups).find((option) => option.value === value) ?? null;
}

export function resolveIsClosedFromStatusOption(option) {
  if (!option) {
    return false;
  }

  if (typeof option.isClosed === 'boolean') {
    return option.isClosed;
  }

  return isClosedStatusCategory(option.category);
}

export function resolveTaskIsClosedFromStatus(statusId, statusGroups = [], allStatusGroups = []) {
  const option =
    findBoardStatusOption(statusGroups, statusId) ??
    findBoardStatusOption(allStatusGroups, statusId);

  return resolveIsClosedFromStatusOption(option);
}
