import {
  createDefaultStandardFieldVisibility,
  CUSTOM_TAB_ALL_FIELDS,
  STANDARD_TAB_FIELDS,
} from '../constants/list-custom-fields-constants';
import { RiText } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import { getErpFieldIcon, isErpColumn } from './erp-column-utils';

export const TITLE_COLUMN = {
  key: 'title',
  label: 'Title',
  sortable: true,
  builtin: true,
  fieldType: 'title',
};

export const PINNED_FIRST_COLUMN_KEY = TITLE_COLUMN.key;

/** Title must always remain the first column when present in the order. */
export function ensurePinnedFirstColumnOrder(order = [], pinnedKey = PINNED_FIRST_COLUMN_KEY) {
  if (!Array.isArray(order) || order.length === 0 || !pinnedKey) {
    return order;
  }

  if (!order.includes(pinnedKey)) {
    return order;
  }

  return [pinnedKey, ...order.filter((key) => key !== pinnedKey)];
}

/** @deprecated Use buildListColumns instead */
export const BUILTIN_LIST_COLUMNS = [
  TITLE_COLUMN,
  { key: 'assignee', label: 'Assignee', sortable: true, builtin: true, fieldType: 'people' },
  { key: 'dueDate', label: 'Due Date', builtin: true, fieldType: 'date' },
  { key: 'status', label: 'Status', builtin: true, fieldType: 'status' },
  { key: 'priority', label: 'Priority', sortable: true, builtin: true, fieldType: 'priority' },
];

const CUSTOM_FIELD_TYPE_ICONS = Object.fromEntries(
  CUSTOM_TAB_ALL_FIELDS.map((field) => [field.type, field.icon]),
);

export function getCustomColumnIcon(column = {}) {
  if (isErpColumn(column)) {
    return getErpFieldIcon(column.moduleId, column.fieldId, column.label);
  }

  return CUSTOM_FIELD_TYPE_ICONS[column.fieldType] ?? RiText;
}

export function normalizeCustomColumns(columns = []) {
  if (!Array.isArray(columns)) {
    return [];
  }

  return columns.map((column) => ({
    ...column,
    visible: column.visible !== false,
  }));
}

export function createCustomFieldsVisibilityState(customColumns = []) {
  return normalizeCustomColumns(customColumns).map((column) => ({
    id: column.fieldId ?? column.key,
    label: column.label,
    icon: getCustomColumnIcon(column),
    visible: column.visible !== false,
  }));
}

const BUILTIN_FIELD_ID_TO_COLUMN_KEY = Object.fromEntries(
  STANDARD_TAB_FIELDS.map((field) => [field.id, field.key]),
);

export function getBuiltinColumnKeyForField(field) {
  return BUILTIN_FIELD_ID_TO_COLUMN_KEY[field?.id] ?? null;
}

export function getListColumnsStorageKey(listId) {
  return `devx-board-list-custom-columns-${listId}`;
}

export function getStandardVisibilityStorageKey(listId) {
  return `devx-board-list-standard-visibility-${listId}`;
}

