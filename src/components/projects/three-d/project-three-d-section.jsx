import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiDownloadLine,
  RiFilter3Line,
  RiImageLine,
  RiLayoutColumnLine,
  RiListCheck,
  RiSearch2Line,
  RiSettings3Line,
} from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import { ProjectFollowersPopover } from '@/components/document-subscribe';
import ProjectDetailThreeDTable from '@/components/projects/three-d/project-detail-three-d-table';
import ProjectThreeDCreateDrawer from '@/components/projects/three-d/project-three-d-create-drawer';
import ProjectThreeDViewDrawer from '@/components/projects/three-d/project-three-d-view-drawer';
import ProjectThreeDGalleryView from '@/components/projects/three-d/project-three-d-gallery-view';
import ProjectThreeDGalleryPreview from '@/components/projects/three-d/project-three-d-gallery-preview';
import { THREE_D_UPLOAD_MODES } from '@/components/projects/three-d/project-three-d-attachment-helpers';
import {
  buildProjectThreeDGroupByParam,
  buildProjectThreeDListviewFilters,
  buildProjectThreeDNewVersionFormData,
  buildProjectThreeDUpdateFormData,
  buildProjectThreeDUploadFilesFormData,
  collectThreeDAssigneeFilterOptions,
  getProjectThreeDRowFieldValue,
  mapProjectThreeDDetailToRow,
  mapProjectThreeDGalleryListResponse,
  mapProjectThreeDListviewToGroups,
  mapProjectThreeDVersionedImagesToGalleryTask,
  patchProjectThreeDRow,
  PROJECT_THREE_D_GALLERY_PAGE_SIZE,
  projectThreeDFieldValuesEqual,
  threeDGroupBadgeColor,
} from '@/components/projects/three-d/project-three-d-helpers';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Checkbox from '@/components/ui/checkbox';
import * as Filter from '@/components/ui/filter';
import GroupByToolbarControl from '@/components/ui/group-by-toolbar-control';
import ProjectQuickFilterToolbar from '@/components/projects/shared/project-quick-filter-toolbar';
import ProjectSectionStatusToolbarFilter from '@/components/projects/shared/project-section-status-toolbar-filter';
import {
  flattenProjectSectionGroupsByStatuses,
  isProjectSectionStatusFilterActive,
} from '@/components/projects/shared/project-section-status-flatten';
import * as Input from '@/components/ui/input';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Popover from '@/components/ui/popover';
import { useColumnConfig } from '@/hooks/use-column-config';
import { useDebounce } from '@/hooks/use-debounce';
import { toStatusFilterOptions } from '@/hooks/use-status-options';
import { PROJECT_COLUMN_TABLE_IDS } from '@/components/projects/column-config';
import { getProjectFloorFilterOptions, parseProjectFloors } from '@/components/projects/shared';
import { useProjectAreaFilterOptions } from '@/hooks/use-project-areas';
import {
  PROJECT_DETAIL_THREE_D_COLUMNS,
  PROJECT_DETAIL_THREE_D_FILTER_OPTIONS,
  PROJECT_DETAIL_THREE_D_FILTER_SECTIONS,
  PROJECT_DETAIL_THREE_D_GROUP_BY_OPTIONS,
} from '@/components/projects/constants';
import {
  clearProjectTaskDetail,
  createProjectTaskNewVersion,
  fetchProjectDetail,
  fetchProjectTaskDetail,
  fetchProjectThreeDListview,
  fetchProjectColumnConfig,
  saveProjectColumnConfig,
  fetchProjectThreeDGalleryListview,
  fetchProjectThreeDVersionedImages,
  patchProjectTaskDetailField,
  selectProjectDetail,
  selectProjectTaskDetail,
  selectProjectTaskDetailLoading,
  selectProjectThreeDListview,
  selectProjectThreeDListviewLoading,
  selectProjectThreeDGalleryListview,
  selectProjectThreeDGalleryListviewLoading,
  updateProjectTask,
} from '@/redux/projectSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { refreshOpenProjectTaskActivities } from '@/components/projects/shared/project-activity-refresh';
import { useProjectFloorVersionAcknowledge } from '@/hooks/use-project-floor-version-acknowledge';
import { cn } from '@/utils/cn';
import {
  TaskStatusScopeProvider,
  useTaskStatusScope,
} from '@/components/projects/shared/task-status-scope-context';

