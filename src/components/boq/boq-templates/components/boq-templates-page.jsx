import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createBoqTemplate,
  createBoqTemplateType,
  deleteBoqTemplate,
  duplicateBoqTemplate,
  fetchBoqTemplateFilterOptions,
  fetchBoqTemplateList,
  updateBoqTemplate,
} from '@/api/boqTemplates';
import {
  BOQ_TAB_IDS,
  BOQ_TEMPLATE_LIST_SEARCH_DEBOUNCE_MS,
  DEFAULT_BOQ_TEMPLATE_FILTERS,
} from '@/components/boq/constants';
import {
  buildBoqTemplateApiFilters,
  buildBoqTemplateFilterOptionsByTab,
  buildBoqTemplateOrderParams,
  cloneBoqTemplateFilters,
  EMPTY_BOQ_SORTING,
  normalizeBoqTemplateRow,
  resolveBoqEmptyContext,
} from '@/components/boq/boq-helper';
import BoqTemplatesTable, {
  useBoqTemplatesColumnConfig,
} from '@/components/boq/boq-templates/components/boq-templates-table';
import BoqTemplatesToolbar from '@/components/boq/boq-templates/components/boq-templates-toolbar';
import BoqTemplateViewDrawer from '@/components/boq/boq-templates/components/boq-template-view-drawer';
import CreateBoqTemplateModal from '@/components/boq/boq-templates/components/create-boq-template-modal';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const BOQ_TEMPLATE_LIST_PAGE_SIZE = 20;

