import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  createProjectBoq,
  fetchProjectBoqClientOptions,
  fetchProjectBoqFilterOptions,
  fetchProjectBoqList,
  fetchProjectBoqProjectOptions,
  fetchProjectBoqTemplateOptions,
} from '@/api/projectBoqs';
import {
  BOQ_TAB_IDS,
  DEFAULT_PROJECT_BOQ_FILTERS,
  PROJECT_BOQ_TYPES,
} from '@/components/boq/constants';
import {
  applyProjectBoqClientFilters,
  buildProjectBoqApiFilters,
  buildProjectBoqCreatePayload,
  buildProjectBoqFilterOptionsByTab,
  buildProjectBoqOrderParams,
  cloneProjectBoqFilters,
  EMPTY_BOQ_SORTING,
  normalizeProjectBoqRow,
  resolveProjectBoqEmptyContext,
  sortProjectBoqRows,
} from '@/components/boq/boq-helper';
import CreateProjectBoqModal from '@/components/boq/project-boqs/components/create-project-boq-modal';
import ProjectBoqsTable, {
  useProjectBoqsColumnConfig,
} from '@/components/boq/project-boqs/components/project-boqs-table';
import ProjectBoqsToolbar from '@/components/boq/project-boqs/components/project-boqs-toolbar';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const SEARCH_DEBOUNCE_MS = 400;
const PROJECT_BOQ_LIST_PAGE_SIZE = 20;

