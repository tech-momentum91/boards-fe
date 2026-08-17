import { useMemo } from 'react';
import {
  FROZEN_TABLE_CLASSES,
  buildFrozenColumnPinning,
  getFrozenHeaderTableProps,
  getFrozenRootTableProps,
  getFrozenTanStackColumnProp,
  getFrozenWrapperClassName,
} from '@/lib/frozen-table-columns';

/**
 * Memoized frozen-column layout + pinning config for TanStack tables.
 *
 * @param {object} options
 * @param {boolean} options.enabled
 * @param {string} options.leftColumnId - Column id pinned on the left (e.g. `brand_name`, `name`).
 * @param {string} [options.rightColumnId='actions']
 * @param {boolean} [options.hideActionsColumn=false]
 * @param {Array<{id?: string}>} [options.columns=[]]
 */
export function useFrozenTableColumns({
  enabled,
  leftColumnId,
  rightColumnId,
  hideActionsColumn = false,
  columns = [],
}) {
  const columnPinning = useMemo(
    () =>
      buildFrozenColumnPinning({
        enabled,
        leftColumnId,
        rightColumnId,
        hideActionsColumn,
        columns,
      }),
    [enabled, leftColumnId, rightColumnId, hideActionsColumn, columns],
  );

  const pinningOptions = useMemo(
    () => ({
      enableColumnPinning: Boolean(enabled),
      columnPinning,
    }),
    [enabled, columnPinning],
  );

  const layout = useMemo(
    () => ({
      wrapperClassName: getFrozenWrapperClassName(enabled),
      headerProps: getFrozenHeaderTableProps(enabled),
      classes: FROZEN_TABLE_CLASSES,
    }),
    [enabled],
  );

  return {
    columnPinning,
    ...pinningOptions,
    ...layout,
    getRootTableProps: (tableInstance, unfrozenClassName) =>
      getFrozenRootTableProps(enabled, { tableInstance, unfrozenClassName }),
    getHeaderColumnProp: (header) => getFrozenTanStackColumnProp(enabled, header?.column),
    getCellColumnProp: (cell) => getFrozenTanStackColumnProp(enabled, cell?.column),
    withTableState: (state) => (columnPinning ? { ...state, columnPinning } : state),
  };
}
