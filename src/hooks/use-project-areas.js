import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  filterProjectAreaRecordsByFloor,
  mapProjectAreaRecordsToOptions,
} from '@/components/projects/project-area-helpers';
import {
  fetchProjectAreas,
  selectProjectAreasLoading,
  selectProjectAreasRecords,
} from '@/redux/projectSlice';

const EMPTY_AREA_RECORDS = [];

/**
 * Prefetch all project areas (no floor filter) — call once on project detail page load.
 */
export function usePrefetchProjectAreas(projectId) {
  const dispatch = useDispatch();
  const normalizedProject = String(projectId ?? '').trim();

  useEffect(() => {
    if (!normalizedProject) return;
    dispatch(fetchProjectAreas({ projectId: normalizedProject }));
  }, [dispatch, normalizedProject]);
}

/**
 * Area options from /resource/Project Area.
 *
 * - fetchByFloor=false (default): reads project-wide cache and filters by floor client-side.
 * - fetchByFloor=true: fetches areas for the selected floor only (view drawers).
 */
export function useProjectAreas(projectId, floor, currentArea, { fetchByFloor = false } = {}) {
  const dispatch = useDispatch();

  const normalizedProject = String(projectId ?? '').trim();
  const normalizedFloor = String(floor ?? '').trim();
  const cacheFloor = fetchByFloor ? normalizedFloor : '';

  const records = useSelector((state) => {
    if (!normalizedProject) return EMPTY_AREA_RECORDS;
    if (fetchByFloor && !normalizedFloor) return EMPTY_AREA_RECORDS;
    return selectProjectAreasRecords(state, normalizedProject, cacheFloor);
  });
  const isLoading = useSelector((state) => {
    if (!normalizedProject) return false;
    if (fetchByFloor && !normalizedFloor) return false;
    return selectProjectAreasLoading(state, normalizedProject, cacheFloor);
  });

  useEffect(() => {
    if (!normalizedProject) return;
    if (fetchByFloor && !normalizedFloor) return;

    dispatch(
      fetchProjectAreas({
        projectId: normalizedProject,
        ...(fetchByFloor ? { floor: normalizedFloor } : {}),
      }),
    );
  }, [dispatch, fetchByFloor, normalizedFloor, normalizedProject]);

  const scopedRecords = useMemo(() => {
    if (fetchByFloor) return records;
    return filterProjectAreaRecordsByFloor(records, normalizedFloor);
  }, [fetchByFloor, normalizedFloor, records]);

  const areaOptions = useMemo(
    () => mapProjectAreaRecordsToOptions(scopedRecords, currentArea),
    [scopedRecords, currentArea],
  );

  return { areaOptions, records: scopedRecords, isLoading };
}

/** All project areas (no floor filter) — useful for list filters. */
export function useProjectAreaFilterOptions(projectId) {
  const dispatch = useDispatch();

  const normalizedProject = String(projectId ?? '').trim();

  const records = useSelector((state) => {
    if (!normalizedProject) return EMPTY_AREA_RECORDS;
    return selectProjectAreasRecords(state, normalizedProject, '');
  });

  useEffect(() => {
    if (!normalizedProject) return;
    dispatch(fetchProjectAreas({ projectId: normalizedProject }));
  }, [dispatch, normalizedProject]);

  return useMemo(
    () =>
      mapProjectAreaRecordsToOptions(records).map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [records],
  );
}
