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
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ProjectFollowersPopover } from '@/components/document-subscribe';
import ProjectDetailDocumentTable from '@/components/projects/documents/project-detail-document-table';
import ProjectDocumentCreateDrawer from '@/components/projects/documents/project-document-create-drawer';
import ProjectDocumentViewDrawer from '@/components/projects/documents/project-document-view-drawer';
import { createProjectTaskAttachmentUploadHandler } from '@/components/projects/shared/project-attachment-upload-utils';
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
  PROJECT_DETAIL_DOCUMENT_COLUMNS,
  PROJECT_DETAIL_FILTER_OPTIONS,
  PROJECT_DETAIL_GROUP_BY_OPTIONS,
} from '@/components/projects/constants';
import {
  fetchProjectDocumentsListview,
  fetchProjectColumnConfig,
  saveProjectColumnConfig,
  selectProjectDocumentsListview,
  selectProjectDocumentsListviewLoading,
  fetchProjectTaskDetail,
  selectProjectTaskDetail,
  selectProjectTaskDetailLoading,
  updateProjectTask,
  patchProjectTaskDetailField,
} from '@/redux/projectSlice';
import { fetchProjectDocumentCategoryList } from '@/redux/projectMasterSlice';
import {
  buildProjectDocumentsGroupByParam,
  buildProjectDocumentsListviewFilters,
  buildProjectDocumentUpdateFormData,
  documentGroupBadgeColor,
  getProjectDocumentRowFieldValue,
  mapProjectDocumentsListviewToGroups,
  patchProjectDocumentRow,
  projectDocumentFieldValuesEqual,
  mapProjectDocumentDetailToRow,
} from '@/components/projects/documents/project-document-helpers';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';
import {
  TaskStatusScopeProvider,
  useTaskStatusScope,
} from '@/components/projects/shared/task-status-scope-context';

const DOCUMENT_FILTER_SECTIONS = [
  { id: 'category', label: 'Category' },
  { id: 'status', label: 'Status' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'priority', label: 'Priority' },
];

