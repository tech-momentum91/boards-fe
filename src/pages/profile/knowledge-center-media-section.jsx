import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RiAddLine, RiArrowRightSLine, RiSearchLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import EmptyIllustration from '@/components/ui/empty-illustration';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { deleteKnowledgeCenterMedia } from '@/api/knowledgeCenterMedia';
import RemoveFloorLayoutModal from '@/components/centers-management/remove-floor-layout-modal';
import KnowledgeCenterAddMediaDrawer from '@/pages/profile/knowledge-center-add-media-drawer';
import KnowledgeCenterMediaCard from '@/pages/profile/knowledge-center-media-card';
import KnowledgeCenterMediaCategorySidebar from '@/pages/profile/knowledge-center-media-category-sidebar';
import KnowledgeCenterMediaGridSkeleton from '@/pages/profile/knowledge-center-media-grid-skeleton';
import {
  getAddMediaDefaultType,
  mediaCategoryLabelByValue,
} from '@/pages/profile/knowledge-center-media-constants';
import { KNOWLEDGE_CENTER_ROOT } from '@/pages/profile/knowledge-center-paths';
import {
  clearKnowledgeCenterMediaListError,
  fetchKnowledgeCenterMediaCategoryCounts,
  fetchKnowledgeCenterMediaList,
  selectKnowledgeCenterMediaCategoryCounts,
  selectKnowledgeCenterMediaList,
} from '@/redux/knowledgeCenterMediaSlice';
import { fetchCentersForClient, fetchTicketDropdownData } from '@/redux/ticketManagementSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const LIST_SEARCH_DEBOUNCE_MS = 350;
const ALL_CENTERS = '__all_centers__';
const ALL_CLIENTS = '__all_clients__';

