import apiClient from '@/api/axios';
import { DEFAULT_ACCOUNT_FILTERS } from '@/components/crm-accounts/constants';
import {
  getCrmAccountView,
  resetCrmAccountViewToDefault,
  setCrmAccountViewAutosave,
  updateCrmAccountView,
} from '@/services/crm-account-view-service';

export const ACCOUNT_VIEW_SAVE_SCOPES = {
  ME: 'me',
  ALL: 'all',
};

function parseJsonValue(value, fallback) {
  if (value == null || value === '') {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function sortObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortObjectKeys(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function normalizeFilters(filters) {
  const source = filters && typeof filters === 'object' ? filters : {};
  return {
    ...DEFAULT_ACCOUNT_FILTERS,
    ...source,
    type_of_organization: Array.isArray(source.type_of_organization)
      ? source.type_of_organization
      : [],
    industry: Array.isArray(source.industry) ? source.industry : [],
    created_at: {
      ...DEFAULT_ACCOUNT_FILTERS.created_at,
      ...(source.created_at && typeof source.created_at === 'object' ? source.created_at : {}),
    },
    last_modified_at: {
      ...DEFAULT_ACCOUNT_FILTERS.last_modified_at,
      ...(source.last_modified_at && typeof source.last_modified_at === 'object'
        ? source.last_modified_at
        : {}),
    },
  };
}

function normalizeSorting(sorting) {
  if (!Array.isArray(sorting)) return [];
  return sorting
    .filter((item) => item && typeof item === 'object' && typeof item.id === 'string' && item.id)
    .map((item) => ({
      id: item.id,
      desc: Boolean(item.desc),
    }));
}

function normalizeGrouping(grouping) {
  const source =
    grouping && typeof grouping === 'object'
      ? grouping
      : typeof grouping === 'string'
        ? { groupBy: grouping }
        : {};
  const groupBy = typeof source.groupBy === 'string' ? source.groupBy : '';
  const groupOrder = source.groupOrder === 'desc' ? 'desc' : 'asc';
  return { groupBy, groupOrder };
}

function normalizeColumns(columns) {
  if (!Array.isArray(columns)) return [];
  return columns
    .filter((col) => col && typeof col === 'object' && typeof col.id === 'string' && col.id)
    .map((col, index) => ({
      id: col.id,
      visible: col.visible !== false,
      order: typeof col.order === 'number' ? col.order : index,
      label: typeof col.label === 'string' ? col.label : col.id,
      enableHiding: col.enableHiding !== false,
    }));
}

function normalizeSettings(settings) {
  const source = settings && typeof settings === 'object' ? settings : {};
  return {
    search: typeof source.search === 'string' ? source.search : '',
  };
}

/** Parsed view settings used by the Accounts page. */
export function parseCrmAccountViewSettings(view = {}) {
  const filtersConfig = parseJsonValue(view.filtersJson ?? view.filters_json, {});
  const sortingConfig = parseJsonValue(view.sortingJson ?? view.sorting_json, []);
  const groupingConfig = parseJsonValue(view.groupingJson ?? view.grouping_json, {});
  const columnsConfig = parseJsonValue(view.columnsJson ?? view.columns_json, []);
  const settingsConfig = parseJsonValue(view.settingsJson ?? view.settings_json, {});

  const sorting = Array.isArray(sortingConfig)
    ? sortingConfig
    : Array.isArray(sortingConfig?.sorting)
      ? sortingConfig.sorting
      : Array.isArray(sortingConfig?.items)
        ? sortingConfig.items
        : [];

  const columns = Array.isArray(columnsConfig)
    ? columnsConfig
    : Array.isArray(columnsConfig?.columns)
      ? columnsConfig.columns
      : Array.isArray(columnsConfig?.items)
        ? columnsConfig.items
        : [];

  return {
    filters: normalizeFilters(filtersConfig?.filters ?? filtersConfig),
    sorting: normalizeSorting(sorting),
    grouping: normalizeGrouping(groupingConfig),
    columns: normalizeColumns(columns),
    settings: normalizeSettings(settingsConfig),
    isPersonal: Boolean(view.isPersonal ?? view.is_personal),
    autosaveEnabled: Boolean(view.autosaveEnabled ?? view.autosave_enabled),
    canSaveForAll: Boolean(view.canSaveForAll ?? view.can_save_for_all),
  };
}

export function buildCrmAccountViewSettingsPayload({
  filters,
  sorting,
  grouping,
  columns,
  settings,
}) {
  const normalizedGrouping = normalizeGrouping(grouping);
  const normalizedSettings = normalizeSettings(settings);

  return {
    filters_json: normalizeFilters(filters),
    sorting_json: {
      sorting: normalizeSorting(sorting),
    },
    grouping_json: {
      groupBy: normalizedGrouping.groupBy,
      groupOrder: normalizedGrouping.groupOrder,
    },
    columns_json: {
      columns: normalizeColumns(columns),
    },
    settings_json: {
      search: normalizedSettings.search,
    },
  };
}

/** Snapshot used for dirty detection (includes columns — Save View owns persist). */
export function collectAccountViewDirtySnapshot({ filters, sorting, grouping, columns, settings }) {
  return {
    filters: normalizeFilters(filters),
    sorting: normalizeSorting(sorting),
    grouping: normalizeGrouping(grouping),
    columns: normalizeColumns(columns),
    settings: normalizeSettings(settings),
  };
}

export function areAccountViewSettingsEqual(left, right) {
  return (
    JSON.stringify(sortObjectKeys(left ?? null)) === JSON.stringify(sortObjectKeys(right ?? null))
  );
}

/**
 * Fetch legacy column prefs (get_list_pref) when Save View has no columns yet.
 */
async function fetchLegacyAccountColumns(legacyReactTableId) {
  if (!legacyReactTableId) return [];
  try {
    const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
      params: { doctype: 'CRM Account', react_table_id: legacyReactTableId },
    });
    const raw = response?.data?.message ?? response?.data?.data ?? response?.data ?? [];
    const columns = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.columns)
        ? raw.columns
        : Array.isArray(raw?.message)
          ? raw.message
          : [];
    return normalizeColumns(columns);
  } catch {
    return [];
  }
}

