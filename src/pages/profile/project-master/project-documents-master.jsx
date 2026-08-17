import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiAddLine, RiArrowRightSLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import * as Button from '@/components/ui/button';
import GroupByToolbarControl from '@/components/ui/group-by-toolbar-control';
import * as Input from '@/components/ui/input';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import { useColumnConfig } from '@/hooks/use-column-config';
import { useDebounce } from '@/hooks/use-debounce';
import {
  clearProjectDocumentMasterDetail,
  deleteProjectTaskMaster,
  fetchProjectDocumentCategoryList,
  fetchProjectDocumentMasterDetail,
  fetchProjectDocumentMasterList,
  updateProjectDocumentMasterField,
} from '@/redux/projectMasterSlice';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import {
  buildProjectDocumentUpdatePayload,
  buildTaskMasterListFilters,
  documentFieldValuesEqual,
  getDocumentRowFieldValue,
  groupTaskMasterRows,
  mapDocumentCategoryResultsToOptions,
  TASK_MASTER_FILTER_ALL,
} from '@/pages/profile/project-master/project-master-helpers';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import ProjectDocumentCategoryTab from '@/pages/profile/project-master/project-document-category-tab';
import ProjectDocumentCreateDrawer from '@/pages/profile/project-master/project-document-create-drawer';
import ProjectDocumentTable from '@/pages/profile/project-master/project-document-table';
import ProjectDocumentViewDrawer from '@/pages/profile/project-master/project-document-view-drawer';
import ProjectMasterFilterPopover, {
  ProjectMasterGroupValueFilter,
} from '@/pages/profile/project-master/project-master-list-filters';
import ProjectMasterGroupTable from '@/pages/profile/project-master/project-master-group-table';
import ProjectMasterStatusConfigTab from '@/pages/profile/project-master/project-master-status-config-tab';
import { PROJECT_MASTER_STATUS_FIELD_KEYS } from '@/pages/profile/project-master/project-master-status-config';
import {
  PROJECT_DOCUMENT_COLUMNS,
  PROJECT_DOCUMENT_MASTER_FILTER_SECTIONS,
  PROJECT_DOCUMENT_MASTER_GROUP_BY_OPTIONS,
  PROJECT_DOCUMENT_TABS,
  getStoredProjectDocumentColumnConfig,
  saveStoredProjectDocumentColumnConfig,
} from '@/pages/profile/project-master/project-master.constants';
import { useProjectMasterList } from '@/pages/profile/project-master/use-project-master-list';

