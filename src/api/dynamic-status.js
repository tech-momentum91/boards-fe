import apiClient from '@/api/axios';
import { normalizeStatusLifecycleCategory } from '@/components/customize-status/status-lifecycle-constants';

export {
  STATUS_LIFECYCLE_CATEGORIES,
  STATUS_CATEGORY_DEFAULT_COLORS,
  getDefaultColorForStatusCategory,
  normalizeStatusLifecycleCategory,
} from '@/components/customize-status/status-lifecycle-constants';

function withContextParams(params = {}) {
  const next = { ...params };
  const context = (next.context || next.context_key || '').trim();
  if (context) {
    next.context = context;
    next.context_key = context;
  } else {
    delete next.context;
    delete next.context_key;
  }
  return next;
}

function withContextBody(payload = {}) {
  const next = { ...payload };
  const context = (next.context || next.context_key || '').trim();
  if (context) {
    next.context = context;
    next.context_key = context;
  } else {
    delete next.context;
    delete next.context_key;
  }
  return next;
}

function normalizeCategory(value) {
  return normalizeStatusLifecycleCategory(value, { fallback: null });
}

export function normalizeDynamicStatusOptions(message) {
  const rows = Array.isArray(message) ? message : [];
  return rows
    .map((o) => ({
      value: (o?.label || '').trim(),
      label: (o?.label || '').trim(),
      color: o?.color || null,
      category: normalizeCategory(o?.category),
      order: Number(o?.order || 0),
    }))
    .filter((o) => o.value);
}

export function normalizeConfigurationStatuses(statuses) {
  const rows = Array.isArray(statuses) ? statuses : [];
  return rows
    .map((s, index) => ({
      id: s?.id || `status_${index}`,
      label: (s?.label || '').trim(),
      color: s?.color || '#2563EB',
      category: normalizeCategory(s?.category),
      enabled: Boolean(s?.enabled ?? s?.is_active ?? true),
      isDefault: Boolean(s?.is_default ?? s?.isDefault),
      order: Number(s?.order || index + 1),
    }))
    .filter((s) => s.label);
}

export function normalizeDefaultStatuses(statuses) {
  // Derived from live is_default rows (or legacy catalog). Always treat as defaults
  // for Apply Defaults; enabled is forced on so applying restores them into dropdowns.
  return normalizeConfigurationStatuses(statuses).map((row, index) => ({
    ...row,
    id: row.id || `default_${index}`,
    isDefault: true,
    enabled: true,
  }));
}

/** Drop temporary client-only ids before persisting to the API. */
export function sanitizeStatusRowId(id) {
  if (id == null || id === '') return null;
  const raw = String(id);
  if (raw.startsWith('custom_') || raw.startsWith('default_') || raw.startsWith('status_')) {
    return null;
  }
  return raw;
}

export function prepareStatusesForSave(statuses) {
  return (Array.isArray(statuses) ? statuses : [])
    .map((s) => {
      const label = (s?.label || '').trim();
      if (!label) return null;
      return {
        ...s,
        label,
        isNew: false,
      };
    })
    .filter(Boolean);
}

export function prepareDefaultStatusesForSave(statuses) {
  return prepareStatusesForSave(statuses);
}

export function serializeDefaultStatusesForApi(statuses) {
  return (Array.isArray(statuses) ? statuses : []).map((s, index) => ({
    id: sanitizeStatusRowId(s.id),
    label: s.label,
    color: s.color,
    category: normalizeCategory(s.category),
    order: s.order ?? index + 1,
  }));
}

export async function getStatusOptions({ doctype, field, context }) {
  const res = await apiClient.get('/method/devx.api.dynamic_status.get_status_options', {
    params: withContextParams({ doctype, field, context }),
  });
  return normalizeDynamicStatusOptions(res?.data?.message).sort(
    (a, b) => (a.order || 0) - (b.order || 0),
  );
}

export async function getStatusConfiguration({ doctype, field, context }) {
  const res = await apiClient.get('/method/devx.api.dynamic_status.get_status_configuration', {
    params: withContextParams({ doctype, field, context }),
  });
  return res?.data?.message || {};
}

export async function saveStatusConfiguration({
  doctype,
  field,
  context,
  configName,
  statuses,
  syncDefaultCatalog = false,
  activeSource,
}) {
  const res = await apiClient.post(
    '/method/devx.api.dynamic_status.save_status_configuration',
    withContextBody({
      doctype,
      field,
      config_name: configName ?? null,
      sync_default_catalog: syncDefaultCatalog ? 1 : 0,
      active_source: activeSource ?? null,
      context,
      statuses: statuses.map((s, index) => ({
        id: sanitizeStatusRowId(s.id),
        label: s.label,
        color: s.color,
        category: normalizeCategory(s.category),
        enabled: s.enabled,
        is_default: Boolean(s.isDefault),
        order: s.order ?? index + 1,
      })),
    }),
  );
  return res?.data?.message || {};
}