export async function loadCrmAccountViewSettings({ viewKey = 'default', legacyReactTableId } = {}) {
  const result = await getCrmAccountView({ viewKey });
  if (result.error) {
    return result;
  }
  const settings = parseCrmAccountViewSettings(result.data ?? {});
  if (settings.columns.length === 0 && legacyReactTableId) {
    const legacyColumns = await fetchLegacyAccountColumns(legacyReactTableId);
    if (legacyColumns.length > 0) {
      settings.columns = legacyColumns;
    }
  }
  return { data: settings };
}

export async function persistCrmAccountViewSettings(
  settings,
  { scope = ACCOUNT_VIEW_SAVE_SCOPES.ME, viewKey = 'default' } = {},
) {
  const payload = buildCrmAccountViewSettingsPayload(settings);
  const result = await updateCrmAccountView(payload, { scope, viewKey });
  if (result.error) {
    return result;
  }
  return { data: parseCrmAccountViewSettings(result.data ?? {}) };
}

export async function resetCrmAccountViewSettings({
  scope = ACCOUNT_VIEW_SAVE_SCOPES.ME,
  viewKey = 'default',
} = {}) {
  const result = await resetCrmAccountViewToDefault({ scope, viewKey });
  if (result.error) {
    return result;
  }
  return { data: parseCrmAccountViewSettings(result.data ?? {}) };
}

export async function persistCrmAccountViewAutosave(enabled, { viewKey = 'default' } = {}) {
  const result = await setCrmAccountViewAutosave(enabled, { viewKey });
  if (result.error) {
    return result;
  }
  return { data: parseCrmAccountViewSettings(result.data ?? {}) };
}

export function createEmptyAccountViewSettings() {
  return {
    filters: normalizeFilters(DEFAULT_ACCOUNT_FILTERS),
    sorting: [],
    grouping: { groupBy: '', groupOrder: 'asc' },
    columns: [],
    settings: { search: '' },
    isPersonal: false,
    autosaveEnabled: false,
    canSaveForAll: false,
  };
}
