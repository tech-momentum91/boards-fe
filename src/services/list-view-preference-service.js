import apiClient from '@/api/axios';
import { extractErrorMessage, getFrappeResponseError } from '@/utils/error-utils';

const GET_ENDPOINT = '/method/devx.api.list_view_preference.get';
const UPDATE_ENDPOINT = '/method/devx.api.list_view_preference.update';
const RESET_ENDPOINT = '/method/devx.api.list_view_preference.reset_to_default';
const SET_AUTOSAVE_ENDPOINT = '/method/devx.api.list_view_preference.set_autosave';
const GET_TABS_ENDPOINT = '/method/devx.api.list_view_preference.get_tabs';
const UPDATE_TABS_ENDPOINT = '/method/devx.api.list_view_preference.update_tabs';

export const LIST_VIEW_SAVE_SCOPES = {
  ME: 'me',
  ALL: 'all',
};

function toSaveForAllFlag(scope, saveForAll) {
  if (saveForAll != null) {
    return saveForAll ? 1 : 0;
  }
  return scope === LIST_VIEW_SAVE_SCOPES.ALL ? 1 : 0;
}

/**
 * Build a CRM leads save-view key: pipeline:{id}
 * Views are scoped to the pipeline (shared across all stages).
 */
export function buildCrmLeadViewKey(pipeline) {
  const pipelineKey = typeof pipeline === 'string' ? pipeline.trim() : '';
  if (!pipelineKey) return '';
  return `pipeline:${pipelineKey}`;
}

function normalizeView(raw = {}) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    refDoctype: raw.ref_doctype ?? raw.refDoctype ?? '',
    viewKey: raw.view_key ?? raw.viewKey ?? 'default',
    pipeline: raw.pipeline ?? '',
    stage: raw.stage ?? 'all',
    filtersJson: raw.filters_json ?? raw.filtersJson ?? null,
    columnsJson: raw.columns_json ?? raw.columnsJson ?? null,
    groupingJson: raw.grouping_json ?? raw.groupingJson ?? null,
    sortingJson: raw.sorting_json ?? raw.sortingJson ?? null,
    settingsJson: raw.settings_json ?? raw.settingsJson ?? null,
    tabsJson: raw.tabs_json ?? raw.tabsJson ?? null,
    isPersonal: Boolean(raw.is_personal ?? raw.isPersonal),
    autosaveEnabled: Boolean(raw.autosave_enabled ?? raw.autosaveEnabled),
    canSaveForAll: Boolean(raw.can_save_for_all ?? raw.canSaveForAll),
  };
}

function wrapViewResult(result, fallbackMessage) {
  const responseError = getFrappeResponseError(result, fallbackMessage);
  if (responseError) return { error: responseError };
  return { data: normalizeView(result?.message ?? {}) };
}

function requireRefDoctype(refDoctype) {
  const key = typeof refDoctype === 'string' ? refDoctype.trim() : '';
  if (!key) return { error: 'Reference doctype is required.' };
  return { refDoctype: key };
}

export async function getListViewPreference({ refDoctype, viewKey = 'default' } = {}) {
  const scope = requireRefDoctype(refDoctype);
  if (scope.error) return scope;

  try {
    const response = await apiClient.get(GET_ENDPOINT, {
      params: { ref_doctype: scope.refDoctype, view_key: viewKey },
    });
    return wrapViewResult(response.data, 'Failed to load list view.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load list view.'),
    };
  }
}

export async function updateListViewPreference(
  data,
  { refDoctype, viewKey = 'default', scope = LIST_VIEW_SAVE_SCOPES.ME, saveForAll } = {},
) {
  const docScope = requireRefDoctype(refDoctype);
  if (docScope.error) return docScope;

  try {
    const response = await apiClient.post(UPDATE_ENDPOINT, {
      ref_doctype: docScope.refDoctype,
      view_key: viewKey,
      save_for_all: toSaveForAllFlag(scope, saveForAll),
      data: JSON.stringify(data ?? {}),
    });
    return wrapViewResult(response.data, 'Failed to save list view.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to save list view.'),
    };
  }
}

