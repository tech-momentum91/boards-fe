import { updateTaskView } from '@/services/task-view-service';
import type { ServiceResult } from '@/types/api';
import {
  loadColumnOrder,
  loadColumnSort,
  loadCustomColumns,
  loadStandardColumnVisibility,
  normalizeCustomColumns,
} from '../list/utils/list-columns';
import {
  createDefaultStandardFieldVisibility,
  STANDARD_TAB_FIELDS,
} from '../list/constants/list-custom-fields-constants';
import { TASK_VIEW_TYPES } from '../../constants/task-view-constants';
import {
  DEFAULT_BOARD_CALENDAR_DATE_FIELD,
  DEFAULT_BOARD_CALENDAR_LAYOUT_MODE,
  normalizeBoardCalendarDateField,
  normalizeBoardCalendarLayoutMode,
} from '../calendar/board-calendar-utils';
import type {
  CachedViewSettings,
  CalendarDateField,
  CalendarLayoutMode,
  ColumnsConfig,
  ParsedViewSettings,
  TaskViewRecord,
  TaskViewType,
  ViewSaveScope,
  ViewSettingsRefs,
  ViewSettingsSnapshot,
} from './types';

function getViewStoragePrefix(viewId: string): string {
  return `devx-board-task-view-${viewId}`;
}

export function getViewCustomColumnsStorageKey(viewId: string): string {
  return `${getViewStoragePrefix(viewId)}-custom-columns`;
}

export function getViewStandardVisibilityStorageKey(viewId: string): string {
  return `${getViewStoragePrefix(viewId)}-standard-visibility`;
}

export function getViewColumnOrderStorageKey(viewId: string): string {
  return `${getViewStoragePrefix(viewId)}-column-order`;
}

export function getViewColumnSortStorageKey(viewId: string): string {
  return `${getViewStoragePrefix(viewId)}-column-sort`;
}

