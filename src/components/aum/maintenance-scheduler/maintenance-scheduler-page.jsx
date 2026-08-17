import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

import { fetchAumOptions, selectAumOptions } from '@/redux/aumOptionsSlice';
import {
  fetchCenterSchedule,
  fetchMasterScheduleTree,
  resetSchedulerState,
  saveCenterScheduleLine,
  saveMasterScheduleLine,
  selectCenterSchedule,
  selectMasterSchedule,
} from '@/redux/aumMaintenanceSlice';
import MaintenanceSchedulerGrid from '@/components/aum/maintenance-scheduler/maintenance-scheduler-grid';
import MaintenanceSchedulerToolbar from '@/components/aum/maintenance-scheduler/maintenance-scheduler-toolbar';
import {
  filterMsSchedulerRows,
  updateMsSchedulerRow,
} from '@/components/aum/maintenance-scheduler/maintenance-scheduler-helper';
import { AUM_TAB_IDS } from '@/components/aum/constants';
import { useAumSearch } from '@/components/aum/use-aum-search';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const MS_VIEW_MODES = {
  SCHEDULER: 'scheduler',
  MASTER_SETUP: 'master-setup',
};

function findSchedulerRowById(rows, rowId) {
  for (const row of rows) {
    if (row.id === rowId) return row;
    if (row.children?.length) {
      const child = row.children.find((item) => item.id === rowId);
      if (child) return child;
    }
  }
  return null;
}

const GENERATING_CHECKS_CLEAR_MS = 45000;

