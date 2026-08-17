import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  LEAD_VIEW_SAVE_SCOPES,
  areLeadViewSettingsEqual,
  collectLeadViewDirtySnapshot,
  createEmptyLeadViewSettings,
  loadCrmLeadViewSettings,
  persistCrmLeadViewAutosave,
  persistCrmLeadViewSettings,
  resetCrmLeadViewSettings,
} from '@/pages/crm/leads-view/lead-view-settings';

/**
 * CRM Leads Save View — one saved view per pipeline (shared across stages).
 */
export function useCrmLeadSaveView({
  appliedFilters,
  sorting,
  groupBy,
  groupOrder,
  searchTerm,
  showAssignedToMeOnly = false,
  selectedPipelineId,
  selectedStageTab,
  columnsRef,
  onApplyViewSettings,
  enabled = true,
  viewReady = true,
}) {
  const [viewHydrated, setViewHydrated] = useState(false);
  const [hasPersonalView, setHasPersonalView] = useState(false);
  const [canSaveViewForAll, setCanSaveViewForAll] = useState(false);
  const [isAutosaveEnabled, setIsAutosaveEnabled] = useState(false);
  const [isSavingView, setIsSavingView] = useState(false);
  const [savedBaseline, setSavedBaseline] = useState(null);
  const [savedColumns, setSavedColumns] = useState([]);
  /** Live column config for dirty detection (table reports via reportColumnsChange). */
  const [liveColumns, setLiveColumns] = useState([]);
  const [savedLifecycleStage, setSavedLifecycleStage] = useState([]);
  const [baselineReady, setBaselineReady] = useState(false);
  const [loadedScopeKey, setLoadedScopeKey] = useState('');

  const skipPersistRef = useRef(false);
  const autosaveTimerRef = useRef(null);
  const loadRequestIdRef = useRef(0);
  /** Bumped on every save start and on scope load so stale completions are ignored. */
  const saveRequestIdRef = useRef(0);
  /** Tracks non-silent saves so isSavingView is not cleared by a superseded request. */
  const nonSilentSaveCountRef = useRef(0);
  const activeScopeKeyRef = useRef('');
  /** Lifecycle filters stored for the pipeline (All-tab); preserved when saving from a stage tab. */
  const preservedLifecycleRef = useRef([]);

  const pipeline = typeof selectedPipelineId === 'string' ? selectedPipelineId.trim() : '';
  const stage =
    typeof selectedStageTab === 'string' && selectedStageTab.trim()
      ? selectedStageTab.trim()
      : 'all';
  // Reload only when pipeline changes — stages share the same saved view.
  const scopeKey = pipeline && viewReady ? pipeline : '';
  activeScopeKeyRef.current = scopeKey;
  const isActiveScopeLoaded = Boolean(scopeKey) && loadedScopeKey === scopeKey;

  const currentDirtySnapshot = useMemo(() => {
    if (!viewHydrated || !baselineReady || !isActiveScopeLoaded) return null;
    return collectLeadViewDirtySnapshot({
      filters: appliedFilters,
      sorting,
      grouping: { groupBy, groupOrder },
      columns: liveColumns,
      settings: { search: searchTerm, showAssignedToMeOnly: Boolean(showAssignedToMeOnly) },
      stage,
    });
  }, [
    appliedFilters,
    baselineReady,
    groupBy,
    groupOrder,
    isActiveScopeLoaded,
    liveColumns,
    searchTerm,
    showAssignedToMeOnly,
    sorting,
    stage,
    viewHydrated,
  ]);

  const isViewDirty = useMemo(() => {
    if (
      !viewHydrated ||
      !baselineReady ||
      !isActiveScopeLoaded ||
      !savedBaseline ||
      !currentDirtySnapshot
    ) {
      return false;
    }
    return !areLeadViewSettingsEqual(savedBaseline, currentDirtySnapshot);
  }, [baselineReady, currentDirtySnapshot, isActiveScopeLoaded, savedBaseline, viewHydrated]);

  const buildFullSettings = useCallback(() => {
    const columns = Array.isArray(columnsRef?.current)
      ? columnsRef.current
      : Array.isArray(savedColumns)
        ? savedColumns
        : [];

    return {
      filters: appliedFilters,
      sorting,
      grouping: { groupBy, groupOrder },
      columns,
      settings: {
        search: searchTerm,
        showAssignedToMeOnly: Boolean(showAssignedToMeOnly),
      },
    };
  }, [
    appliedFilters,
    columnsRef,
    groupBy,
    groupOrder,
    savedColumns,
    searchTerm,
    showAssignedToMeOnly,
    sorting,
  ]);

  const rememberLifecycleStage = useCallback((lifecycleStage) => {
    const next = Array.isArray(lifecycleStage) ? lifecycleStage : [];
    preservedLifecycleRef.current = next;
    setSavedLifecycleStage(next);
  }, []);

  const commitBaselineFromSettings = useCallback(
    (settings) => {
      const snapshot = collectLeadViewDirtySnapshot({ ...settings, stage });
      setSavedBaseline(snapshot);
      const nextColumns = Array.isArray(settings.columns) ? settings.columns : [];
      setSavedColumns(nextColumns);
      setLiveColumns(snapshot.columns);
      if (columnsRef) {
        columnsRef.current = nextColumns;
      }
      if (stage === 'all' && Array.isArray(settings?.filters?.lifecycle_stage)) {
        rememberLifecycleStage(settings.filters.lifecycle_stage);
      } else if (
        Array.isArray(settings?.filters?.lifecycle_stage) &&
        settings.filters.lifecycle_stage.length > 0
      ) {
        rememberLifecycleStage(settings.filters.lifecycle_stage);
      }
    },
    [columnsRef, rememberLifecycleStage, stage],
  );

  const applyMetaFromResult = useCallback((data) => {
    setHasPersonalView(Boolean(data?.isPersonal));
    setCanSaveViewForAll(Boolean(data?.canSaveForAll));
    setIsAutosaveEnabled(Boolean(data?.autosaveEnabled));
  }, []);

  const handleSaveView = useCallback(
    async ({ silent = false, scope = LEAD_VIEW_SAVE_SCOPES.ME } = {}) => {
      if (!pipeline) return null;

      const normalizedScope =
        scope === LEAD_VIEW_SAVE_SCOPES.ALL ? LEAD_VIEW_SAVE_SCOPES.ALL : LEAD_VIEW_SAVE_SCOPES.ME;

      if (normalizedScope === LEAD_VIEW_SAVE_SCOPES.ALL && !canSaveViewForAll) {
        showErrorToast('Only Admin, Super Admin, or System Manager can save the view for everyone');
        return null;
      }

      const saveId = ++saveRequestIdRef.current;
      const saveScopeKey = pipeline;

      if (!silent) {
        nonSilentSaveCountRef.current += 1;
        setIsSavingView(true);
      }
      try {
        const settings = buildFullSettings();
        if (stage === 'all' && Array.isArray(settings?.filters?.lifecycle_stage)) {
          rememberLifecycleStage(settings.filters.lifecycle_stage);
        }
        const result = await persistCrmLeadViewSettings(settings, {
          scope: normalizedScope,
          pipeline,
          stage,
          preservedLifecycleStage: preservedLifecycleRef.current,
        });
        if (saveId !== saveRequestIdRef.current || saveScopeKey !== activeScopeKeyRef.current) {
          return null;
        }
        if (result.error) {
          if (!silent) showErrorToast(result.error);
          return null;
        }

        commitBaselineFromSettings(settings);
        setBaselineReady(true);
        applyMetaFromResult({
          ...result.data,
          isPersonal: normalizedScope === LEAD_VIEW_SAVE_SCOPES.ME,
        });

        if (!silent) {
          showSuccessToast(
            normalizedScope === LEAD_VIEW_SAVE_SCOPES.ALL
              ? 'View saved for everyone'
              : 'View saved for you',
          );
        }
        return result.data;
      } finally {
        if (!silent) {
          nonSilentSaveCountRef.current = Math.max(0, nonSilentSaveCountRef.current - 1);
          if (nonSilentSaveCountRef.current === 0) {
            setIsSavingView(false);
          }
        }
      }
    },
    [
      applyMetaFromResult,
      buildFullSettings,
      canSaveViewForAll,
      commitBaselineFromSettings,
      pipeline,
      rememberLifecycleStage,
      stage,
    ],
  );

  const handleRevertView = useCallback(() => {
    if (!savedBaseline) return;
    skipPersistRef.current = true;
    const columns = Array.isArray(savedColumns) ? savedColumns : [];
    setLiveColumns(collectLeadViewDirtySnapshot({ ...savedBaseline, columns, stage }).columns);
    if (columnsRef) {
      columnsRef.current = columns;
    }
    onApplyViewSettings?.({
      ...savedBaseline,
      columns,
    });
  }, [columnsRef, onApplyViewSettings, savedBaseline, savedColumns, stage]);

  const handleResetToDefault = useCallback(
    async ({ scope = LEAD_VIEW_SAVE_SCOPES.ME } = {}) => {
      if (!pipeline) return;

      const normalizedScope =
        scope === LEAD_VIEW_SAVE_SCOPES.ALL ? LEAD_VIEW_SAVE_SCOPES.ALL : LEAD_VIEW_SAVE_SCOPES.ME;

      if (normalizedScope === LEAD_VIEW_SAVE_SCOPES.ALL && !canSaveViewForAll) {
        showErrorToast(
          'Only Admin, Super Admin, or System Manager can reset the view for everyone',
        );
        return;
      }

      const saveId = ++saveRequestIdRef.current;
      const saveScopeKey = pipeline;

      nonSilentSaveCountRef.current += 1;
      setIsSavingView(true);
      try {
        const result = await resetCrmLeadViewSettings({
          scope: normalizedScope,
          pipeline,
          stage,
        });
        if (saveId !== saveRequestIdRef.current || saveScopeKey !== activeScopeKeyRef.current) {
          return;
        }
        if (result.error) {
          showErrorToast(result.error);
          return;
        }

        const settings = result.data ?? createEmptyLeadViewSettings({ stage });
        rememberLifecycleStage(
          Array.isArray(settings?.filters?.lifecycle_stage) ? settings.filters.lifecycle_stage : [],
        );
        skipPersistRef.current = true;
        onApplyViewSettings?.(settings);
        commitBaselineFromSettings(settings);
        setBaselineReady(true);
        applyMetaFromResult(settings);

        showSuccessToast(
          normalizedScope === LEAD_VIEW_SAVE_SCOPES.ALL
            ? 'Default view restored for everyone'
            : 'Default view restored',
        );
      } finally {
        nonSilentSaveCountRef.current = Math.max(0, nonSilentSaveCountRef.current - 1);
        if (nonSilentSaveCountRef.current === 0) {
          setIsSavingView(false);
        }
      }
    },
    [
      applyMetaFromResult,
      canSaveViewForAll,
      commitBaselineFromSettings,
      onApplyViewSettings,
      pipeline,
      rememberLifecycleStage,
      stage,
    ],
  );

  const handleToggleAutosave = useCallback(async () => {
    if (!pipeline) return;

    const next = !isAutosaveEnabled;
    const result = await persistCrmLeadViewAutosave(next, { pipeline, stage });
    if (result.error) {
      showErrorToast(result.error);
      return;
    }

    applyMetaFromResult({
      ...result.data,
      autosaveEnabled: Boolean(result.data?.autosaveEnabled ?? next),
    });

    if (next && isViewDirty) {
      await handleSaveView({ silent: true, scope: LEAD_VIEW_SAVE_SCOPES.ME });
    }
  }, [applyMetaFromResult, handleSaveView, isAutosaveEnabled, isViewDirty, pipeline, stage]);

  /**
   * Column rearrange / show-hide report here for Save View dirty detection.
   * Does not write to the server — Save for me / Autosave / Save for all persist.
   */
  const reportColumnsChange = useCallback(
    (columns) => {
      if (!pipeline || !viewHydrated || !baselineReady || skipPersistRef.current) return;

      const nextColumns = Array.isArray(columns) ? columns : [];
      if (columnsRef) {
        columnsRef.current = nextColumns;
      }
      setLiveColumns(
        collectLeadViewDirtySnapshot({
          columns: nextColumns,
          stage,
        }).columns,
      );
    },
    [baselineReady, columnsRef, pipeline, stage, viewHydrated],
  );

  const getSavedColumns = useCallback(() => savedColumns, [savedColumns]);

  // Load (or reload) the view whenever the pipeline changes.
  useEffect(() => {
    if (!enabled) {
      setViewHydrated(true);
      setBaselineReady(true);
      return undefined;
    }

    if (!scopeKey) {
      setViewHydrated(false);
      setBaselineReady(false);
      setLoadedScopeKey('');
      return undefined;
    }

    let cancelled = false;
    const requestId = ++loadRequestIdRef.current;
    // Invalidate in-flight saves for the previous scope.
    ++saveRequestIdRef.current;
    setBaselineReady(false);
    setViewHydrated(false);
    setLoadedScopeKey('');
    rememberLifecycleStage([]);

    (async () => {
      const result = await loadCrmLeadViewSettings({ pipeline, stage });
      if (cancelled || requestId !== loadRequestIdRef.current) return;

      if (result.error) {
        showErrorToast(result.error);
        const empty = createEmptyLeadViewSettings({ stage });
        skipPersistRef.current = true;
        onApplyViewSettings?.(empty);
        commitBaselineFromSettings(empty);
        // Keep canSaveForAll from a prior successful load / role — empty meta
        // would incorrectly clear admin "Save for all" after a transient get failure.
        setHasPersonalView(false);
        setIsAutosaveEnabled(false);
        setLoadedScopeKey(scopeKey);
        setViewHydrated(true);
        setBaselineReady(true);
        return;
      }

      const settings = result.data ?? createEmptyLeadViewSettings({ stage });
      rememberLifecycleStage(
        Array.isArray(settings?.filters?.lifecycle_stage) ? settings.filters.lifecycle_stage : [],
      );
      skipPersistRef.current = true;
      onApplyViewSettings?.(settings);
      commitBaselineFromSettings(settings);
      applyMetaFromResult(settings);
      setLoadedScopeKey(scopeKey);
      setViewHydrated(true);
      setBaselineReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // Reload only when the pipeline identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, scopeKey]);

  // Stage tabs share the pipeline view — re-baseline dirty detection when the
  // active stage changes so lifecycle filter ownership does not false-dirty.
  useEffect(() => {
    if (!isActiveScopeLoaded || !viewHydrated || !baselineReady || !savedBaseline) {
      return;
    }

    const lifecycleStage =
      stage === 'all' && Array.isArray(preservedLifecycleRef.current)
        ? preservedLifecycleRef.current
        : [];

    setSavedBaseline(
      collectLeadViewDirtySnapshot({
        filters: {
          ...savedBaseline.filters,
          lifecycle_stage: lifecycleStage,
        },
        sorting: savedBaseline.sorting,
        grouping: savedBaseline.grouping,
        columns: savedBaseline.columns,
        settings: savedBaseline.settings,
        stage,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Clear skip flag after apply settles
  useEffect(() => {
    if (!skipPersistRef.current) return undefined;
    const timer = window.setTimeout(() => {
      skipPersistRef.current = false;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentDirtySnapshot, scopeKey]);

  // Autosave dirty changes in real time for the active tab
  useEffect(() => {
    if (
      !isActiveScopeLoaded ||
      !viewHydrated ||
      !baselineReady ||
      !isAutosaveEnabled ||
      !isViewDirty ||
      skipPersistRef.current
    ) {
      return undefined;
    }

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      handleSaveView({ silent: true, scope: LEAD_VIEW_SAVE_SCOPES.ME });
    }, 400);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    baselineReady,
    handleSaveView,
    isActiveScopeLoaded,
    isAutosaveEnabled,
    isViewDirty,
    viewHydrated,
  ]);

  return {
    viewHydrated,
    isViewDirty,
    hasPersonalView,
    canSaveViewForAll,
    isAutosaveEnabled,
    isSavingView,
    savedColumns,
    savedLifecycleStage,
    getSavedColumns,
    handleSaveView,
    handleRevertView,
    handleResetToDefault,
    handleToggleAutosave,
    reportColumnsChange,
  };
}
