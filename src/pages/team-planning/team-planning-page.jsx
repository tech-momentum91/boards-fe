import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiCalendarCheckLine } from 'react-icons/ri';
import PageLayout from '@/components/page-layout';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import WithModulePermission from '@/route-protection/with-module-permission';
import {
  AddAllocationModal,
  AddBenchTeamMemberModal,
  AvailableBenchPanel,
  BenchTable,
  ProjectTeamAllocationModal,
  SetProjectPriorityModal,
  TEAM_PLANNING_DOCTYPE,
  TeamPlanningStats,
  TeamPlanningTable,
  TeamPlanningToolbar,
  TeamPlanningViewTabs,
  WeeklyPriorityPanel,
} from '@/components/team-planning';
import { selectCenterAccess, setSelectedCenters, fetchCenterAccess } from '@/redux/centerSlice';
import {
  deriveGlobalCenterIntent,
  isExplicitlyEmptyIntent,
  isLoadingIntent,
  adaptGlobalCenterIntent,
  NO_CENTERS_EMPTY_STATE,
} from '@/utils/global-center-filter';
import {
  fetchAvailableBench,
  fetchTeamPlanningGrid,
  fetchWeeklyPriorities,
  openAllocationModal,
  openBenchMemberModal,
  openProjectTeamModal,
  openWeeklyPriorityModal,
  removeWeeklyPriority,
  setAvailableBenchDepartment,
  setTeamPlanningFilters,
} from '@/redux/teamPlanningSlice';
import { useDebounce } from '@/hooks/use-debounce';
import { showErrorToast } from '@/utils/error-utils';
import {
  toPlanningMonthValue,
  getMondayOfWeek,
  toDateInputValue,
} from '@/components/team-planning/constants';

