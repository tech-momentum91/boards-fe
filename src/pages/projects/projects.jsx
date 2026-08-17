import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiSuitcaseLine } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/page-layout';
import { ProjectCreateDrawer, ProjectsTable, ProjectsToolbar } from '@/components/projects';
import {
  buildProjectAccountFilterOptions,
  buildProjectCityFilterOptions,
  PROJECT_COLUMNS,
  PROJECT_LIST_DEFAULT_SORTING,
  buildProjectListOrderBy,
} from '@/components/projects/constants';
import { PROJECT_COLUMN_TABLE_IDS } from '@/components/projects/column-config';
import {
  buildProjectStageFilterOptions,
  fetchProjectStageOptions,
} from '@/components/projects/project-stage-status-helpers';
import { useColumnConfig } from '@/hooks/use-column-config';
import { useDebounce } from '@/hooks/use-debounce';
import { useTableVariant } from '@/hooks/use-table-variant';
import {
  fetchProjectAccounts,
  fetchProjectListview,
  fetchProjectColumnConfig,
  patchProjectListviewField,
  saveProjectColumnConfig,
  selectProjectAccounts,
  selectProjectListview,
  selectProjectListviewLoading,
  updateProject,
} from '@/redux/projectSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { INDIA_CITY_OPTIONS } from '@/components/crm-leads/constants';

const PROJECT_LIST_PAGE_SIZE = 20;

function buildProjectListFilters({ stageFilter, cityFilter, accountFilter }) {
  const filters = [];

  if (stageFilter && stageFilter !== 'all') {
    filters.push(['custom_project_stage', '=', stageFilter]);
  }

  if (cityFilter && cityFilter !== 'all') {
    filters.push(['custom_city', '=', cityFilter]);
  }

  if (accountFilter && accountFilter !== 'all') {
    filters.push(['custom_crm_account', '=', accountFilter]);
  }

  return filters;
}

export default function ProjectsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const listview = useSelector(selectProjectListview);
  const isListLoading = useSelector(selectProjectListviewLoading);
  const projectAccounts = useSelector(selectProjectAccounts);

  const accountFilterOptions = useMemo(
    () => buildProjectAccountFilterOptions(projectAccounts),
    [projectAccounts],
  );

  const cityFilterOptions = useMemo(() => buildProjectCityFilterOptions(INDIA_CITY_OPTIONS), []);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [stageFilterOptions, setStageFilterOptions] = useState(buildProjectStageFilterOptions([]));
  const [stageOptions, setStageOptions] = useState([]);
  const [cityFilter, setCityFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [sorting, setSorting] = useState(PROJECT_LIST_DEFAULT_SORTING);

  const debouncedSearch = useDebounce(searchTerm, 400);
  const orderBy = useMemo(() => buildProjectListOrderBy(sorting), [sorting]);

  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'projects-table',
    'compact',
  );

  const columnConfig = useColumnConfig(
    PROJECT_COLUMN_TABLE_IDS.LIST,
    PROJECT_COLUMNS,
    (columns) =>
      dispatch(
        saveProjectColumnConfig({ tableId: PROJECT_COLUMN_TABLE_IDS.LIST, columns }),
      ).unwrap(),
    () => dispatch(fetchProjectColumnConfig({ tableId: PROJECT_COLUMN_TABLE_IDS.LIST })).unwrap(),
    { autoSave: true, debounce: 200 },
  );

  useEffect(() => {
    let cancelled = false;
    fetchProjectStageOptions()
      .then((options) => {
        if (!cancelled) {
          setStageOptions(options);
          setStageFilterOptions(buildProjectStageFilterOptions(options));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStageOptions([]);
          setStageFilterOptions(buildProjectStageFilterOptions([]));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const listFilters = useMemo(
    () => buildProjectListFilters({ stageFilter, cityFilter, accountFilter }),
    [accountFilter, cityFilter, stageFilter],
  );

  const loadProjectListview = useCallback(
    async ({ page = 1, append = false } = {}) => {
      try {
        await dispatch(
          fetchProjectListview({
            keyword: debouncedSearch,
            order_by: orderBy,
            filters: listFilters,
            page,
            limit_page_length: PROJECT_LIST_PAGE_SIZE,
            append,
          }),
        ).unwrap();
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [debouncedSearch, dispatch, listFilters, orderBy],
  );

  useEffect(() => {
    dispatch(fetchProjectAccounts())
      .unwrap()
      .catch((error) => {
        showErrorToast(extractErrorMessage(error));
      });
  }, [dispatch]);

  useEffect(() => {
    loadProjectListview({ page: 1, append: false });
  }, [loadProjectListview]);

  const projects = useMemo(() => listview?.results ?? [], [listview]);
  const listPage = Number(listview?.page) || 1;
  const hasMore = Boolean(listview?.has_more);
  const isLoadingMore = isListLoading && projects.length > 0;
  const isInitialLoading = isListLoading && projects.length === 0;

  const handleLoadMore = useCallback(() => {
    if (isListLoading || !hasMore) return;
    loadProjectListview({ page: listPage + 1, append: true });
  }, [hasMore, isListLoading, listPage, loadProjectListview]);

  const handleAddProject = useCallback(() => {
    setIsCreateOpen(true);
  }, []);

  const handleCreateProject = useCallback(() => {
    loadProjectListview({ page: 1, append: false });
  }, [loadProjectListview]);

  const handleRowClick = useCallback(
    (project) => {
      const projectId = project?.name;
      if (!projectId) return;
      navigate(`/projects/${projectId}`);
    },
    [navigate],
  );

  const handleStageChange = useCallback(
    async (projectId, nextStage) => {
      const previousStage = projects.find((row) => row.name === projectId)?.custom_project_stage;
      dispatch(
        patchProjectListviewField({
          projectId,
          fieldName: 'custom_project_stage',
          value: nextStage,
        }),
      );

      try {
        await dispatch(
          updateProject({
            projectId,
            fields: { custom_project_stage: nextStage },
          }),
        ).unwrap();
        showSuccessToast('Project stage updated');
      } catch (error) {
        dispatch(
          patchProjectListviewField({
            projectId,
            fieldName: 'custom_project_stage',
            value: previousStage,
          }),
        );
        showErrorToast(extractErrorMessage(error) || 'Failed to update project stage');
        throw error;
      }
    },
    [dispatch, projects],
  );

  return (
    <PageLayout
      pageTitle='Projects'
      pageIcon={<RiSuitcaseLine size={24} />}
      pageDescription='View and manage all your projects from here'
    >
      <div className='flex w-full flex-col gap-5 mt-3 px-8 pb-8'>
        <ProjectsToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          stageFilter={stageFilter}
          onStageFilterChange={setStageFilter}
          stageFilterOptions={stageFilterOptions}
          cityFilter={cityFilter}
          onCityFilterChange={setCityFilter}
          cityFilterOptions={cityFilterOptions}
          accountFilter={accountFilter}
          onAccountFilterChange={setAccountFilter}
          accountFilterOptions={accountFilterOptions}
          columnConfig={columnConfig}
          tableVariant={tableVariant}
          onTableVariantToggle={toggleTableVariant}
          onAddProject={handleAddProject}
        />

        <ProjectsTable
          rows={projects}
          columnConfig={columnConfig.columns}
          sorting={sorting}
          onSortingChange={setSorting}
          onRowClick={handleRowClick}
          stageOptions={stageOptions}
          onStageChange={handleStageChange}
          variant={tableVariant}
          isLoading={isInitialLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          enableScrollPagination
        />
      </div>

      <ProjectCreateDrawer
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreate={handleCreateProject}
      />
    </PageLayout>
  );
}
