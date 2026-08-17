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
import ProjectDetailLayoutTable from '@/components/projects/layouts/project-detail-layout-table';
import {
  buildProjectLayoutUpdatePayload,
  buildProjectLayoutsGroupByParam,
  buildProjectLayoutsListviewFilters,
  getProjectLayoutRowFieldValue,
  layoutGroupBadgeColor,
  mapProjectLayoutDetailToRow,
  mapProjectLayoutsListviewToGroups,
  patchProjectLayoutRow,
  projectLayoutFieldValuesEqual,
} from '@/components/projects/layouts/project-layout-helpers';
import ProjectLayoutViewDrawer from '@/components/projects/layouts/project-layout-view-drawer';
import ProjectLayoutCreateDrawer from '@/components/projects/layouts/project-layout-create-drawer';
import { normalizeUploadFilesForApi } from '@/components/projects/shared/project-attachment-upload-utils';
import ProjectFloorFilterBar from '@/components/projects/shared/project-floor-filter-bar';
import ProjectQuickFilterToolbar from '@/components/projects/shared/project-quick-filter-toolbar';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import * as Filter from '@/components/ui/filter';
import GroupByToolbarControl from '@/components/ui/group-by-toolbar-control';
import * as Input from '@/components/ui/input';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Popover from '@/components/ui/popover';
import { useColumnConfig } from '@/hooks/use-column-config';
import { useDebounce } from '@/hooks/use-debounce';
import { buildStatusMetaMap, useStatusOptions } from '@/hooks/use-status-options';
import { PROJECT_COLUMN_TABLE_IDS } from '@/components/projects/column-config';
import {
  PROJECT_DETAIL_COMPLETED_QUICK_FILTER_STATUS,
  PROJECT_DETAIL_LAYOUT_COLUMNS,
  PROJECT_DETAIL_LAYOUT_FILTER_OPTIONS,
  PROJECT_DETAIL_LAYOUT_FILTER_SECTIONS,
  PROJECT_DETAIL_LAYOUT_GROUP_BY_OPTIONS,
  PROJECT_LAYOUT_STATUS_CONFIG,
} from '@/components/projects/constants';
import { getProjectFloorFilterOptions, parseProjectFloors } from '@/components/projects/shared';
import {
  clearProjectLayoutDetail,
  acknowledgeProjectFloorLayoutVersion,
  fetchProjectDetail,
  fetchProjectLayoutDetail,
  fetchProjectLayoutsListview,
  fetchProjectColumnConfig,
  saveProjectColumnConfig,
  patchProjectLayoutDetailField,
  selectProjectDetail,
  selectProjectLayoutDetail,
  selectProjectLayoutDetailLoading,
  selectProjectLayoutsListview,
  selectProjectLayoutsListviewLoading,
  updateProjectLayoutThunk,
} from '@/redux/projectSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { refreshOpenProjectLayoutActivities } from '@/components/projects/shared/project-activity-refresh';
import { cn } from '@/utils/cn';

function patchLayoutFloorSyncRow(row, layoutId, floorSync) {
  if (!row || row.id !== layoutId) {
    const versions = Array.isArray(row?.versions)
      ? row.versions.map((version) => patchLayoutFloorSyncRow(version, layoutId, floorSync))
      : row?.versions;
    return versions ? { ...row, versions } : row;
  }

  return {
    ...row,
    floor_sync: floorSync,
    show_warning: false,
    can_acknowledge: false,
    list_display_version: floorSync > 0 ? `V${floorSync}` : row.list_display_version,
  };
}