export default function KnowledgeCenterMediaSection() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    data: listRows,
    status: listStatus,
    error: listError,
  } = useSelector(selectKnowledgeCenterMediaList);
  const categoryCounts = useSelector(selectKnowledgeCenterMediaCategoryCounts);

  const ticketDropdown = useSelector((state) => state.ticketManagement.dropdownData);
  const centersState = useSelector((state) => state.ticketManagement.centers);

  const [activeCategory, setActiveCategory] = useState('all');
  const [centerFilter, setCenterFilter] = useState(ALL_CENTERS);
  const [clientFilter, setClientFilter] = useState(ALL_CLIENTS);
  const [searchValue, setSearchValue] = useState('');
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [deletingMediaId, setDeletingMediaId] = useState(null);
  const [layoutToRemove, setLayoutToRemove] = useState(null);
  const [isRemoveLayoutModalOpen, setIsRemoveLayoutModalOpen] = useState(false);
  const [isRemovingLayout, setIsRemovingLayout] = useState(false);

  const skipSearchDebounceOnce = useRef(true);

  const handleCategoryChange = useCallback((nextCategory) => {
    setActiveCategory(nextCategory);
    setSearchValue('');
    skipSearchDebounceOnce.current = true;
  }, []);

  useEffect(() => {
    dispatch(fetchTicketDropdownData());
    dispatch(fetchCentersForClient(null));
  }, [dispatch]);

  /** Center/client filters — shared by list and sidebar counts. */
  const scopeFilters = useMemo(() => {
    const filters = [];
    if (centerFilter && centerFilter !== ALL_CENTERS) {
      filters.push(['center', '=', centerFilter]);
    }
    if (clientFilter && clientFilter !== ALL_CLIENTS) {
      filters.push(['client', '=', clientFilter]);
    }
    return filters;
  }, [centerFilter, clientFilter]);

  /** List filters include active sidebar tab (media_type) and scope filters. */
  const listFilters = useMemo(() => {
    const filters = [...scopeFilters];
    if (activeCategory !== 'all') {
      filters.push(['media_type', '=', activeCategory]);
    }
    return filters;
  }, [scopeFilters, activeCategory]);

  const refetchCategoryCounts = useCallback(() => {
    dispatch(
      fetchKnowledgeCenterMediaCategoryCounts({
        filters: scopeFilters,
      }),
    );
  }, [dispatch, scopeFilters]);

  const refetchList = useCallback(() => {
    dispatch(
      fetchKnowledgeCenterMediaList({
        filters: listFilters,
        keyword: searchValue.trim() || undefined,
        limit_start: 0,
        limit_page_length: 200,
        order_by: 'modified desc',
      }),
    );
  }, [dispatch, listFilters, searchValue]);

  useEffect(() => {
    refetchCategoryCounts();
  }, [refetchCategoryCounts]);

  useEffect(() => {
    const keyword = searchValue.trim() || undefined;
    const delay = skipSearchDebounceOnce.current ? 0 : LIST_SEARCH_DEBOUNCE_MS;
    skipSearchDebounceOnce.current = false;

    const requestId = window.setTimeout(() => {
      dispatch(
        fetchKnowledgeCenterMediaList({
          filters: listFilters,
          keyword,
          limit_start: 0,
          limit_page_length: 200,
          order_by: 'modified desc',
        }),
      );
    }, delay);

    return () => window.clearTimeout(requestId);
  }, [dispatch, listFilters, searchValue]);

  const countForCategoryItem = useCallback(
    ({ value }) => {
      if (value === 'all') return categoryCounts.total;
      return categoryCounts.byMediaType[value] ?? 0;
    },
    [categoryCounts.byMediaType, categoryCounts.total],
  );

  const clientOptions = useMemo(() => {
    const raw = ticketDropdown.data?.clients || ticketDropdown.data?.customers || [];
    return Array.isArray(raw) ? raw : [];
  }, [ticketDropdown.data]);

  const centerOptions = useMemo(
    () => (Array.isArray(centersState.data) ? centersState.data : []),
    [centersState.data],
  );

  const centerFilterOptions = useMemo(
    () => [{ value: ALL_CENTERS, label: 'All Centers' }, ...centerOptions],
    [centerOptions],
  );

  const clientFilterOptions = useMemo(
    () => [{ value: ALL_CLIENTS, label: 'All Clients' }, ...clientOptions],
    [clientOptions],
  );

  const handleRetryList = useCallback(() => {
    dispatch(clearKnowledgeCenterMediaListError());
    refetchList();
  }, [dispatch, refetchList]);

  const gotoKnowledgeCenterRoot = useCallback(() => {
    navigate(KNOWLEDGE_CENTER_ROOT);
  }, [navigate]);

  const clearSearch = useCallback(() => {
    setSearchValue('');
  }, []);

  const handleAddSaved = useCallback(() => {
    setAddDrawerOpen(false);
    setEditRecord(null);
    refetchCategoryCounts();
    refetchList();
  }, [refetchCategoryCounts, refetchList]);

  const handleOpenAddDrawer = useCallback(() => {
    setEditRecord(null);
    setAddDrawerOpen(true);
  }, []);

  const handleEditMedia = useCallback((row) => {
    setEditRecord(row);
    setAddDrawerOpen(true);
  }, []);

  const handleDrawerOpenChange = useCallback((open) => {
    setAddDrawerOpen(open);
    if (!open) setEditRecord(null);
  }, []);

  const handleDeleteMedia = useCallback(
    async (row) => {
      if (!row?.name || deletingMediaId || isRemovingLayout) return;

      if (row.media_type === 'Layout') {
        setLayoutToRemove(row);
        setIsRemoveLayoutModalOpen(true);
        return;
      }

      setDeletingMediaId(row.name);
      try {
        await deleteKnowledgeCenterMedia(row.name);
        showSuccessToast('Media deleted.');
        refetchCategoryCounts();
        refetchList();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Could not delete media.' });
      } finally {
        setDeletingMediaId(null);
      }
    },
    [deletingMediaId, isRemovingLayout, refetchCategoryCounts, refetchList],
  );

  const handleConfirmRemoveLayout = useCallback(async () => {
    if (!layoutToRemove?.name || isRemovingLayout) return;

    setIsRemovingLayout(true);
    setDeletingMediaId(layoutToRemove.name);

    try {
      await deleteKnowledgeCenterMedia(layoutToRemove.name);
      showSuccessToast('Media deleted.');
      setIsRemoveLayoutModalOpen(false);
      setLayoutToRemove(null);
      refetchCategoryCounts();
      refetchList();
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Could not delete media.' });
    } finally {
      setIsRemovingLayout(false);
      setDeletingMediaId(null);
    }
  }, [isRemovingLayout, layoutToRemove, refetchCategoryCounts, refetchList]);

  const rows = listRows ?? [];
  const showEmptySuccess = listStatus === 'succeeded' && rows.length === 0 && !listError;
  const trimmedSearch = searchValue.trim();
  const activeCategoryLabel = mediaCategoryLabelByValue[activeCategory] ?? 'Media';
  const hasAnyMedia = categoryCounts.total > 0;

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <nav
        aria-label='Breadcrumb'
        className='flex h-12 shrink-0 items-center gap-1.5 border-b border-stroke-soft-200 px-3'
      >
        <button
          type='button'
          onClick={gotoKnowledgeCenterRoot}
          className='label-small text-text-sub-500 transition-colors hover:text-text-main-900'
        >
          Knowledge Center
        </button>
        <RiArrowRightSLine className='size-5 shrink-0 text-text-soft-400' aria-hidden />
        <p className='label-small text-text-main-900'>Center Media</p>
      </nav>

      <div className='flex min-h-0 flex-1 overflow-hidden'>
        <aside className='flex min-h-0 shrink-0 flex-col'>
          <KnowledgeCenterMediaCategorySidebar
            value={activeCategory}
            onValueChange={handleCategoryChange}
            countForCategoryItem={countForCategoryItem}
          />
        </aside>

        <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pl-5 pt-6'>
          <div className='flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2 pb-4'>
            <div className='w-[240px] shrink-0'>
              <Input.Root size='small' className='w-full'>
                <Input.Wrapper>
                  <Input.Icon as={RiSearchLine} />
                  <Input.Input
                    placeholder='Search here...'
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    aria-label='Search media'
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>

            <div className='ml-auto flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2'>
              <SearchableSelect
                size='small'
                showArrow
                value={centerFilter}
                onValueChange={setCenterFilter}
                options={centerFilterOptions}
                disabled={centersState.status === 'loading'}
                placeholder='All Centers'
                searchPlaceholder='Search centers...'
                emptyMessage={
                  centersState.status === 'loading' ? 'Loading...' : 'No centers available'
                }
                noResultsMessage='No centers found'
                triggerClassName='w-[118px] shrink-0'
              />

              <SearchableSelect
                size='small'
                showArrow
                value={clientFilter}
                onValueChange={setClientFilter}
                options={clientFilterOptions}
                disabled={ticketDropdown.status === 'loading'}
                placeholder='All Clients'
                searchPlaceholder='Search clients...'
                emptyMessage={
                  ticketDropdown.status === 'loading' ? 'Loading...' : 'No clients available'
                }
                noResultsMessage='No clients found'
                triggerClassName='w-[111px] shrink-0'
              />

              <Button.Root
                type='button'
                variant='primary'
                mode='filled'
                size='small'
                className='shrink-0 gap-1'
                onClick={handleOpenAddDrawer}
              >
                <Button.Icon as={RiAddLine} />
                Add
              </Button.Root>
            </div>
          </div>

          <div className='flex min-h-0 flex-1 flex-col overflow-y-auto pr-2'>
            {listStatus === 'loading' ? <KnowledgeCenterMediaGridSkeleton /> : null}

            {listStatus === 'failed' && listError ? (
              <div
                className='flex flex-col gap-2 rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'
                role='alert'
              >
                <p className='paragraph-small text-text-main-900'>{String(listError)}</p>
                <Button.Root
                  type='button'
                  size='small'
                  variant='neutral'
                  mode='stroke'
                  onClick={handleRetryList}
                >
                  Retry
                </Button.Root>
              </div>
            ) : null}

            {showEmptySuccess ? (
              <div
                className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 px-6 py-14 text-center'
                role='status'
                aria-live='polite'
              >
                <EmptyIllustration className='size-[108px] shrink-0' />
                {!hasAnyMedia && !trimmedSearch ? (
                  <>
                    <h3 className='mt-5 label-medium text-text-main-900'>No media yet</h3>
                    <p className='mt-2 max-w-md paragraph-small text-text-sub-500'>
                      Add photos, videos, layouts, and other center assets from one place.
                    </p>
                    <Button.Root
                      type='button'
                      size='small'
                      variant='neutral'
                      mode='stroke'
                      className='mt-6 gap-2'
                      onClick={handleOpenAddDrawer}
                    >
                      <Button.Icon as={RiAddLine} />
                      Add media
                    </Button.Root>
                  </>
                ) : null}
                {hasAnyMedia && trimmedSearch ? (
                  <>
                    <h3 className='mt-5 label-medium text-text-main-900'>No matching media</h3>
                    <p className='mt-2 max-w-md paragraph-small text-text-sub-500'>
                      Nothing matches your search in this category. Try different keywords or clear
                      the search.
                    </p>
                    <div className='mt-6 flex flex-wrap items-center justify-center gap-2'>
                      <Button.Root
                        type='button'
                        size='small'
                        variant='neutral'
                        mode='stroke'
                        onClick={clearSearch}
                      >
                        Clear search
                      </Button.Root>
                      <Button.Root
                        type='button'
                        size='small'
                        className='gap-2'
                        onClick={handleOpenAddDrawer}
                      >
                        <Button.Icon as={RiAddLine} />
                        Add media
                      </Button.Root>
                    </div>
                  </>
                ) : null}
                {hasAnyMedia && !trimmedSearch && activeCategory !== 'all' ? (
                  <>
                    <h3 className='mt-5 label-medium text-text-main-900'>
                      No media in this category
                    </h3>
                    <p className='mt-2 max-w-md paragraph-small text-text-sub-500'>
                      {`There is no media in “${activeCategoryLabel}”. View all categories or pick another type.`}
                    </p>
                    <Button.Root
                      type='button'
                      size='small'
                      variant='neutral'
                      mode='stroke'
                      className='mt-6'
                      onClick={() => handleCategoryChange('all')}
                    >
                      View all categories
                    </Button.Root>
                  </>
                ) : null}
              </div>
            ) : null}

            {listStatus === 'succeeded' && rows.length > 0 ? (
              <div className='grid grid-cols-3 gap-4'>
                {rows.map((row) => (
                  <KnowledgeCenterMediaCard
                    key={row.name}
                    row={row}
                    onEdit={handleEditMedia}
                    onDelete={handleDeleteMedia}
                    isDeleting={deletingMediaId === row.name}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <KnowledgeCenterAddMediaDrawer
        open={addDrawerOpen}
        onOpenChange={handleDrawerOpenChange}
        onSaved={handleAddSaved}
        defaultMediaType={getAddMediaDefaultType(activeCategory)}
        editRecord={editRecord}
      />

      <RemoveFloorLayoutModal
        open={isRemoveLayoutModalOpen}
        onOpenChange={(open) => {
          if (isRemovingLayout) return;
          setIsRemoveLayoutModalOpen(open);
          if (!open) setLayoutToRemove(null);
        }}
        onConfirm={handleConfirmRemoveLayout}
        isRemoving={isRemovingLayout}
      />
    </div>
  );
}