export function getViewColumnWidthsStorageKey(viewId: string): string {
  return `${getViewStoragePrefix(viewId)}-column-widths`;
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (value == null || value === '') {
    return fallback;
  }

  if (typeof value === 'object') {
    return value as T;
  }

  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

export function createTableDefaultStandardVisibility(): Record<string, boolean> {
  return Object.fromEntries(
    STANDARD_TAB_FIELDS.map((field) => [
      field.id,
      field.id === 'assignee' || field.id === 'priority',
    ]),
  );
}

export const TABLE_DEFAULT_COLUMN_ORDER = ['title', 'assignee', 'priority'];

export const TABLE_DEFAULT_FROZEN_COLUMNS = ['title'];

export function createTableDefaultColumnSettings(): ColumnsConfig {
  return {
    customColumns: [],
    standardVisibility: createTableDefaultStandardVisibility(),
    columnOrder: [...TABLE_DEFAULT_COLUMN_ORDER],
    frozenColumns: [...TABLE_DEFAULT_FROZEN_COLUMNS],
    columnCalculations: {},
    columnWidths: {},
  };
}

function isEmptyColumnConfig(columnsConfig: ColumnsConfig = {}): boolean {
  if (!columnsConfig || typeof columnsConfig !== 'object') {
    return true;
  }

  const hasVisibility =
    columnsConfig.standardVisibility && Object.keys(columnsConfig.standardVisibility).length > 0;
  const hasOrder = Array.isArray(columnsConfig.columnOrder) && columnsConfig.columnOrder.length > 0;
  const hasCustom =
    Array.isArray(columnsConfig.customColumns) && columnsConfig.customColumns.length > 0;

  return !hasVisibility && !hasOrder && !hasCustom;
}

export function hasStoredViewColumnSettings(taskView: TaskViewRecord = {}): boolean {
  const columnsConfig = parseJsonValue<ColumnsConfig>(
    taskView.columnsJson ?? taskView.columns_json,
    {},
  );
  return !isEmptyColumnConfig(columnsConfig);
}

export function parseTaskViewSettings(
  taskView: TaskViewRecord = {},
  { viewType = null }: { viewType?: TaskViewType | null } = {},
): ParsedViewSettings {
  const columnsConfig = parseJsonValue<ColumnsConfig>(
    taskView.columnsJson ?? taskView.columns_json,
    {},
  );
  const filtersConfig = parseJsonValue<{ fieldFilters?: ParsedViewSettings['fieldFilters'] }>(
    taskView.filtersJson ?? taskView.filters_json,
    {},
  );
  const sortingConfig = parseJsonValue<{
    columnSort?: ParsedViewSettings['columnSort'];
  }>(taskView.sortingJson ?? taskView.sorting_json, {});
  const groupingConfig = parseJsonValue<unknown>(
    taskView.groupingJson ?? taskView.grouping_json,
    null,
  );
  const uiConfig = parseJsonValue<{
    wrapText?: boolean;
    rowHeight?: ParsedViewSettings['rowHeight'];
    showClosedOnly?: boolean;
    showAssignedToMeOnly?: boolean;
    calendarDateField?: ParsedViewSettings['calendarDateField'];
    calendarLayoutMode?: ParsedViewSettings['calendarLayoutMode'];
  }>(taskView.settingsJson ?? taskView.settings_json, {});

  const resolvedViewType = viewType ?? taskView.viewType ?? taskView.view_type;
  const tableDefaults =
    resolvedViewType === TASK_VIEW_TYPES.TABLE && isEmptyColumnConfig(columnsConfig)
      ? createTableDefaultColumnSettings()
      : null;

  const mergedColumnConfig = tableDefaults ?? columnsConfig;
  const groupingRecord =
    groupingConfig && typeof groupingConfig === 'object' && !Array.isArray(groupingConfig)
      ? (groupingConfig as { groupBy?: unknown })
      : null;

  return {
    customColumns: normalizeCustomColumns(mergedColumnConfig.customColumns ?? []),
    standardVisibility: {
      ...(resolvedViewType === TASK_VIEW_TYPES.TABLE
        ? createTableDefaultStandardVisibility()
        : createDefaultStandardFieldVisibility()),
      ...mergedColumnConfig.standardVisibility,
    },
    columnOrder:
      Array.isArray(mergedColumnConfig.columnOrder) && mergedColumnConfig.columnOrder.length > 0
        ? mergedColumnConfig.columnOrder
        : resolvedViewType === TASK_VIEW_TYPES.TABLE
          ? [...TABLE_DEFAULT_COLUMN_ORDER]
          : [],
    columnSort: Array.isArray(sortingConfig.columnSort ?? sortingConfig)
      ? (sortingConfig.columnSort ?? (sortingConfig as ParsedViewSettings['columnSort']))
      : [],
    fieldFilters: Array.isArray(filtersConfig.fieldFilters) ? filtersConfig.fieldFilters : [],
    groupBy: groupingRecord?.groupBy ?? groupingConfig ?? null,
    columnCalculations: mergedColumnConfig.columnCalculations ?? {},
    columnWidths: mergedColumnConfig.columnWidths ?? {},
    frozenColumns:
      Array.isArray(mergedColumnConfig.frozenColumns) && mergedColumnConfig.frozenColumns.length > 0
        ? mergedColumnConfig.frozenColumns
        : resolvedViewType === TASK_VIEW_TYPES.TABLE
          ? [...TABLE_DEFAULT_FROZEN_COLUMNS]
          : [],
    wrapText: Boolean(uiConfig.wrapText),
    rowHeight: uiConfig.rowHeight ?? 'default',
    showClosedOnly: Boolean(uiConfig.showClosedOnly),
    showAssignedToMeOnly: Boolean(uiConfig.showAssignedToMeOnly),
    calendarDateField: normalizeBoardCalendarDateField(
      uiConfig.calendarDateField ?? DEFAULT_BOARD_CALENDAR_DATE_FIELD,
    ) as CalendarDateField,
    calendarLayoutMode: normalizeBoardCalendarLayoutMode(
      uiConfig.calendarLayoutMode ?? DEFAULT_BOARD_CALENDAR_LAYOUT_MODE,
    ) as CalendarLayoutMode,
  };
}

export function buildTaskViewSettingsPayload(settings: Partial<ParsedViewSettings> = {}) {
  return {
    columns_json: {
      customColumns: settings.customColumns ?? [],
      standardVisibility: settings.standardVisibility ?? {},
      columnOrder: settings.columnOrder ?? [],
      columnCalculations: settings.columnCalculations ?? {},
      columnWidths: settings.columnWidths ?? {},
      frozenColumns: settings.frozenColumns ?? [],
    },
    sorting_json: {
      columnSort: settings.columnSort ?? [],
    },
    filters_json: {
      fieldFilters: settings.fieldFilters ?? [],
    },
    grouping_json: settings.groupBy ?? null,
    settings_json: {
      wrapText: Boolean(settings.wrapText),
      rowHeight: settings.rowHeight ?? 'default',
      showClosedOnly: Boolean(settings.showClosedOnly),
      showAssignedToMeOnly: Boolean(settings.showAssignedToMeOnly),
      calendarDateField: normalizeBoardCalendarDateField(
        settings.calendarDateField ?? DEFAULT_BOARD_CALENDAR_DATE_FIELD,
      ),
      calendarLayoutMode: normalizeBoardCalendarLayoutMode(
        settings.calendarLayoutMode ?? DEFAULT_BOARD_CALENDAR_LAYOUT_MODE,
      ),
    },
  };
}

export function buildTaskViewRecordPatch(settings: Partial<ParsedViewSettings> = {}) {
  const payload = buildTaskViewSettingsPayload(settings);

  return {
    columnsJson: payload.columns_json,
    sortingJson: payload.sorting_json,
    filtersJson: payload.filters_json,
    groupingJson: payload.grouping_json,
    settingsJson: payload.settings_json,
  };
}

export function clearViewSettingsCache(viewId: string): void {
  if (!viewId) {
    return;
  }

  try {
    localStorage.removeItem(getViewCustomColumnsStorageKey(viewId));
    localStorage.removeItem(getViewStandardVisibilityStorageKey(viewId));
    localStorage.removeItem(getViewColumnOrderStorageKey(viewId));
    localStorage.removeItem(getViewColumnSortStorageKey(viewId));
    localStorage.removeItem(getViewColumnWidthsStorageKey(viewId));
  } catch {
    // ignore storage errors
  }
}

export function mergeCachedViewSettings(
  parsed: ParsedViewSettings,
  viewId: string,
): ParsedViewSettings {
  const cached = loadViewSettingsFromCache(viewId);

  if (!cached) {
    return parsed;
  }

  return {
    ...parsed,
    customColumns: cached.customColumns.length ? cached.customColumns : parsed.customColumns,
    standardVisibility: {
      ...parsed.standardVisibility,
      ...cached.standardVisibility,
    },
    columnOrder: cached.columnOrder.length ? cached.columnOrder : parsed.columnOrder,
    columnSort: cached.columnSort.length ? cached.columnSort : parsed.columnSort,
    columnWidths: {
      ...parsed.columnWidths,
      ...cached.columnWidths,
    },
  };
}

export function loadViewSettingsFromCache(viewId: string): CachedViewSettings | null {
  if (!viewId) {
    return null;
  }

  try {
    const customColumns = JSON.parse(
      localStorage.getItem(getViewCustomColumnsStorageKey(viewId)) ?? 'null',
    );
    const standardVisibility = JSON.parse(
      localStorage.getItem(getViewStandardVisibilityStorageKey(viewId)) ?? 'null',
    );
    const columnOrder = JSON.parse(
      localStorage.getItem(getViewColumnOrderStorageKey(viewId)) ?? 'null',
    );
    const columnSort = JSON.parse(
      localStorage.getItem(getViewColumnSortStorageKey(viewId)) ?? 'null',
    );
    const columnWidths = JSON.parse(
      localStorage.getItem(getViewColumnWidthsStorageKey(viewId)) ?? 'null',
    );

    if (
      customColumns == null &&
      standardVisibility == null &&
      columnOrder == null &&
      columnSort == null &&
      columnWidths == null
    ) {
      return null;
    }

    return {
      customColumns: normalizeCustomColumns(Array.isArray(customColumns) ? customColumns : []),
      standardVisibility: standardVisibility ?? createTableDefaultStandardVisibility(),
      columnOrder: Array.isArray(columnOrder) ? columnOrder : [],
      columnSort: Array.isArray(columnSort) ? columnSort : [],
      columnWidths: columnWidths && typeof columnWidths === 'object' ? columnWidths : {},
    };
  } catch {
    return null;
  }
}

export function saveViewSettingsToCache(
  viewId: string,
  settings: Partial<ParsedViewSettings> = {},
): void {
  if (!viewId) {
    return;
  }

  try {
    if (settings.customColumns) {
      localStorage.setItem(
        getViewCustomColumnsStorageKey(viewId),
        JSON.stringify(settings.customColumns),
      );
    }

    if (settings.standardVisibility) {
      localStorage.setItem(
        getViewStandardVisibilityStorageKey(viewId),
        JSON.stringify(settings.standardVisibility),
      );
    }

    if (settings.columnOrder) {
      localStorage.setItem(
        getViewColumnOrderStorageKey(viewId),
        JSON.stringify(settings.columnOrder),
      );
    }

    if (settings.columnSort) {
      localStorage.setItem(
        getViewColumnSortStorageKey(viewId),
        JSON.stringify(settings.columnSort),
      );
    }

    if (settings.columnWidths) {
      localStorage.setItem(
        getViewColumnWidthsStorageKey(viewId),
        JSON.stringify(settings.columnWidths),
      );
    }
  } catch {
    // ignore storage errors
  }
}

export const VIEW_SAVE_SCOPES = {
  ME: 'me',
  ALL: 'all',
} as const;

export async function persistTaskViewSettings(
  viewId: string,
  settings: Partial<ParsedViewSettings> = {},
  { scope = VIEW_SAVE_SCOPES.ME }: { scope?: ViewSaveScope } = {},
): Promise<ServiceResult<unknown>> {
  if (!viewId) {
    return { error: 'View is required.' };
  }

  const normalizedScope =
    scope === VIEW_SAVE_SCOPES.ALL ? VIEW_SAVE_SCOPES.ALL : VIEW_SAVE_SCOPES.ME;

  saveViewSettingsToCache(viewId, settings);

  const payload = buildTaskViewSettingsPayload(settings);
  return updateTaskView(
    viewId,
    {
      columns_json: payload.columns_json,
      sorting_json: payload.sorting_json,
      filters_json: payload.filters_json,
      grouping_json: payload.grouping_json,
      settings_json: payload.settings_json,
    },
    { scope: normalizedScope },
  );
}

export function loadViewColumnSettingsFromList(listId: string) {
  return {
    customColumns: loadCustomColumns(listId),
    standardVisibility: loadStandardColumnVisibility(listId),
    columnOrder: loadColumnOrder(listId),
    columnSort: loadColumnSort(listId),
  };
}

export const VIEW_AUTOSAVE_STORAGE_KEY = 'devx-board-view-autosave-enabled';

export function readViewAutosaveEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const stored = window.localStorage.getItem(VIEW_AUTOSAVE_STORAGE_KEY);
    if (stored === null) {
      return false;
    }

    return stored === '1';
  } catch {
    return false;
  }
}