function LayoutGroupTable({
  group,
  rows,
  onFieldUpdate,
  onOpenLayout,
  onAcknowledgeFloorVersion,
  isAcknowledgingFloorVersion,
  acknowledgingLayoutId,
  columnConfig,
  projectId,
  projectFloors,
  showGroupHeader = true,
  statusOptions = [],
  statusMetaMap = {},
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
            color={layoutGroupBadgeColor(group)}
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
            <ProjectDetailLayoutTable
              layouts={rows}
              groupId={group}
              columnConfig={columnConfig}
              onFieldUpdate={onFieldUpdate}
              onRowClick={onOpenLayout}
              onAcknowledgeFloorVersion={onAcknowledgeFloorVersion}
              isAcknowledgingFloorVersion={isAcknowledgingFloorVersion}
              acknowledgingLayoutId={acknowledgingLayoutId}
              projectId={projectId}
              projectFloors={projectFloors}
              statusOptions={statusOptions}
              statusMetaMap={statusMetaMap}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ProjectLayoutsSection({ projectId }) {
  const dispatch = useDispatch();
  const layoutsListview = useSelector(selectProjectLayoutsListview);
  const isListLoading = useSelector(selectProjectLayoutsListviewLoading);
  const layoutDetailData = useSelector(selectProjectLayoutDetail);
  const isDetailLoading = useSelector(selectProjectLayoutDetailLoading);
  const projectDetailData = useSelector(selectProjectDetail);
  const { options: layoutStatusOptions } = useStatusOptions(PROJECT_LAYOUT_STATUS_CONFIG);
  const layoutStatusMetaMap = useMemo(
    () => buildStatusMetaMap(layoutStatusOptions),
    [layoutStatusOptions],
  );

  const [layoutGroups, setLayoutGroups] = useState([]);
  const [floorFilter, setFloorFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('layout_type');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [activeFilterSection, setActiveFilterSection] = useState('layout_type');
  const [selectedFilters, setSelectedFilters] = useState({
    layout_type: [],
    status: [],
    assignee: [],
    priority: [],
  });
  const [selectedLayoutKey, setSelectedLayoutKey] = useState(null);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isAcknowledgingFloorVersion, setIsAcknowledgingFloorVersion] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [acknowledgingLayoutId, setAcknowledgingLayoutId] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  const projectFloors = useMemo(() => parseProjectFloors(projectDetailData), [projectDetailData]);

  const floorFilterOptions = useMemo(
    () => getProjectFloorFilterOptions(projectFloors),
    [projectFloors],
  );

  const columnConfig = useColumnConfig(
    PROJECT_COLUMN_TABLE_IDS.LAYOUT,
    PROJECT_DETAIL_LAYOUT_COLUMNS,
    (columns) =>
      dispatch(
        saveProjectColumnConfig({ tableId: PROJECT_COLUMN_TABLE_IDS.LAYOUT, columns }),
      ).unwrap(),
    () => dispatch(fetchProjectColumnConfig({ tableId: PROJECT_COLUMN_TABLE_IDS.LAYOUT })).unwrap(),
    { autoSave: true, debounce: 200 },
  );

  const loadLayouts = useCallback(async () => {
    if (!projectId) return;

    try {
      await dispatch(
        fetchProjectLayoutsListview({
          project: projectId,
          keyword: debouncedSearchQuery,
          group_by: buildProjectLayoutsGroupByParam(groupBy, groupOrder),
          filters: buildProjectLayoutsListviewFilters(selectedFilters, floorFilter),
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

  useEffect(() => {
    loadLayouts();
  }, [loadLayouts]);

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
    setLayoutGroups(mapProjectLayoutsListviewToGroups(layoutsListview));
  }, [layoutsListview]);

  const totalFilterCount = useMemo(
    () =>
      Object.values(selectedFilters).reduce(
        (count, values) => count + (Array.isArray(values) ? values.length : 0),
        0,
      ),
    [selectedFilters],
  );

  const visibleLayoutGroups = useMemo(() => layoutGroups, [layoutGroups]);

  const flatLayoutRows = useMemo(
    () =>
      layoutGroups.flatMap((group) =>
        group.rows.flatMap((row) => [
          { ...row, groupId: group.id },
          ...(Array.isArray(row.versions)
            ? row.versions.map((version) => ({ ...version, groupId: group.id }))
            : []),
        ]),
      ),
    [layoutGroups],
  );

  const selectedLayoutIndex = useMemo(
    () =>
      selectedLayoutKey
        ? flatLayoutRows.findIndex(
            (row) =>
              row.id === selectedLayoutKey.rowId && row.groupId === selectedLayoutKey.groupId,
          )
        : -1,
    [flatLayoutRows, selectedLayoutKey],
  );

  const listSelectedLayout = selectedLayoutIndex >= 0 ? flatLayoutRows[selectedLayoutIndex] : null;

  const selectedLayout = useMemo(() => {
    if (!selectedLayoutKey?.rowId) return null;
    if (layoutDetailData?.name === selectedLayoutKey.rowId) {
      return mapProjectLayoutDetailToRow(layoutDetailData, listSelectedLayout);
    }
    return listSelectedLayout;
  }, [layoutDetailData, listSelectedLayout, selectedLayoutKey?.rowId]);

  const getLayoutRowForUpdate = useCallback(
    (layoutId, fieldName) => {
      const listRow = flatLayoutRows.find((row) => row.id === layoutId);
      if (!listRow) return null;

      if (
        fieldName === 'description' &&
        selectedLayoutKey?.rowId === layoutId &&
        layoutDetailData?.name === layoutId
      ) {
        return mapProjectLayoutDetailToRow(layoutDetailData, listRow);
      }

      return listRow;
    },
    [flatLayoutRows, layoutDetailData, selectedLayoutKey?.rowId],
  );

  const handleFieldUpdate = useCallback(
    async (layoutId, fieldName, value) => {
      const layout = getLayoutRowForUpdate(layoutId, fieldName);
      if (!layoutId || !layout) return;

      const originalValue = getProjectLayoutRowFieldValue(layout, fieldName);
      if (projectLayoutFieldValuesEqual(fieldName, originalValue, value)) return;

      try {
        await dispatch(
          updateProjectLayoutThunk({
            layoutId,
            payload: buildProjectLayoutUpdatePayload(layoutId, fieldName, value),
          }),
        ).unwrap();
        showSuccessToast('Layout updated successfully');

        setLayoutGroups((previous) =>
          previous.map((group) => ({
            ...group,
            rows: group.rows.map((row) =>
              row.id === layoutId ? patchProjectLayoutRow(row, fieldName, value) : row,
            ),
          })),
        );

        if (selectedLayoutKey?.rowId === layoutId) {
          dispatch(patchProjectLayoutDetailField({ fieldName, value }));
        }

        refreshOpenProjectLayoutActivities(dispatch, layoutId, selectedLayoutKey?.rowId);
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [dispatch, getLayoutRowForUpdate, selectedLayoutKey?.rowId],
  );

  const handleUploadAttachments = useCallback(
    async (layoutId, _mode, files) => {
      const uploadFiles = normalizeUploadFilesForApi(files);
      if (!layoutId || uploadFiles.length === 0) return;

      setIsUploadingAttachments(true);
      try {
        await dispatch(
          updateProjectLayoutThunk({
            layoutId,
            payload: { layout_id: layoutId },
            attachments: uploadFiles,
          }),
        ).unwrap();
        showSuccessToast('File uploaded successfully');
        await loadLayouts();
        if (selectedLayoutKey?.rowId === layoutId) {
          await dispatch(fetchProjectLayoutDetail(layoutId)).unwrap();
        }
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      } finally {
        setIsUploadingAttachments(false);
      }
    },
    [dispatch, loadLayouts, selectedLayoutKey?.rowId],
  );

  useEffect(() => {
    const layoutId = selectedLayoutKey?.rowId;
    if (!layoutId) return;

    dispatch(fetchProjectLayoutDetail(layoutId)).catch((error) => {
      showErrorToast(extractErrorMessage(error));
    });
  }, [dispatch, selectedLayoutKey?.rowId]);

  const handleLayoutRefresh = useCallback(
    async (nextLayoutId) => {
      const normalizedId =
        nextLayoutId != null && typeof nextLayoutId === 'object'
          ? String(nextLayoutId.layout_id ?? nextLayoutId.layoutId ?? '').trim()
          : String(nextLayoutId ?? '').trim();
      const layoutId = normalizedId || String(selectedLayoutKey?.rowId ?? '').trim();
      if (!layoutId) return;

      if (normalizedId && normalizedId !== selectedLayoutKey?.rowId) {
        setSelectedLayoutKey((previous) =>
          previous ? { ...previous, rowId: normalizedId } : previous,
        );
      }

      await dispatch(fetchProjectLayoutDetail(layoutId)).unwrap();
      await loadLayouts();
    },
    [dispatch, loadLayouts, selectedLayoutKey?.rowId],
  );

  const handleAcknowledgeFloorVersion = useCallback(
    async (layout, floorLockedVersion) => {
      const layoutId = String(layout?.id ?? '').trim();
      if (!layoutId) return;

      const options = Array.isArray(layout.floor_version_options)
        ? layout.floor_version_options
        : [];
      const latestOption =
        options.find((option) => option?.is_latest) ?? options[options.length - 1];
      const resolvedVersion =
        floorLockedVersion ?? latestOption?.value ?? layout.parent_version ?? undefined;

      setIsAcknowledgingFloorVersion(true);
      setAcknowledgingLayoutId(layoutId);
      try {
        const result = await dispatch(
          acknowledgeProjectFloorLayoutVersion({
            layoutId,
            floorLockedVersion: resolvedVersion,
          }),
        ).unwrap();
        showSuccessToast(result?.message ?? 'Layout synced to floor version');
        const syncedVersion = Number(result?.floor_sync ?? resolvedVersion ?? 0);
        if (syncedVersion > 0) {
          setLayoutGroups((previous) =>
            previous.map((group) => ({
              ...group,
              rows: group.rows.map((row) => patchLayoutFloorSyncRow(row, layoutId, syncedVersion)),
            })),
          );
        }
        await loadLayouts();
        if (selectedLayoutKey?.rowId === layoutId) {
          await dispatch(fetchProjectLayoutDetail(layoutId)).unwrap();
        }
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      } finally {
        setIsAcknowledgingFloorVersion(false);
        setAcknowledgingLayoutId('');
      }
    },
    [dispatch, loadLayouts, selectedLayoutKey?.rowId],
  );

  const activeSectionOptions = useMemo(() => {
    if (activeFilterSection === 'status') {
      return layoutStatusOptions.map((option) => ({
        value: option.value,
        label: option.label ?? option.value,
      }));
    }
    return PROJECT_DETAIL_LAYOUT_FILTER_OPTIONS[activeFilterSection] ?? [];
  }, [activeFilterSection, layoutStatusOptions]);

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
    setSelectedFilters({ layout_type: [], status: [], assignee: [], priority: [] });
  };

  const openLayoutDrawer = (groupId, rowId) => {
    setSelectedLayoutKey({ groupId, rowId });
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
        <ProjectFloorFilterBar
          projectId={projectId}
          projectDetail={projectDetailData}
          floorFilter={floorFilter}
          onFloorFilterChange={setFloorFilter}
        />

        <div className='flex items-center justify-between gap-3'>
          <div className='w-full max-w-[300px]'>
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
                section='layouts'
                referenceDoctype='Project'
                referenceName={projectId}
                activityLabel='layouts tab'
              />
            ) : null}
            <GroupByToolbarControl
              options={PROJECT_DETAIL_LAYOUT_GROUP_BY_OPTIONS}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
              groupOrder={groupOrder}
              onGroupOrderChange={setGroupOrder}
              size='xsmall'
            />

            <ProjectQuickFilterToolbar
              selectedFilters={selectedFilters}
              setSelectedFilters={setSelectedFilters}
              completedStatus={PROJECT_DETAIL_COMPLETED_QUICK_FILTER_STATUS.layout}
              entityLabel='layouts'
            />
            <Popover.Root>
              <Filter.TriggerButton
                filterCount={totalFilterCount}
                tooltipContent='Filters'
                ariaLabel='Filter project layouts'
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
                    {PROJECT_DETAIL_LAYOUT_FILTER_SECTIONS.map((section) => (
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
                  aria-label='Manage layout columns'
                >
                  <Button.Icon as={RiLayoutColumnLine} />
                </Button.Root>
              }
            />
            <Button.Root
              variant='primary'
              mode='filled'
              size='xsmall'
              onClick={() => setIsCreateDrawerOpen(true)}
            >
              <Button.Icon as={RiAddLine} />
              Add Layout
            </Button.Root>
          </div>
        </div>

        <div className='flex flex-col gap-5 pb-4'>
          {isListLoading && visibleLayoutGroups.length === 0 ? (
            <div className='flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-paragraph-sm text-text-sub-500'>
              Loading layouts…
            </div>
          ) : visibleLayoutGroups.length > 0 ? (
            visibleLayoutGroups.map((group) => (
              <LayoutGroupTable
                key={group.id}
                group={group.id}
                rows={group.rows}
                columnConfig={columnConfig.columns}
                onFieldUpdate={handleFieldUpdate}
                onOpenLayout={openLayoutDrawer}
                onAcknowledgeFloorVersion={handleAcknowledgeFloorVersion}
                isAcknowledgingFloorVersion={isAcknowledgingFloorVersion}
                acknowledgingLayoutId={acknowledgingLayoutId}
                projectId={projectId}
                projectFloors={projectFloors}
                showGroupHeader={Boolean(groupBy)}
                statusOptions={layoutStatusOptions}
                statusMetaMap={layoutStatusMetaMap}
                isCollapsed={Boolean(collapsedGroups[group.id])}
                onToggleCollapse={() => toggleGroupCollapse(group.id)}
              />
            ))
          ) : (
            <div className='flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
              <p className='text-label-md text-text-strong-950'>No layouts found</p>
              <p className='mt-1 text-paragraph-sm text-text-sub-500'>
                Adjust filters or add a new layout.
              </p>
            </div>
          )}
        </div>
      </div>

      <ProjectLayoutCreateDrawer
        open={isCreateDrawerOpen}
        onOpenChange={setIsCreateDrawerOpen}
        projectId={projectId}
        projectFloors={projectFloors}
        onCreated={() => {
          loadLayouts();
        }}
      />

      <ProjectLayoutViewDrawer
        open={Boolean(selectedLayoutKey)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedLayoutKey(null);
            dispatch(clearProjectLayoutDetail());
          }
        }}
        layout={selectedLayout}
        isLoading={isDetailLoading}
        onFieldUpdate={handleFieldUpdate}
        onUploadAttachments={handleUploadAttachments}
        isUploadingAttachments={isUploadingAttachments}
        projectId={projectId}
        onLayoutRefresh={handleLayoutRefresh}
        onAcknowledgeFloorVersion={handleAcknowledgeFloorVersion}
        isAcknowledgingFloorVersion={isAcknowledgingFloorVersion}
        projectFloors={projectFloors}
      />
    </>
  );
}
