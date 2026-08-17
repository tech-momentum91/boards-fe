import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiArrowDownLine,
  RiArrowRightSLine,
  RiArrowUpLine,
  RiDownloadLine,
  RiLayoutColumnLine,
  RiSearch2Line,
} from 'react-icons/ri';
import { ProjectFollowersPopover } from '@/components/document-subscribe';
import ProjectDetailSelectionTable from '@/components/projects/project-selection/project-detail-selection-table';
import ProjectSelectionViewDrawer from '@/components/projects/project-selection/project-selection-view-drawer';
import {
  adaptProjectSelectionResponse,
  adaptApiCategoryRow,
  adaptApiItemRow,
} from '@/components/projects/project-selection/project-selection-adapter';
import {
  appendCategoryToGroups,
  buildSelectionCategoryUpdateFormData,
  buildSelectionItemUpdateFormData,
  buildProjectSelectionCategoryDetailFormData,
  buildAddProjectSelectionCategoryFormData,
  buildAddProjectSelectionCustomColumnFormData,
  buildAddProjectSelectionItemFormData,
  buildRemoveProjectSelectionCustomColumnFormData,
  buildVisibleSelectionGroups,
  collectSelectionFilterOptions,
  findSelectionCategoryInGroups,
  findSelectionItemInGroups,
  isSelectionFieldUnchanged,
  patchSelectionCategoryRow,
  patchSelectionItemRow,
  patchSelectionGroups,
  patchSelectionItemInGroups,
  replaceCategoryInGroups,
  rowToSelectionCategoryDetail,
  resolveSelectionGroupId,
} from '@/components/projects/project-selection/project-selection-helpers';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Filter from '@/components/ui/filter';
import GroupByToolbarControl from '@/components/ui/group-by-toolbar-control';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import ProjectQuickFilterToolbar from '@/components/projects/shared/project-quick-filter-toolbar';
import { createProjectTaskAttachmentUploadHandler } from '@/components/projects/shared/project-attachment-upload-utils';
import { refreshOpenProjectSelectionActivities } from '@/components/projects/shared/project-activity-refresh';
import { useColumnConfig } from '@/hooks/use-column-config';
import {
  PROJECT_DETAIL_COMPLETED_QUICK_FILTER_STATUS,
  PROJECT_DETAIL_SELECTION_COLUMNS,
  PROJECT_DETAIL_SELECTION_FILTER_SECTIONS,
  PROJECT_DETAIL_SELECTION_GROUP_BY_OPTIONS,
  getStoredProjectDetailSelectionColumnConfig,
  saveStoredProjectDetailSelectionColumnConfig,
} from '@/components/projects/constants';
import {
  addProjectSelectionCategory,
  addProjectSelectionComment,
  addProjectSelectionCustomColumn,
  addProjectSelectionItem,
  fetchProjectSelection,
  fetchProjectSelectionComments,
  removeProjectSelectionCustomColumn,
  selectProjectSelection,
  selectProjectSelectionComments,
  selectProjectSelectionLoading,
  updateProjectSelectionCategory,
  updateProjectSelectionItem,
} from '@/redux/projectSlice';
import { fetchItemsForProductCategory } from '@/redux/projectMasterSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';

const EMPTY_SELECTION_FILTERS = {
  status: [],
  po_status: [],
  delivery_status: [],
  assignee: [],
  priority: [],
  order_category: [],
  product_category: [],
};