export default function ProjectDocumentsMaster({ onDocumentsClick }) {
  const dispatch = useDispatch();
  const { list, detail } = useSelector((state) => state.projectMaster.documents);
  const categoryListResponse = useSelector(
    (state) => state.projectMaster.documentCategories.list.data,
  );
  const isDeleting = useSelector((state) => state.projectMaster.delete.isLoading);
  const { data: documentList, isLoading: isListLoading } = list;
  const { isLoading: isDetailLoading } = detail;
  const listDocuments = documentList?.results ?? [];
  const openDocument = detail.data;

  const [activeTab, setActiveTab] = useState('Documents');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState('category');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [groupValueFilter, setGroupValueFilter] = useState(TASK_MASTER_FILTER_ALL);
  const [activeFilterSection, setActiveFilterSection] = useState('status');
  const [selectedFilters, setSelectedFilters] = useState({ status: [], priority: [] });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const columnConfig = useColumnConfig(
    'project-document-master',
    PROJECT_DOCUMENT_COLUMNS,
    saveStoredProjectDocumentColumnConfig,
    getStoredProjectDocumentColumnConfig,
    { autoSave: true, debounce: 200 },
  );

  const categoryOptions = useMemo(
    () => mapDocumentCategoryResultsToOptions(categoryListResponse?.results ?? []),
    [categoryListResponse],
  );

  useEffect(() => {
    dispatch(fetchProjectDocumentCategoryList({ limit_page_length: 100 })).catch((error) => {
      showErrorToast(extractErrorMessage(error, 'Failed to load document categories'));
    });
  }, [dispatch]);

  const getListFilters = useCallback(
    () => ({
      keyword: debouncedSearchTerm,
      filters: buildTaskMasterListFilters({
        groupBy,
        groupValueFilter,
        selectedFilters,
      }),
    }),
    [debouncedSearchTerm, groupBy, groupValueFilter, selectedFilters],
  );

  const { loadList, paginationProps } = useProjectMasterList({
    dispatch,
    fetchListThunk: fetchProjectDocumentMasterList,
    getFilters: getListFilters,
    isActive: activeTab === 'Documents',
    reloadDeps: [debouncedSearchTerm, groupBy, groupValueFilter, selectedFilters, groupOrder],
  });

  const documentGroups = useMemo(
    () => groupTaskMasterRows(listDocuments, groupBy, groupOrder),
    [groupBy, groupOrder, listDocuments],
  );

  useEffect(() => {
    setGroupValueFilter(TASK_MASTER_FILTER_ALL);
  }, [groupBy]);

  const loadDocumentDetail = useCallback(
    async (documentId) => {
      await dispatch(fetchProjectDocumentMasterDetail(documentId)).unwrap();
    },
    [dispatch],
  );

  const handleOpenDocument = useCallback(
    async (document) => {
      const documentId = document?.name ?? document?.id;
      if (!documentId) return;

      setIsViewDrawerOpen(true);
      try {
        await loadDocumentDetail(documentId);
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
        setIsViewDrawerOpen(false);
        dispatch(clearProjectDocumentMasterDetail());
      }
    },
    [dispatch, loadDocumentDetail],
  );

  const handleFieldUpdate = useCallback(
    async (documentId, fieldName, value) => {
      const document = listDocuments.find((row) => row.name === documentId);
      if (!documentId || !document) return;

      const originalValue = getDocumentRowFieldValue(document, fieldName);
      if (documentFieldValuesEqual(fieldName, originalValue, value)) return;

      try {
        await dispatch(
          updateProjectDocumentMasterField(
            buildProjectDocumentUpdatePayload(documentId, fieldName, value),
          ),
        ).unwrap();
        await loadList();
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [dispatch, listDocuments, loadList],
  );

  const handleRefreshDocument = useCallback(async () => {
    const documentId = openDocument?.name;
    if (!documentId) return;

    try {
      await loadDocumentDetail(documentId);
      await loadList();
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  }, [loadDocumentDetail, loadList, openDocument?.name]);

  const handleDocumentChange = useCallback(
    async (documentId) => {
      if (!documentId) return;
      try {
        await loadDocumentDetail(documentId);
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [loadDocumentDetail],
  );

  const handleCloseDrawer = useCallback(() => {
    setIsViewDrawerOpen(false);
    dispatch(clearProjectDocumentMasterDetail());
  }, [dispatch]);

  const handleDocumentCreated = useCallback(() => {
    setActiveTab('Documents');
    loadList();
  }, [loadList]);

  const handleRequestDeleteDocument = useCallback((document) => {
    const id = document?.name ?? document?.id;
    if (!id) return;

    setPendingDelete({
      id,
      label: document.task_name || id,
    });
  }, []);

  const handleConfirmDeleteDocument = useCallback(async () => {
    const documentId = pendingDelete?.id;
    if (!documentId) return;

    try {
      await dispatch(deleteProjectTaskMaster(documentId)).unwrap();
      showSuccessToast('Document deleted successfully');
      if (openDocument?.name === documentId) {
        handleCloseDrawer();
      }
      setPendingDelete(null);
      await loadList();
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  }, [dispatch, handleCloseDrawer, loadList, openDocument?.name, pendingDelete?.id]);

  return (
    <div className='flex w-full flex-col'>
      <div className='flex items-center gap-2 border-b border-stroke-soft-200 pb-2'>
        <div onClick={onDocumentsClick} className='text-label-sm text-text-sub-500'>
          Projects Master
        </div>
        <RiArrowRightSLine className='size-4 text-text-sub-500' />
        <div>Documentation</div>
      </div>

      <section className='flex flex-col gap-5'>
        <TabMenuHorizontal.Root value={activeTab} onValueChange={setActiveTab}>
          <TabMenuHorizontal.List
            wrapperClassName='border-b border-stroke-soft-200'
            className='border-none'
          >
            {PROJECT_DOCUMENT_TABS.map((tab) => (
              <TabMenuHorizontal.Trigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabMenuHorizontal.Trigger>
            ))}
          </TabMenuHorizontal.List>
        </TabMenuHorizontal.Root>

        {activeTab === 'Documents' ? (
          <>
            <div className='flex flex-col gap-3'>
              <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
                <Input.Root size='xsmall' className='w-full sm:w-[276px]'>
                  <Input.Wrapper>
                    <Input.Icon as={RiSearchLine} />
                    <Input.Input
                      placeholder='Search here...'
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </Input.Wrapper>
                </Input.Root>

                <div className='flex flex-wrap items-center justify-end gap-3'>
                  <GroupByToolbarControl
                    options={PROJECT_DOCUMENT_MASTER_GROUP_BY_OPTIONS}
                    groupBy={groupBy}
                    onGroupByChange={setGroupBy}
                    groupOrder={groupOrder}
                    onGroupOrderChange={setGroupOrder}
                    size='xsmall'
                  />
                  <ProjectMasterGroupValueFilter
                    groupBy={groupBy}
                    value={groupValueFilter}
                    onChange={setGroupValueFilter}
                  />
                  <ProjectMasterFilterPopover
                    filterSections={PROJECT_DOCUMENT_MASTER_FILTER_SECTIONS}
                    selectedFilters={selectedFilters}
                    onSelectedFiltersChange={setSelectedFilters}
                    activeSection={activeFilterSection}
                    onActiveSectionChange={setActiveFilterSection}
                    ariaLabel='Filter project documents'
                  />
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
                        aria-label='Manage columns'
                      >
                        <Button.Icon as={RiLayoutColumnLine} />
                      </Button.Root>
                    }
                  />
                  <Button.Root
                    size='xsmall'
                    className='gap-2 px-4'
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <Button.Icon as={RiAddLine} />
                    Add Document
                  </Button.Root>
                </div>
              </div>
            </div>

            <PaginatedTableLayout grouped {...paginationProps}>
              {isListLoading ? (
                <div className='flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-paragraph-sm text-text-sub-500'>
                  Loading documents…
                </div>
              ) : documentGroups.some((group) => group.rows.length > 0) ? (
                documentGroups.map((group) =>
                  group.rows.length > 0 ? (
                    <ProjectMasterGroupTable
                      key={group.id}
                      group={group.id}
                      groupBy={groupBy}
                      showGroupHeader={Boolean(groupBy)}
                    >
                      <ProjectDocumentTable
                        documents={group.rows}
                        onFieldUpdate={handleFieldUpdate}
                        onOpenDocument={handleOpenDocument}
                        onDelete={handleRequestDeleteDocument}
                        columnConfig={columnConfig.columns}
                        categoryOptions={categoryOptions}
                      />
                    </ProjectMasterGroupTable>
                  ) : null,
                )
              ) : (
                <div className='flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
                  <p className='text-label-md text-text-strong-950'>No documents found</p>
                  <p className='mt-1 text-paragraph-sm text-text-sub-500'>
                    Create a document or adjust the search filter.
                  </p>
                </div>
              )}
            </PaginatedTableLayout>
          </>
        ) : activeTab === 'Status' ? (
          <ProjectMasterStatusConfigTab
            fieldKey={PROJECT_MASTER_STATUS_FIELD_KEYS.documents}
            configKey='documents'
          />
        ) : (
          <ProjectDocumentCategoryTab />
        )}

        <ProjectDocumentCreateDrawer
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onCreated={handleDocumentCreated}
          categoryOptions={categoryOptions}
        />

        <ProjectDocumentViewDrawer
          isOpen={isViewDrawerOpen}
          onClose={handleCloseDrawer}
          document={openDocument}
          onRefresh={handleRefreshDocument}
          documents={listDocuments}
          onDocumentChange={handleDocumentChange}
          isLoading={isDetailLoading}
          categoryOptions={categoryOptions}
        />

        <DeleteConfirmModal
          isOpen={Boolean(pendingDelete)}
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null);
          }}
          title='Delete document?'
          description={
            pendingDelete?.label
              ? `Are you sure you want to delete "${pendingDelete.label}"? This action cannot be undone.`
              : 'Are you sure you want to delete this document? This action cannot be undone.'
          }
          item={pendingDelete}
          onConfirm={handleConfirmDeleteDocument}
          isLoading={isDeleting}
        />
      </section>
    </div>
  );
}