export function writeViewAutosaveEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(VIEW_AUTOSAVE_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // ignore storage errors
  }
}

export function collectViewSettingsSnapshot(
  settings: Partial<ParsedViewSettings> = {},
): ViewSettingsSnapshot {
  return {
    customColumns: normalizeCustomColumns(settings.customColumns ?? []),
    standardVisibility: settings.standardVisibility ?? {},
    columnOrder: Array.isArray(settings.columnOrder) ? [...settings.columnOrder] : [],
    columnSort: Array.isArray(settings.columnSort) ? [...settings.columnSort] : [],
    fieldFilters: Array.isArray(settings.fieldFilters) ? [...settings.fieldFilters] : [],
    groupBy: settings.groupBy ?? null,
    columnCalculations: settings.columnCalculations ?? {},
    columnWidths: settings.columnWidths ?? {},
    frozenColumns: Array.isArray(settings.frozenColumns) ? [...settings.frozenColumns] : [],
    wrapText: Boolean(settings.wrapText),
    rowHeight: settings.rowHeight ?? 'default',
    showClosedOnly: Boolean(settings.showClosedOnly),
    showAssignedToMeOnly: Boolean(settings.showAssignedToMeOnly),
    calendarDateField: normalizeBoardCalendarDateField(
      settings.calendarDateField ?? DEFAULT_BOARD_CALENDAR_DATE_FIELD,
    ) as CalendarDateField,
    calendarLayoutMode: normalizeBoardCalendarLayoutMode(
      settings.calendarLayoutMode ?? DEFAULT_BOARD_CALENDAR_LAYOUT_MODE,
    ) as CalendarLayoutMode,
  };
}

