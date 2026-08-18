import type { CSSProperties, KeyboardEventHandler, MouseEventHandler, ReactNode } from 'react';

export type BoardLayoutMode = 'list' | 'table' | 'calendar';
export type CalendarLayoutMode = 'day' | 'week' | 'month';
export type CalendarDateField = 'creation' | 'startDate' | 'dueDate';
export type TaskViewType = 'List' | 'Table' | 'Calendar';
export type ViewSaveScope = 'me' | 'all';
export type RowHeightSetting = 'default' | 'compact' | 'comfortable' | string;

export interface CustomColumn {
  key?: string;
  fieldId?: string;
  label?: string;
  fieldType?: string;
  visible?: boolean;
  moduleId?: string;
  [key: string]: unknown;
}

export interface ColumnsConfig {
  customColumns?: CustomColumn[];
  standardVisibility?: Record<string, boolean>;
  columnOrder?: string[];
  columnCalculations?: Record<string, unknown>;
  columnWidths?: Record<string, number>;
  frozenColumns?: string[];
}

export interface TaskViewRecord {
  id?: string;
  name?: string;
  title?: string;
  viewType?: TaskViewType;
  view_type?: TaskViewType;
  list?: string;
  isDefault?: boolean;
  is_default?: boolean;
  sortOrder?: number;
  sort_order?: number;
  favorite?: boolean;
  archived?: boolean;
  isPersonal?: boolean;
  is_personal?: boolean;
  filtersJson?: unknown;
  filters_json?: unknown;
  columnsJson?: unknown;
  columns_json?: unknown;
  groupingJson?: unknown;
  grouping_json?: unknown;
  sortingJson?: unknown;
  sorting_json?: unknown;
  permissionsJson?: unknown;
  permissions_json?: unknown;
  settingsJson?: unknown;
  settings_json?: unknown;
}

export interface NormalizedTaskView extends TaskViewRecord {
  id: string;
  name: string;
  title: string;
  viewType: TaskViewType;
  isDefault: boolean;
  sortOrder: number;
  isPersonal: boolean;
}

export interface ParsedViewSettings {
  customColumns: CustomColumn[];
  standardVisibility: Record<string, boolean>;
  columnOrder: string[];
  columnSort: ColumnSortEntry[];
  fieldFilters: FieldFilterEntry[];
  groupBy: unknown;
  columnCalculations: Record<string, unknown>;
  columnWidths: Record<string, number>;
  frozenColumns: string[];
  wrapText: boolean;
  rowHeight: RowHeightSetting;
  showClosedOnly: boolean;
  showAssignedToMeOnly: boolean;
  calendarDateField: CalendarDateField;
  calendarLayoutMode: CalendarLayoutMode;
}

export interface ColumnSortEntry {
  key?: string;
  direction?: 'asc' | 'desc';
  [key: string]: unknown;
}

export interface FieldFilterEntry {
  field?: string;
  operator?: string;
  value?: unknown;
  [key: string]: unknown;
}

export interface ViewSettingsSnapshot extends ParsedViewSettings {}

export interface ViewSettingsRefs {
  customColumns?: CustomColumn[];
  standardVisibility?: Record<string, boolean>;
  columnOrder?: string[];
  columnSort?: ColumnSortEntry[];
  columnWidths?: Record<string, number>;
  frozenColumns?: string[];
}

export interface CachedViewSettings {
  customColumns: CustomColumn[];
  standardVisibility: Record<string, boolean>;
  columnOrder: string[];
  columnSort: ColumnSortEntry[];
  columnWidths: Record<string, number>;
}

export interface BoardStatusOption {
  id?: string;
  value?: string;
  name?: string;
  label?: string;
  color?: string;
  category?: string;
  isClosed?: boolean;
  percentage?: number;
  [key: string]: unknown;
}

export interface BoardStatusOptionGroup {
  key: string;
  label: string;
  options: BoardStatusOption[];
}

export interface BoardItemRef {
  type?: string;
  [key: string]: unknown;
}

export interface BoardTask {
  id?: string;
  name?: string;
  title: string;
  status?: string | null;
  startDate?: string | null;
  start_date?: string | null;
  dueDate?: string | null;
  due_date?: string | null;
  creation?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface BoardStatusGroup {
  options?: BoardStatusOption[];
  [key: string]: unknown;
}

export interface CalendarDropTarget {
  zone: 'month' | 'allday' | 'time';
  dateKey: string;
  hour: number | null;
}

export interface CalendarDropZoneProps {
  zone: CalendarDropTarget['zone'];
  dateKey: string;
  hour?: number | null;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement>;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  role?: string;
  tabIndex?: number;
  'aria-label'?: string;
}