export default function ProjectSelectionSection({ projectId }) {
  const dispatch = useDispatch();
  const selectionData = useSelector(selectProjectSelection);
  const isLoading = useSelector(selectProjectSelectionLoading);
  const selectionCommentsState = useSelector(selectProjectSelectionComments);
  const selectionCommentsData = selectionCommentsState.data;
  const selectionCommentsLoading = selectionCommentsState.status === 'loading';
  const selectionCommentsStatus = selectionCommentsState.status;
  const selectionId = selectionData?.selection_name;
  const [selectionGroups, setSelectionGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('order_category');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [activeFilterSection, setActiveFilterSection] = useState('status');
  const [selectedFilters, setSelectedFilters] = useState(EMPTY_SELECTION_FILTERS);
  const [expandedRows, setExpandedRows] = useState(() => new Set());
  const [drawerState, setDrawerState] = useState(null);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const hasLoadedOnce = useRef(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);

  const columnConfig = useColumnConfig(
    'project-detail-selection',
    PROJECT_DETAIL_SELECTION_COLUMNS,
    saveStoredProjectDetailSelectionColumnConfig,
    getStoredProjectDetailSelectionColumnConfig,
    { autoSave: true, debounce: 200 },
  );

  const loadSelection = useCallback(() => {
    if (!projectId) return;
    dispatch(fetchProjectSelection({ projectId }));
  }, [dispatch, projectId]);

  useEffect(() => {
    setDrawerState(null);
    hasLoadedOnce.current = false;
    setSelectedFilters(EMPTY_SELECTION_FILTERS);
    setGroupBy('order_category');
    setGroupOrder('asc');
    setSearchQuery('');
  }, [projectId]);

  useEffect(() => {
    loadSelection();
  }, [loadSelection]);

  useEffect(() => {
    if (!drawerState || !selectionId) return;
    dispatch(fetchProjectSelectionComments({ selectionId }));
  }, [dispatch, drawerState, selectionId]);

  const handleRefreshSelectionComments = useCallback(() => {
    if (!selectionId) return;
    dispatch(fetchProjectSelectionComments({ selectionId }));
  }, [dispatch, selectionId]);

  const handleAddSelectionComment = useCallback(
    async (id, content, attachments, _isVisibleToClient, parentCommentId) => {
      if (!id) return;
      try {
        await dispatch(
          addProjectSelectionComment({
            selectionId: id,
            content,
            attachments,
            parentCommentId,
          }),
        ).unwrap();
        await dispatch(fetchProjectSelectionComments({ selectionId: id })).unwrap();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to add comment. Please try again.' });
      }
    },
    [dispatch],
  );

  useEffect(() => {
    const groups = adaptProjectSelectionResponse(selectionData);
    setSelectionGroups(groups);
    if (selectionData) {
      hasLoadedOnce.current = true;
    }
  }, [selectionData]);

  const totalFilterCount = useMemo(
    () =>
      Object.values(selectedFilters).reduce(
        (count, values) => count + (Array.isArray(values) ? values.length : 0),
        0,
      ),
    [selectedFilters],
  );

  const filterOptions = useMemo(
    () => collectSelectionFilterOptions(selectionGroups),
    [selectionGroups],
  );

  const visibleGroups = useMemo(
    () =>
      buildVisibleSelectionGroups({
        groups: selectionGroups,
        searchQuery,
        selectedFilters,
        groupBy,
        groupOrder,
      }),
    [groupBy, groupOrder, searchQuery, selectedFilters, selectionGroups],
  );

  const hasActiveListConstraints = totalFilterCount > 0 || Boolean(searchQuery.trim());

  const displayGroups = useMemo(() => {
    if (visibleGroups.length > 0) return visibleGroups;
    if (hasActiveListConstraints) return [];
    if (groupBy === 'order_category') {
      return [{ id: 'ungrouped', label: 'UNCATEGORIZED', rows: [] }];
    }
    if (!groupBy) {
      return [{ id: 'all', label: 'ALL', rows: [] }];
    }
    return [];
  }, [groupBy, hasActiveListConstraints, visibleGroups]);

  const selectedDrawerData = useMemo(() => {
    if (!drawerState) return null;
    const found = findSelectionCategoryInGroups(selectionGroups, drawerState.rowId);
    if (!found) return null;
    if (drawerState.itemId) {
      const item = found.row.items?.find((entry) => entry.id === drawerState.itemId);
      if (!item) return null;
      return { group: found.group, row: found.row, item, mode: 'item' };
    }
    return { group: found.group, row: found.row, item: null, mode: 'category' };
  }, [drawerState, selectionGroups]);

  const selectedVendor =
    selectedDrawerData?.mode === 'item' ? selectedDrawerData.item : selectedDrawerData?.row;

  const persistCategoryField = useCallback(
    async (groupId, rowId, fieldName, value) => {
      const found = findSelectionCategoryInGroups(selectionGroups, rowId);
      const row = found?.row;
      if (!row) return;
      if (isSelectionFieldUnchanged(row, fieldName, value)) return;

      const patch = patchSelectionCategoryRow(row, fieldName, value);
      setSelectionGroups((prev) => patchSelectionGroups(prev, groupId, rowId, patch));

      try {
        const result = await dispatch(
          updateProjectSelectionCategory(
            buildSelectionCategoryUpdateFormData(projectId, rowId, fieldName, value),
          ),
        ).unwrap();
        if (result?.data) {
          const adapted = adaptApiCategoryRow(result.data);
          const targetGroupId = resolveSelectionGroupId(adapted.order_category) || groupId;
          setSelectionGroups((prev) => replaceCategoryInGroups(prev, targetGroupId, adapted));
        }
        refreshOpenProjectSelectionActivities(
          dispatch,
          selectionId,
          drawerState ? selectionId : null,
        );
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update selection category' });
        dispatch(fetchProjectSelection({ projectId }));
      }
    },
    [dispatch, drawerState, projectId, selectionId, selectionGroups],
  );

  const persistItemField = useCallback(
    async (groupId, rowId, itemId, fieldName, value) => {
      const found = findSelectionItemInGroups(selectionGroups, rowId, itemId);
      const item = found?.item;
      const row = found?.row;
      if (!item) return;
      if (isSelectionFieldUnchanged(item, fieldName, value)) return;

      if (fieldName !== 'custom_image') {
        const patch = patchSelectionItemRow(item, fieldName, value);
        setSelectionGroups((prev) =>
          patchSelectionItemInGroups(prev, groupId, rowId, itemId, patch),
        );
      }

      try {
        const result = await dispatch(
          updateProjectSelectionItem(
            buildSelectionItemUpdateFormData(projectId, rowId, itemId, fieldName, value),
          ),
        ).unwrap();
        if (result?.data) {
          const apiItem = adaptApiItemRow(result.data, row);
          setSelectionGroups((prev) =>
            patchSelectionItemInGroups(prev, groupId, rowId, itemId, apiItem),
          );
        }
        refreshOpenProjectSelectionActivities(
          dispatch,
          selectionId,
          drawerState ? selectionId : null,
        );
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update selection item' });
        dispatch(fetchProjectSelection({ projectId }));
      }
    },
    [dispatch, drawerState, projectId, selectionId, selectionGroups],
  );

  const updateRow = (groupId, rowId, patch) => {
    return Promise.all(
      Object.entries(patch).map(([fieldName, value]) =>
        persistCategoryField(groupId, rowId, fieldName, value),
      ),
    );
  };

  const updateItem = (groupId, rowId, itemId, patch) => {
    return Promise.all(
      Object.entries(patch).map(([fieldName, value]) =>
        persistItemField(groupId, rowId, itemId, fieldName, value),
      ),
    );
  };

  const submitNewCategory = useCallback(
    async (groupId, payload) => {
      const name = String(payload?.name ?? '').trim();
      if (!name) return;

      const result = await dispatch(
        addProjectSelectionCategory(
          buildAddProjectSelectionCategoryFormData(projectId, groupId, payload),
        ),
      ).unwrap();
      showSuccessToast('Selection category added');
      if (result?.data) {
        const adapted = adaptApiCategoryRow(result.data);
        const targetGroupId =
          groupId !== 'ungrouped' && groupId !== 'all'
            ? groupId
            : adapted.order_category || 'ungrouped';
        setSelectionGroups((prev) => appendCategoryToGroups(prev, targetGroupId, adapted));
        setExpandedRows((prev) => new Set([...prev, adapted.id]));
      }
    },
    [dispatch, projectId],
  );

  const saveCategoryDetail = useCallback(
    async (detail) => {
      const result = await dispatch(
        updateProjectSelectionCategory(
          buildProjectSelectionCategoryDetailFormData(projectId, detail),
        ),
      ).unwrap();
      if (result?.data) {
        const adapted = adaptApiCategoryRow(result.data);
        const groupId = resolveSelectionGroupId(adapted.order_category);
        setSelectionGroups((prev) => replaceCategoryInGroups(prev, groupId, adapted));
      }
    },
    [dispatch, projectId],
  );

  const handleAddColumn = useCallback(
    async (rowId, { label, columnType }) => {
      try {
        const result = await dispatch(
          addProjectSelectionCustomColumn(
            buildAddProjectSelectionCustomColumnFormData(projectId, rowId, {
              label,
              columnType,
            }),
          ),
        ).unwrap();
        if (result?.data) {
          const adapted = adaptApiCategoryRow(result.data);
          const groupId = resolveSelectionGroupId(adapted.order_category);
          setSelectionGroups((prev) => replaceCategoryInGroups(prev, groupId, adapted));
        }
        showSuccessToast('Custom column added');
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [dispatch, projectId],
  );

  const handleRemoveColumn = useCallback(
    async (rowId, columnLabel) => {
      try {
        const result = await dispatch(
          removeProjectSelectionCustomColumn(
            buildRemoveProjectSelectionCustomColumnFormData(projectId, rowId, columnLabel),
          ),
        ).unwrap();
        if (result?.data) {
          const adapted = adaptApiCategoryRow(result.data);
          const groupId = resolveSelectionGroupId(adapted.order_category);
          setSelectionGroups((prev) => replaceCategoryInGroups(prev, groupId, adapted));
        }
        showSuccessToast('Custom column removed');
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [dispatch, projectId],
  );

  const loadItemOptions = useCallback(
    async (_rowId, productCategory = '', keyword = '') => {
      try {
        const data = await dispatch(
          fetchItemsForProductCategory({
            product_category: productCategory || '',
            keyword,
            limit_page_length: 200,
          }),
        ).unwrap();
        return data?.results ?? [];
      } catch {
        return [];
      }
    },
    [dispatch],
  );

  const handleItemSelect = useCallback(
    async (groupId, categoryId, itemIndex, itemCode, selected) => {
      const found = findSelectionCategoryInGroups(selectionGroups, categoryId);
      const row = found?.row;
      if (!row) return;

      try {
        const result = await dispatch(
          addProjectSelectionItem(
            buildAddProjectSelectionItemFormData(projectId, categoryId, itemCode, selected),
          ),
        ).unwrap();
        if (!result?.data) return;
        const apiItem = adaptApiItemRow(result.data, row);
        setSelectionGroups((prev) =>
          prev.map((entry) => ({
            ...entry,
            rows: (entry.rows ?? []).map((categoryRow) => {
              if (categoryRow.id !== categoryId) return categoryRow;
              const items = [...(categoryRow.items ?? [])];
              if (items[itemIndex]) {
                items[itemIndex] = apiItem;
              } else {
                items.push(apiItem);
              }
              return { ...categoryRow, items };
            }),
          })),
        );
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [dispatch, projectId, selectionGroups],
  );

  const handleItemRemove = useCallback(
    async (groupId, categoryId, itemId) => {
      const found = findSelectionCategoryInGroups(selectionGroups, categoryId);
      const row = found?.row;
      if (!row) return;

      const nextItems = (row.items ?? []).filter((item) => item.id !== itemId);
      setSelectionGroups((prev) =>
        prev.map((entry) => ({
          ...entry,
          rows: (entry.rows ?? []).map((categoryRow) =>
            categoryRow.id === categoryId ? { ...categoryRow, items: nextItems } : categoryRow,
          ),
        })),
      );

      try {
        const detail = rowToSelectionCategoryDetail({ ...row, items: nextItems });
        await saveCategoryDetail(detail);
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
        dispatch(fetchProjectSelection({ projectId }));
      }
    },
    [dispatch, projectId, saveCategoryDetail, selectionGroups],
  );

  const toggleExpand = (_groupId, rowId) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const openCategory = (groupId, rowId) => {
    setDrawerState({ groupId, rowId, itemId: null });
  };

  const openItem = (groupId, rowId, itemId) => {
    setDrawerState({ groupId, rowId, itemId });
  };

  const handleUploadAttachments = useCallback(
    createProjectTaskAttachmentUploadHandler({
      dispatch,
      setIsUploading: setIsUploadingAttachments,
      onAfterUpload: async () => {
        const result = await dispatch(fetchProjectSelection({ projectId })).unwrap();
        setSelectionGroups(adaptProjectSelectionResponse(result));
      },
    }),
    [dispatch, projectId],
  );

  const activeSectionOptions = filterOptions[activeFilterSection] ?? [];

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
    setSelectedFilters(EMPTY_SELECTION_FILTERS);
  };

  const allowAddCategory = groupBy === 'order_category';
  const showGroupHeader = Boolean(groupBy);

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
                section='selection'
                referenceDoctype='Project'
                referenceName={projectId}
                activityLabel='selection tab'
              />
            ) : null}
            <GroupByToolbarControl
              options={PROJECT_DETAIL_SELECTION_GROUP_BY_OPTIONS}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
              groupOrder={groupOrder}
              onGroupOrderChange={setGroupOrder}
              size='xsmall'
            />

            <ProjectQuickFilterToolbar
              selectedFilters={selectedFilters}
              setSelectedFilters={setSelectedFilters}
              completedStatus={PROJECT_DETAIL_COMPLETED_QUICK_FILTER_STATUS.selection}
              entityLabel='selections'
            />

            <Popover.Root>
              <Filter.TriggerButton
                filterCount={totalFilterCount}
                tooltipContent='Filters'
                ariaLabel='Filter project selections'
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
                  <Filter.Sidebar width='140px' className='p-2'>
                    {PROJECT_DETAIL_SELECTION_FILTER_SECTIONS.map((section) => (
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
                  <Filter.Content width='380px' className='p-2'>
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
                      {activeSectionOptions.length === 0 ? (
                        <p className='p-2 text-paragraph-sm text-text-sub-500'>No options</p>
                      ) : null}
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
                  aria-label='Manage selection columns'
                >
                  <Button.Icon as={RiLayoutColumnLine} />
                </Button.Root>
              }
            />
          </div>
        </div>

        {isLoading && !hasLoadedOnce.current ? (
          <div className='flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-paragraph-sm text-text-sub-500'>
            Loading selection...
          </div>
        ) : null}

        {(!isLoading || hasLoadedOnce.current) && displayGroups.length === 0 ? (
          <div className='flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-paragraph-sm text-text-sub-500'>
            No results found.
          </div>
        ) : null}

        {(!isLoading || hasLoadedOnce.current) &&
          displayGroups.map((group) => (
            <div key={group.id} className='flex min-w-0 w-full flex-col gap-2'>
              {showGroupHeader ? (
                <div className='flex items-center gap-1'>
                  <Badge.Root
                    variant='light'
                    color={group.id === 'on-site-vendor' ? 'orange' : 'blue'}
                    size='small'
                    className='uppercase'
                  >
                    {group.label}
                  </Badge.Root>
                  {groupOrder === 'asc' ? (
                    <RiArrowUpLine className='size-4 text-text-soft-400' />
                  ) : (
                    <RiArrowDownLine className='size-4 text-text-soft-400' />
                  )}
                </div>
              ) : null}
              <ProjectDetailSelectionTable
                group={group}
                projectId={projectId}
                columnConfig={columnConfig.columns}
                expandedRows={expandedRows}
                onToggleExpand={toggleExpand}
                onUpdateRow={updateRow}
                onOpenVendor={openCategory}
                onOpenItem={openItem}
                onUpdateItem={updateItem}
                onSubmitNewCategory={submitNewCategory}
                onSaveCategoryDetail={saveCategoryDetail}
                onAddColumn={handleAddColumn}
                onRemoveColumn={handleRemoveColumn}
                onItemSelect={handleItemSelect}
                onItemRemove={handleItemRemove}
                loadItemOptions={loadItemOptions}
                allowAddCategory={allowAddCategory}
              />
            </div>
          ))}
      </div>

      <ProjectSelectionViewDrawer
        open={Boolean(drawerState)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDrawerState(null);
        }}
        vendor={selectedVendor}
        viewMode={drawerState?.itemId ? 'item' : 'category'}
        categoryRow={selectedDrawerData?.row ?? null}
        projectId={projectId}
        selectionId={selectionId}
        commentsData={selectionCommentsData}
        commentsLoading={selectionCommentsLoading}
        commentsFetchStatus={selectionCommentsStatus}
        onAddComment={handleAddSelectionComment}
        onRefreshComments={handleRefreshSelectionComments}
        onUpdateVendor={(patch) => {
          if (!selectedDrawerData) return Promise.resolve();
          if (selectedDrawerData.mode === 'item' && selectedDrawerData.item) {
            return updateItem(
              selectedDrawerData.group.id,
              selectedDrawerData.row.id,
              selectedDrawerData.item.id,
              patch,
            );
          }
          return updateRow(selectedDrawerData.group.id, selectedDrawerData.row.id, patch);
        }}
        onAddColumn={handleAddColumn}
        onUploadAttachments={handleUploadAttachments}
        isUploadingAttachments={isUploadingAttachments}
      />
    </>
  );
}