export function loadCustomColumns(listId) {
  if (!listId) {
    return [];
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(getListColumnsStorageKey(listId)));
    return normalizeCustomColumns(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

export function saveCustomColumns(listId, columns) {
  if (!listId) {
    return;
  }

  try {
    localStorage.setItem(getListColumnsStorageKey(listId), JSON.stringify(columns));
  } catch {
    // ignore storage errors
  }
}

export function loadStandardColumnVisibility(listId) {
  if (!listId) {
    return createDefaultStandardFieldVisibility();
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(getStandardVisibilityStorageKey(listId)));
    if (!parsed || typeof parsed !== 'object') {
      return createDefaultStandardFieldVisibility();
    }

    return {
      ...createDefaultStandardFieldVisibility(),
      ...parsed,
    };
  } catch {
    return createDefaultStandardFieldVisibility();
  }
}

export function saveStandardColumnVisibility(listId, visibility) {
  if (!listId) {
    return;
  }

  try {
    localStorage.setItem(getStandardVisibilityStorageKey(listId), JSON.stringify(visibility));
  } catch {
    // ignore storage errors
  }
}

export function getColumnOrderStorageKey(listId) {
  return `devx-board-list-column-order-${listId}`;
}

export function loadColumnOrder(listId) {
  if (!listId) {
    return [];
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(getColumnOrderStorageKey(listId)));
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function saveColumnOrder(listId, order) {
  if (!listId) {
    return;
  }

  try {
    localStorage.setItem(getColumnOrderStorageKey(listId), JSON.stringify(order));
  } catch {
    // ignore storage errors
  }
}

export function getColumnSortStorageKey(listId) {
  return `devx-board-list-column-sort-${listId}`;
}

export function loadColumnSort(listId) {
  if (!listId) {
    return [];
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(getColumnSortStorageKey(listId)));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveColumnSort(listId, sortRules) {
  if (!listId) {
    return;
  }

  try {
    localStorage.setItem(getColumnSortStorageKey(listId), JSON.stringify(sortRules));
  } catch {
    // ignore storage errors
  }
}

/** Keep saved order while dropping removed keys and appending any new columns. */
export function reconcileColumnOrder(order = [], columns = []) {
  const keys = columns.map((column) => column.key);
  const keySet = new Set(keys);
  const reconciled = [];
  const seen = new Set();

  if (Array.isArray(order)) {
    order.forEach((key) => {
      if (keySet.has(key) && !seen.has(key)) {
        reconciled.push(key);
        seen.add(key);
      }
    });
  }

  keys.forEach((key) => {
    if (!seen.has(key)) {
      reconciled.push(key);
    }
  });

  return ensurePinnedFirstColumnOrder(reconciled);
}

export function applyColumnOrder(columns = [], order = []) {
  if (!Array.isArray(order) || order.length === 0) {
    return columns;
  }

  const columnMap = new Map(columns.map((column) => [column.key, column]));
  const ordered = [];
  const seen = new Set();

  order.forEach((key) => {
    if (columnMap.has(key) && !seen.has(key)) {
      ordered.push(columnMap.get(key));
      seen.add(key);
    }
  });

  columns.forEach((column) => {
    if (!seen.has(column.key)) {
      ordered.push(column);
    }
  });

  return ordered;
}

export function buildStandardColumns(visibility = {}) {
  return STANDARD_TAB_FIELDS.filter((field) => visibility[field.id] ?? field.defaultVisible).map(
    (field) => ({
      key: field.key,
      label: field.label,
      sortable: Boolean(field.sortable),
      builtin: true,
      fieldType: field.fieldType,
      standardFieldId: field.id,
    }),
  );
}

export function buildListColumns(customColumns = [], standardVisibility = {}) {
  const visibleCustomColumns = normalizeCustomColumns(customColumns).filter(
    (column) => column.visible !== false,
  );

  return [TITLE_COLUMN, ...buildStandardColumns(standardVisibility), ...visibleCustomColumns];
}

export function createCustomColumnFromField(field) {
  return {
    key: field.id,
    fieldId: field.id,
    label: field.label,
    fieldType: field.type,
    templateId: field.templateId,
    config: field.config ?? {},
    custom: true,
    visible: true,
  };
}

export function getColumnWidthTrack(column = {}, { isTableLayout = false } = {}) {
  if (isTableLayout) {
    return getTableColumnWidthTrack(column);
  }

  // Every column uses a flexible `minmax(min, fr)` track so the whole table
  // distributes spare horizontal space (e.g. when the sidebar collapses) across
  // all columns proportionally, while keeping per-type minimums so the table
  // can still scroll horizontally once many columns are added.
  if (column.key === 'title') {
    return 'minmax(240px, 2.5fr)';
  }

  if (isErpColumn(column)) {
    return 'minmax(160px, 1.2fr)';
  }

  switch (column.fieldType) {
    case 'status':
      return 'minmax(160px, 1.2fr)';
    case 'priority':
      return 'minmax(130px, 1fr)';
    case 'tags':
      return 'minmax(150px, 1.4fr)';
    case 'people':
      return 'minmax(140px, 1fr)';
    case 'date':
      return 'minmax(130px, 1fr)';
    case 'checkbox':
      return 'minmax(90px, 0.6fr)';
    case 'dropdown':
    case 'labels':
      return 'minmax(150px, 1.2fr)';
    case 'long-text':
      return 'minmax(180px, 1.6fr)';
    case 'number':
      return 'minmax(110px, 0.8fr)';
    case 'image':
      return 'minmax(110px, 0.7fr)';
    case 'file-upload':
    case 'url':
      return 'minmax(160px, 1.4fr)';
    default:
      return 'minmax(140px, 1fr)';
  }
}

export function getTableColumnDefaultWidth(column = {}) {
  if (column.key === 'title') {
    return 160;
  }

  if (isErpColumn(column)) {
    return 140;
  }

  switch (column.fieldType) {
    case 'status':
      return 148;
    case 'priority':
      return 92;
    case 'tags':
      return 112;
    case 'people':
      return 88;
    case 'date':
      return 96;
    case 'checkbox':
      return 72;
    case 'dropdown':
    case 'labels':
      return 108;
    case 'long-text':
      return 128;
    case 'number':
      return 80;
    case 'image':
      return 80;
    case 'file-upload':
    case 'url':
      return 112;
    default:
      return 96;
  }
}

export const TABLE_COLUMN_MIN_WIDTH = 56;
export const TABLE_COLUMN_MAX_WIDTH = 640;

export function getTableColumnWidthPx(column = {}, columnWidths = {}) {
  const saved = columnWidths[column.key];

  if (typeof saved === 'number' && Number.isFinite(saved)) {
    return Math.max(TABLE_COLUMN_MIN_WIDTH, Math.min(TABLE_COLUMN_MAX_WIDTH, saved));
  }

  return getTableColumnDefaultWidth(column);
}

export function getTableColumnWidthTrack(column = {}, columnWidths = {}) {
  return `${getTableColumnWidthPx(column, columnWidths)}px`;
}

export function getDataGridTemplateColumns(columns, options = {}) {
  return columns.map((column) => getColumnWidthTrack(column, options)).join(' ');
}

export function getTableDataGridTemplateColumns(columns, columnWidths = {}) {
  return columns.map((column) => getTableColumnWidthTrack(column, columnWidths)).join(' ');
}

/** @deprecated Use getDataGridTemplateColumns for data columns; actions are rendered separately */
export function getGridTemplateColumns(columns, options = {}) {
  return `${getDataGridTemplateColumns(columns, options)} 48px`;
}

export const TABLE_INDEX_COL = '36px';
export const TABLE_FILLER_COL = '1fr';
export const TABLE_ACTIONS_COL = '28px';
export const TABLE_ROW_HEIGHT_CLASS = 'h-8';

export function getTableGridTemplateColumns(columns, columnWidths = {}) {
  return `${TABLE_INDEX_COL} ${getTableDataGridTemplateColumns(columns, columnWidths)} ${TABLE_FILLER_COL} ${TABLE_ACTIONS_COL}`;
}

export function getTableCellBorderClass(isTableLayout = false) {
  return isTableLayout ? 'border-r border-stroke-soft-200' : '';
}

export const TABLE_INDEX_HEADER_CLASS =
  'sticky left-0 z-[22] flex h-8 shrink-0 items-center justify-center border-r border-stroke-soft-200 bg-bg-weak-100';

export const TABLE_INDEX_CELL_CLASS =
  'sticky left-0 z-[3] flex h-8 shrink-0 items-center justify-center border-r border-stroke-soft-200 bg-bg-white-0 text-xs text-text-soft-400 group-hover/row:bg-bg-weak-50';

export const TABLE_FILLER_HEADER_CLASS =
  'flex h-8 min-w-0 border-r border-stroke-soft-200 bg-bg-weak-100';

export const TABLE_FILLER_CELL_CLASS =
  'flex h-8 min-w-0 border-r border-stroke-soft-200 bg-bg-white-0 group-hover/row:bg-bg-weak-50';

export function getTableHeaderCellClass() {
  return 'relative flex h-8 min-w-0 select-none items-center gap-1 overflow-hidden border-r border-stroke-soft-200 px-2';
}

export function getTableDataCellClass(column = null) {
  const isStatus = column?.key === 'status' || column?.fieldType === 'status';
  return cn(
    'flex h-8 min-w-0 items-center border-r border-stroke-soft-200 p-0',
    isStatus ? 'overflow-visible' : 'overflow-hidden',
  );
}

export function getListTableGridStyle(gridTemplateColumns) {
  return {
    display: 'grid',
    gridTemplateColumns,
    width: '100%',
    minWidth: '100%',
  };
}

export function getTableListGridStyle(gridTemplateColumns) {
  return {
    display: 'grid',
    gridTemplateColumns,
    width: '100%',
    minWidth: '100%',
    alignContent: 'start',
    gridAutoRows: 'min-content',
  };
}

export function getListTableRowStyle() {
  return {
    display: 'grid',
    gridTemplateColumns: 'subgrid',
    gridColumn: '1 / -1',
  };
}

/** @deprecated Use getListTableGridStyle */
export function getDataGridStyle(dataGridTemplateColumns) {
  return getListTableGridStyle(dataGridTemplateColumns);
}

export const LIST_TABLE_ACTIONS_COLUMN_CLASS = 'flex w-12 shrink-0 items-center justify-center';

const LIST_TABLE_TITLE_STICKY_CLASS = 'sticky left-0';

export const LIST_TABLE_TITLE_HEADER_CLASS = `${LIST_TABLE_TITLE_STICKY_CLASS} z-[3] bg-bg-weak-100`;

export const LIST_TABLE_TITLE_CELL_CLASS = `${LIST_TABLE_TITLE_STICKY_CLASS} z-[2] bg-bg-white-0 group-hover/row:bg-bg-weak-50`;

const LIST_TABLE_STICKY_ACTIONS_CLASS =
  'sticky right-0 border-l border-stroke-soft-200 shadow-[-8px_0_16px_-8px_rgba(15,23,42,0.12)]';

export const LIST_TABLE_ACTIONS_HEADER_CLASS = `${LIST_TABLE_ACTIONS_COLUMN_CLASS} ${LIST_TABLE_STICKY_ACTIONS_CLASS} z-[3] h-10 bg-bg-weak-100`;

export const LIST_TABLE_ACTIONS_CELL_CLASS = `${LIST_TABLE_ACTIONS_COLUMN_CLASS} ${LIST_TABLE_STICKY_ACTIONS_CLASS} z-[2] bg-bg-white-0 group-hover/row:bg-bg-weak-50`;

const TABLE_TITLE_STICKY_CLASS = 'sticky left-9 z-[2] border-r border-stroke-soft-200 bg-inherit';

export const TABLE_TITLE_HEADER_CLASS = `${TABLE_TITLE_STICKY_CLASS} bg-bg-weak-100`;

export const TABLE_TITLE_CELL_CLASS =
  'sticky left-9 z-[2] border-r border-stroke-soft-200 bg-bg-white-0 group-hover/row:bg-bg-weak-50';

const TABLE_STICKY_ACTIONS_CLASS =
  'sticky right-0 z-[2] border-l border-stroke-soft-200 bg-inherit';

export const TABLE_ACTIONS_HEADER_CLASS = `${TABLE_STICKY_ACTIONS_CLASS} flex h-8 w-7 shrink-0 items-center justify-center bg-bg-weak-100`;

export const TABLE_ACTIONS_CELL_CLASS = `${TABLE_STICKY_ACTIONS_CLASS} flex h-8 w-7 shrink-0 items-center justify-center bg-bg-white-0 group-hover/row:bg-bg-weak-50`;

export function getTableStickyColumnClass(
  column,
  { isTableLayout = false, isHeader = false, isSelected = false } = {},
) {
  if (!isTableLayout || column?.key !== 'title') {
    return '';
  }

  if (isHeader) {
    return cn(TABLE_TITLE_HEADER_CLASS, 'z-[21]');
  }

  return cn(TABLE_TITLE_CELL_CLASS, isSelected && '!bg-primary-alpha-10');
}

export function getTableActionsCellClass(isHeader = false) {
  return isHeader ? TABLE_ACTIONS_HEADER_CLASS : TABLE_ACTIONS_CELL_CLASS;
}