const ProjectBoqsPage = ({ isActive = false }) => {
  const navigate = useNavigate();
  const columnConfigHook = useProjectBoqsColumnConfig();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [appliedFilters, setAppliedFilters] = useState(() =>
    cloneProjectBoqFilters(DEFAULT_PROJECT_BOQ_FILTERS),
  );
  const [sorting, setSorting] = useState(EMPTY_BOQ_SORTING);
  const [filterOptions, setFilterOptions] = useState({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createBoqType, setCreateBoqType] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingBoqNameRowId, setEditingBoqNameRowId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clientOptions, setClientOptions] = useState([]);
  const [projectOptions, setProjectOptions] = useState([]);
  const [templateOptions, setTemplateOptions] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const fetchRequestIdRef = useRef(0);

  const apiFilters = useMemo(() => buildProjectBoqApiFilters(appliedFilters), [appliedFilters]);

  const filterOptionsByTab = useMemo(
    () => buildProjectBoqFilterOptionsByTab(filterOptions),
    [filterOptions],
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchValue]);

  useEffect(() => {
    if (!isActive) return undefined;

    let cancelled = false;
    fetchProjectBoqFilterOptions()
      .then((options) => {
        if (!cancelled) setFilterOptions(options);
      })
      .catch((error) => {
        if (!cancelled) {
          showErrorToast(error, { defaultMessage: 'Failed to load Project BOQ filters.' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isActive]);

  const loadProjectBoqs = useCallback(
    async ({ page: nextPage = 1, append = false } = {}) => {
      const requestId = fetchRequestIdRef.current + 1;
      fetchRequestIdRef.current = requestId;
      setIsLoading(true);

      try {
        const { orderBy, orderDir } = buildProjectBoqOrderParams(sorting);
        const {
          rows: apiRows,
          page: responsePage,
          hasMore: responseHasMore,
        } = await fetchProjectBoqList({
          keyword: debouncedSearch,
          filters: apiFilters,
          page: nextPage,
          pageSize: PROJECT_BOQ_LIST_PAGE_SIZE,
          orderBy,
          orderDir,
        });

        if (fetchRequestIdRef.current !== requestId) return;

        const normalized = apiRows.map(normalizeProjectBoqRow);
        setRows((previous) => (append ? [...previous, ...normalized] : normalized));
        setPage(responsePage);
        setHasMore(responseHasMore);
      } catch (error) {
        if (fetchRequestIdRef.current !== requestId) return;
        if (!append) {
          setRows([]);
          setPage(1);
          setHasMore(false);
        }
        showErrorToast(error, { defaultMessage: 'Failed to load Project BOQs.' });
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
    loadProjectBoqs({ page: 1, append: false });
  }, [isActive, loadProjectBoqs]);

  const isInitialLoading = isLoading && rows.length === 0;
  const isLoadingMore = isLoading && rows.length > 0;

  const handleLoadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    loadProjectBoqs({ page: page + 1, append: true });
  }, [hasMore, isLoading, loadProjectBoqs, page]);

  useEffect(() => {
    if (!isActive || !isCreateModalOpen) return undefined;

    let cancelled = false;

    Promise.all([fetchProjectBoqClientOptions(), fetchProjectBoqTemplateOptions()])
      .then(([clients, templates]) => {
        if (cancelled) return;
        setClientOptions(clients);
        setTemplateOptions(templates);
      })
      .catch((error) => {
        if (!cancelled) {
          showErrorToast(error, { defaultMessage: 'Failed to load create form options.' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isActive, isCreateModalOpen]);

  useEffect(() => {
    if (!selectedClientId) {
      setProjectOptions([]);
      return undefined;
    }

    let cancelled = false;
    fetchProjectBoqProjectOptions({ clientId: selectedClientId })
      .then((projects) => {
        if (!cancelled) setProjectOptions(projects);
      })
      .catch((error) => {
        if (!cancelled) {
          setProjectOptions([]);
          showErrorToast(error, { defaultMessage: 'Failed to load projects for client.' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedClientId]);

  const displayedRows = useMemo(() => {
    const filterApplied = applyProjectBoqClientFilters(rows, appliedFilters);
    return sortProjectBoqRows(filterApplied, sorting).map(normalizeProjectBoqRow);
  }, [appliedFilters, rows, sorting]);

  const emptyContext = useMemo(
    () => resolveProjectBoqEmptyContext({ keyword: debouncedSearch, filters: appliedFilters }),
    [debouncedSearch, appliedFilters],
  );

  const handleNewBoqType = useCallback((typeId) => {
    if (typeId === PROJECT_BOQ_TYPES.ADDITIONAL) {
      showErrorToast(null, {
        defaultMessage: 'Additional BOQs can only be created inside an existing BOQ family.',
      });
      return;
    }
    setCreateBoqType(typeId);
    setSelectedClientId('');
    setProjectOptions([]);
    setIsCreateModalOpen(true);
  }, []);

  const handleCreateBoq = useCallback(
    async (form) => {
      setIsCreating(true);
      try {
        const result = await createProjectBoq(buildProjectBoqCreatePayload(form));

        setIsCreateModalOpen(false);
        setCreateBoqType('');
        setSelectedClientId('');

        const familyCode = result?.code || result?.familyCode || result?.id;
        if (result?.existing) {
          showSuccessToast('This project already has a BOQ. Opening existing family.');
        } else {
          showSuccessToast('Project BOQ family created successfully.');
        }

        await loadProjectBoqs({ page: 1, append: false });
        if (familyCode) {
          navigate(`/boq/project-boqs/${encodeURIComponent(familyCode)}`);
        }
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to create Project BOQ.' });
      } finally {
        setIsCreating(false);
      }
    },
    [loadProjectBoqs, navigate],
  );

  const handleFiltersChange = useCallback((nextFilters) => {
    setAppliedFilters(cloneProjectBoqFilters(nextFilters));
  }, []);

  const handleRowClick = useCallback(
    (row) => {
      const code = row?.code || row?.id;
      if (!code) return;
      navigate(`/boq/project-boqs/${encodeURIComponent(code)}`);
    },
    [navigate],
  );

  const handleBoqNameEditStart = useCallback((rowId) => {
    setEditingBoqNameRowId(rowId);
  }, []);

  const handleBoqNameSave = useCallback((rowId, nextName, options = {}) => {
    if (!options.cancel && nextName?.trim()) {
      setRows((previous) =>
        previous.map((row) =>
          row.id === rowId ? { ...row, boqName: nextName.trim(), updated: 'Just now' } : row,
        ),
      );
    }
    setEditingBoqNameRowId(null);
  }, []);

  const handleDuplicateBoq = useCallback((row) => {
    if (!row) return;
    showErrorToast(null, { defaultMessage: 'Duplicate Project BOQ is not available yet.' });
  }, []);

  const handleDeleteRequest = useCallback((row) => {
    setDeleteTarget(row);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    try {
      showErrorToast(null, { defaultMessage: 'Delete Project BOQ is not available yet.' });
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget]);

  if (!isActive) return null;

  return (
    <TabMenuHorizontal.Content value={BOQ_TAB_IDS.PROJECT_BOQS} className='outline-none'>
      <div className='flex w-full flex-col gap-5 px-8 pb-10 pt-6'>
        <ProjectBoqsToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          appliedFilters={appliedFilters}
          onFiltersChange={handleFiltersChange}
          filterOptionsByTab={filterOptionsByTab}
          columnConfig={columnConfigHook}
          onNewBoqType={handleNewBoqType}
        />

        <ProjectBoqsTable
          rows={displayedRows}
          sorting={sorting}
          onSortingChange={setSorting}
          columnConfig={columnConfigHook.columns}
          editingBoqNameRowId={editingBoqNameRowId}
          onBoqNameEditStart={handleBoqNameEditStart}
          onBoqNameSave={handleBoqNameSave}
          onDuplicateBoq={handleDuplicateBoq}
          onDeleteBoq={handleDeleteRequest}
          onRowClick={handleRowClick}
          context={emptyContext}
          isLoading={isInitialLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          enableScrollPagination
        />

        <CreateProjectBoqModal
          open={isCreateModalOpen}
          onOpenChange={(open) => {
            setIsCreateModalOpen(open);
            if (!open) {
              setCreateBoqType('');
              setSelectedClientId('');
            }
          }}
          onSubmit={handleCreateBoq}
          isSubmitting={isCreating}
          boqType={createBoqType}
          clientOptions={clientOptions}
          projectOptions={projectOptions}
          onClientChange={setSelectedClientId}
          templateOptions={{
            templateMaster: templateOptions,
          }}
          lockContextFields={false}
        />

        <DeleteConfirmModal
          isOpen={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title='Delete BOQ?'
          description={
            deleteTarget
              ? `Are you sure you want to delete "${deleteTarget.boqName}"? This action cannot be undone.`
              : 'Are you sure you want to delete this BOQ? This action cannot be undone.'
          }
          item={deleteTarget}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
          confirmLabel='Delete'
          loadingLabel='Deleting...'
        />
      </div>
    </TabMenuHorizontal.Content>
  );
};

export default ProjectBoqsPage;
