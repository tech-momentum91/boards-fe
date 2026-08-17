import {
  getListViewPreference,
  resetListViewPreferenceToDefault,
  setListViewAutosave,
  updateListViewPreference,
} from '@/services/list-view-preference-service';

const REF_DOCTYPE = 'CRM Contact';

/**
 * Contacts Save View key.
 * Main list uses `default`; embedded tables use their react_table_id.
 */
export function buildCrmContactViewKey(viewKey = 'default') {
  const key = typeof viewKey === 'string' ? viewKey.trim() : '';
  return key || 'default';
}

function requireScope({ viewKey } = {}) {
  return { viewKey: buildCrmContactViewKey(viewKey) };
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

export async function getCrmContactView({ viewKey } = {}) {
  const scope = requireScope({ viewKey });
  const result = await getListViewPreference({
    refDoctype: REF_DOCTYPE,
    viewKey: scope.viewKey,
  });
  return withCrmScope(result, scope.viewKey);
}

export async function updateCrmContactView(data, { scope = 'me', saveForAll, viewKey } = {}) {
  const viewScope = requireScope({ viewKey });
  const result = await updateListViewPreference(data, {
    refDoctype: REF_DOCTYPE,
    viewKey: viewScope.viewKey,
    scope,
    saveForAll,
  });
  return withCrmScope(result, viewScope.viewKey);
}

export async function resetCrmContactViewToDefault({ scope = 'me', saveForAll, viewKey } = {}) {
  const viewScope = requireScope({ viewKey });
  const result = await resetListViewPreferenceToDefault({
    refDoctype: REF_DOCTYPE,
    viewKey: viewScope.viewKey,
    scope,
    saveForAll,
  });
  return withCrmScope(result, viewScope.viewKey);
}

export async function setCrmContactViewAutosave(enabled, { viewKey } = {}) {
  const viewScope = requireScope({ viewKey });
  const result = await setListViewAutosave(enabled, {
    refDoctype: REF_DOCTYPE,
    viewKey: viewScope.viewKey,
  });
  return withCrmScope(result, viewScope.viewKey);
}
