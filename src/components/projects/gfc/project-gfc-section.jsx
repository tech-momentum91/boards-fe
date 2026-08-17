import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiDownloadLine,
  RiFilter3Line,
  RiLayoutColumnLine,
  RiSearch2Line,
} from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import { ProjectFollowersPopover } from '@/components/document-subscribe';
import ProjectDetailGfcTable from '@/components/projects/gfc/project-detail-gfc-table';
import ProjectGfcCreateDrawer from '@/components/projects/gfc/project-gfc-create-drawer';
import {
  buildProjectGfcGroupByParam,
  buildProjectGfcListviewFilters,
  buildProjectGfcUpdateFormData,
  gfcGroupBadgeColor,
  getProjectGfcRowFieldValue,
  mapProjectGfcDetailToRow,
  mapProjectGfcListviewToGroups,
  patchProjectGfcRow,
  projectGfcFieldValuesEqual,
} from '@/components/projects/gfc/project-gfc-helpers';
import ProjectGfcViewDrawer from '@/components/projects/gfc/project-gfc-view-drawer';
import { createProjectTaskAttachmentUploadHandler } from '@/components/projects/shared/project-attachment-upload-utils';
import { THREE_D_UPLOAD_MODES } from '@/components/projects/three-d/project-three-d-attachment-helpers';
import ProjectQuickFilterToolbar from '@/components/projects/shared/project-quick-filter-toolbar';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Checkbox from '@/components/ui/checkbox';
import * as Filter from '@/components/ui/filter';
import GroupByToolbarControl from '@/components/ui/group-by-toolbar-control';
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
  PROJECT_DETAIL_GFC_COLUMNS,
  PROJECT_DETAIL_GFC_FILTER_OPTIONS,
  PROJECT_DETAIL_GFC_FILTER_SECTIONS,
  PROJECT_DETAIL_GFC_GROUP_BY_OPTIONS,
} from '@/components/projects/constants';
import {
  clearProjectTaskDetail,
  fetchProjectDetail,
  fetchProjectGfcListview,
  fetchProjectColumnConfig,
  saveProjectColumnConfig,
  fetchProjectTaskDetail,
  patchProjectTaskDetailField,
  selectProjectDetail,
  selectProjectGfcListview,
  selectProjectGfcListviewLoading,
  selectProjectTaskDetail,
  selectProjectTaskDetailLoading,
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

function GfcGroupTable({
  group,
  rows,
  onFieldUpdate,
  onOpenGfc,
  onAcknowledgeFloorVersion,
  isAcknowledgingFloorVersion,
  acknowledgingTaskId,
  columnConfig,
  projectFloors,
  projectId,
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
            color={gfcGroupBadgeColor(group)}
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
            <ProjectDetailGfcTable
              rows={rows}
              groupId={group}
              columnConfig={columnConfig}
              onFieldUpdate={onFieldUpdate}
              onRowClick={onOpenGfc}
              onAcknowledgeFloorVersion={onAcknowledgeFloorVersion}
              isAcknowledgingFloorVersion={isAcknowledgingFloorVersion}
              acknowledgingTaskId={acknowledgingTaskId}
              projectId={projectId}
              projectFloors={projectFloors}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProjectGfcSectionContent({ projectId }) {
  const { completedStatus, statusOptions } = useTaskStatusScope();
  const dispatch = useDispatch();
  const gfcListview = useSelector(selectProjectGfcListview);
  const isListLoading = useSelector(selectProjectGfcListviewLoading);
  const gfcDetailData = useSelector(selectProjectTaskDetail);
  const isDetailLoading = useSelector(selectProjectTaskDetailLoading);
  const projectDetailData = useSelector(selectProjectDetail);

  const [gfcGroups, setGfcGroups] = useState([]);
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
  const [selectedGfcKey, setSelectedGfcKey] = useState(null);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  const projectFloors = useMemo(() => parseProjectFloors(projectDetailData), [projectDetailData]);

  const flatGfcRows = useMemo(
    () =>
      gfcGroups.flatMap((group) =>
        group.rows.flatMap((row) => [
          { ...row, groupId: group.id },
          ...(Array.isArray(row.versions)
            ? row.versions.map((version) => ({ ...version, groupId: group.id }))
            : []),
        ]),
      ),
    [gfcGroups],
  );

  const areaFilterOptions = useProjectAreaFilterOptions(projectId);

  const gfcFilterOptions = useMemo(
    () => ({
      ...PROJECT_DETAIL_GFC_FILTER_OPTIONS,
      area: areaFilterOptions,
      status: toStatusFilterOptions(statusOptions),
    }),
    [areaFilterOptions, statusOptions],
  );

  const floorFilterOptions = useMemo(
    () => getProjectFloorFilterOptions(projectFloors),
    [projectFloors],
  );

  const columnConfig = useColumnConfig(
    PROJECT_COLUMN_TABLE_IDS.GFC,
    PROJECT_DETAIL_GFC_COLUMNS,
    (columns) =>
      dispatch(
        saveProjectColumnConfig({ tableId: PROJECT_COLUMN_TABLE_IDS.GFC, columns }),
      ).unwrap(),
    () => dispatch(fetchProjectColumnConfig({ tableId: PROJECT_COLUMN_TABLE_IDS.GFC })).unwrap(),
    { autoSave: true, debounce: 200 },
  );

  const loadGfcTasks = useCallback(async () => {
    if (!projectId) return;

    try {
      await dispatch(
        fetchProjectGfcListview({
          project: projectId,
          keyword: debouncedSearchQuery,
          group_by: buildProjectGfcGroupByParam(groupBy, groupOrder),
          filters: buildProjectGfcListviewFilters(selectedFilters, floorFilter),
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

  const {
    isAcknowledging: isAcknowledgingFloorVersion,
    acknowledgingTaskId,
    acknowledgeTaskFloorVersion,
  } = useProjectFloorVersionAcknowledge({
    onAfterAcknowledge: async (taskId) => {
      await loadGfcTasks();
      if (selectedGfcKey?.rowId === taskId) {
        await dispatch(fetchProjectTaskDetail(taskId)).unwrap();
      }
    },
  });

  useEffect(() => {
    loadGfcTasks();
  }, [loadGfcTasks]);

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
    setGfcGroups(mapProjectGfcListviewToGroups(gfcListview));
  }, [gfcListview]);

  const totalFilterCount = useMemo(
    () =>
      Object.values(selectedFilters).reduce(
        (count, values) => count + (Array.isArray(values) ? values.length : 0),
        0,
      ),
    [selectedFilters],
  );

  const visibleGfcGroups = useMemo(
    () => gfcGroups.filter((group) => group.rows.length > 0),
    [gfcGroups],
  );

  const selectedGfcIndex = useMemo(
    () =>
      selectedGfcKey
        ? flatGfcRows.findIndex(
            (row) => row.id === selectedGfcKey.rowId && row.groupId === selectedGfcKey.groupId,
          )
        : -1,
    [flatGfcRows, selectedGfcKey],
  );

  const listSelectedGfc = selectedGfcIndex >= 0 ? flatGfcRows[selectedGfcIndex] : null;

  const selectedGfc = useMemo(() => {
    if (!selectedGfcKey?.rowId) return null;
    if (gfcDetailData?.name === selectedGfcKey.rowId) {
      return mapProjectGfcDetailToRow(gfcDetailData, listSelectedGfc);
    }
    return listSelectedGfc;
  }, [gfcDetailData, listSelectedGfc, selectedGfcKey?.rowId]);

  const getGfcRowForUpdate = useCallback(
    (gfcId, fieldName) => {
      const listRow = flatGfcRows.find((row) => row.id === gfcId);
      if (!listRow) return null;

      if (
        fieldName === 'description' &&
        selectedGfcKey?.rowId === gfcId &&
        gfcDetailData?.name === gfcId
      ) {
        return mapProjectGfcDetailToRow(gfcDetailData, listRow);
      }

      return listRow;
    },
    [flatGfcRows, gfcDetailData, selectedGfcKey?.rowId],
  );

  const handleFieldUpdate = useCallback(
    async (gfcId, fieldName, value) => {
      const gfc = getGfcRowForUpdate(gfcId, fieldName);
      if (!gfcId || !gfc) return;

      const originalValue = getProjectGfcRowFieldValue(gfc, fieldName);
      if (projectGfcFieldValuesEqual(fieldName, originalValue, value)) return;

      try {
        await dispatch(
          updateProjectTask(buildProjectGfcUpdateFormData(gfcId, fieldName, value)),
        ).unwrap();
        showSuccessToast('GFC updated successfully');

        setGfcGroups((previous) =>
          previous.map((group) => ({
            ...group,
            rows: group.rows.map((row) =>
              row.id === gfcId ? patchProjectGfcRow(row, fieldName, value) : row,
            ),
          })),
        );

        if (fieldName === 'description') {
          if (selectedGfcKey?.rowId === gfcId) {
            dispatch(patchProjectTaskDetailField({ fieldName, value }));
          }
        } else {
          await loadGfcTasks();

          if (selectedGfcKey?.rowId === gfcId) {
            await dispatch(fetchProjectTaskDetail(gfcId)).unwrap();
          }
        }

        refreshOpenProjectTaskActivities(dispatch, gfcId, selectedGfcKey?.rowId);
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [dispatch, getGfcRowForUpdate, loadGfcTasks, selectedGfcKey?.rowId],
  );

  const handleUploadAttachments = useCallback(
    createProjectTaskAttachmentUploadHandler({
      dispatch,
      supportsNewVersion: true,
      setIsUploading: setIsUploadingAttachments,
      onAfterUpload: async ({ taskId, mode, result }) => {
        await loadGfcTasks();
        const newTaskId = result?.task_id;
        if (
          newTaskId &&
          mode === THREE_D_UPLOAD_MODES.NEW_VERSION &&
          selectedGfcKey?.rowId === taskId
        ) {
          setSelectedGfcKey((previous) =>
            previous ? { ...previous, rowId: newTaskId } : previous,
          );
          await dispatch(fetchProjectTaskDetail(newTaskId)).unwrap();
        } else if (selectedGfcKey?.rowId === taskId) {
          await dispatch(fetchProjectTaskDetail(taskId)).unwrap();
        }
      },
    }),
    [dispatch, loadGfcTasks, selectedGfcKey?.rowId],
  );

  useEffect(() => {
    const gfcId = selectedGfcKey?.rowId;
    if (!gfcId) return;

    dispatch(fetchProjectTaskDetail(gfcId)).catch((error) => {
      showErrorToast(extractErrorMessage(error));
    });
  }, [dispatch, selectedGfcKey?.rowId]);

  const activeSectionOptions = gfcFilterOptions[activeFilterSection] ?? [];

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

  const openGfcDrawer = (groupId, rowId) => {
    setSelectedGfcKey({ groupId, rowId });
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
        <div className='flex items-center justify-between gap-3'>
          <div className='w-full max-w-[372px]'>
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

          <div className='flex items-center gap-3'>
            {projectId ? (
              <ProjectFollowersPopover
                projectId={projectId}
                scopeMode='project'
                section='gfc'
                referenceDoctype='Project'
                referenceName={projectId}
                activityLabel='GFC tab'
              />
            ) : null}
            <GroupByToolbarControl
              options={PROJECT_DETAIL_GFC_GROUP_BY_OPTIONS}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
              groupOrder={groupOrder}
              onGroupOrderChange={setGroupOrder}
              size='xsmall'
            />
            <ProjectQuickFilterToolbar
              selectedFilters={selectedFilters}
              setSelectedFilters={setSelectedFilters}
              completedStatus={completedStatus}
              entityLabel='GFC items'
            />
            <Popover.Root>
              <Filter.TriggerButton
                filterCount={totalFilterCount}
                tooltipContent='Filters'
                ariaLabel='Filter GFC documents'
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
                    {PROJECT_DETAIL_GFC_FILTER_SECTIONS.map((section) => (
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
                  aria-label='Manage GFC columns'
                >
                  <Button.Icon as={RiLayoutColumnLine} />
                </Button.Root>
              }
            />
            <Button.Root
              variant='primary'
              mode='filled'
              size='xsmall'
              onClick={() => setIsCreateOpen(true)}
            >
              <Button.Icon as={RiAddLine} />
              Add TD/GFC
            </Button.Root>
          </div>
        </div>

        <div className='flex flex-col gap-5 pb-4'>
          {isListLoading ? (
            <div className='flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-paragraph-sm text-text-sub-500'>
              Loading GFC documents…
            </div>
          ) : visibleGfcGroups.length > 0 ? (
            visibleGfcGroups.map((group) => (
              <GfcGroupTable
                key={group.id}
                group={group.id}
                rows={group.rows}
                columnConfig={columnConfig.columns}
                onFieldUpdate={handleFieldUpdate}
                onOpenGfc={openGfcDrawer}
                onAcknowledgeFloorVersion={acknowledgeTaskFloorVersion}
                isAcknowledgingFloorVersion={isAcknowledgingFloorVersion}
                acknowledgingTaskId={acknowledgingTaskId}
                projectId={projectId}
                projectFloors={projectFloors}
                showGroupHeader={Boolean(groupBy)}
                isCollapsed={Boolean(collapsedGroups[group.id])}
                onToggleCollapse={() => toggleGroupCollapse(group.id)}
              />
            ))
          ) : (
            <div className='flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
              <p className='text-label-md text-text-strong-950'>No GFC documents found</p>
              <p className='mt-1 text-paragraph-sm text-text-sub-500'>
                Adjust filters or add a new TD/GFC document.
              </p>
            </div>
          )}
        </div>
      </div>

      <ProjectGfcCreateDrawer
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        projectId={projectId}
        projectFloors={projectFloors}
        onCreated={() => loadGfcTasks()}
      />

      <ProjectGfcViewDrawer
        open={Boolean(selectedGfcKey)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedGfcKey(null);
            dispatch(clearProjectTaskDetail());
          }
        }}
        gfc={selectedGfc}
        isLoading={isDetailLoading}
        onFieldUpdate={handleFieldUpdate}
        onUploadAttachments={handleUploadAttachments}
        isUploadingAttachments={isUploadingAttachments}
        onAcknowledgeFloorVersion={acknowledgeTaskFloorVersion}
        isAcknowledgingFloorVersion={isAcknowledgingFloorVersion}
        projectId={projectId}
        projectFloors={projectFloors}
      />
    </>
  );
}

export default function ProjectGfcSection(props) {
  return (
    <TaskStatusScopeProvider tabKey='gfc'>
      <ProjectGfcSectionContent {...props} />
    </TaskStatusScopeProvider>
  );
}