export const ACTIVE_SOURCE = {
  DEFAULT: 'default',
  CUSTOM: 'custom',
};

/** UI source tabs — same values as ACTIVE_SOURCE (Default | Custom). */
export const STATUS_SOURCE_MODE = {
  DEFAULT: ACTIVE_SOURCE.DEFAULT,
  CUSTOM: ACTIVE_SOURCE.CUSTOM,
};

export function normalizeActiveSource(activeSource) {
  if (activeSource === ACTIVE_SOURCE.CUSTOM || activeSource === 'imported') {
    return ACTIVE_SOURCE.CUSTOM;
  }
  // default | custom_defaults | empty → Default
  return ACTIVE_SOURCE.DEFAULT;
}

export function resolveSourceModeFromActiveSource(activeSource) {
  return normalizeActiveSource(activeSource);
}

export async function renameStatus({ configName, oldValue, newValue }) {
  const res = await apiClient.post('/method/devx.api.dynamic_status.rename_status', {
    config_name: configName,
    old: oldValue,
    new: newValue,
  });
  return res?.data?.message || {};
}

export async function getStatusUsage({ configName, status }) {
  const res = await apiClient.get('/method/devx.api.dynamic_status.get_status_usage', {
    params: { config_name: configName, status },
  });
  return res?.data?.message || {};
}

export async function getStatusModules() {
  const res = await apiClient.get('/method/devx.api.dynamic_status.get_status_modules');
  return res?.data?.message || [];
}

export async function discoverDefaultStatuses({ doctype, field, context }) {
  const res = await apiClient.get('/method/devx.api.dynamic_status.discover_default_statuses', {
    params: withContextParams({ doctype, field, context }),
  });
  return res?.data?.message || {};
}

export async function analyzeImportStatuses({
  targetDoctype,
  targetField,
  targetContext,
  sourceDoctype,
  sourceField,
  sourceContext,
  statusNames,
}) {
  const res = await apiClient.post('/method/devx.api.dynamic_status.analyze_import_statuses', {
    target_doctype: targetDoctype,
    target_field: targetField,
    target_context: (targetContext || '').trim() || null,
    source_doctype: sourceDoctype,
    source_field: sourceField,
    source_context: (sourceContext || '').trim() || null,
    status_names: statusNames ?? null,
  });
  return res?.data?.message || {};
}

export async function analyzeApplyCustomDefaults({ doctype, field, context, defaultStatuses }) {
  const res = await apiClient.post(
    '/method/devx.api.dynamic_status.analyze_apply_custom_defaults',
    withContextBody({
      doctype,
      field,
      context,
      default_statuses: defaultStatuses ?? null,
    }),
  );
  return res?.data?.message || {};
}

export async function applyCustomDefaultStatuses({
  doctype,
  field,
  context,
  defaultStatuses,
  statusMappings,
  replaceAllWith,
}) {
  const res = await apiClient.post(
    '/method/devx.api.dynamic_status.apply_custom_default_statuses',
    withContextBody({
      doctype,
      field,
      context,
      // null → backend uses live is_default rows or code canonical defaults
      default_statuses: defaultStatuses ?? null,
      status_mappings: statusMappings ?? null,
      replace_all_with: replaceAllWith ?? null,
    }),
  );
  return res?.data?.message || {};
}

/** @deprecated Prefer applyCustomDefaultStatuses — catalog table was removed. */
export async function saveDefaultStatusOptions({ doctype, field, context, defaultStatuses }) {
  return applyCustomDefaultStatuses({ doctype, field, context, defaultStatuses });
}

export async function importStatuses({
  targetDoctype,
  targetField,
  targetContext,
  sourceDoctype,
  sourceField,
  sourceContext,
  statusNames,
  mode = 'replace',
  statusMappings,
  replaceAllWith,
}) {
  const res = await apiClient.post('/method/devx.api.dynamic_status.import_statuses', {
    target_doctype: targetDoctype,
    target_field: targetField,
    target_context: (targetContext || '').trim() || null,
    source_doctype: sourceDoctype,
    source_field: sourceField,
    source_context: (sourceContext || '').trim() || null,
    status_names: statusNames ?? null,
    mode,
    status_mappings: statusMappings ?? null,
    replace_all_with: replaceAllWith ?? null,
  });
  return res?.data?.message || {};
}