function DocumentGroupTable({
  group,
  rows,
  onFieldUpdate,
  onOpenDocument,
  columnConfig,
  projectId,
  showGroupHeader = true,
  categoryOptions = [],
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
            color={documentGroupBadgeColor(group)}
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
            <ProjectDetailDocumentTable
              rows={rows}
              columnConfig={columnConfig}
              onFieldUpdate={onFieldUpdate}
              onRowClick={onOpenDocument}
              categoryOptions={categoryOptions}
              projectId={projectId}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProjectDocumentsSectionContent({ projectId }) {
  const { completedStatus, statusOptions } = useTaskStatusScope();
  const { id: paramId } = useParams();
  const activeProjectId = projectId || paramId;
  const dispatch = useDispatch();

  const isListLoading = useSelector(selectProjectDocumentsListviewLoading);
  const rawListviewData = useSelector(selectProjectDocumentsListview);
  const taskDetailData = useSelector(selectProjectTaskDetail);
  const isDetailLoading = useSelector(selectProjectTaskDetailLoading);
  const categoryListResponse = useSelector(
    (state) => state.projectMaster.documentCategories?.list?.data,
  );

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [activeFilterSection, setActiveFilterSection] = useState('category');
  const [selectedFilters, setSelectedFilters] = useState({
    category: [],
    status: [],
    assignee: [],
    priority: [],
  });

  const [selectedRowId, setSelectedRowId] = useState(null);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const columnConfig = useColumnConfig(
    PROJECT_COLUMN_TABLE_IDS.DOCUMENT,
    PROJECT_DETAIL_DOCUMENT_COLUMNS,
    (columns) =>
      dispatch(
        saveProjectColumnConfig({ tableId: PROJECT_COLUMN_TABLE_IDS.DOCUMENT, columns }),
      ).unwrap(),
    () =>
      dispatch(fetchProjectColumnConfig({ tableId: PROJECT_COLUMN_TABLE_IDS.DOCUMENT })).unwrap(),
    { autoSave: true, debounce: 200 },
  );

  const totalFilterCount = useMemo(
    () =>
      Object.values(selectedFilters).reduce(
        (count, values) => count + (Array.isArray(values) ? values.length : 0),
        0,
      ),
    [selectedFilters],
  );

  const categoryOptions = useMemo(() => {
    const results = categoryListResponse?.results ?? [];
    return results.map((item) => ({
      value: item.name,
      label: item.category ?? item.name,
    }));
  }, [categoryListResponse]);

  const filterOptions = useMemo(() => {
    return {
      category: categoryOptions,
      ...PROJECT_DETAIL_FILTER_OPTIONS,
      status: toStatusFilterOptions(statusOptions),
    };
  }, [categoryOptions, statusOptions]);

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
    setSelectedFilters({
      category: [],
      status: [],
      assignee: [],
      priority: [],
    });
  };

  useEffect(() => {
    dispatch(fetchProjectDocumentCategoryList({ limit_page_length: 100 })).catch((error) => {
      showErrorToast(extractErrorMessage(error, 'Failed to load document categories'));
    });
  }, [dispatch]);

  const loadDocuments = useCallback(async () => {
    if (!activeProjectId) return;
    try {
      const filters = buildProjectDocumentsListviewFilters(selectedFilters);
      const group_by = buildProjectDocumentsGroupByParam(groupBy, groupOrder);
      await dispatch(
        fetchProjectDocumentsListview({
          project: activeProjectId,
          keyword: debouncedSearchQuery,
          group_by,
          filters,
        }),
      ).unwrap();
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  }, [dispatch, activeProjectId, debouncedSearchQuery, groupBy, groupOrder, selectedFilters]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (!selectedRowId) return;
    dispatch(fetchProjectTaskDetail(selectedRowId)).catch((error) => {
      showErrorToast(extractErrorMessage(error));
    });
  }, [dispatch, selectedRowId]);

  const documentGroups = useMemo(() => {
    return mapProjectDocumentsListviewToGroups(rawListviewData);
  }, [rawListviewData]);

  const flatDocumentRows = useMemo(() => {
    return documentGroups.flatMap((group) => group.rows);
  }, [documentGroups]);

  const fallbackRow = useMemo(() => {
    if (!selectedRowId) return null;
    return flatDocumentRows.find((row) => row.id === selectedRowId) || null;
  }, [selectedRowId, flatDocumentRows]);

  const selectedRow = useMemo(() => {
    if (!selectedRowId) return null;
    if (taskDetailData && taskDetailData.name === selectedRowId) {
      return mapProjectDocumentDetailToRow(taskDetailData, fallbackRow);
    }
    return fallbackRow;
  }, [selectedRowId, taskDetailData, fallbackRow]);

  const handleFieldUpdate = useCallback(
    async (taskId, fieldName, value) => {
      if (fieldName === '_refresh') {
        loadDocuments();
        if (selectedRowId === taskId) {
          dispatch(fetchProjectTaskDetail(taskId));
        }
        return;
      }

      const doc = flatDocumentRows.find((row) => row.id === taskId);
      if (!taskId || !doc) return;

      const originalValue = getProjectDocumentRowFieldValue(doc, fieldName);
      if (projectDocumentFieldValuesEqual(fieldName, originalValue, value)) return;

      try {
        const formData = buildProjectDocumentUpdateFormData(taskId, fieldName, value);
        await dispatch(updateProjectTask(formData)).unwrap();
        showSuccessToast('Document updated successfully');

        if (fieldName === 'description') {
          if (selectedRowId === taskId) {
            dispatch(patchProjectTaskDetailField({ fieldName, value }));
          }
        } else {
          loadDocuments();
          if (selectedRowId === taskId) {
            dispatch(fetchProjectTaskDetail(taskId));
          }
        }
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [dispatch, flatDocumentRows, loadDocuments, selectedRowId],
  );

  const handleUploadAttachments = useCallback(
    createProjectTaskAttachmentUploadHandler({
      dispatch,
      setIsUploading: setIsUploadingAttachments,
      onAfterUpload: async ({ taskId }) => {
        await loadDocuments();
        if (selectedRowId === taskId) {
          await dispatch(fetchProjectTaskDetail(taskId)).unwrap();
        }
      },
    }),
    [dispatch, loadDocuments, selectedRowId],
  );

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
            {activeProjectId ? (
              <ProjectFollowersPopover
                projectId={activeProjectId}
                scopeMode='project'
                section='documents'
                referenceDoctype='Project'
                referenceName={activeProjectId}
                activityLabel='documents tab'
              />
            ) : null}
            <GroupByToolbarControl
              options={PROJECT_DETAIL_GROUP_BY_OPTIONS}
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
              entityLabel='documents'
            />
            <Popover.Root>
              <Filter.TriggerButton
                filterCount={totalFilterCount}
                tooltipContent='Filters'
                ariaLabel='Filter documents'
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
                    {DOCUMENT_FILTER_SECTIONS.map((section) => (
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
                  aria-label='Manage document columns'
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
              Add Document
            </Button.Root>
          </div>
        </div>

        <div className='flex flex-col gap-5 pb-4'>
          {isListLoading ? (
            <div className='flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-paragraph-sm text-text-sub-500'>
              Loading documents…
            </div>
          ) : documentGroups.length > 0 ? (
            documentGroups.map((group) => (
              <DocumentGroupTable
                key={group.id}
                group={group.id}
                rows={group.rows}
                columnConfig={columnConfig.columns}
                onFieldUpdate={handleFieldUpdate}
                onOpenDocument={setSelectedRowId}
                showGroupHeader={Boolean(groupBy)}
                categoryOptions={categoryOptions}
                projectId={projectId}
                isCollapsed={Boolean(collapsedGroups[group.id])}
                onToggleCollapse={() => toggleGroupCollapse(group.id)}
              />
            ))
          ) : (
            <div className='flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
              <p className='text-label-md text-text-strong-950'>No documents found</p>
              <p className='mt-1 text-paragraph-sm text-text-sub-500'>
                Adjust filters or add a new document.
              </p>
            </div>
          )}
        </div>
      </div>

      <ProjectDocumentCreateDrawer
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        projectId={activeProjectId}
        onCreated={loadDocuments}
        categoryOptions={categoryOptions}
      />

      <ProjectDocumentViewDrawer
        open={Boolean(selectedRow)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedRowId(null);
        }}
        document={selectedRow}
        onFieldUpdate={handleFieldUpdate}
        onUploadAttachments={handleUploadAttachments}
        isUploadingAttachments={isUploadingAttachments}
        categoryOptions={categoryOptions}
        projectId={activeProjectId}
      />
    </>
  );
}

export default function ProjectDocumentsSection(props) {
  return (
    <TaskStatusScopeProvider tabKey='document'>
      <ProjectDocumentsSectionContent {...props} />
    </TaskStatusScopeProvider>
  );
}
