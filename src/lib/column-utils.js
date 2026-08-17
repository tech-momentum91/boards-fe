/**
 * Simplified Column Management Utilities
 */

import { FIRST_COLUMN_NAME } from '@/constants/constants';

/**
 * Prepare column definitions for configuration
 * Extracts labels and creates config objects
 */
export const prepareColumnsForConfig = (columnDefs) => {
  const getLabel = (col) => {
    // Check for explicit label first (from API columns)
    if (col.label) return col.label;
    if (col.columnLabel) return col.columnLabel;
    if (typeof col.header === 'string') return col.header;
    if (col.id) {
      return col.id
        .replaceAll('_', ' ')
        .replaceAll(/([A-Z])/g, ' $1')
        .trim()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    if (col.accessorKey) {
      return col.accessorKey
        .replaceAll('_', ' ')
        .replaceAll(/([A-Z])/g, ' $1')
        .trim()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    return 'Unnamed Column';
  };

  return columnDefs.map((col, index) => ({
    id: col.id || col.accessorKey || `col_${index}`,
    label: getLabel(col),
    visible: col.visible !== false, // Default to true
    order: index,
    enableHiding: col.enableHiding !== false,
  }));
};

/**
 * Apply column configuration to column definitions
 * Returns visible columns in configured order.
 * Columns that exist in columnDefs but not in columnConfig (e.g. new date columns
 * after changing the date range) are included as visible, preserving def order.
 */
export const applyColumnConfig = (
  columnDefs,
  columnConfig,
  defaultColumnConfig,
  pinnedColumnId,
) => {
  if (!columnConfig?.length) return columnDefs;

  const configById = new Map(columnConfig.map((c) => [c.id, c]));
  const defaultById =
    Array.isArray(defaultColumnConfig) && defaultColumnConfig.length > 0
      ? new Map(defaultColumnConfig.map((c) => [c.id, c]))
      : null;

  // For each current def: visibility/order from saved config; fall back to default column defs
  const withMeta = columnDefs.map((def, index) => {
    const id = def.id || def.accessorKey;
    const config = id ? configById.get(id) : null;
    const defaultCol = id && defaultById ? defaultById.get(id) : null;
    let visible = true;
    if (config != null) {
      visible = config.visible !== false;
    } else if (defaultCol != null) {
      visible = defaultCol.visible !== false;
    }
    return {
      def,
      order: config?.order ?? defaultCol?.order ?? index,
      visible,
    };
  });

  let result = withMeta
    .filter(({ visible }) => visible)
    .sort((a, b) => a.order - b.order)
    .map(({ def }) => def);

  // Ensure the pinned "first" column (if any) always appears first.
  // An explicit `pinnedColumnId` wins (when present in the result); otherwise fall
  // back to the first match from FIRST_COLUMN_NAME. The explicit override avoids the
  // heuristic picking the wrong column when a table has more than one candidate
  // (e.g. both `product` and `name`).
  if (pinnedColumnId && result.some((def) => (def.id || def.accessorKey) === pinnedColumnId)) {
    const index = result.findIndex((def) => (def.id || def.accessorKey) === pinnedColumnId);
    if (index > 0) {
      const reordered = [...result];
      const [pinned] = reordered.splice(index, 1);
      reordered.unshift(pinned);
      result = reordered;
    }
  } else if (
    FIRST_COLUMN_NAME &&
    Array.isArray(FIRST_COLUMN_NAME) &&
    FIRST_COLUMN_NAME.length > 0
  ) {
    const pinnedId = FIRST_COLUMN_NAME.find((key) =>
      result.some((def) => (def.id || def.accessorKey) === key),
    );
    if (pinnedId) {
      const index = result.findIndex((def) => (def.id || def.accessorKey) === pinnedId);
      if (index > 0) {
        const reordered = [...result];
        const [pinned] = reordered.splice(index, 1);
        reordered.unshift(pinned);
        result = reordered;
      }
    }
  }

  return result;
};

/** CRM Task Master / ACL tasks: keep Trigger Type → Drop Reason → Pipeline → Lifecycle Stage → Status contiguous. */
export const PIPELINE_LIFECYCLE_COLUMN_IDS = [
  'trigger_type',
  'drop_reason',
  'pipeline',
  'lifecycle_stage',
  'lifecycle_stage_status',
];

export function reorderPipelineLifecycleGroup(columnDefs) {
  if (!Array.isArray(columnDefs) || columnDefs.length === 0) return columnDefs;
  const getId = (c) => c?.id || c?.accessorKey;
  const groupOrder = PIPELINE_LIFECYCLE_COLUMN_IDS;
  let anchor = -1;
  const extracted = [];
  columnDefs.forEach((c, i) => {
    const id = getId(c);
    if (groupOrder.includes(id)) {
      extracted.push(c);
      if (anchor === -1 || i < anchor) anchor = i;
    }
  });
  if (extracted.length === 0) return columnDefs;
  const ordered = groupOrder.map((id) => extracted.find((c) => getId(c) === id)).filter(Boolean);
  const rest = columnDefs.filter((c) => !groupOrder.includes(getId(c)));
  let insertAt = 0;
  for (let i = 0; i < anchor; i += 1) {
    if (!groupOrder.includes(getId(columnDefs[i]))) insertAt += 1;
  }
  return [...rest.slice(0, insertAt), ...ordered, ...rest.slice(insertAt)];
}
