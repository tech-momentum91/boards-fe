import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useSearchParams } from 'react-router-dom';

import { getProjectFloorLayoutBundle } from '@/api/projectLayout';
import { deleteProjectTask } from '@/api/projectTasks';
import ProjectGlobalLayoutHeader from '@/components/projects/global-layout/project-global-layout-header';
import ProjectGlobalLayoutTabs from '@/components/projects/global-layout/project-global-layout-tabs';
import ProjectGlobalLayoutTaskViewHost from '@/components/projects/global-layout/project-global-layout-task-view-host';
import ProjectGlobalLayoutViewer from '@/components/projects/global-layout/project-global-layout-viewer';
import { normalizeProjectFloorLayoutBundle } from '@/components/projects/global-layout/project-global-layout-helpers';
import { resolveGlobalLayoutBundleRequestFilters } from '@/components/projects/global-layout/project-global-layout-status-filter-helpers';
import { getProjectGlobalLayoutTabConfig } from '@/components/projects/global-layout/project-global-layout-task-icons';
import ProjectMembersPopover from '@/components/projects/list/project-members-popover';
import { parseProjectFloors } from '@/components/projects/shared';
import {
  fetchProjectDetail,
  selectProjectDetail,
  selectProjectDetailLoading,
} from '@/redux/projectSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';