export function buildAppliedViewSettingsSnapshot(
  settings: Partial<ParsedViewSettings> = {},
  refs: ViewSettingsRefs = {},
  { isTableLayout = false }: { isTableLayout?: boolean } = {},
): ViewSettingsSnapshot {
  const frozenColumns = refs.frozenColumns ?? settings.frozenColumns ?? [];

  return collectViewSettingsSnapshot({
    ...settings,
    customColumns: refs.customColumns ?? settings.customColumns,
    standardVisibility: refs.standardVisibility ?? settings.standardVisibility,
    columnOrder: refs.columnOrder ?? settings.columnOrder,
    columnSort: refs.columnSort ?? settings.columnSort,
    columnWidths: refs.columnWidths ?? settings.columnWidths,
    frozenColumns: isTableLayout
      ? frozenColumns.length > 0
        ? frozenColumns
        : ['title']
      : frozenColumns,
  });
}

function stableSerialize(value: unknown): string {
  return JSON.stringify(value, (_, current) => {
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      return Object.keys(current as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((accumulator, key) => {
          accumulator[key] = (current as Record<string, unknown>)[key];
          return accumulator;
        }, {});
    }

    return current;
  });
}

export function areViewSettingsEqual(
  left: Partial<ParsedViewSettings> | null | undefined,
  right: Partial<ParsedViewSettings> | null | undefined,
): boolean {
  if (!left || !right) {
    return false;
  }

  return (
    stableSerialize(collectViewSettingsSnapshot(left)) ===
    stableSerialize(collectViewSettingsSnapshot(right))
  );
}

export function getTaskViewSettingsKey(taskView: TaskViewRecord = {}): string {
  const viewId = taskView.id ?? taskView.name;
  if (!viewId) {
    return '';
  }

  const parsed = parseTaskViewSettings(taskView, {
    viewType: taskView.viewType ?? taskView.view_type,
  });
  return `${viewId}:${stableSerialize(collectViewSettingsSnapshot(parsed))}`;
}

export function getViewSettingsKeyForScope(
  scopeId: string,
  settings: Partial<ParsedViewSettings> = {},
): string {
  if (!scopeId) {
    return '';
  }

  return `${scopeId}:${stableSerialize(collectViewSettingsSnapshot(settings))}`;
}
