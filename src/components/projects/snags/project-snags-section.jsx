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
import ProjectDetailSnagTable from '@/components/projects/snags/project-detail-snag-table';
import ProjectSnagCreateDrawer from '@/components/projects/snags/project-snag-create-drawer';
import {
  buildProjectSnagGroupByParam,
  buildProjectSnagListviewFilters,
  buildProjectSnagUpdateFormData,
  collectSnagAssigneeFilterOptions,
  collectSnagCategoryFilterOptions,
  resolvePublicSnagFormUrl,
  mapProjectSnagDetailToRow,
  mapProjectSnagsListviewToGroups,
  patchProjectSnagRow,
  projectSnagFieldValuesEqual,
  getProjectSnagRowFieldValue,
  snagGroupBadgeColor,
} from '@/components/projects/snags/project-snag-helpers';
import ProjectSnagViewDrawer from '@/components/projects/snags/project-snag-view-drawer';
import { createProjectTaskAttachmentUploadHandler } from '@/components/projects/shared/project-attachment-upload-utils';
import { parseProjectFloors } from '@/components/projects/shared';
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
import { toStatusFilterOptions } from '@/hooks/use-status-options';
import { PROJECT_COLUMN_TABLE_IDS } from '@/components/projects/column-config';
import {
  PROJECT_DETAIL_SNAG_COLUMNS,
  PROJECT_DETAIL_SNAG_FILTER_OPTIONS,
  PROJECT_DETAIL_SNAG_FILTER_SECTIONS,
  PROJECT_DETAIL_SNAG_GROUP_BY_OPTIONS,
} from '@/components/projects/constants';
import {
  clearProjectTaskDetail,
  fetchProjectDetail,
  fetchProjectSnagShareLink,
  fetchProjectSnagsListview,
  fetchProjectColumnConfig,
  saveProjectColumnConfig,
  fetchProjectTaskDetail,
  patchProjectTaskDetailField,
  selectProjectDetail,
  selectProjectSnagShareLink,
  selectProjectSnagShareLinkLoading,
  selectProjectSnagsListview,
  selectProjectSnagsListviewLoading,
  selectProjectTaskDetail,
  selectProjectTaskDetailLoading,
  updateProjectTask,
} from '@/redux/projectSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { refreshOpenProjectTaskActivities } from '@/components/projects/shared/project-activity-refresh';
import * as LinkButton from '@/components/ui/link-button';
import { cn } from '@/utils/cn';
import {
  TaskStatusScopeProvider,
  useTaskStatusScope,
} from '@/components/projects/shared/task-status-scope-context';

