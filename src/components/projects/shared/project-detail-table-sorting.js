import { parseToDate } from '@/utils/date-utils';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export function projectDetailAssigneeAccessor(row) {
  return (row?.assignees ?? [])
    .map((entry) => entry?.label ?? entry?.name ?? entry?.id ?? '')
    .filter(Boolean)
    .join(', ')
    .toLowerCase();
}

export function projectDetailDueDateAccessor(row) {
  return row?.exp_end_date ?? row?.due_date ?? '';
}

export function projectDetailPrioritySortingFn(rowA, rowB, columnId) {
  const rank = (value) => PRIORITY_ORDER[String(value ?? '').toLowerCase()] ?? 99;
  return rank(rowA.getValue(columnId)) - rank(rowB.getValue(columnId));
}

export function projectDetailDateSortingFn(rowA, rowB, columnId) {
  const toTime = (row) => parseToDate(row.getValue(columnId))?.getTime() ?? 0;
  return toTime(rowA) - toTime(rowB);
}

export function projectDetailNumericSortingFn(rowA, rowB, columnId) {
  const parse = (value) => {
    if (value == null || value === '') return 0;
    const normalized = Number(String(value).replaceAll(/[^\d.-]/g, ''));
    return Number.isFinite(normalized) ? normalized : 0;
  };
  return parse(rowA.getValue(columnId)) - parse(rowB.getValue(columnId));
}
