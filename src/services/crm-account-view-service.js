import {
  getListViewPreference,
  resetListViewPreferenceToDefault,
  setListViewAutosave,
  updateListViewPreference,
} from '@/services/list-view-preference-service';

const REF_DOCTYPE = 'CRM Account';

/**
 * Accounts Save View key.
 * Main list uses `default`; embedded tables use their react_table_id.
 */
export function buildCrmAccountViewKey(viewKey = 'default') {
  const key = typeof viewKey === 'string' ? viewKey.trim() : '';
  return key || 'default';
}

function requireScope({ viewKey } = {}) {
  return { viewKey: buildCrmAccountViewKey(viewKey) };
}

function withCrmScope(result, viewKey) {
  if (result.error || !result.data) return result;
  return {
    data: {
      ...result.data,
      viewKey,
    },
  };
}

export async function getCrmAccountView({ viewKey } = {}) {
  const scope = requireScope({ viewKey });
  const result = await getListViewPreference({
    refDoctype: REF_DOCTYPE,
    viewKey: scope.viewKey,
  });
  return withCrmScope(result, scope.viewKey);
}

export async function updateCrmAccountView(data, { scope = 'me', saveForAll, viewKey } = {}) {
  const viewScope = requireScope({ viewKey });
  const result = await updateListViewPreference(data, {
    refDoctype: REF_DOCTYPE,
    viewKey: viewScope.viewKey,
    scope,
    saveForAll,
  });
  return withCrmScope(result, viewScope.viewKey);
}

export async function resetCrmAccountViewToDefault({ scope = 'me', saveForAll, viewKey } = {}) {
  const viewScope = requireScope({ viewKey });
  const result = await resetListViewPreferenceToDefault({
    refDoctype: REF_DOCTYPE,
    viewKey: viewScope.viewKey,
    scope,
    saveForAll,
  });
  return withCrmScope(result, viewScope.viewKey);
}

export async function setCrmAccountViewAutosave(enabled, { viewKey } = {}) {
  const viewScope = requireScope({ viewKey });
  const result = await setListViewAutosave(enabled, {
    refDoctype: REF_DOCTYPE,
    viewKey: viewScope.viewKey,
  });
  return withCrmScope(result, viewScope.viewKey);
}
