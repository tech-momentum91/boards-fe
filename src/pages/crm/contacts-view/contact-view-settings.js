import apiClient from '@/api/axios';
import { DEFAULT_CONTACT_FILTERS } from '@/components/crm-contacts/constants';
import {
  getCrmContactView,
  resetCrmContactViewToDefault,
  setCrmContactViewAutosave,
  updateCrmContactView,
} from '@/services/crm-contact-view-service';

export const CONTACT_VIEW_SAVE_SCOPES = {
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
  const arrayKeys = [
    'account',
    'sales_owner',
    'designation',
    'department',
    'city',
    'subscription_status',
  ];
  const next = {
    ...DEFAULT_CONTACT_FILTERS,
    ...source,
  };
  for (const key of arrayKeys) {
    next[key] = Array.isArray(source[key]) ? source[key] : [];
  }
  next.created_at = {
    ...DEFAULT_CONTACT_FILTERS.created_at,
    ...(source.created_at && typeof source.created_at === 'object' ? source.created_at : {}),
  };
  next.last_modified_at = {
    ...DEFAULT_CONTACT_FILTERS.last_modified_at,
    ...(source.last_modified_at && typeof source.last_modified_at === 'object'
      ? source.last_modified_at
      : {}),
  };
  return next;
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

/** Parsed view settings used by the Contacts page. */
export function parseCrmContactViewSettings(view = {}) {
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

export function buildCrmContactViewSettingsPayload({
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
export function collectContactViewDirtySnapshot({ filters, sorting, grouping, columns, settings }) {
  return {
    filters: normalizeFilters(filters),
    sorting: normalizeSorting(sorting),
    grouping: normalizeGrouping(grouping),
    columns: normalizeColumns(columns),
    settings: normalizeSettings(settings),
  };
}

export function areContactViewSettingsEqual(left, right) {
  return (
    JSON.stringify(sortObjectKeys(left ?? null)) === JSON.stringify(sortObjectKeys(right ?? null))
  );
}

/**
 * Fetch legacy column prefs (get_list_pref) when Save View has no columns yet.
 */
async function fetchLegacyContactColumns(legacyReactTableId) {
  if (!legacyReactTableId) return [];
  try {
    const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
      params: { doctype: 'CRM Contact', react_table_id: legacyReactTableId },
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

export async function loadCrmContactViewSettings({ viewKey = 'default', legacyReactTableId } = {}) {
  const result = await getCrmContactView({ viewKey });
  if (result.error) {
    return result;
  }
  const settings = parseCrmContactViewSettings(result.data ?? {});
  if (settings.columns.length === 0 && legacyReactTableId) {
    const legacyColumns = await fetchLegacyContactColumns(legacyReactTableId);
    if (legacyColumns.length > 0) {
      settings.columns = legacyColumns;
    }
  }
  return { data: settings };
}

export async function persistCrmContactViewSettings(
  settings,
  { scope = CONTACT_VIEW_SAVE_SCOPES.ME, viewKey = 'default' } = {},
) {
  const payload = buildCrmContactViewSettingsPayload(settings);
  const result = await updateCrmContactView(payload, { scope, viewKey });
  if (result.error) {
    return result;
  }
  return { data: parseCrmContactViewSettings(result.data ?? {}) };
}

export async function resetCrmContactViewSettings({
  scope = CONTACT_VIEW_SAVE_SCOPES.ME,
  viewKey = 'default',
} = {}) {
  const result = await resetCrmContactViewToDefault({ scope, viewKey });
  if (result.error) {
    return result;
  }
  return { data: parseCrmContactViewSettings(result.data ?? {}) };
}

export async function persistCrmContactViewAutosave(enabled, { viewKey = 'default' } = {}) {
  const result = await setCrmContactViewAutosave(enabled, { viewKey });
  if (result.error) {
    return result;
  }
  return { data: parseCrmContactViewSettings(result.data ?? {}) };
}

export function createEmptyContactViewSettings() {
  return {
    filters: normalizeFilters(DEFAULT_CONTACT_FILTERS),
    sorting: [],
    grouping: { groupBy: '', groupOrder: 'asc' },
    columns: [],
    settings: { search: '' },
    isPersonal: false,
    autosaveEnabled: false,
    canSaveForAll: false,
  };
}