export default function ProjectGlobalLayoutPage() {
  const dispatch = useDispatch();
  const { id: projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
  const floorParam = String(searchParams.get('floor') ?? '').trim();
  const layoutIdParam = String(searchParams.get('layout_id') ?? '').trim();
  const tabParam = String(searchParams.get('tab') ?? 'all').trim() || 'all';

  const projectDetail = useSelector(selectProjectDetail);
  const isProjectDetailLoading = useSelector(selectProjectDetailLoading);

  const [bundle, setBundle] = useState(null);
  const [activeTabId, setActiveTabId] = useState(tabParam);
  const [appliedStatusFilters, setAppliedStatusFilters] = useState({});
  const [viewTask, setViewTask] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState(null);
  const isInitialLoadRef = useRef(true);

  const activeTab = useMemo(() => getProjectGlobalLayoutTabConfig(activeTabId), [activeTabId]);
  const filterTaskType = activeTab.taskType;
  const showAreas = activeTab.showAreas;

  useEffect(() => {
    setActiveTabId(tabParam);
  }, [tabParam]);

  useEffect(() => {
    const project = String(projectId ?? '').trim();
    if (!project) return;
    dispatch(fetchProjectDetail(project));
  }, [dispatch, projectId]);

  const bundleRequestFilters = useMemo(
    () => resolveGlobalLayoutBundleRequestFilters(appliedStatusFilters),
    [appliedStatusFilters],
  );

  const bundleFetchKey = useMemo(
    () =>
      JSON.stringify({
        projectId: String(projectId ?? '').trim(),
        page,
        floor: floorParam,
        layout_id: layoutIdParam,
        task_type: bundleRequestFilters.task_type,
        statuses: bundleRequestFilters.statuses,
        useClientFilter: bundleRequestFilters.useClientFilter,
        clientFilters: bundleRequestFilters.clientFilters,
      }),
    [bundleRequestFilters, floorParam, layoutIdParam, page, projectId],
  );

  const loadBundle = useCallback(async () => {
    const project = String(projectId ?? '').trim();
    if (!project) {
      setError('Project ID is required');
      setIsInitialLoading(false);
      return;
    }

    const isInitialLoad = isInitialLoadRef.current;
    if (isInitialLoad) {
      setIsInitialLoading(true);
    }
    setError(null);

    try {
      const payload = { project, page };
      if (floorParam) payload.floor = floorParam;
      if (layoutIdParam) payload.layout_id = layoutIdParam;
      if (!bundleRequestFilters.useClientFilter) {
        if (bundleRequestFilters.task_type) payload.task_type = bundleRequestFilters.task_type;
        if (bundleRequestFilters.statuses?.length === 1) {
          payload.status = bundleRequestFilters.statuses[0];
        } else if (bundleRequestFilters.statuses?.length > 1) {
          payload.statuses = bundleRequestFilters.statuses;
        }
      }

      const message = await getProjectFloorLayoutBundle(payload);
      setBundle(normalizeProjectFloorLayoutBundle(message));
      // eslint-disable-next-line require-atomic-updates -- ref tracks first successful load only
      isInitialLoadRef.current = false;
      setHasLoadedOnce(true);
    } catch (fetchError) {
      const message = extractErrorMessage(fetchError, 'Failed to load global layout');
      setError(message);
      if (isInitialLoad) {
        showErrorToast(message);
      }
    } finally {
      setIsInitialLoading(false);
    }
  }, [bundleRequestFilters, floorParam, layoutIdParam, page, projectId]);

  useEffect(() => {
    loadBundle();
    // bundleFetchKey captures the fetch inputs; loadBundle reads the latest filter state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundleFetchKey]);

  const floor = bundle?.floor ?? null;
  const totalPages = bundle?.totalPages ?? 1;
  const currentPage = bundle?.page ?? page;
  const canGoPrev = currentPage > 1;
  const canGoNext = Boolean(bundle?.hasMore);

  const updateSearchParams = useCallback(
    (patch) => {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        Object.entries(patch).forEach(([key, value]) => {
          const normalized = String(value ?? '').trim();
          if (!normalized || (key === 'page' && Number(normalized) <= 1)) {
            next.delete(key);
          } else {
            next.set(key, normalized);
          }
        });
        return next;
      });
    },
    [setSearchParams],
  );

  const handlePrevFloor = useCallback(() => {
    if (!canGoPrev) return;
    updateSearchParams({ page: String(currentPage - 1), floor: '', layout_id: '' });
  }, [canGoPrev, currentPage, updateSearchParams]);

  const handleNextFloor = useCallback(() => {
    if (!canGoNext) return;
    updateSearchParams({ page: String(currentPage + 1), floor: '', layout_id: '' });
  }, [canGoNext, currentPage, updateSearchParams]);

  const handleTabChange = useCallback(
    (nextTabId) => {
      setActiveTabId(nextTabId);
      updateSearchParams({ tab: nextTabId === 'all' ? '' : nextTabId });
    },
    [updateSearchParams],
  );

  const handleStatusFiltersApply = useCallback(
    (nextFilters) => {
      setAppliedStatusFilters(nextFilters);
      updateSearchParams({ page: '1', floor: '', layout_id: '' });
    },
    [updateSearchParams],
  );

  const handleViewTask = useCallback((task) => {
    if (!task) return;
    setViewTask(task);
  }, []);

  const handleCloseViewTask = useCallback(() => {
    setViewTask(null);
  }, []);

  const handleDeleteTask = useCallback(
    async (task) => {
      const taskId = String(task?.task_id ?? task?.name ?? '').trim();
      if (!taskId) {
        showErrorToast(null, { defaultMessage: 'Task ID is required' });
        return false;
      }

      try {
        const result = await deleteProjectTask(taskId);
        showSuccessToast(result?.message ?? 'Task deleted successfully');

        if (String(viewTask?.task_id ?? viewTask?.name ?? '').trim() === taskId) {
          setViewTask(null);
        }

        await loadBundle();
        return true;
      } catch (error) {
        showErrorToast(extractErrorMessage(error, 'Failed to delete task'));
        return false;
      }
    },
    [loadBundle, viewTask],
  );

  const floorNavigation = useMemo(
    () => ({
      currentPage,
      totalPages,
      canGoPrev,
      canGoNext,
      onPrev: handlePrevFloor,
      onNext: handleNextFloor,
    }),
    [canGoNext, canGoPrev, currentPage, handleNextFloor, handlePrevFloor, totalPages],
  );

  const projectFloors = useMemo(() => parseProjectFloors(projectDetail), [projectDetail]);

  const showInitialLoader = isInitialLoading && !hasLoadedOnce;

  return (
    <div className='flex h-dvh w-dvw flex-col overflow-hidden bg-bg-white-0'>
      <ProjectGlobalLayoutHeader
        project={projectDetail}
        isLoading={isProjectDetailLoading && !projectDetail}
        membersAction={
          <ProjectMembersPopover
            project={projectDetail || { name: projectId, users: [] }}
            projectId={projectId}
            onUpdated={async () => {
              if (!projectId) return;
              await dispatch(fetchProjectDetail(projectId)).unwrap();
            }}
          >
            <button
              type='button'
              className='text-label-sm text-primary-base underline disabled:opacity-50'
              disabled={!projectId || (isProjectDetailLoading && !projectDetail)}
            >
              View All
            </button>
          </ProjectMembersPopover>
        }
      />

      <ProjectGlobalLayoutTabs
        activeTabId={activeTabId}
        onTabChange={handleTabChange}
        statusFiltersByTaskType={appliedStatusFilters}
        onStatusFiltersApply={handleStatusFiltersApply}
        disabled={showInitialLoader}
      />

      <div className='relative min-h-0 flex-1 overflow-hidden bg-bg-weak-50'>
        {showInitialLoader ? (
          <div className='flex h-full items-center justify-center text-paragraph-sm text-text-sub-500'>
            Loading global layout…
          </div>
        ) : null}

        {!showInitialLoader && error && !floor ? (
          <div className='flex h-full items-center justify-center px-6 text-paragraph-sm text-error-base'>
            {error}
          </div>
        ) : null}

        {!showInitialLoader && floor ? (
          <ProjectGlobalLayoutViewer
            projectId={projectId}
            floor={floor}
            filterTaskType={filterTaskType}
            statusFiltersByTaskType={appliedStatusFilters}
            showAreas={showAreas}
            floorNavigation={floorNavigation}
            onTaskCreated={loadBundle}
            onViewTask={handleViewTask}
            onDeleteTask={handleDeleteTask}
            className='h-full rounded-none border-0'
          />
        ) : null}

        {!showInitialLoader && !error && !floor ? (
          <div className='flex h-full items-center justify-center px-6 text-paragraph-sm text-text-sub-500'>
            No floor layout found for this project.
          </div>
        ) : null}
      </div>

      <ProjectGlobalLayoutTaskViewHost
        task={viewTask}
        projectId={projectId}
        projectFloors={projectFloors}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) handleCloseViewTask();
        }}
        onUpdated={loadBundle}
      />
    </div>
  );
}
