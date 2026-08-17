import { cn } from '@/utils/cn';

/** Wrapper for inline editors — fills the cell without shrinking below column width. */
export const PROJECT_DETAIL_INLINE_CELL = 'w-full min-w-0';

/** Align borderless inline controls with column headers (offset default cell padding). */
export const PROJECT_DETAIL_INLINE_FIELD_CLASS = 'w-full -ml-2';

/** Select / datepicker trigger alignment inside table cells. */
export const PROJECT_DETAIL_INLINE_TRIGGER_CLASS = 'h-8 w-full -ml-2';

/** Area field trigger — alignment + suppress focus ring in tables. */
export const PROJECT_DETAIL_INLINE_AREA_TRIGGER_CLASS =
  'h-8 w-full -ml-2 focus:!shadow-none focus:!ring-transparent data-[state=open]:!shadow-none data-[state=open]:before:!ring-transparent hover:bg-transparent';

/** Scrollable table shell: horizontal scroll when columns exceed viewport, no cell bleed. */
export const PROJECT_DETAIL_TABLE_ROOT_CLASS =
  'w-full overflow-x-auto [&_table]:table-fixed [&_table]:w-full [&_table]:min-w-[1240px] [&_td]:overflow-hidden [&_th]:overflow-hidden';

/** Wider min-width for tables with many columns (e.g. Snags). */
export const PROJECT_DETAIL_WIDE_TABLE_ROOT_CLASS =
  'w-full overflow-x-auto [&_table]:table-fixed [&_table]:w-full [&_table]:min-w-[1600px] [&_td]:overflow-hidden [&_th]:overflow-hidden';

const INLINE_EDITABLE_COLUMNS = new Set([
  'assignee',
  'floor',
  'area',
  'due_date',
  'status',
  'priority',
  'category',
]);

export function projectDetailColumnMeta(widths, key, { fluidKeys = [] } = {}) {
  const width = widths[key];
  const isFluid = fluidKeys.includes(key);
  const tightPadding = INLINE_EDITABLE_COLUMNS.has(key) ? '!px-2' : '';

  if (isFluid) {
    return {
      headClassName: cn('whitespace-nowrap', tightPadding),
      cellClassName: cn(width, 'overflow-hidden', tightPadding),
    };
  }

  return {
    headClassName: cn(width, 'whitespace-nowrap', tightPadding),
    cellClassName: cn(width, 'overflow-hidden', tightPadding),
  };
}