function ThreeDGroupTable({
  group,
  rows,
  flattenVersions = false,
  onFieldUpdate,
  onOpenThreeD,
  onUploadAttachments,
  isUploadingAttachments = false,
  onAcknowledgeFloorVersion,
  isAcknowledgingFloorVersion = false,
  acknowledgingTaskId = '',
  onAddNew,
  columnConfig,
  projectId,
  projectFloors,
  showGroupHeader = true,
  isCollapsed = false,
  onToggleCollapse,
}) {
  return (
    <div className='flex flex-col gap-2'>
      {showGroupHeader ? (
        <button
          type='button'
          onClick={onToggleCollapse}
          className='flex w-fit items-center gap-1 text-left'
          aria-expanded={!isCollapsed}
        >
          <Badge.Root
            variant='light'
            color={threeDGroupBadgeColor(group)}
            size='small'
            className='uppercase'
          >
            {group}
          </Badge.Root>
          {isCollapsed ? (
            <RiArrowRightSLine className='size-4 text-text-soft-400' />
          ) : (
            <RiArrowDownSLine className='size-4 text-text-soft-400' />
          )}
          <span className='text-paragraph-xs text-text-sub-500'>({rows.length})</span>
        </button>
      ) : null}

      {!isCollapsed ? (
        <div className='overflow-hidden rounded-xl bg-bg-white-0'>
          <div className='overflow-x-auto'>
            <ProjectDetailThreeDTable
              rows={rows}
              groupId={group}
              columnConfig={columnConfig}
              flattenVersions={flattenVersions}
              onFieldUpdate={onFieldUpdate}
              onRowClick={onOpenThreeD}
              onUploadAttachments={onUploadAttachments}
              isUploadingAttachments={isUploadingAttachments}
              onAcknowledgeFloorVersion={onAcknowledgeFloorVersion}
              isAcknowledgingFloorVersion={isAcknowledgingFloorVersion}
              acknowledgingTaskId={acknowledgingTaskId}
              onAddNew={onAddNew}
              projectId={projectId}
              projectFloors={projectFloors}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProjectThreeDSectionContent({ projectId }) {
  const { completedStatus, statusOptions } = useTaskStatusScope();
  const dispatch = useDispatch();
  const threeDListview = useSelector(selectProjectThreeDListview);
  const isListLoading = useSelector(selectProjectThreeDListviewLoading);
  const threeDGalleryListview = useSelector(selectProjectThreeDGalleryListview);
  const isGalleryLoading = useSelector(selectProjectThreeDGalleryListviewLoading);
  const threeDDetailData = useSelector(selectProjectTaskDetail);
  const isDetailLoading = useSelector(selectProjectTaskDetailLoading);
  const projectDetailData = useSelector(selectProjectDetail);

  const [threeDGroups, setThreeDGroups] = useState([]);
  const [floorFilter, setFloorFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('floor');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [activeFilterSection, setActiveFilterSection] = useState('area');
  const [selectedFilters, setSelectedFilters] = useState({
    area: [],
    status: [],
    assignee: [],
    priority: [],
  });
  const [selectedThreeDKey, setSelectedThreeDKey] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [galleryListPage, setGalleryListPage] = useState(1);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [galleryPreview, setGalleryPreview] = useState(null);
  const [galleryPreviewTask, setGalleryPreviewTask] = useState(null);
  const [isGalleryPreviewLoading, setIsGalleryPreviewLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  const projectFloors = useMemo(() => parseProjectFloors(projectDetailData), [projectDetailData]);

  const statusFilterActive = isProjectSectionStatusFilterActive(selectedFilters.status);

  const displayThreeDGroups = useMemo(
    () => flattenProjectSectionGroupsByStatuses(threeDGroups, selectedFilters.status),
    [selectedFilters.status, threeDGroups],
  );

  const flatThreeDRows = useMemo(
    () =>
      displayThreeDGroups.flatMap((group) =>
        group.rows.flatMap((row) => [
          { ...row, groupId: group.id },
          ...(Array.isArray(row.versions)
            ? row.versions.map((version) => ({ ...version, groupId: group.id }))
            : []),
        ]),
      ),
    [displayThreeDGroups],
  );

  const areaFilterOptions = useProjectAreaFilterOptions(projectId);

  const threeDFilterOptions = useMemo(
    () => ({
      ...PROJECT_DETAIL_THREE_D_FILTER_OPTIONS,
      area: areaFilterOptions,
      assignee: collectThreeDAssigneeFilterOptions(flatThreeDRows),
      status: toStatusFilterOptions(statusOptions),
    }),
    [areaFilterOptions, flatThreeDRows, statusOptions],
  );

  const floorFilterOptions = useMemo(
    () => getProjectFloorFilterOptions(projectFloors),
    [projectFloors],
  );

  const columnConfig = useColumnConfig(
    PROJECT_COLUMN_TABLE_IDS.THREE_D,
    PROJECT_DETAIL_THREE_D_COLUMNS,
    (columns) =>
      dispatch(
        saveProjectColumnConfig({ tableId: PROJECT_COLUMN_TABLE_IDS.THREE_D, columns }),
      ).unwrap(),
    () =>
      dispatch(fetchProjectColumnConfig({ tableId: PROJECT_COLUMN_TABLE_IDS.THREE_D })).unwrap(),
    { autoSave: true, debounce: 200 },
  );

  const loadThreeDTasks = useCallback(async () => {
    if (!projectId) return;

    try {
      await dispatch(
        fetchProjectThreeDListview({
          project: projectId,
          keyword: debouncedSearchQuery,
          group_by: buildProjectThreeDGroupByParam(groupBy, groupOrder),
          filters: buildProjectThreeDListviewFilters(selectedFilters, floorFilter),
        }),
      ).unwrap();
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  }, [
    debouncedSearchQuery,
    dispatch,
    floorFilter,
    groupBy,
    groupOrder,
    projectId,
    selectedFilters,
  ]);

  const loadThreeDGalleryTasks = useCallback(
    async ({ page = 1, append = false } = {}) => {
      if (!projectId) return;

      try {
        await dispatch(
          fetchProjectThreeDGalleryListview({
            project: projectId,
            keyword: debouncedSearchQuery,
            filters: buildProjectThreeDListviewFilters(selectedFilters, floorFilter),
            page,
            limit_page_length: PROJECT_THREE_D_GALLERY_PAGE_SIZE,
            append,
          }),
        ).unwrap();
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [debouncedSearchQuery, dispatch, floorFilter, projectId, selectedFilters],
  );

  const {
    isAcknowledging: isAcknowledgingFloorVersion,
    acknowledgingTaskId,
    acknowledgeTaskFloorVersion,
  } = useProjectFloorVersionAcknowledge({
    onAfterAcknowledge: async (taskId) => {
      await loadThreeDTasks();
      if (viewMode === 'gallery') {
        await loadThreeDGalleryTasks({ page: 1, append: false });
      }
      if (selectedThreeDKey?.rowId === taskId) {
        await dispatch(fetchProjectTaskDetail(taskId)).unwrap();
      }
    },
  });

  useEffect(() => {
    if (viewMode === 'list') {
      loadThreeDTasks();
    }
  }, [loadThreeDTasks, viewMode]);

  useEffect(() => {
    if (viewMode !== 'gallery') return;
    setGalleryListPage(1);
    loadThreeDGalleryTasks({ page: 1, append: false });
  }, [debouncedSearchQuery, floorFilter, loadThreeDGalleryTasks, selectedFilters, viewMode]);

  useEffect(() => {
    if (!projectId) return;

    dispatch(fetchProjectDetail(projectId)).catch((error) => {
      showErrorToast(extractErrorMessage(error));
    });
  }, [dispatch, projectId]);

  useEffect(() => {
    if (floorFilter === 'all') return;
    const isValid = floorFilterOptions.some((option) => option.id === floorFilter);
    if (!isValid) {
      setFloorFilter('all');
    }
  }, [floorFilter, floorFilterOptions]);

  useEffect(() => {
    setThreeDGroups(mapProjectThreeDListviewToGroups(threeDListview));
  }, [threeDListview]);

  const totalFilterCount = useMemo(
    () =>
      Object.entries(selectedFilters).reduce(
        (count, [key, values]) =>
          key === 'status' ? count : count + (Array.isArray(values) ? values.length : 0),
        0,
      ),
    [selectedFilters],
  );

  const visibleThreeDGroups = useMemo(
    () => displayThreeDGroups.filter((group) => group.rows.length > 0),
    [displayThreeDGroups],
  );

  const galleryListData = useMemo(
    () => mapProjectThreeDGalleryListResponse(threeDGalleryListview),
    [threeDGalleryListview],
  );

  const galleryTasks = galleryListData.tasks;
  const isGalleryLoadingMore = isGalleryLoading && galleryTasks.length > 0;

  const handleLoadMoreGallery = useCallback(() => {
    if (isGalleryLoading || !galleryListData.hasMore) return;
    const nextPage = galleryListPage + 1;
    setGalleryListPage(nextPage);
    loadThreeDGalleryTasks({ page: nextPage, append: true });
  }, [galleryListData.hasMore, galleryListPage, isGalleryLoading, loadThreeDGalleryTasks]);

  const normalizeUploadFiles = (files = []) =>
    files.map((file) => (file instanceof File ? { file } : file)).filter((entry) => entry?.file);

  const handleUploadAttachments = useCallback(
    async (taskId, mode, files, row) => {
      const sourceRow = row ?? flatThreeDRows.find((entry) => entry.id === taskId);
      const uploadFiles = normalizeUploadFiles(files);
      if (!taskId || !sourceRow || uploadFiles.length === 0) return;

      setIsUploadingAttachments(true);
      try {
        if (mode === THREE_D_UPLOAD_MODES.NEW_VERSION) {
          const formData = buildProjectThreeDNewVersionFormData(taskId, uploadFiles);
          const result = await dispatch(createProjectTaskNewVersion(formData)).unwrap();
          showSuccessToast(result?.message ?? 'New version created successfully');

          await loadThreeDTasks();
          if (viewMode === 'gallery') {
            await loadThreeDGalleryTasks({ page: 1, append: false });
          }

          const newTaskId = result?.task_id;
          if (newTaskId && selectedThreeDKey?.rowId === taskId) {
            setSelectedThreeDKey((previous) =>
              previous ? { ...previous, rowId: newTaskId } : previous,
            );
            await dispatch(fetchProjectTaskDetail(newTaskId)).unwrap();
          }
        } else {
          const formData = buildProjectThreeDUploadFilesFormData(taskId, uploadFiles);
          await dispatch(updateProjectTask(formData)).unwrap();
          showSuccessToast('3D file uploaded successfully');
          await loadThreeDTasks();
          if (viewMode === 'gallery') {
            await loadThreeDGalleryTasks({ page: 1, append: false });
          }

          if (selectedThreeDKey?.rowId === taskId) {
            await dispatch(fetchProjectTaskDetail(taskId)).unwrap();
          }
        }
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      } finally {
        setIsUploadingAttachments(false);
      }
    },
    [
      dispatch,
      flatThreeDRows,
      loadThreeDTasks,
      loadThreeDGalleryTasks,
      selectedThreeDKey?.rowId,
      viewMode,
    ],
  );

  const loadGalleryPreviewTask = useCallback(
    async (task, attachmentId = null) => {
      if (!task?.taskId) return;

      const summary = {
        ...task,
        lockToMatchedVersion: Boolean(task.lockToMatchedVersion ?? statusFilterActive),
        focusVersionTaskId: task.focusVersionTaskId ?? (statusFilterActive ? task.taskId : null),
        statusFilter: selectedFilters.status,
      };

      setGalleryPreview({ taskId: summary.taskId, attachmentId });
      setGalleryPreviewTask(null);
      setIsGalleryPreviewLoading(true);

      try {
        const data = await dispatch(fetchProjectThreeDVersionedImages(summary.taskId)).unwrap();
        setGalleryPreviewTask(mapProjectThreeDVersionedImagesToGalleryTask(data, summary));
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
        setGalleryPreview(null);
        setGalleryPreviewTask(null);
      } finally {
        setIsGalleryPreviewLoading(false);
      }
    },
    [dispatch, selectedFilters.status, statusFilterActive],
  );

  const openGalleryPreview = useCallback(
    (task, attachmentId) => {
      loadGalleryPreviewTask(
        {
          ...task,
          lockToMatchedVersion: statusFilterActive,
          focusVersionTaskId: statusFilterActive ? task.taskId : null,
        },
        attachmentId ?? null,
      );
    },
    [loadGalleryPreviewTask, statusFilterActive],
  );

  const openGalleryPreviewFromDrawer = useCallback(
    (attachment) => {
      const taskId = selectedThreeDKey?.rowId;
      if (!taskId) return;

      const listSummary = galleryTasks.find((entry) => entry.taskId === taskId);
      const rowSummary = flatThreeDRows.find((row) => row.id === taskId);
      const summary = listSummary ?? {
        taskId,
        title: rowSummary?.title ?? '',
        floor: rowSummary?.floor ?? '',
        area: rowSummary?.area ?? '',
        status: rowSummary?.status ?? '',
        latestVersion: rowSummary?.version ?? 'V1',
      };

      loadGalleryPreviewTask(
        {
          ...summary,
          lockToMatchedVersion: statusFilterActive,
          focusVersionTaskId: statusFilterActive ? taskId : null,
        },
        attachment?.id ?? attachment?.childRowId ?? null,
      );
    },
    [
      flatThreeDRows,
      galleryTasks,
      loadGalleryPreviewTask,
      selectedThreeDKey?.rowId,
      statusFilterActive,
    ],
  );

  const previewNavigationTasks = useMemo(() => {
    if (viewMode === 'gallery') {
      return galleryTasks.map((task) => ({
        ...task,
        lockToMatchedVersion: statusFilterActive,
        focusVersionTaskId: statusFilterActive ? task.taskId : null,
      }));
    }

    return flatThreeDRows.map((row) => ({
      taskId: row.id,
      title: row.title ?? '',
      floor: row.floor ?? '',
      area: row.area ?? '',
      status: row.status ?? '',
      latestVersion: row.version ?? 'V1',
      lockToMatchedVersion: statusFilterActive,
      focusVersionTaskId: statusFilterActive ? row.id : null,
    }));
  }, [flatThreeDRows, galleryTasks, statusFilterActive, viewMode]);

  const selectedThreeDIndex = useMemo(
    () =>
      selectedThreeDKey
        ? flatThreeDRows.findIndex(
            (row) =>
              row.id === selectedThreeDKey.rowId && row.groupId === selectedThreeDKey.groupId,
          )
        : -1,
    [flatThreeDRows, selectedThreeDKey],
  );

  const listSelectedThreeD = selectedThreeDIndex >= 0 ? flatThreeDRows[selectedThreeDIndex] : null;

  const selectedThreeD = useMemo(() => {
    if (!selectedThreeDKey?.rowId) return null;
    if (threeDDetailData?.name === selectedThreeDKey.rowId) {
      return mapProjectThreeDDetailToRow(threeDDetailData, listSelectedThreeD);
    }
    return listSelectedThreeD;
  }, [listSelectedThreeD, selectedThreeDKey?.rowId, threeDDetailData]);

  const getThreeDRowForUpdate = useCallback(
    (taskId, fieldName) => {
      const listRow = flatThreeDRows.find((row) => row.id === taskId);
      if (!listRow) return null;

      if (
        fieldName === 'description' &&
        selectedThreeDKey?.rowId === taskId &&
        threeDDetailData?.name === taskId
      ) {
        return mapProjectThreeDDetailToRow(threeDDetailData, listRow);
      }

      return listRow;
    },
    [flatThreeDRows, selectedThreeDKey?.rowId, threeDDetailData],
  );

  const handleFieldUpdate = useCallback(
    async (taskId, fieldName, value) => {
      const row = getThreeDRowForUpdate(taskId, fieldName);
      if (!taskId || !row) return;

      const originalValue = getProjectThreeDRowFieldValue(row, fieldName);
      if (projectThreeDFieldValuesEqual(fieldName, originalValue, value)) return;

      try {
        await dispatch(
          updateProjectTask(buildProjectThreeDUpdateFormData(taskId, fieldName, value)),
        ).unwrap();
        showSuccessToast('3D updated successfully');

        setThreeDGroups((previous) =>
          previous.map((group) => ({
            ...group,
            rows: group.rows.map((entry) =>
              entry.id === taskId ? patchProjectThreeDRow(entry, fieldName, value) : entry,
            ),
          })),
        );

        if (fieldName === 'description') {
          if (selectedThreeDKey?.rowId === taskId) {
            dispatch(patchProjectTaskDetailField({ fieldName, value }));
          }
        } else {
          await loadThreeDTasks();
          if (viewMode === 'gallery') {
            await loadThreeDGalleryTasks({ page: 1, append: false });
          }

          if (selectedThreeDKey?.rowId === taskId) {
            await dispatch(fetchProjectTaskDetail(taskId)).unwrap();
          }
        }

        refreshOpenProjectTaskActivities(dispatch, taskId, selectedThreeDKey?.rowId);
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [
      dispatch,
      getThreeDRowForUpdate,
      loadThreeDTasks,
      loadThreeDGalleryTasks,
      selectedThreeDKey?.rowId,
      viewMode,
    ],
  );

  useEffect(() => {
    const taskId = selectedThreeDKey?.rowId;
    if (!taskId) return;

    dispatch(fetchProjectTaskDetail(taskId)).catch((error) => {
      showErrorToast(extractErrorMessage(error));
    });
  }, [dispatch, selectedThreeDKey?.rowId]);

  const activeSectionOptions = threeDFilterOptions[activeFilterSection] ?? [];

  const toggleFilterOption = (section, option) => {
    if (option.disabled) return;
    setSelectedFilters((prev) => {
      const current = prev[section] ?? [];
      const nextValues = current.includes(option.value)
        ? current.filter((value) => value !== option.value)
        : [...current, option.value];
      return { ...prev, [section]: nextValues };
    });
  };

  const clearAllFilters = () => {
    setSelectedFilters({ area: [], status: [], assignee: [], priority: [] });
  };

  const openThreeDDrawer = (groupId, rowId) => {
    setSelectedThreeDKey({ groupId, rowId });
  };

  const toggleGroupCollapse = (groupId) => {
    setCollapsedGroups((previous) => ({
      ...previous,
      [groupId]: !previous[groupId],
    }));
  };

  return (
    <>
      <div className='flex flex-col gap-4'>
        <div className='flex w-full shrink-0 min-w-0 flex-nowrap items-center gap-2 overflow-x-auto justify-between pb-1'>
          <div className='flex min-w-0 flex-1 items-center gap-2'>
            <ButtonGroup.Root size='xsmall' className='shrink-0'>
              <ButtonGroup.Item
                data-state={viewMode === 'list' ? 'on' : 'off'}
                onClick={() => setViewMode('list')}
                aria-label='List view'
              >
                <ButtonGroup.Icon as={RiListCheck} />
              </ButtonGroup.Item>
              <ButtonGroup.Item
                data-state={viewMode === 'gallery' ? 'on' : 'off'}
                onClick={() => setViewMode('gallery')}
                aria-label='Gallery view'
              >
                <ButtonGroup.Icon as={RiImageLine} />
              </ButtonGroup.Item>
            </ButtonGroup.Root>
            <div className='min-w-[120px] max-w-[220px] flex-1'>
              <Input.Root size='xsmall'>
                <Input.Wrapper>
                  <Input.Icon as={RiSearch2Line} />
                  <Input.Input
                    placeholder='Search here...'
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
          </div>

          <div className='flex shrink-0 flex-1 items-center justify-end gap-2'>
            {projectId ? (
              <ProjectFollowersPopover
                projectId={projectId}
                scopeMode='project'
                section='three_d'
                referenceDoctype='Project'
                referenceName={projectId}
                activityLabel='3D tab'
              />
            ) : null}

            <GroupByToolbarControl
              options={PROJECT_DETAIL_THREE_D_GROUP_BY_OPTIONS}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
              groupOrder={groupOrder}
              onGroupOrderChange={setGroupOrder}
              size='xsmall'
            />
            <ProjectSectionStatusToolbarFilter
              value={selectedFilters.status}
              options={toStatusFilterOptions(statusOptions)}
              onValueChange={(nextStatuses) =>
                setSelectedFilters((previous) => ({ ...previous, status: nextStatuses }))
              }
            />
            <ProjectQuickFilterToolbar
              selectedFilters={selectedFilters}
              setSelectedFilters={setSelectedFilters}
              completedStatus={completedStatus}
              entityLabel='3D items'
            />
            <Popover.Root>
              <Filter.TriggerButton
                filterCount={totalFilterCount}
                tooltipContent='Filters'
                ariaLabel='Filter 3D items'
                size='xsmall'
                onClear={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  clearAllFilters();
                }}
              />
              <Filter.Root align='end' sideOffset={8} showArrow={false} className='w-[520px]'>
                <Filter.Header onClear={clearAllFilters} />
                <Filter.Body className='h-[220px]'>
                  <Filter.Sidebar width='120px' className='p-2'>
                    {PROJECT_DETAIL_THREE_D_FILTER_SECTIONS.map((section) => (
                      <Filter.SidebarItem
                        key={section.id}
                        isActive={activeFilterSection === section.id}
                        onClick={() => setActiveFilterSection(section.id)}
                        count={selectedFilters[section.id]?.length ?? 0}
                        icon={RiArrowRightSLine}
                      >
                        {section.label}
                      </Filter.SidebarItem>
                    ))}
                  </Filter.Sidebar>
                  <Filter.Content width='400px' className='p-2'>
                    <div className='flex flex-col gap-1 overflow-y-auto'>
                      {activeSectionOptions.map((option) => {
                        const checked = (selectedFilters[activeFilterSection] ?? []).includes(
                          option.value,
                        );
                        return (
                          <button
                            key={option.value}
                            type='button'
                            disabled={option.disabled}
                            onClick={() => toggleFilterOption(activeFilterSection, option)}
                            className={cn(
                              'flex items-center gap-2 rounded-lg p-2 text-left text-paragraph-sm transition',
                              option.disabled
                                ? 'cursor-not-allowed text-text-disabled-300'
                                : 'text-text-main-900 hover:bg-bg-weak-50',
                            )}
                          >
                            <Checkbox.Root
                              size='medium'
                              checked={checked}
                              disabled={option.disabled}
                              onCheckedChange={() =>
                                toggleFilterOption(activeFilterSection, option)
                              }
                              onClick={(event) => event.stopPropagation()}
                            />
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </Filter.Content>
                </Filter.Body>
              </Filter.Root>
            </Popover.Root>
            <Button.Root variant='neutral' mode='stroke' size='xsmall'>
              <Button.Icon as={RiDownloadLine} />
            </Button.Root>
            <ColumnManagerDropdown
              open={isColumnManagerOpen}
              onOpenChange={setIsColumnManagerOpen}
              config={columnConfig}
              tooltipContent={<p>Manage columns</p>}
              trigger={
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  aria-label='Manage 3D columns'
                >
                  <Button.Icon as={RiLayoutColumnLine} />
                </Button.Root>
              }
            />
            {/* <Button.Root
              variant='neutral'
              mode='ghost'
              size='xsmall'
              className='bg-bg-weak-100'
              aria-label='Settings'
            >
              <Button.Icon as={RiSettings3Line} />
            </Button.Root> */}
            <Button.Root
              variant='primary'
              mode='filled'
              size='xsmall'
              onClick={() => setIsCreateOpen(true)}
            >
              <Button.Icon as={RiAddLine} />
              Add
            </Button.Root>
          </div>
        </div>

        <div className='flex flex-col gap-5 pb-4'>
          {viewMode === 'gallery' ? (
            <ProjectThreeDGalleryView
              tasks={galleryTasks}
              isLoading={isGalleryLoading && galleryTasks.length === 0}
              isLoadingMore={isGalleryLoadingMore}
              hasMore={galleryListData.hasMore}
              onLoadMore={handleLoadMoreGallery}
              onOpenTaskPreview={openGalleryPreview}
            />
          ) : isListLoading ? (
            <div className='flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-paragraph-sm text-text-sub-500'>
              Loading 3D items…
            </div>
          ) : visibleThreeDGroups.length > 0 ? (
            visibleThreeDGroups.map((group) => (
              <ThreeDGroupTable
                key={group.id}
                group={group.id}
                rows={group.rows}
                flattenVersions={statusFilterActive}
                columnConfig={columnConfig.columns}
                onFieldUpdate={handleFieldUpdate}
                onOpenThreeD={openThreeDDrawer}
                onUploadAttachments={handleUploadAttachments}
                isUploadingAttachments={isUploadingAttachments}
                onAcknowledgeFloorVersion={acknowledgeTaskFloorVersion}
                isAcknowledgingFloorVersion={isAcknowledgingFloorVersion}
                acknowledgingTaskId={acknowledgingTaskId}
                onAddNew={() => setIsCreateOpen(true)}
                projectId={projectId}
                projectFloors={projectFloors}
                showGroupHeader={Boolean(groupBy)}
                isCollapsed={Boolean(collapsedGroups[group.id])}
                onToggleCollapse={() => toggleGroupCollapse(group.id)}
              />
            ))
          ) : (
            <div className='flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
              <p className='text-label-md text-text-strong-950'>No 3D items found</p>
              <p className='mt-1 text-paragraph-sm text-text-sub-500'>
                Adjust filters or add a new 3D item.
              </p>
            </div>
          )}
        </div>
      </div>

      <ProjectThreeDCreateDrawer
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        projectId={projectId}
        projectFloors={projectFloors}
        onCreated={() => {
          loadThreeDTasks();
          if (viewMode === 'gallery') {
            loadThreeDGalleryTasks({ page: 1, append: false });
          }
        }}
      />

      <ProjectThreeDViewDrawer
        open={Boolean(selectedThreeDKey)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedThreeDKey(null);
            dispatch(clearProjectTaskDetail());
          }
        }}
        threeD={selectedThreeD}
        isLoading={isDetailLoading}
        onFieldUpdate={handleFieldUpdate}
        onUploadAttachments={handleUploadAttachments}
        isUploadingAttachments={isUploadingAttachments}
        onOpenGallery={openGalleryPreviewFromDrawer}
        onAcknowledgeFloorVersion={acknowledgeTaskFloorVersion}
        isAcknowledgingFloorVersion={isAcknowledgingFloorVersion}
        projectId={projectId}
        projectFloors={projectFloors}
      />

      <ProjectThreeDGalleryPreview
        open={Boolean(galleryPreview)}
        task={galleryPreviewTask}
        initialAttachmentId={galleryPreview?.attachmentId}
        isLoading={isGalleryPreviewLoading}
        navigationTasks={previewNavigationTasks}
        onNavigateTask={(nextTask) => loadGalleryPreviewTask(nextTask)}
        onClose={() => {
          setGalleryPreview(null);
          setGalleryPreviewTask(null);
        }}
      />
    </>
  );
}

export default function ProjectThreeDSection(props) {
  return (
    <TaskStatusScopeProvider tabKey='threeD'>
      <ProjectThreeDSectionContent {...props} />
    </TaskStatusScopeProvider>
  );
}