const TeamPlanningPage = () => {
  const dispatch = useDispatch();
  const centerAccess = useSelector(selectCenterAccess);
  const { filters, grid, availableBench, weeklyPriority } = useSelector(
    (state) => state.teamPlanning,
  );
  const debouncedSearch = useDebounce(filters.search, 400);
  const [benchCollapsed, setBenchCollapsed] = useState(false);
  const [weeklyPriorityCollapsed, setWeeklyPriorityCollapsed] = useState(false);

  const globalCenterIntent = useMemo(() => deriveGlobalCenterIntent(centerAccess), [centerAccess]);
  const noCenters = useMemo(
    () => isExplicitlyEmptyIntent(globalCenterIntent),
    [globalCenterIntent],
  );
  const headerScope = useMemo(
    () => adaptGlobalCenterIntent.teamMember(globalCenterIntent),
    [globalCenterIntent],
  );
  const centerAccessLoading = useMemo(
    () => isLoadingIntent(globalCenterIntent),
    [globalCenterIntent],
  );

  const isBenchView = filters.view_mode === 'bench';
  const isWeeklyView = filters.view_mode === 'weekly_allocation';
  const showAvailableBench =
    !isBenchView && filters.view_by === 'projects' && !noCenters && !centerAccessLoading;
  const showWeeklyPriority = isWeeklyView && !noCenters && !centerAccessLoading;

  useEffect(() => {
    if (centerAccess.status === 'idle') {
      dispatch(fetchCenterAccess());
    }
  }, [dispatch, centerAccess.status]);

  const apiFilters = useMemo(() => {
    const base = headerScope ? { ...headerScope } : {};
    if (filters.member && filters.member !== 'all') base.member = filters.member;
    if (Array.isArray(filters.department)) {
      if (filters.department.length > 0) base.department = filters.department;
    } else if (filters.department && filters.department !== 'all') {
      base.department = filters.department;
    }
    if (filters.project && filters.project !== 'all') base.project = filters.project;
    return base;
  }, [headerScope, filters.member, filters.department, filters.project]);

  const loadGrid = useCallback(() => {
    if (headerScope === undefined) return;
    if (noCenters) return;

    dispatch(
      fetchTeamPlanningGrid({
        keyword: debouncedSearch,
        planning_year: filters.planning_year,
        planning_month: filters.planning_month,
        planning_week_start: filters.planning_week_start,
        view_mode: filters.view_mode,
        group_by: filters.view_by,
        filters: apiFilters,
      }),
    );
  }, [
    dispatch,
    debouncedSearch,
    filters.planning_year,
    filters.planning_month,
    filters.planning_week_start,
    filters.view_mode,
    filters.view_by,
    apiFilters,
    headerScope,
    noCenters,
  ]);

  const loadAvailableBench = useCallback(() => {
    if (!showAvailableBench) return;
    if (headerScope === undefined) return;

    dispatch(
      fetchAvailableBench({
        planning_year: filters.planning_year,
        department: availableBench.department,
        filters: headerScope || {},
      }),
    );
  }, [dispatch, showAvailableBench, filters.planning_year, availableBench.department, headerScope]);

  const loadWeeklyPriorities = useCallback(() => {
    if (!showWeeklyPriority) return;
    if (headerScope === undefined) return;
    if (!filters.planning_week_start) return;

    dispatch(
      fetchWeeklyPriorities({
        planning_week_start: filters.planning_week_start,
        filters: headerScope || {},
      }),
    );
  }, [dispatch, showWeeklyPriority, filters.planning_week_start, headerScope]);

  useEffect(() => {
    loadGrid();
  }, [loadGrid]);

  useEffect(() => {
    loadAvailableBench();
  }, [loadAvailableBench]);

  useEffect(() => {
    loadWeeklyPriorities();
  }, [loadWeeklyPriorities]);

  const handleGlobalCenterChange = useCallback(
    (selectedCenters) => {
      dispatch(setSelectedCenters(selectedCenters));
    },
    [dispatch],
  );

  const handleAddAllocation = useCallback(
    ({ member, column, centers, row }) => {
      const scopedCenters = centers || [];
      const isWeekly = filters.view_mode === 'weekly_allocation';
      const viewMode = isWeekly ? 'weekly_allocation' : 'monthly_capacity';
      // Weekly allocations are per day — use the clicked column's date (column.id).
      const planningWeekStart = isWeekly
        ? column?.id || filters.planning_week_start || toDateInputValue(getMondayOfWeek(new Date()))
        : null;
      // Monthly uses the month column id; weekly stores the day's month for reference.
      const planningMonth = isWeekly
        ? column?.planning_month || column?.id || filters.planning_month
        : column?.planning_month || column?.id;

      if (row?.type === 'project_team') {
        const defaultCenter =
          scopedCenters.length === 1
            ? scopedCenters[0]
            : scopedCenters.find((center) =>
                (row.cells?.[column?.id]?.members || []).some((item) => item.center === center.id),
              ) || scopedCenters[0];

        if (!defaultCenter || !row.client) return;

        dispatch(
          openProjectTeamModal({
            client: row.client,
            client_name: row.client_name || row.label,
            role_type_label: row.role_type_label,
            center: defaultCenter.id,
            centers: scopedCenters.map((center) => center.id),
            planning_month: planningMonth,
            planning_week_start: planningWeekStart,
            view_mode: viewMode,
          }),
        );
        return;
      }

      if (!member?.member_id) return;

      const memberCenters = member?.centers || [];
      const defaultCenter =
        scopedCenters.length === 1
          ? scopedCenters[0]
          : scopedCenters.find((center) => memberCenters.includes(center.id)) || scopedCenters[0];

      if (!defaultCenter) return;

      dispatch(
        openAllocationModal({
          member,
          column,
          center: defaultCenter,
          centers: scopedCenters,
          planning_month: planningMonth,
          planning_week_start: planningWeekStart,
          view_mode: viewMode,
        }),
      );
    },
    [dispatch, filters.view_mode, filters.planning_week_start, filters.planning_month],
  );

  const handleAddJoinee = useCallback(
    ({ column, month } = {}) => {
      const planningMonth =
        month?.id || column?.planning_month || column?.id || filters.planning_month;
      const centerIds = (grid.data?.centers || []).map((center) => center.id).filter(Boolean);
      dispatch(
        openBenchMemberModal({
          planning_month: planningMonth,
          centers: centerIds,
        }),
      );
    },
    [dispatch, filters.planning_month, grid.data?.centers],
  );

  const handleBenchSaved = useCallback(() => {
    loadGrid();
    loadAvailableBench();
  }, [loadGrid, loadAvailableBench]);

  const handleWeeklyPrioritySaved = useCallback(() => {
    loadWeeklyPriorities();
  }, [loadWeeklyPriorities]);

  const handleOpenWeeklyPriority = useCallback(
    (taskCategory) => {
      dispatch(
        openWeeklyPriorityModal({
          planning_week_start:
            filters.planning_week_start || toDateInputValue(getMondayOfWeek(new Date())),
          task_category: taskCategory,
        }),
      );
    },
    [dispatch, filters.planning_week_start],
  );

  const handleRemoveWeeklyPriority = useCallback(
    async (project, categoryId) => {
      if (!project?.client || !categoryId) return;
      try {
        await dispatch(
          removeWeeklyPriority({
            client: project.client,
            task_category: categoryId,
            planning_week_start: filters.planning_week_start,
            filters: headerScope || {},
          }),
        ).unwrap();
        loadWeeklyPriorities();
      } catch (removeError) {
        showErrorToast(removeError || 'Failed to remove priority project');
      }
    },
    [dispatch, filters.planning_week_start, headerScope, loadWeeklyPriorities],
  );

  const gridData = noCenters ? {} : grid.data || {};
  const tableRows = noCenters ? [] : gridData.rows || [];
  const tableLoading = noCenters ? false : grid.isLoading || centerAccessLoading;
  const benchMonths = availableBench.data?.months || [];
  const benchDepartments = availableBench.data?.departments || [];
  const weeklyPriorityCategories = weeklyPriority.data?.categories || [];
  const showSidePanel = showAvailableBench || showWeeklyPriority;

  return (
    <>
      <PageLayout
        pageTitle='Team Planning'
        pageIcon={<RiCalendarCheckLine size={24} />}
        pageDescription='Resource capacity planning & workforce allocation'
        headerActions={
          <CenterAccessDropdown
            centers={centerAccess.data}
            selectedCenters={centerAccess.selectedCenters}
            onChange={handleGlobalCenterChange}
            isLoading={centerAccess.status === 'loading'}
          />
        }
      >
        <div className='flex flex-col gap-6 px-8 py-5'>
          <TeamPlanningViewTabs
            viewMode={filters.view_mode}
            planningYear={filters.planning_year}
            planningMonth={filters.planning_month}
            planningWeekStart={filters.planning_week_start}
            onViewModeChange={(view_mode) => {
              const next = { view_mode };
              // Bench uses multi-select departments (array). Other tabs use single 'all'.
              if (view_mode === 'bench') {
                next.department = Array.isArray(filters.department)
                  ? filters.department
                  : filters.department && filters.department !== 'all'
                    ? [filters.department]
                    : [];
              } else if (Array.isArray(filters.department)) {
                next.department = filters.department.length === 1 ? filters.department[0] : 'all';
              }
              // Weekly must always have an explicit week start so saves/loads never
              // fall back to monthly period keys.
              if (view_mode === 'weekly_allocation' && !filters.planning_week_start) {
                next.planning_week_start = toDateInputValue(getMondayOfWeek(new Date()));
              }
              dispatch(setTeamPlanningFilters(next));
            }}
            onYearChange={(planning_year) => dispatch(setTeamPlanningFilters({ planning_year }))}
            onMonthChange={(month, year = filters.planning_year) =>
              dispatch(
                setTeamPlanningFilters({
                  planning_year: year,
                  planning_month: toPlanningMonthValue(year, month),
                }),
              )
            }
            onWeekChange={(planning_week_start) =>
              dispatch(setTeamPlanningFilters({ planning_week_start }))
            }
          />

          <TeamPlanningStats stats={gridData.stats || {}} />

          <TeamPlanningToolbar
            filters={filters}
            filterOptions={gridData.filter_options || {}}
            onSearchChange={(search) => dispatch(setTeamPlanningFilters({ search }))}
            onMemberChange={(member) => dispatch(setTeamPlanningFilters({ member }))}
            onDepartmentChange={(department) => dispatch(setTeamPlanningFilters({ department }))}
            onProjectChange={(project) => dispatch(setTeamPlanningFilters({ project }))}
            onViewByChange={(view_by) => dispatch(setTeamPlanningFilters({ view_by }))}
            onOpenWeeklyPriority={() => handleOpenWeeklyPriority()}
          />

          <div className={showSidePanel ? 'flex min-h-0 items-stretch gap-0' : undefined}>
            <div className={showSidePanel ? 'min-w-0 flex-1' : undefined}>
              {isBenchView ? (
                <BenchTable
                  columns={gridData.columns || []}
                  rows={tableRows}
                  isLoading={tableLoading}
                  error={noCenters ? null : grid.error}
                  emptyTitle={noCenters ? NO_CENTERS_EMPTY_STATE.title : undefined}
                  emptyDescription={noCenters ? NO_CENTERS_EMPTY_STATE.description : undefined}
                  onRetry={loadGrid}
                  onAddJoinee={handleAddJoinee}
                />
              ) : (
                <TeamPlanningTable
                  columns={gridData.columns || []}
                  rows={tableRows}
                  centers={gridData.centers || []}
                  isLoading={tableLoading}
                  error={noCenters ? null : grid.error}
                  emptyTitle={noCenters ? NO_CENTERS_EMPTY_STATE.title : undefined}
                  emptyDescription={noCenters ? NO_CENTERS_EMPTY_STATE.description : undefined}
                  onRetry={loadGrid}
                  onAddAllocation={handleAddAllocation}
                  resourceColumnLabel={filters.view_by === 'projects' ? 'Projects' : 'Resource'}
                />
              )}
            </div>

            {showAvailableBench ? (
              <AvailableBenchPanel
                months={benchMonths}
                departments={benchDepartments}
                department={availableBench.department}
                planningYear={filters.planning_year}
                onDepartmentChange={(department) =>
                  dispatch(setAvailableBenchDepartment(department))
                }
                isLoading={availableBench.isLoading}
                onAddJoinee={handleAddJoinee}
                collapsed={benchCollapsed}
                onCollapsedChange={setBenchCollapsed}
              />
            ) : null}

            {showWeeklyPriority ? (
              <WeeklyPriorityPanel
                categories={weeklyPriorityCategories}
                isLoading={weeklyPriority.isLoading}
                onAdd={() => handleOpenWeeklyPriority()}
                onRemoveProject={handleRemoveWeeklyPriority}
                collapsed={weeklyPriorityCollapsed}
                onCollapsedChange={setWeeklyPriorityCollapsed}
              />
            ) : null}
          </div>
        </div>
      </PageLayout>

      <AddAllocationModal onSaved={loadGrid} />
      <ProjectTeamAllocationModal onSaved={loadGrid} />
      <AddBenchTeamMemberModal centers={gridData.centers || []} onSaved={handleBenchSaved} />
      <SetProjectPriorityModal onSaved={handleWeeklyPrioritySaved} headerScope={headerScope} />
    </>
  );
};

export default WithModulePermission(TeamPlanningPage, TEAM_PLANNING_DOCTYPE);
