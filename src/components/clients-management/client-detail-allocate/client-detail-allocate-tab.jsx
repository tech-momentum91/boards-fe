import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  RiAddLine,
  RiBox3Line,
  RiLayoutMasonryLine,
  RiLayoutGridLine,
  RiLayoutRowLine,
  RiListCheck,
  RiArrowRightSLine,
} from 'react-icons/ri';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import {
  fetchAllocatedSpacesThunk,
  selectAllocatedSpaces,
  selectAllocateSpaceModal,
  openAllocateSpaceModal,
  closeAllocateSpaceModal,
  selectClientDetail,
} from '@/redux/clientDetailSlice';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import AllocateSpaceModal from '@/components/clients-management/client-detail-allocate/allocate-space-modal';
import AllocatedSpaceList from '@/components/clients-management/client-detail-allocate/allocated-space-list';
import ClientDetailAllocateTable from '@/components/clients-management/client-detail-allocate/client-detail-allocate-table';
import ClientDetailAllocateLayoutPage from '@/components/clients-management/client-detail-allocate/client-detail-allocate-layout-page';
import { CLIENT_ALLOCATE_LAYOUT_QUERY_PARAM } from '@/constants/layout/client-floor-constants';
import {
  ALLOCATE_FILTER_TABS,
  ALLOCATE_FILTER_TAB_CONFIG,
  ALLOCATE_FILTER_OPTION,
  SPACE_TYPE_OPTIONS,
  ALLOCATE_SPACE_STATUS_OPTIONS,
  ALLOCATE_SEATS_OPTIONS,
  ALLOCATE_LEASE_DURATION_OPTIONS,
  ALLOCATE_TOTAL_RATE_OPTIONS,
  CLIENT_DETAIL_ALLOCATE_FILTERS_KEY,
} from '@/components/clients-management/constants';
import { canAccessClientCoworkerLayout } from '@/utils/user-role-utils';

