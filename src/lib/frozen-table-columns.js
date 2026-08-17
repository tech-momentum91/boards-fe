/**
 * Shared TanStack Table column-freezing (sticky header + pinned left/right columns).
 * Used by CRM list tables and any table that needs the same scroll behavior.
 */

/** Default id for the right-pinned actions column */
export const FROZEN_ACTIONS_COLUMN_ID = 'actions';

/** Layout class names for frozen table shells */
export const FROZEN_TABLE_CLASSES = {
  header: 'sticky top-0 z-30 bg-bg-weak-50',
  root: 'min-h-0 flex-1 overflow-auto',
  wrapper: 'flex h-full min-h-0 w-full flex-col',
  rootScrollX: 'w-full overflow-x-auto',
  rootFullWidth: 'w-full',
};

/** Corner header: stays fixed on vertical + horizontal scroll (z above table header row). */
const PINNED_CORNER_HEAD_CLASS = 'sticky top-0 z-40';

const LEFT_PIN_META = {
  headClassName: PINNED_CORNER_HEAD_CLASS,
};

const RIGHT_PIN_META = {
  headClassName: PINNED_CORNER_HEAD_CLASS,
};

const RIGHT_LEGACY_STICKY_META = {
  headClassName: 'sticky right-0 z-30 bg-bg-weak-50',
  cellClassName: 'border-stroke-soft-200 sticky right-0 z-30 bg-white',
};

/**
 * Extra column-def fields for the left (primary) frozen column.
 * @param {boolean} enabled
 * @returns {object}
 */
export function getFrozenLeftColumnExtras(enabled) {
  if (!enabled) return {};
  return {
    enablePinning: true,
    meta: { ...LEFT_PIN_META },
  };
}

/**
 * Meta / pinning extras for the right actions column.
 * @param {boolean} enabled - Use TanStack right pinning (no legacy CSS sticky).
 */
export function getFrozenActionsColumnExtras(enabled) {
  if (!enabled) {
    return { meta: { ...RIGHT_LEGACY_STICKY_META } };
  }
  return {
    enablePinning: true,
    meta: { ...RIGHT_PIN_META },
  };
}

/**
 * TanStack `columnPinning` state for left + optional right columns.
 * @param {object} options
 * @param {boolean} options.enabled
 * @param {string} [options.leftColumnId] - Single left-pinned column id.
 * @param {string[]} [options.leftColumnIds] - Multiple left-pinned column ids (e.g. center + client).
 * @param {string} [options.rightColumnId='actions']
 * @param {boolean} [options.hideActionsColumn=false]
 * @param {Array<{id?: string}>} [options.columns=[]] - Visible columns (to detect actions).
 * @returns {undefined | { left: string[], right: string[] }}
 */
export function buildFrozenColumnPinning({
  enabled,
  leftColumnId,
  leftColumnIds,
  rightColumnId = FROZEN_ACTIONS_COLUMN_ID,
  hideActionsColumn = false,
  columns = [],
}) {
  if (!enabled) return undefined;

  const left =
    Array.isArray(leftColumnIds) && leftColumnIds.length > 0
      ? leftColumnIds
      : leftColumnId
        ? [leftColumnId]
        : [];
  if (left.length === 0) return undefined;

  const columnIds = columns.map((c) => c.id).filter(Boolean);
  const hasRight = !hideActionsColumn && columnIds.includes(rightColumnId);

  return {
    left,
    right: hasRight ? [rightColumnId] : [],
  };
}

/**
 * Keep the actions column last (required for stable right pinning).
 * @param {Array<{id?: string}>} columns
 * @param {string} [actionsColumnId='actions']
 * @returns {Array<{id?: string}>}
 */
export function orderColumnsWithActionsLast(columns, actionsColumnId = FROZEN_ACTIONS_COLUMN_ID) {
  const actionsCol = columns.find((c) => c.id === actionsColumnId);
  if (!actionsCol) return columns;
  const rest = columns.filter((c) => c.id !== actionsColumnId);
  return [...rest, actionsCol];
}

/**
 * Wrapper around the table (outside Table.Root).
 * @param {boolean} enabled
 */
export function getFrozenWrapperClassName(enabled) {
  return enabled ? FROZEN_TABLE_CLASSES.wrapper : FROZEN_TABLE_CLASSES.rootFullWidth;
}

/**
 * Props for Table.Root.
 * @param {boolean} enabled
 * @param {object} [options]
 * @param {object} [options.tableInstance] - TanStack table instance when frozen.
 * @param {string} [options.unfrozenClassName] - Class when not frozen.
 */
export function getFrozenRootTableProps(enabled, { tableInstance, unfrozenClassName } = {}) {
  return {
    tableInstance: enabled ? tableInstance : undefined,
    className: enabled
      ? FROZEN_TABLE_CLASSES.root
      : (unfrozenClassName ?? FROZEN_TABLE_CLASSES.rootScrollX),
    stickyHeader: enabled,
  };
}

/**
 * Props for Table.Header.
 * @param {boolean} enabled
 */
export function getFrozenHeaderTableProps(enabled) {
  return enabled ? { className: FROZEN_TABLE_CLASSES.header } : {};
}

/**
 * Pass `column` into Table.Head / Table.Cell for pinning styles.
 * @param {boolean} enabled
 * @param {import('@tanstack/react-table').Column | undefined} column
 */
export function getFrozenTanStackColumnProp(enabled, column) {
  return enabled && column ? { column } : {};
}

/**
 * Merge frozen pinning into an existing TanStack `state` object.
 * @param {object} state
 * @param {ReturnType<typeof buildFrozenColumnPinning>} columnPinning
 */
export function withFrozenColumnPinning(state, columnPinning) {
  if (!columnPinning) return state;
  return { ...state, columnPinning };
}

/**
 * Options to spread into `useReactTable` for freezing.
 * @param {object} options - Same as buildFrozenColumnPinning
 * @returns {{ enableColumnPinning: boolean, columnPinning: object | undefined }}
 */
export function getFrozenReactTableOptions(options) {
  const columnPinning = buildFrozenColumnPinning(options);
  return {
    enableColumnPinning: Boolean(options.enabled),
    columnPinning,
  };
}