const BoqTemplatesPage = ({ isActive = false }) => {
  const columnConfigHook = useBoqTemplatesColumnConfig();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [appliedFilters, setAppliedFilters] = useState(() =>
    cloneBoqTemplateFilters(DEFAULT_BOQ_TEMPLATE_FILTERS),
  );
  const [sorting, setSorting] = useState(EMPTY_BOQ_SORTING);
  const [filterOptions, setFilterOptions] = useState({});
  const [editingTemplateNameRowId, setEditingTemplateNameRowId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const selectedTemplateDirtyRef = useRef(false);
  const fetchRequestIdRef = useRef(0);

  const apiFilters = useMemo(() => buildBoqTemplateApiFilters(appliedFilters), [appliedFilters]);

  const filterOptionsByTab = useMemo(
    () => buildBoqTemplateFilterOptionsByTab(filterOptions),
    [filterOptions],
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, BOQ_TEMPLATE_LIST_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchValue]);

  useEffect(() => {
    if (!isActive) return undefined;

    let cancelled = false;
    fetchBoqTemplateFilterOptions()
      .then((options) => {
        if (!cancelled) setFilterOptions(options);
      })
      .catch((error) => {
        if (!cancelled) {
          showErrorToast(error, { defaultMessage: 'Failed to load BOQ template filters.' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isActive]);

  const loadTemplates = useCallback(
    async ({ page: nextPage = 1, append = false } = {}) => {
      const requestId = fetchRequestIdRef.current + 1;
      fetchRequestIdRef.current = requestId;
      setIsLoading(true);
      setLoadError(null);

      try {
        const { orderBy, orderDir } = buildBoqTemplateOrderParams(sorting);
        const {
          rows: apiRows,
          page: responsePage,
          hasMore: responseHasMore,
        } = await fetchBoqTemplateList({
          keyword: debouncedSearch,
          filters: apiFilters,
          page: nextPage,
          pageSize: BOQ_TEMPLATE_LIST_PAGE_SIZE,
          orderBy,
          orderDir,
        });

        if (fetchRequestIdRef.current !== requestId) return;

        const normalizedRows = apiRows.map(normalizeBoqTemplateRow);
        setRows((previous) => (append ? [...previous, ...normalizedRows] : normalizedRows));
        setPage(responsePage);
        setHasMore(responseHasMore);
      } catch (error) {
        if (fetchRequestIdRef.current !== requestId) return;
        const message = error?.message || 'Failed to load BOQ templates.';
        setLoadError(message);
        if (!append) {
          setRows([]);
          setPage(1);
          setHasMore(false);
        }
        showErrorToast(error, { defaultMessage: 'Failed to load BOQ templates.' });
      } finally {
        if (fetchRequestIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    },
    [apiFilters, debouncedSearch, sorting],
  );

  useEffect(() => {
    if (!isActive) return;
    loadTemplates({ page: 1, append: false });
  }, [isActive, loadTemplates]);

  const isInitialLoading = isLoading && rows.length === 0;
  const isLoadingMore = isLoading && rows.length > 0;

  const handleLoadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    loadTemplates({ page: page + 1, append: true });
  }, [hasMore, isLoading, loadTemplates, page]);

  const handleRetry = useCallback(() => {
    loadTemplates({ page: 1, append: false });
  }, [loadTemplates]);

  const emptyContext = useMemo(
    () => resolveBoqEmptyContext({ keyword: debouncedSearch, filters: appliedFilters }),
    [debouncedSearch, appliedFilters],
  );

  const handleNewTemplate = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const handleCreateTemplate = useCallback(
    async (form) => {
      setIsCreating(true);
      try {
        const created = await createBoqTemplate({
          templateName: form.templateName,
          templateType: form.templateType,
          templateCategory: form.templateCategory,
          sqftArea: form.sqftArea,
          status: form.status,
          description: form.description,
          tags: form.tags,
        });
        setIsCreateModalOpen(false);
        showSuccessToast('Template created successfully.');
        const normalized = normalizeBoqTemplateRow(created);
        if (normalized?.code || normalized?.id) {
          selectedTemplateDirtyRef.current = false;
          setSelectedTemplate(normalized);
        }
        await loadTemplates({ page: 1, append: false });
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to create BOQ template.' });
      } finally {
        setIsCreating(false);
      }
    },
    [loadTemplates],
  );

  const handleTemplateNameEditStart = useCallback((rowId) => {
    setEditingTemplateNameRowId(rowId);
  }, []);

  const handleTemplateNameSave = useCallback(
    async (rowId, nextName, options = {}) => {
      setEditingTemplateNameRowId(null);
      if (options.cancel) return;

      const trimmed = nextName?.trim();
      if (!trimmed) return;

      const targetRow = rows.find((row) => row.id === rowId);
      if (!targetRow?.code) return;

      const previousName = targetRow.templateName;
      if (trimmed === previousName) return;

      setRows((previous) =>
        previous.map((row) => (row.id === rowId ? { ...row, templateName: trimmed } : row)),
      );
      setSelectedTemplate((previous) =>
        previous?.id === rowId ? { ...previous, templateName: trimmed } : previous,
      );

      try {
        await updateBoqTemplate(targetRow.code, { templateName: trimmed });
        showSuccessToast('Template renamed successfully.');
      } catch (error) {
        setRows((previous) =>
          previous.map((row) => (row.id === rowId ? { ...row, templateName: previousName } : row)),
        );
        setSelectedTemplate((previous) =>
          previous?.id === rowId ? { ...previous, templateName: previousName } : previous,
        );
        showErrorToast(error, { defaultMessage: 'Failed to rename BOQ template.' });
      }
    },
    [rows],
  );

  const handleCreateTemplateType = useCallback(async (typeName) => {
    const created = await createBoqTemplateType(typeName);
    setFilterOptions((previous) => {
      const existing = Array.isArray(previous.type) ? previous.type : [];
      const nextType = created?.value
        ? [...existing.filter((option) => option.value !== created.value), created]
        : existing;
      return { ...previous, type: nextType };
    });
    return created;
  }, []);

  const handleDuplicateTemplate = useCallback(
    async (row) => {
      if (!row?.code) return;

      try {
        await duplicateBoqTemplate(row.code);
        showSuccessToast('Template duplicated successfully.');
        await loadTemplates({ page: 1, append: false });
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to duplicate BOQ template.' });
      }
    },
    [loadTemplates],
  );

  const handleDeleteRequest = useCallback((row) => {
    setDeleteTarget(row);
  }, []);

  const handleRowClick = useCallback((row) => {
    selectedTemplateDirtyRef.current = false;
    setSelectedTemplate(row);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget?.code) return;

    setIsDeleting(true);
    try {
      await deleteBoqTemplate(deleteTarget.code);
      if (
        selectedTemplate?.code === deleteTarget.code ||
        selectedTemplate?.id === deleteTarget.id
      ) {
        setSelectedTemplate(null);
      }
      setDeleteTarget(null);
      showSuccessToast('Template deleted successfully.');
      await loadTemplates({ page: 1, append: false });
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to delete BOQ template.' });
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, loadTemplates, selectedTemplate]);

  const handleFiltersChange = useCallback((nextFilters) => {
    setAppliedFilters(cloneBoqTemplateFilters(nextFilters));
  }, []);

  if (!isActive) return null;

  return (
    <TabMenuHorizontal.Content value={BOQ_TAB_IDS.BOQ_TEMPLATES} className='outline-none'>
      <div className='flex w-full flex-col gap-5 px-8 pb-10 pt-6'>
        <BoqTemplatesToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          appliedFilters={appliedFilters}
          onFiltersChange={handleFiltersChange}
          filterOptionsByTab={filterOptionsByTab}
          columnConfig={columnConfigHook}
          onNewTemplate={handleNewTemplate}
        />

        <BoqTemplatesTable
          rows={rows}
          sorting={sorting}
          onSortingChange={setSorting}
          columnConfig={columnConfigHook.columns}
          editingTemplateNameRowId={editingTemplateNameRowId}
          onTemplateNameEditStart={handleTemplateNameEditStart}
          onTemplateNameSave={handleTemplateNameSave}
          onDuplicateTemplate={handleDuplicateTemplate}
          onDeleteTemplate={handleDeleteRequest}
          onRowClick={handleRowClick}
          context={emptyContext}
          loadError={loadError}
          onRetry={handleRetry}
          isLoading={isInitialLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          enableScrollPagination
        />

        <CreateBoqTemplateModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onSubmit={handleCreateTemplate}
          isSubmitting={isCreating}
          typeOptions={filterOptionsByTab.type}
          categoryOptions={filterOptionsByTab.category}
          statusOptions={filterOptionsByTab.status}
          tagOptions={filterOptionsByTab.tags}
          onCreateType={handleCreateTemplateType}
        />

        <DeleteConfirmModal
          isOpen={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title='Delete Template?'
          description={
            deleteTarget
              ? `Are you sure you want to delete "${deleteTarget.templateName}"? This action cannot be undone.`
              : 'Are you sure you want to delete this template? This action cannot be undone.'
          }
          item={deleteTarget}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
          confirmLabel='Delete'
          loadingLabel='Deleting...'
        />

        <BoqTemplateViewDrawer
          open={Boolean(selectedTemplate)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedTemplate(null);
              if (selectedTemplateDirtyRef.current) {
                selectedTemplateDirtyRef.current = false;
                void loadTemplates({ page: 1, append: false });
              }
            }
          }}
          templateRow={selectedTemplate}
          onMutated={() => {
            selectedTemplateDirtyRef.current = true;
          }}
        />
      </div>
    </TabMenuHorizontal.Content>
  );
};

export default BoqTemplatesPage;