const MaintenanceSchedulerPage = () => {
  const dispatch = useDispatch();
  const { centers: centerOptions } = useSelector(selectAumOptions);
  const { rows: masterFromStore, status: masterStatus } = useSelector(selectMasterSchedule);
  const { rows: centerFromStore, status: centerStatus } = useSelector(selectCenterSchedule);

  const [viewMode, setViewMode] = useState(MS_VIEW_MODES.MASTER_SETUP);
  const { searchValue, setSearchValue, debouncedSearch } = useAumSearch();
  const [selectedCenter, setSelectedCenter] = useState('');
  const [masterRows, setMasterRows] = useState([]);
  const [schedulerRows, setSchedulerRows] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingChecks, setIsGeneratingChecks] = useState(false);

  const isMasterSetupMode = viewMode === MS_VIEW_MODES.MASTER_SETUP;
  const isLoading = isMasterSetupMode ? masterStatus === 'loading' : centerStatus === 'loading';

  const saveTimerRef = useRef(null);
  const saveQueueRef = useRef({ inFlight: false, pending: null, needsRetry: false });
  const generatingChecksTimerRef = useRef(null);

  useEffect(() => {
    setMasterRows(masterFromStore);
  }, [masterFromStore]);

  useEffect(() => {
    setSchedulerRows(centerFromStore);
  }, [centerFromStore]);

  useEffect(() => {
    dispatch(fetchAumOptions());
    return () => {
      dispatch(resetSchedulerState());
    };
  }, [dispatch]);

  useEffect(() => {
    if (centerOptions.length > 0) {
      setSelectedCenter((current) => current || centerOptions[0].value);
    }
  }, [centerOptions]);

  useEffect(() => {
    if (!isMasterSetupMode) return undefined;
    dispatch(fetchMasterScheduleTree());
    return undefined;
  }, [dispatch, isMasterSetupMode]);

  useEffect(() => {
    if (isMasterSetupMode || !selectedCenter) return undefined;
    dispatch(fetchCenterSchedule(selectedCenter));
    return undefined;
  }, [dispatch, isMasterSetupMode, selectedCenter]);

  useEffect(() => {
    if (masterStatus === 'failed') {
      showErrorToast('Could not load master schedule.');
    }
  }, [masterStatus]);

  useEffect(() => {
    if (centerStatus === 'failed') {
      showErrorToast('Could not load center schedule.');
    }
  }, [centerStatus]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (generatingChecksTimerRef.current) {
        clearTimeout(generatingChecksTimerRef.current);
      }
    },
    [],
  );

  const markPreventiveChecksQueued = useCallback(() => {
    setIsGeneratingChecks(true);
    if (generatingChecksTimerRef.current) {
      clearTimeout(generatingChecksTimerRef.current);
    }
    generatingChecksTimerRef.current = setTimeout(() => {
      setIsGeneratingChecks(false);
      generatingChecksTimerRef.current = null;
    }, GENERATING_CHECKS_CLEAR_MS);
  }, []);

  const activeRows = isMasterSetupMode ? masterRows : schedulerRows;

  const filteredRows = useMemo(
    () => filterMsSchedulerRows(activeRows, debouncedSearch),
    [activeRows, debouncedSearch],
  );

  const persistRow = useCallback(
    async (rowId, nextRows) => {
      const row = findSchedulerRowById(nextRows, rowId);
      if (!row) return null;

      const hasChildren = Boolean(row.children?.length);

      try {
        let checksQueued = false;
        if (isMasterSetupMode) {
          const result = await dispatch(saveMasterScheduleLine(row)).unwrap();
          checksQueued = Boolean(result?.result?.preventive_checks_queued);
        } else {
          const result = await dispatch(
            saveCenterScheduleLine({ center: selectedCenter, row }),
          ).unwrap();
          checksQueued = Boolean(result?.result?.preventive_checks_queued);
        }
        return { refetch: hasChildren ? 'refetch' : null, checksQueued };
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Could not save schedule line.' });
        throw error;
      }
    },
    [dispatch, isMasterSetupMode, selectedCenter],
  );

  const flushSaveQueue = useCallback(async () => {
    if (saveQueueRef.current.inFlight) {
      saveQueueRef.current.needsRetry = true;
      return;
    }

    saveQueueRef.current.inFlight = true;
    setIsSaving(true);

    let shouldRefetch = false;
    let checksQueued = false;

    try {
      while (saveQueueRef.current.pending) {
        const pending = saveQueueRef.current.pending;
        saveQueueRef.current.pending = null;
        const result = await persistRow(pending.rowId, pending.nextRows);
        if (result?.refetch === 'refetch') {
          shouldRefetch = true;
        }
        if (result?.checksQueued) {
          checksQueued = true;
        }
      }

      if (checksQueued) {
        markPreventiveChecksQueued();
        showSuccessToast('Schedule saved. Generating preventive checks in the background.');
      }

      if (shouldRefetch) {
        if (isMasterSetupMode) {
          dispatch(fetchMasterScheduleTree());
        } else if (selectedCenter) {
          dispatch(fetchCenterSchedule(selectedCenter));
        }
      }
    } finally {
      const shouldRetry = saveQueueRef.current.needsRetry || saveQueueRef.current.pending;
      saveQueueRef.current.inFlight = false;
      saveQueueRef.current.needsRetry = false;
      setIsSaving(false);
      if (shouldRetry) {
        flushSaveQueue();
      }
    }
  }, [dispatch, isMasterSetupMode, markPreventiveChecksQueued, persistRow, selectedCenter]);

  const schedulePersist = useCallback(
    (rowId, nextRows) => {
      saveQueueRef.current.pending = { rowId, nextRows };
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        flushSaveQueue();
      }, 400);
    },
    [flushSaveQueue],
  );

  const handleRowChange = useCallback(
    (rowId, patchOrUpdater) => {
      if (isMasterSetupMode) {
        setMasterRows((previous) => {
          const nextRows = updateMsSchedulerRow(previous, rowId, patchOrUpdater);
          schedulePersist(rowId, nextRows);
          return nextRows;
        });
        return;
      }

      setSchedulerRows((previous) => {
        const nextRows = updateMsSchedulerRow(previous, rowId, patchOrUpdater);
        schedulePersist(rowId, nextRows);
        return nextRows;
      });
    },
    [isMasterSetupMode, schedulePersist],
  );

  const handleMasterSetupClick = useCallback(() => {
    setSearchValue('');
    setViewMode(MS_VIEW_MODES.MASTER_SETUP);
  }, []);

  const handleCenterChange = useCallback((centerValue) => {
    setSelectedCenter(centerValue);
    setSearchValue('');
    setViewMode(MS_VIEW_MODES.SCHEDULER);
  }, []);

  const handleExitMasterSetup = useCallback(() => {
    setSearchValue('');
    setViewMode(MS_VIEW_MODES.SCHEDULER);
  }, []);

  return (
    <TabMenuHorizontal.Content
      value={AUM_TAB_IDS.MAINTENANCE_SCHEDULER}
      className='min-h-0 flex-1 outline-none'
    >
      <div className='flex min-h-0 flex-1 flex-col gap-4 px-8 pb-10 pt-6'>
        <MaintenanceSchedulerToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          selectedCenter={selectedCenter}
          centerOptions={centerOptions}
          onCenterChange={handleCenterChange}
          onMasterSetupClick={handleMasterSetupClick}
          onExitMasterSetup={handleExitMasterSetup}
          isMasterSetupMode={isMasterSetupMode}
          isSaving={isSaving}
          isGeneratingChecks={isGeneratingChecks}
        />

        {isLoading ? (
          <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-10 text-center text-label-sm text-text-sub-500'>
            Loading schedule...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-10 text-center text-label-sm text-text-sub-500'>
            No product types match this search.
          </div>
        ) : (
          <MaintenanceSchedulerGrid
            key={`${selectedCenter}-${isMasterSetupMode ? 'master' : 'center'}`}
            rows={filteredRows}
            onRowChange={handleRowChange}
          />
        )}
      </div>
    </TabMenuHorizontal.Content>
  );
};

export default MaintenanceSchedulerPage;