export async function resetListViewPreferenceToDefault({
  refDoctype,
  viewKey = 'default',
  scope = LIST_VIEW_SAVE_SCOPES.ME,
  saveForAll,
} = {}) {
  const docScope = requireRefDoctype(refDoctype);
  if (docScope.error) return docScope;

  try {
    const response = await apiClient.post(RESET_ENDPOINT, {
      ref_doctype: docScope.refDoctype,
      view_key: viewKey,
      save_for_all: toSaveForAllFlag(scope, saveForAll),
    });
    return wrapViewResult(response.data, 'Failed to reset list view.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to reset list view.'),
    };
  }
}

export async function setListViewAutosave(enabled, { refDoctype, viewKey = 'default' } = {}) {
  const docScope = requireRefDoctype(refDoctype);
  if (docScope.error) return docScope;

  try {
    const response = await apiClient.post(SET_AUTOSAVE_ENDPOINT, {
      ref_doctype: docScope.refDoctype,
      view_key: viewKey,
      enabled: enabled ? 1 : 0,
    });
    return wrapViewResult(response.data, 'Failed to update autosave.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to update autosave.'),
    };
  }
}

function normalizeTabs(raw = {}) {
  const emptyBucket = { order: [], pinned: [], hidden: [] };
  const normalizeBucket = (bucket) => ({
    order: Array.isArray(bucket?.order) ? bucket.order.map(String) : [],
    pinned: Array.isArray(bucket?.pinned) ? bucket.pinned.map(String) : [],
    hidden: Array.isArray(bucket?.hidden) ? bucket.hidden.map(String) : [],
  });
  const stageRaw = raw.stage_tabs ?? raw.stageTabs ?? {};
  const stageTabs = {};
  if (stageRaw && typeof stageRaw === 'object') {
    Object.entries(stageRaw).forEach(([pipelineId, bucket]) => {
      const key = String(pipelineId ?? '').trim();
      if (!key) return;
      stageTabs[key] = normalizeBucket(bucket);
    });
  }
  return {
    user: raw.user ?? '',
    refDoctype: raw.ref_doctype ?? raw.refDoctype ?? '',
    pipelineTabs: normalizeBucket(raw.pipeline_tabs ?? raw.pipelineTabs ?? emptyBucket),
    stageTabs,
  };
}

function wrapTabsResult(result, fallbackMessage) {
  const responseError = getFrappeResponseError(result, fallbackMessage);
  if (responseError) return { error: responseError };
  return { data: normalizeTabs(result?.message ?? {}) };
}

export async function getListViewTabs({ refDoctype } = {}) {
  const scope = requireRefDoctype(refDoctype);
  if (scope.error) return scope;

  try {
    const response = await apiClient.get(GET_TABS_ENDPOINT, {
      params: { ref_doctype: scope.refDoctype },
    });
    return wrapTabsResult(response.data, 'Failed to load tab preferences.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load tab preferences.'),
    };
  }
}

export async function updateListViewTabs(payload = {}, { refDoctype } = {}) {
  const scope = requireRefDoctype(refDoctype);
  if (scope.error) return scope;

  const body = {};
  if (payload.pipelineTabs) body.pipeline_tabs = payload.pipelineTabs;
  if (payload.stageTabs) body.stage_tabs = payload.stageTabs;
  if (payload.replaceStageTabs) body.replace_stage_tabs = 1;

  try {
    const response = await apiClient.post(UPDATE_TABS_ENDPOINT, {
      ref_doctype: scope.refDoctype,
      data: JSON.stringify(body),
    });
    return wrapTabsResult(response.data, 'Failed to save tab preferences.');
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to save tab preferences.'),
    };
  }
}