function SnagGroupTable({
  group,
  rows,
  onFieldUpdate,
  onOpenSnag,
  columnConfig,
  projectId,
  projectFloors,
  layoutBundles,
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
            color={snagGroupBadgeColor(group)}
            size='small'
            className='uppercase'
          >
            {group || 'Unassigned'}
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
            <ProjectDetailSnagTable
              rows={rows}
              groupId={group}
              columnConfig={columnConfig}
              onFieldUpdate={onFieldUpdate}
              onRowClick={onOpenSnag}
              projectId={projectId}
              projectFloors={projectFloors}
              layoutBundles={layoutBundles}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProjectSnagsSectionContent({ projectId }) {
  const { completedStatus, statusOptions } = useTaskStatusScope();
  const dispatch = useDispatch();
  const snagsListview = useSelector(selectProjectSnagsListview);
  const isListLoading = useSelector(selectProjectSnagsListviewLoading);
  const snagDetailData = useSelector(selectProjectTaskDetail);
  const isDetailLoading = useSelector(selectProjectTaskDetailLoading);
  const projectDetailData = useSelector(selectProjectDetail);
  const shareLink = useSelector(selectProjectSnagShareLink);
  const isShareLinkLoading = useSelector(selectProjectSnagShareLinkLoading);

  const [snagGroups, setSnagGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('snag_source');
  const [groupOrder, setGroupOrder] = useState('desc');
  const [activeFilterSection, setActiveFilterSection] = useState('category');
  const [selectedFilters, setSelectedFilters] = useState({
    category: [],
    snag_source: [],
    status: [],
    assignee: [],
    priority: [],
  });
  const [selectedSnagKey, setSelectedSnagKey] = useState(null);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  const projectFloors = useMemo(() => parseProjectFloors(projectDetailData), [projectDetailData]);

  const layoutBundles = useMemo(
    () => snagsListview?.layout_bundles ?? null,
    [snagsListview?.layout_bundles],
  );

  const flatSnagRows = useMemo(
    () =>
      snagGroups.flatMap((group) =>
        group.rows.map((row) => ({
          ...row,
          groupId: group.id,
        })),
      ),
    [snagGroups],
  );

  const snagFilterOptions = useMemo(
    () => ({
      ...PROJECT_DETAIL_SNAG_FILTER_OPTIONS,
      category: collectSnagCategoryFilterOptions(flatSnagRows),
      assignee: collectSnagAssigneeFilterOptions(flatSnagRows),
      status: toStatusFilterOptions(statusOptions),
    }),
    [flatSnagRows, statusOptions],
  );

  const columnConfig = useColumnConfig(
    PROJECT_COLUMN_TABLE_IDS.SNAG,
    PROJECT_DETAIL_SNAG_COLUMNS,
    (columns) =>
      dispatch(
        saveProjectColumnConfig({ tableId: PROJECT_COLUMN_TABLE_IDS.SNAG, columns }),
      ).unwrap(),
    () => dispatch(fetchProjectColumnConfig({ tableId: PROJECT_COLUMN_TABLE_IDS.SNAG })).unwrap(),
    { autoSave: true, debounce: 200 },
  );

  const loadSnags = useCallback(async () => {
    if (!projectId) return;

    try {
      await dispatch(
        fetchProjectSnagsListview({
          project: projectId,
          keyword: debouncedSearchQuery,
          group_by: buildProjectSnagGroupByParam(groupBy, groupOrder),
          filters: buildProjectSnagListviewFilters(selectedFilters),
        }),
      ).unwrap();
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  }, [debouncedSearchQuery, dispatch, groupBy, groupOrder, projectId, selectedFilters]);

  useEffect(() => {
    loadSnags();
  }, [loadSnags]);

  useEffect(() => {
    if (!projectId) return;

    dispatch(fetchProjectDetail(projectId)).catch((error) => {
      showErrorToast(extractErrorMessage(error));
    });
  }, [dispatch, projectId]);

  useEffect(() => {
    setSnagGroups(mapProjectSnagsListviewToGroups(snagsListview));
  }, [snagsListview]);

  const totalFilterCount = useMemo(
    () =>
      Object.values(selectedFilters).reduce(
        (count, values) => count + (Array.isArray(values) ? values.length : 0),
        0,
      ),
    [selectedFilters],
  );

  const visibleSnagGroups = useMemo(
    () => snagGroups.filter((group) => group.rows.length > 0),
    [snagGroups],
  );

  const selectedSnagIndex = useMemo(
    () =>
      selectedSnagKey
        ? flatSnagRows.findIndex(
            (row) => row.id === selectedSnagKey.rowId && row.groupId === selectedSnagKey.groupId,
          )
        : -1,
    [flatSnagRows, selectedSnagKey],
  );

  const listSelectedSnag = selectedSnagIndex >= 0 ? flatSnagRows[selectedSnagIndex] : null;

  const selectedSnag = useMemo(() => {
    if (!selectedSnagKey?.rowId) return null;
    if (snagDetailData?.name === selectedSnagKey.rowId) {
      return mapProjectSnagDetailToRow(snagDetailData, listSelectedSnag);
    }
    return listSelectedSnag;
  }, [listSelectedSnag, selectedSnagKey?.rowId, snagDetailData]);

  const getSnagRowForUpdate = useCallback(
    (snagId, fieldName) => {
      const listRow = flatSnagRows.find((row) => row.id === snagId);
      if (!listRow) return null;

      if (
        fieldName === 'description' &&
        selectedSnagKey?.rowId === snagId &&
        snagDetailData?.name === snagId
      ) {
        return mapProjectSnagDetailToRow(snagDetailData, listRow);
      }

      return listRow;
    },
    [flatSnagRows, selectedSnagKey?.rowId, snagDetailData],
  );

  const handleFieldUpdate = useCallback(
    async (snagId, fieldName, value) => {
      const snag = getSnagRowForUpdate(snagId, fieldName);
      if (!snagId || !snag) return;

      const originalValue = getProjectSnagRowFieldValue(snag, fieldName);
      if (projectSnagFieldValuesEqual(fieldName, originalValue, value)) return;

      try {
        await dispatch(
          updateProjectTask(buildProjectSnagUpdateFormData(snagId, fieldName, value)),
        ).unwrap();
        showSuccessToast('Snag updated successfully');

        setSnagGroups((previous) =>
          previous.map((group) => ({
            ...group,
            rows: group.rows.map((row) =>
              row.id === snagId ? patchProjectSnagRow(row, fieldName, value) : row,
            ),
          })),
        );

        if (fieldName === 'description') {
          if (selectedSnagKey?.rowId === snagId) {
            dispatch(patchProjectTaskDetailField({ fieldName, value }));
          }
        } else {
          await loadSnags();

          if (selectedSnagKey?.rowId === snagId) {
            await dispatch(fetchProjectTaskDetail(snagId)).unwrap();
          }
        }

        refreshOpenProjectTaskActivities(dispatch, snagId, selectedSnagKey?.rowId);
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [dispatch, getSnagRowForUpdate, loadSnags, selectedSnagKey?.rowId],
  );

  const handleUploadAttachments = useCallback(
    createProjectTaskAttachmentUploadHandler({
      dispatch,
      setIsUploading: setIsUploadingAttachments,
      onAfterUpload: async ({ taskId }) => {
        await loadSnags();
        if (selectedSnagKey?.rowId === taskId) {
          await dispatch(fetchProjectTaskDetail(taskId)).unwrap();
        }
      },
    }),
    [dispatch, loadSnags, selectedSnagKey?.rowId],
  );

  useEffect(() => {
    const snagId = selectedSnagKey?.rowId;
    if (!snagId) return;

    dispatch(fetchProjectTaskDetail(snagId)).catch((error) => {
      showErrorToast(extractErrorMessage(error));
    });
  }, [dispatch, selectedSnagKey?.rowId]);

  const activeSectionOptions = snagFilterOptions[activeFilterSection] ?? [];

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
    setSelectedFilters({
      category: [],
      snag_source: [],
      status: [],
      assignee: [],
      priority: [],
    });
  };

  const openSnagDrawer = (groupId, rowId) => {
    setSelectedSnagKey({ groupId, rowId });
  };

  const toggleGroupCollapse = (groupId) => {
    setCollapsedGroups((previous) => ({
      ...previous,
      [groupId]: !previous[groupId],
    }));
  };

  const loadShareLink = useCallback(async () => {
    if (!projectId) return null;

    if (shareLink?.project === projectId && shareLink?.url) {
      return shareLink;
    }

    try {
      return await dispatch(fetchProjectSnagShareLink(projectId)).unwrap();
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
      return null;
    }
  }, [dispatch, projectId, shareLink]);

  const handlePreviewShareForm = useCallback(async () => {
    const data = await loadShareLink();
    const publicFormUrl = resolvePublicSnagFormUrl(data);
    if (!publicFormUrl) return;

    window.open(publicFormUrl, '_blank', 'noopener,noreferrer');
  }, [loadShareLink]);

  const handleCopyShareLink = useCallback(async () => {
    const data = await loadShareLink();
    const publicFormUrl = resolvePublicSnagFormUrl(data);
    if (!publicFormUrl) return;

    try {
      await navigator.clipboard.writeText(publicFormUrl);
      showSuccessToast('Snag form link copied to clipboard');
    } catch {
      showErrorToast('Failed to copy the link');
    }
  }, [loadShareLink]);

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
                section='snags'
                referenceDoctype='Project'
                referenceName={projectId}
                activityLabel='snags tab'
              />
            ) : null}
            <GroupByToolbarControl
              options={PROJECT_DETAIL_SNAG_GROUP_BY_OPTIONS}
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
              entityLabel='snags'
            />
            <Popover.Root>
              <Filter.TriggerButton
                filterCount={totalFilterCount}
                tooltipContent='Filters'
                ariaLabel='Filter snags'
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
                    {PROJECT_DETAIL_SNAG_FILTER_SECTIONS.map((section) => (
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
                  aria-label='Manage snag columns'
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
              Add Snag
            </Button.Root>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-3 rounded-lg border border-information-light bg-information-lighter px-4 py-2.5 text-paragraph-sm text-text-sub-600'>
          <span>Collect external snags directly through this form.</span>
          <div className='flex items-center gap-4'>
            <LinkButton.Root
              variant='primary'
              size='medium'
              underline
              disabled={isShareLinkLoading}
              onClick={handlePreviewShareForm}
            >
              Preview
            </LinkButton.Root>
            <LinkButton.Root
              variant='primary'
              size='medium'
              underline
              disabled={isShareLinkLoading}
              onClick={handleCopyShareLink}
            >
              Copy Link
            </LinkButton.Root>
          </div>
        </div>

        <div className='flex flex-col gap-5 pb-4'>
          {isListLoading ? (
            <div className='flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-paragraph-sm text-text-sub-500'>
              Loading snags…
            </div>
          ) : visibleSnagGroups.length > 0 ? (
            visibleSnagGroups.map((group) => (
              <SnagGroupTable
                key={group.id}
                group={group.id}
                rows={group.rows}
                columnConfig={columnConfig.columns}
                onFieldUpdate={handleFieldUpdate}
                onOpenSnag={openSnagDrawer}
                projectId={projectId}
                projectFloors={projectFloors}
                layoutBundles={layoutBundles}
                showGroupHeader={Boolean(groupBy)}
                isCollapsed={Boolean(collapsedGroups[group.id])}
                onToggleCollapse={() => toggleGroupCollapse(group.id)}
              />
            ))
          ) : (
            <div className='flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
              <p className='text-label-md text-text-strong-950'>No snags found</p>
              <p className='mt-1 text-paragraph-sm text-text-sub-500'>
                Adjust filters or add a new snag.
              </p>
            </div>
          )}
        </div>
      </div>

      <ProjectSnagCreateDrawer
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        projectId={projectId}
        projectFloors={projectFloors}
        onCreated={() => loadSnags()}
      />

      <ProjectSnagViewDrawer
        open={Boolean(selectedSnagKey)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedSnagKey(null);
            dispatch(clearProjectTaskDetail());
          }
        }}
        snag={selectedSnag}
        isLoading={isDetailLoading}
        onFieldUpdate={handleFieldUpdate}
        onUploadAttachments={handleUploadAttachments}
        isUploadingAttachments={isUploadingAttachments}
        projectId={projectId}
        projectFloors={projectFloors}
      />
    </>
  );
}

export default function ProjectSnagsSection(props) {
  return (
    <TaskStatusScopeProvider tabKey='snag'>
      <ProjectSnagsSectionContent {...props} />
    </TaskStatusScopeProvider>
  );
}
