import { DEFAULT_LEAD_FILTERS } from '@/components/crm-leads/constants';
import {
  getCrmLeadView,
  resetCrmLeadViewToDefault,
  setCrmLeadViewAutosave,
  updateCrmLeadView,
} from '@/services/crm-lead-view-service';

export const LEAD_VIEW_SAVE_SCOPES = {
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

function normalizeFilters(filters, { allowLifecycleStage = false } = {}) {
  const source = filters && typeof filters === 'object' ? filters : {};
  return {
    ...DEFAULT_LEAD_FILTERS,
    ...source,
    // Stage tabs own lifecycle selection — only All may persist stage filters.
    lifecycle_stage: allowLifecycleStage
      ? Array.isArray(source.lifecycle_stage)
        ? source.lifecycle_stage
        : []
      : [],
    created_at: {
      ...DEFAULT_LEAD_FILTERS.created_at,
      ...(source.created_at && typeof source.created_at === 'object' ? source.created_at : {}),
    },
    last_modified_at: {
      ...DEFAULT_LEAD_FILTERS.last_modified_at,
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
    showAssignedToMeOnly: Boolean(
      source.showAssignedToMeOnly ?? source.show_assigned_to_me ?? source.assigned_to_me,
    ),
  };
}

/** Parsed view settings used by the Leads page. */
export function parseCrmLeadViewSettings(view = {}, { stage = 'all' } = {}) {
  const filtersConfig = parseJsonValue(view.filtersJson ?? view.filters_json, {});
  const sortingConfig = parseJsonValue(view.sortingJson ?? view.sorting_json, []);
  const groupingConfig = parseJsonValue(view.groupingJson ?? view.grouping_json, {});
  const columnsConfig = parseJsonValue(view.columnsJson ?? view.columns_json, []);
  const settingsConfig = parseJsonValue(view.settingsJson ?? view.settings_json, {});
  const allowLifecycleStage = stage === 'all';

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
    filters: normalizeFilters(filtersConfig?.filters ?? filtersConfig, { allowLifecycleStage }),
    sorting: normalizeSorting(sorting),
    grouping: normalizeGrouping(groupingConfig),
    columns: normalizeColumns(columns),
    settings: normalizeSettings(settingsConfig),
    isPersonal: Boolean(view.isPersonal ?? view.is_personal),
    autosaveEnabled: Boolean(view.autosaveEnabled ?? view.autosave_enabled),
    canSaveForAll: Boolean(view.canSaveForAll ?? view.can_save_for_all),
  };
}

export function buildCrmLeadViewSettingsPayload(
  { filters, sorting, grouping, columns, settings },
  { stage = 'all', preservedLifecycleStage } = {},
) {
  const normalizedGrouping = normalizeGrouping(grouping);
  const normalizedSettings = normalizeSettings(settings);
  // Pipeline-scoped views always store lifecycle filters. When saving from a
  // non-All stage tab, keep the previously saved All-tab lifecycle selection.
  const lifecycleStage =
    stage === 'all'
      ? Array.isArray(filters?.lifecycle_stage)
        ? filters.lifecycle_stage
        : []
      : Array.isArray(preservedLifecycleStage)
        ? preservedLifecycleStage
        : [];

  return {
    filters_json: normalizeFilters(
      {
        ...(filters && typeof filters === 'object' ? filters : {}),
        lifecycle_stage: lifecycleStage,
      },
      { allowLifecycleStage: true },
    ),
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
      showAssignedToMeOnly: Boolean(normalizedSettings.showAssignedToMeOnly),
    },
  };
}

/** Snapshot used for dirty detection (includes columns — Save View owns persist). */
export function collectLeadViewDirtySnapshot({
  filters,
  sorting,
  grouping,
  columns,
  settings,
  stage = 'all',
}) {
  const allowLifecycleStage = stage === 'all';
  return {
    filters: normalizeFilters(filters, { allowLifecycleStage }),
    sorting: normalizeSorting(sorting),
    grouping: normalizeGrouping(grouping),
    columns: normalizeColumns(columns),
    settings: normalizeSettings(settings),
  };
}

export function areLeadViewSettingsEqual(left, right) {
  return (
    JSON.stringify(sortObjectKeys(left ?? null)) === JSON.stringify(sortObjectKeys(right ?? null))
  );
}

export async function loadCrmLeadViewSettings({ pipeline, stage } = {}) {
  const result = await getCrmLeadView({ pipeline, stage });
  if (result.error) {
    return result;
  }
  // Always parse with lifecycle allowed — tab UI decides whether to show/apply it.
  return { data: parseCrmLeadViewSettings(result.data ?? {}, { stage: 'all' }) };
}

export async function persistCrmLeadViewSettings(
  settings,
  { scope = LEAD_VIEW_SAVE_SCOPES.ME, pipeline, stage, preservedLifecycleStage } = {},
) {
  const payload = buildCrmLeadViewSettingsPayload(settings, {
    stage,
    preservedLifecycleStage,
  });
  const result = await updateCrmLeadView(payload, { scope, pipeline, stage });
  if (result.error) {
    return result;
  }
  return { data: parseCrmLeadViewSettings(result.data ?? {}, { stage: 'all' }) };
}

export async function resetCrmLeadViewSettings({
  scope = LEAD_VIEW_SAVE_SCOPES.ME,
  pipeline,
  stage,
} = {}) {
  const result = await resetCrmLeadViewToDefault({ scope, pipeline, stage });
  if (result.error) {
    return result;
  }
  return { data: parseCrmLeadViewSettings(result.data ?? {}, { stage: 'all' }) };
}

/**
 * Persist column changes via a full settings payload so a replace-style
 * update API cannot wipe filters / sorting / grouping / search.
 */
export async function persistCrmLeadViewColumns(
  settings,
  { scope = LEAD_VIEW_SAVE_SCOPES.ME, pipeline, stage, preservedLifecycleStage } = {},
) {
  return persistCrmLeadViewSettings(settings, {
    scope,
    pipeline,
    stage,
    preservedLifecycleStage,
  });
}

export async function persistCrmLeadViewAutosave(enabled, { pipeline, stage } = {}) {
  const result = await setCrmLeadViewAutosave(enabled, { pipeline, stage });
  if (result.error) {
    return result;
  }
  return { data: parseCrmLeadViewSettings(result.data ?? {}, { stage: 'all' }) };
}

export function createEmptyLeadViewSettings({ stage = 'all' } = {}) {
  return {
    filters: normalizeFilters(DEFAULT_LEAD_FILTERS, { allowLifecycleStage: true }),
    sorting: [],
    grouping: { groupBy: '', groupOrder: 'asc' },
    columns: [],
    settings: { search: '', showAssignedToMeOnly: false },
    isPersonal: false,
    autosaveEnabled: false,
    canSaveForAll: false,
  };
}
