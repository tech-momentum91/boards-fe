import {
  buildCrmLeadViewKey,
  getListViewPreference,
  resetListViewPreferenceToDefault,
  setListViewAutosave,
  updateListViewPreference,
} from '@/services/list-view-preference-service';

const REF_DOCTYPE = 'CRM Lead';

function requireScope({ pipeline, stage }) {
  const pipelineKey = typeof pipeline === 'string' ? pipeline.trim() : '';
  const stageKey = typeof stage === 'string' && stage.trim() ? stage.trim() : 'all';
  if (!pipelineKey) {
    return { error: 'Pipeline is required.' };
  }
  return {
    pipeline: pipelineKey,
    stage: stageKey,
    // Save View is pipeline-scoped — stage is only echoed for UI/tab behavior.
    viewKey: buildCrmLeadViewKey(pipelineKey),
  };
}

function withCrmScope(result, pipeline, stage) {
  if (result.error || !result.data) return result;
  return {
    data: {
      ...result.data,
      pipeline,
      stage,
    },
  };
}

export async function getCrmLeadView({ pipeline, stage } = {}) {
  const scope = requireScope({ pipeline, stage });
  if (scope.error) return scope;

  const result = await getListViewPreference({
    refDoctype: REF_DOCTYPE,
    viewKey: scope.viewKey,
  });
  return withCrmScope(result, scope.pipeline, scope.stage);
}

export async function updateCrmLeadView(data, { scope = 'me', saveForAll, pipeline, stage } = {}) {
  const viewScope = requireScope({ pipeline, stage });
  if (viewScope.error) return viewScope;

  const result = await updateListViewPreference(data, {
    refDoctype: REF_DOCTYPE,
    viewKey: viewScope.viewKey,
    scope,
    saveForAll,
  });
  return withCrmScope(result, viewScope.pipeline, viewScope.stage);
}

export async function resetCrmLeadViewToDefault({
  scope = 'me',
  saveForAll,
  pipeline,
  stage,
} = {}) {
  const viewScope = requireScope({ pipeline, stage });
  if (viewScope.error) return viewScope;

  const result = await resetListViewPreferenceToDefault({
    refDoctype: REF_DOCTYPE,
    viewKey: viewScope.viewKey,
    scope,
    saveForAll,
  });
  return withCrmScope(result, viewScope.pipeline, viewScope.stage);
}

export async function setCrmLeadViewAutosave(enabled, { pipeline, stage } = {}) {
  const viewScope = requireScope({ pipeline, stage });
  if (viewScope.error) return viewScope;

  const result = await setListViewAutosave(enabled, {
    refDoctype: REF_DOCTYPE,
    viewKey: viewScope.viewKey,
  });
  return withCrmScope(result, viewScope.pipeline, viewScope.stage);
}
