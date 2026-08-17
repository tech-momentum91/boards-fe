import { useCallback, useEffect, useRef, useState } from 'react';
import { ALL_PIPELINE_TAB_VALUE } from '@/components/crm-leads/constants';
import {
  emptyTabBucket,
  ensureAtLeastOneVisible,
  hideTabInBucket,
  normalizeTabBucket,
  togglePinnedInBucket,
  unhideTabInBucket,
  reorderVisibleTabOrder,
} from '@/pages/crm/leads-view/crm-lead-tab-preferences';
import {
  getCrmLeadTabPreference,
  updateCrmLeadTabPreference,
} from '@/services/crm-lead-tab-preference-service';
import { showErrorToast } from '@/utils/error-utils';

/**
 * Per-user CRM lead pipeline/stage tab preferences (pin / hide / reorder).
 */
export function useCrmLeadTabPreferences() {
  const [pipelineTabs, setPipelineTabs] = useState(() => emptyTabBucket());
  const [stageTabsByPipeline, setStageTabsByPipeline] = useState(() => ({}));
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const pipelineTabsRef = useRef(pipelineTabs);
  const stageTabsByPipelineRef = useRef(stageTabsByPipeline);
  const saveSeqRef = useRef(0);

  useEffect(() => {
    pipelineTabsRef.current = pipelineTabs;
  }, [pipelineTabs]);

  useEffect(() => {
    stageTabsByPipelineRef.current = stageTabsByPipeline;
  }, [stageTabsByPipeline]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await getCrmLeadTabPreference();
      if (cancelled) return;

      if (result.error) {
        showErrorToast(result.error);
        setIsLoaded(true);
        return;
      }

      setPipelineTabs(result.data?.pipelineTabs ?? emptyTabBucket());
      setStageTabsByPipeline(result.data?.stageTabs ?? {});
      setIsLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(
    async ({ nextPipelineTabs, nextStageTabsByPipeline, stagePatch, rollback }) => {
      const seq = ++saveSeqRef.current;
      setIsSaving(true);

      const payload = {};
      if (nextPipelineTabs) {
        payload.pipelineTabs = nextPipelineTabs;
      }
      if (stagePatch) {
        payload.stageTabs = stagePatch;
      } else if (nextStageTabsByPipeline) {
        payload.stageTabs = nextStageTabsByPipeline;
        payload.replaceStageTabs = true;
      }

      const wroteStages = Boolean(stagePatch || nextStageTabsByPipeline);
      const result = await updateCrmLeadTabPreference(payload);

      if (seq !== saveSeqRef.current) {
        return result;
      }

      setIsSaving(false);

      if (result.error) {
        showErrorToast(result.error);
        if (rollback) {
          pipelineTabsRef.current = rollback.pipeline;
          stageTabsByPipelineRef.current = rollback.stages;
          setPipelineTabs(rollback.pipeline);
          setStageTabsByPipeline(rollback.stages);
        }
        return result;
      }

      if (result.data?.pipelineTabs) {
        setPipelineTabs(result.data.pipelineTabs);
      }
      // Pipeline-only saves still return stage_tabs from the DB. That map often lags
      // behind client-side syncStageAvailable (which is local-only), so applying it
      // here would wipe stage order and leave only the locked "All" tab visible.
      if (wroteStages && result.data?.stageTabs) {
        setStageTabsByPipeline(result.data.stageTabs);
      }
      return result;
    },
    [],
  );

  const syncPipelineAvailable = useCallback((availableIds, { lockedIds = [] } = {}) => {
    const normalized = ensureAtLeastOneVisible(
      normalizeTabBucket(availableIds, pipelineTabsRef.current, { lockedIds }),
    );
    const prev = pipelineTabsRef.current;
    const unchanged = JSON.stringify(prev) === JSON.stringify(normalized);
    if (unchanged) return normalized;

    pipelineTabsRef.current = normalized;
    setPipelineTabs(normalized);
    return normalized;
  }, []);

  const syncStageAvailable = useCallback(
    (pipelineId, availableIds, { lockedIds = ['all'] } = {}) => {
      const key = String(pipelineId ?? '').trim();
      if (!key) return emptyTabBucket();

      const currentMap = stageTabsByPipelineRef.current;
      const current = currentMap[key] ?? emptyTabBucket();
      const normalized = normalizeTabBucket(availableIds, current, { lockedIds });
      const unchanged = JSON.stringify(current) === JSON.stringify(normalized);
      if (unchanged) return normalized;

      const nextMap = { ...currentMap, [key]: normalized };
      stageTabsByPipelineRef.current = nextMap;
      setStageTabsByPipeline(nextMap);
      return normalized;
    },
    [],
  );

  const getStageBucket = useCallback((pipelineId) => {
    const key = String(pipelineId ?? '').trim();
    if (!key) return emptyTabBucket();
    return stageTabsByPipelineRef.current[key] ?? emptyTabBucket();
  }, []);

  const updatePipelineBucket = useCallback(
    (updater) => {
      const previous = pipelineTabsRef.current;
      const next = typeof updater === 'function' ? updater(previous) : updater;
      const normalized = ensureAtLeastOneVisible(next);
      const rollback = {
        pipeline: previous,
        stages: stageTabsByPipelineRef.current,
      };
      pipelineTabsRef.current = normalized;
      setPipelineTabs(normalized);
      return persist({ nextPipelineTabs: normalized, rollback });
    },
    [persist],
  );

  const updateStageBucket = useCallback(
    (pipelineId, updater) => {
      const key = String(pipelineId ?? '').trim();
      if (!key) return Promise.resolve({ data: emptyTabBucket() });
      const currentMap = stageTabsByPipelineRef.current;
      const current = currentMap[key] ?? emptyTabBucket();
      const next = typeof updater === 'function' ? updater(current) : updater;
      const rollback = {
        pipeline: pipelineTabsRef.current,
        stages: currentMap,
      };
      const nextMap = { ...currentMap, [key]: next };
      stageTabsByPipelineRef.current = nextMap;
      setStageTabsByPipeline(nextMap);
      return persist({ stagePatch: { [key]: next }, rollback });
    },
    [persist],
  );

  const reorderPipelineTabs = useCallback(
    (activeId, overId) =>
      updatePipelineBucket((bucket) => ({
        ...bucket,
        order: reorderVisibleTabOrder(bucket.order, bucket.hidden, bucket.pinned, activeId, overId),
      })),
    [updatePipelineBucket],
  );

  const togglePinPipelineTab = useCallback(
    (tabId) => updatePipelineBucket((bucket) => togglePinnedInBucket(bucket, tabId)),
    [updatePipelineBucket],
  );

  const hidePipelineTab = useCallback(
    (tabId) =>
      updatePipelineBucket((bucket) =>
        hideTabInBucket(bucket, tabId, {
          lockedIds: [ALL_PIPELINE_TAB_VALUE],
          requireOneVisible: true,
        }),
      ),
    [updatePipelineBucket],
  );

  const unhidePipelineTab = useCallback(
    (tabId) => updatePipelineBucket((bucket) => unhideTabInBucket(bucket, tabId)),
    [updatePipelineBucket],
  );

  const reorderStageTabs = useCallback(
    (pipelineId, activeId, overId) =>
      updateStageBucket(pipelineId, (bucket) => ({
        ...bucket,
        order: reorderVisibleTabOrder(bucket.order, bucket.hidden, bucket.pinned, activeId, overId),
      })),
    [updateStageBucket],
  );

  const togglePinStageTab = useCallback(
    (pipelineId, tabId) =>
      updateStageBucket(pipelineId, (bucket) => togglePinnedInBucket(bucket, tabId)),
    [updateStageBucket],
  );

  const hideStageTab = useCallback(
    (pipelineId, tabId) =>
      updateStageBucket(pipelineId, (bucket) =>
        hideTabInBucket(bucket, tabId, { lockedIds: ['all'], requireOneVisible: false }),
      ),
    [updateStageBucket],
  );

  const unhideStageTab = useCallback(
    (pipelineId, tabId) =>
      updateStageBucket(pipelineId, (bucket) => unhideTabInBucket(bucket, tabId)),
    [updateStageBucket],
  );

  return {
    isLoaded,
    isSaving,
    pipelineTabs,
    stageTabsByPipeline,
    getStageBucket,
    syncPipelineAvailable,
    syncStageAvailable,
    reorderPipelineTabs,
    togglePinPipelineTab,
    hidePipelineTab,
    unhidePipelineTab,
    reorderStageTabs,
    togglePinStageTab,
    hideStageTab,
    unhideStageTab,
  };
}