const ClientDetailAllocateTab = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const canAccessClientLayout = useMemo(
    () => canAccessClientCoworkerLayout(userSideBarPerm),
    [userSideBarPerm],
  );
  const clientDetail = useSelector(selectClientDetail);
  const client = clientDetail.data;
  const clientName = client?.name || client?.customer_name || id;
  const clientDisplayName = client?.custom_display_name || client?.customer_name || clientName;

  const showLayoutView = searchParams.get(CLIENT_ALLOCATE_LAYOUT_QUERY_PARAM) === '1';

  useEffect(() => {
    if (!showLayoutView || canAccessClientLayout) return;
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete(CLIENT_ALLOCATE_LAYOUT_QUERY_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [canAccessClientLayout, setSearchParams, showLayoutView]);

  const openLayoutView = useCallback(() => {
    if (!canAccessClientLayout) return;
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set('tab', 'allocate');
        next.set(CLIENT_ALLOCATE_LAYOUT_QUERY_PARAM, '1');
        return next;
      },
      { replace: true },
    );
  }, [canAccessClientLayout, setSearchParams]);

  const closeLayoutView = useCallback(() => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete(CLIENT_ALLOCATE_LAYOUT_QUERY_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);
  const allocatedSpaces = useSelector(selectAllocatedSpaces);
  const allocateSpaceModal = useSelector(selectAllocateSpaceModal);
  const [viewMode, setViewMode] = useState('accordion');

  // Filter state
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(ALLOCATE_FILTER_TABS.RESOURCE_TYPE);
  const [filterCount, setFilterCount] = useState(0);
  const [filterSearch, setFilterSearch] = useState('');
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const storageKey = `${CLIENT_DETAIL_ALLOCATE_FILTERS_KEY}-${clientName || id || 'unknown'}`;
  const [appliedFilters, setAppliedFilters] = usePersistedFilters({
    storageKey,
    defaultFilters: ALLOCATE_FILTER_OPTION,
  });
  const [stagedFilters, setStagedFilters] = useState(ALLOCATE_FILTER_OPTION);

  useEffect(() => {
    setFiltersInitialized(false);
  }, [storageKey]);

  useEffect(() => {
    if (filtersInitialized) return;
    const merged = {
      ...ALLOCATE_FILTER_OPTION,
      ...appliedFilters,
    };
    setAppliedFilters(merged);
    setStagedFilters(merged);
    const count =
      (merged.resource_type?.length || 0) +
      (merged.status?.length || 0) +
      (merged.seats?.length || 0) +
      (merged.lease_duration?.length || 0) +
      (merged.total_rate?.length || 0);
    setFilterCount(count);
    setFiltersInitialized(true);
  }, [appliedFilters, filtersInitialized, setAppliedFilters]);

  // Fetch allocated spaces — re-runs whenever applied filters change
  const fetchSpaces = useCallback(
    (filters) => {
      if (clientName) {
        dispatch(fetchAllocatedSpacesThunk({ customer: clientName, filters }));
      }
    },
    [clientName, dispatch],
  );

  // Fetch spaces whenever client or applied filters change
  useEffect(() => {
    if (!filtersInitialized) return;
    fetchSpaces(appliedFilters);
  }, [fetchSpaces, appliedFilters, filtersInitialized]);

  const handleAllocateSuccess = () => {
    fetchSpaces(appliedFilters);
  };

  // Current tab's filter options (with optional search)
  const currentFilterOptions = useMemo(() => {
    let options = [];
    if (activeTab === ALLOCATE_FILTER_TABS.RESOURCE_TYPE) {
      options = SPACE_TYPE_OPTIONS;
    } else if (activeTab === ALLOCATE_FILTER_TABS.STATUS) {
      options = ALLOCATE_SPACE_STATUS_OPTIONS;
    } else if (activeTab === ALLOCATE_FILTER_TABS.SEATS) {
      options = ALLOCATE_SEATS_OPTIONS;
    } else if (activeTab === ALLOCATE_FILTER_TABS.LEASE_DURATION) {
      options = ALLOCATE_LEASE_DURATION_OPTIONS;
    } else if (activeTab === ALLOCATE_FILTER_TABS.TOTAL_RATE) {
      options = ALLOCATE_TOTAL_RATE_OPTIONS;
    }
    if (filterSearch.trim()) {
      const needle = filterSearch.toLowerCase();
      options = options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(needle) || opt.value.toLowerCase().includes(needle),
      );
    }
    return options;
  }, [activeTab, filterSearch]);

  const handleOpenChange = (open) => {
    if (!open) {
      // Closing: apply staged filters and re-fetch from backend
      const newFilters = { ...stagedFilters };
      setAppliedFilters(newFilters);
      const count =
        (newFilters.resource_type?.length || 0) +
        (newFilters.status?.length || 0) +
        (newFilters.seats?.length || 0) +
        (newFilters.lease_duration?.length || 0) +
        (newFilters.total_rate?.length || 0);
      setFilterCount(count);
    } else {
      // Opening: sync staged with applied
      setStagedFilters(appliedFilters);
    }
    setIsFilterDropdownOpen(open);
  };

  const handleToggleFilter = (value) => {
    setStagedFilters((prev) => {
      const current = prev[activeTab] || [];
      const isSelected = current.includes(value);
      return {
        ...prev,
        [activeTab]: isSelected ? current.filter((item) => item !== value) : [...current, value],
      };
    });
  };

  const handleClearFilters = () => {
    const cleared = { ...ALLOCATE_FILTER_OPTION };
    setStagedFilters(cleared);
    setAppliedFilters(cleared);
    setFilterCount(0);
    setFilterSearch('');
  };

  if (showLayoutView && canAccessClientLayout) {
    return (
      <ClientDetailAllocateLayoutPage
        clientDisplayName={clientDisplayName}
        customerId={clientName}
        onBack={closeLayoutView}
      />
    );
  }

  if (allocatedSpaces.isLoading) {
    return (
      <div className='flex flex-1 overflow-hidden'>
        <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0'>
          <div className='flex items-center justify-center h-full'>
            <div className='w-8 h-8 border-4 border-primary-base border-t-transparent rounded-full animate-spin' />
          </div>
        </div>
      </div>
    );
  }

  if (allocatedSpaces.error) {
    return (
      <div className='flex flex-1 overflow-hidden'>
        <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0 px-6 py-12'>
          <div className='flex flex-col items-center justify-center'>
            <p className='text-paragraph-sm text-error-base mb-2'>Error loading allocated spaces</p>
            <p className='text-paragraph-xs text-text-sub-500'>{allocatedSpaces.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-1 overflow-hidden'>
      <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0 px-6 py-5'>
        {/* Header */}
        <div className='flex items-center justify-between mb-5'>
          {/* Left side title */}
          <div className='flex items-center gap-2'>
            <RiBox3Line className='text-text-sub-500 text-xl' />
            <h2 className='label-medium  text-text-sub-500'>Allocated Space</h2>
          </div>

          {/* Right side actions */}
          <div className='flex items-center gap-3'>
            {/* Filter Dropdown */}
            <Popover.Root open={isFilterDropdownOpen} onOpenChange={handleOpenChange}>
              <Filter.TriggerButton
                filterCount={filterCount}
                onClear={(e) => {
                  e.stopPropagation();
                  handleClearFilters();
                  setIsFilterDropdownOpen(false);
                }}
                tooltipContent='Filter'
                ariaLabel='Filter allocated spaces'
              />
              <Filter.Root>
                <Filter.Header title='FILTERS' onClear={handleClearFilters} />
                <Filter.Body>
                  <Filter.Sidebar width='160px'>
                    <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
                      <TabMenuVertical.List className='p-2 border-r-0'>
                        {ALLOCATE_FILTER_TAB_CONFIG.map((tab) => {
                          const count = stagedFilters[tab.value]?.length || 0;
                          return (
                            <TabMenuVertical.Trigger
                              key={tab.value}
                              value={tab.value}
                              className='w-full flex items-center justify-between'
                            >
                              {tab.label}
                              {count > 0 ? (
                                <Badge.Root
                                  size='medium'
                                  variant='filled'
                                  className='shrink-0 rounded-full bg-black text-white'
                                >
                                  {count}
                                </Badge.Root>
                              ) : (
                                <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                              )}
                            </TabMenuVertical.Trigger>
                          );
                        })}
                      </TabMenuVertical.List>
                    </TabMenuVertical.Root>
                  </Filter.Sidebar>
                  <Filter.Content width='240px'>
                    <Filter.List
                      options={currentFilterOptions}
                      selectedValues={stagedFilters[activeTab] || []}
                      onToggle={handleToggleFilter}
                      searchValue={filterSearch}
                      onSearchChange={setFilterSearch}
                      emptyMessage={`No ${activeTab.replace('_', ' ')} found`}
                    />
                  </Filter.Content>
                </Filter.Body>
              </Filter.Root>
            </Popover.Root>

            {/* View toggle */}
            <div className='bg-bg-white-0 rounded-lg outline outline-1 outline-stroke-soft-200/80 inline-flex overflow-hidden'>
              <button
                onClick={() => setViewMode('accordion')}
                className={`p-1.5 flex justify-center items-center transition-colors ${
                  viewMode === 'accordion' ? 'bg-bg-weak-100' : 'bg-bg-white-0'
                }`}
              >
                <RiLayoutRowLine
                  className={`w-5 h-5 ${
                    viewMode === 'accordion' ? 'text-gray-900' : 'text-gray-500'
                  }`}
                />
              </button>

              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 flex justify-center items-center transition-colors border-l border-stroke-soft-200/80 ${
                  viewMode === 'table' ? 'bg-bg-weak-100' : 'bg-bg-white-0'
                }`}
              >
                <RiListCheck
                  className={`w-5 h-5 ${viewMode === 'table' ? 'text-gray-900' : 'text-gray-500'}`}
                />
              </button>

              {canAccessClientLayout ? (
                <Button.Root variant='neutral' mode='ghost' onClick={openLayoutView}>
                  <RiLayoutMasonryLine className='h-5 w-5' />
                </Button.Root>
              ) : null}
            </div>

            {/* Allocate Space Button */}
            <Button.Root
              size='small'
              variant='primary'
              onClick={() => dispatch(openAllocateSpaceModal())}
            >
              <Button.Icon as={RiAddLine} className='mr-1' />
              Allocate Space
            </Button.Root>
          </div>
        </div>

        {/* Spaces List — data comes directly from the API (already filtered server-side) */}
        {viewMode === 'accordion' ? (
          <AllocatedSpaceList spaces={allocatedSpaces.data} variant='compact' />
        ) : (
          <ClientDetailAllocateTable data={allocatedSpaces.data} variant='compact' />
        )}

        {/* Allocate Space Modal */}
        <AllocateSpaceModal
          open={allocateSpaceModal.isOpen}
          onOpenChange={(open) => {
            if (!open) {
              dispatch(closeAllocateSpaceModal());
            }
          }}
          clientId={clientName}
          onSuccess={handleAllocateSuccess}
        />
      </div>
    </div>
  );
};

export default ClientDetailAllocateTab;
