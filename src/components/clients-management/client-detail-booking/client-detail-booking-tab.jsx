import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useImperativeHandle,
} from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectClientDetail } from '@/redux/clientDetailSlice';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';
import {
  CLIENT_DETAIL_BOOKING_TAB_PERSIST_DEFAULTS,
  CLIENT_DETAIL_BOOKING_TAB_PERSIST_OPTS,
} from '@/components/clients-management/constants';
import {
  RiSearchLine,
  RiCalendarLine,
  RiCloseLine,
  RiAddLine,
  RiLayoutColumnLine,
  RiArrowRightSLine,
} from 'react-icons/ri';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import * as Popover from '@/components/ui/popover';
import * as Select from '@/components/ui/select';
import * as DatepickerPrimivites from '@/components/ui/calendar';
import * as Tooltip from '@/components/ui/tooltip';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import { formatDateRangeLabel } from '@/utils/date-utils';
import { BOOKING_STATUS } from '@/components/bookings/constants';
import { fetchCenters } from '@/redux/bookingSlice';
import { fetchResourceTypes, selectResourceTypesData } from '@/redux/commonSlice';
import ClientDetailBookingTable from './client-detail-booking-table';
import ClientDetailBookingCreateDrawer from './client-detail-booking-create-drawer';

const size = 'xsmall';

const FILTER_TAB_CONFIG = [
  { id: 'center', label: 'Center', filterKey: 'centers' },
  { id: 'resourceType', label: 'Resource Type', filterKey: 'resourceTypes' },
];

const ensureArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const BookingDetailFilterDropdown = React.forwardRef(
  ({ open, onFiltersChange, appliedFilters = {}, setFilterCount }, ref) => {
    const { shared } = useSelector((state) => state.booking);
    const { centers } = shared;
    const resourceTypes = useSelector(selectResourceTypesData) || [];
    // console.log('appliedFilters is', appliedFilters);
    const [activeTab, setActiveTab] = useState('center');
    const [searchText, setSearchText] = useState('');
    const [filters, setFilters] = useState({
      centers: [],
      resourceTypes: [],
    });

    const popoverRef = useRef(null);
    const prevOpenRef = useRef(open);

    useEffect(() => {
      setFilters({
        centers: ensureArray(appliedFilters.centers || appliedFilters.center),
        resourceTypes: ensureArray(appliedFilters.resourceTypes),
      });
    }, [appliedFilters]);

    // console.log('centers is', centers);

    useEffect(() => {
      const count = filters.centers.length + filters.resourceTypes.length;
      setFilterCount?.(count);
    }, [filters.centers.length, filters.resourceTypes.length, setFilterCount]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    const buildFiltersObject = useCallback(
      () => ({
        center: filters?.centers || [],
        resourceTypes: filters.resourceTypes,
      }),
      [filters],
    );

    const handlePopoverClose = useCallback(() => {
      onFiltersChange?.(buildFiltersObject());
    }, [buildFiltersObject, onFiltersChange]);

    useImperativeHandle(ref, () => ({ handleClose: handlePopoverClose }));

    useEffect(() => {
      if (prevOpenRef.current && !open) {
        handlePopoverClose();
      }
      prevOpenRef.current = open;
    }, [open, handlePopoverClose]);

    const currentOptions = useMemo(() => {
      let options = [];
      const needle = searchText.toLowerCase().trim();

      if (activeTab === 'center') {
        if (Array.isArray(centers.data)) {
          options = centers.data.map((item) => ({
            value: item.value || item.name || '',
            label: item.label || item.center_name || item.name || '',
          }));
        }
      } else if (activeTab === 'resourceType') {
        options = (resourceTypes || []).map((item) => ({
          value: item.value || item.name || '',
          label: item.label || item.name || '',
        }));
      }

      options = options.filter((item) => item.label && item.value);
      options.sort((a, b) => a.label.localeCompare(b.label));

      if (needle) {
        return options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(needle) || opt.value.toLowerCase().includes(needle),
        );
      }

      return options;
    }, [activeTab, centers.data, resourceTypes, searchText]);

    const handleToggle = useCallback(
      (value) => {
        const activeConfig = FILTER_TAB_CONFIG.find((t) => t.id === activeTab);
        if (!activeConfig) return;

        setFilters((prev) => {
          const currentList = prev[activeConfig.filterKey] || [];
          const isSelected = currentList.includes(value);
          const newValues = isSelected
            ? currentList.filter((item) => item !== value)
            : [...currentList, value];
          return { ...prev, [activeConfig.filterKey]: newValues };
        });
      },
      [activeTab],
    );

    const handleClear = () => {
      setFilters({ centers: [], resourceTypes: [] });
      setSearchText('');
    };

    if (!open) return null;

    const activeConfig = FILTER_TAB_CONFIG.find((t) => t.id === activeTab);
    const selectedValues = activeConfig ? filters[activeConfig.filterKey] || [] : [];
    const isLoading = activeTab === 'center' && centers.isLoading;

    return (
      <Filter.Root
        ref={popoverRef}
        onInteractOutside={handlePopoverClose}
        onEscapeKeyDown={handlePopoverClose}
      >
        <Filter.Header title='FILTERS' onClear={handleClear} />

        <Filter.Body>
          <Filter.Sidebar width='180px'>
            <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
              <TabMenuVertical.List className='p-2 border-r-0'>
                {FILTER_TAB_CONFIG.map((tab) => {
                  const count = filters[tab.filterKey]?.length || 0;
                  return (
                    <TabMenuVertical.Trigger
                      className='w-full flex items-center justify-between'
                      key={tab.id}
                      value={tab.id}
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

          <Filter.Content width='300px'>
            <Filter.List
              options={currentOptions}
              selectedValues={selectedValues}
              onToggle={handleToggle}
              searchValue={searchText}
              onSearchChange={setSearchText}
              virtualized
              isLoading={isLoading}
              emptyMessage={
                activeConfig ? `No ${activeConfig.label.toLowerCase()}s found` : 'No results found'
              }
            />
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

BookingDetailFilterDropdown.displayName = 'BookingDetailFilterDropdown';

const ClientDetailBookingTab = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const clientDetail = useSelector(selectClientDetail);
  const client = clientDetail?.data;
  const clientId = client?.name || id;
  const clientName = client?.customer_name || client?.name || id;
  const resourceTypesStatus = useSelector((state) => state.common.resourceTypes.status);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [statusFilter, setStatusFilter] = useState('all');
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState({
    center: null,
    resourceTypes: [],
  });

  const tableRef = React.useRef(null);

  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: clientId ? `client-detail-booking-view-filter-dropdown-${clientId}` : null,
    defaultFilters: CLIENT_DETAIL_BOOKING_TAB_PERSIST_DEFAULTS,
    persistIncludeKeys: CLIENT_DETAIL_BOOKING_TAB_PERSIST_OPTS.includeKeys,
    persistTrimStringArrays: CLIENT_DETAIL_BOOKING_TAB_PERSIST_OPTS.trimStringArrayElements,
    persistScalarDiffKeys: CLIENT_DETAIL_BOOKING_TAB_PERSIST_OPTS.scalarDiffKeys,
    persistTruthyObjectKeys: CLIENT_DETAIL_BOOKING_TAB_PERSIST_OPTS.truthyObjectKeys,
    persistObjectSubkeysTruthyKeys: CLIENT_DETAIL_BOOKING_TAB_PERSIST_OPTS.objectSubkeysTruthyKeys,
  });

  // 1. Initialize from persistence
  useEffect(() => {
    if (!clientId || filtersInitialized) return;

    setSearchTerm(persistedFilters.searchTerm || '');
    setStatusFilter(persistedFilters.statusFilter || 'all');
    setAppliedFilters({
      center: persistedFilters.center || null,
      resourceTypes: persistedFilters.resourceTypes || [],
    });
    setDateRange(persistedFilters.dateRange || { from: undefined, to: undefined });
    setFiltersInitialized(true);
  }, [clientId, persistedFilters, filtersInitialized]);

  // 2. Persist to storage
  useEffect(() => {
    if (!clientId || !filtersInitialized) return;

    const merged = {
      searchTerm: debouncedSearchTerm,
      statusFilter,
      center: appliedFilters.center,
      resourceTypes: appliedFilters.resourceTypes,
      dateRange,
    };
    const compact = compactFiltersForSessionStorage(
      merged,
      CLIENT_DETAIL_BOOKING_TAB_PERSIST_DEFAULTS,
      CLIENT_DETAIL_BOOKING_TAB_PERSIST_OPTS,
    );
    const currentPersistedCompact = compactFiltersForSessionStorage(
      persistedFilters,
      CLIENT_DETAIL_BOOKING_TAB_PERSIST_DEFAULTS,
      CLIENT_DETAIL_BOOKING_TAB_PERSIST_OPTS,
    );

    if (JSON.stringify(compact) !== JSON.stringify(currentPersistedCompact)) {
      setPersistedFilters(merged);
    }
  }, [
    clientId,
    debouncedSearchTerm,
    statusFilter,
    appliedFilters,
    dateRange,
    persistedFilters,
    filtersInitialized,
    setPersistedFilters,
  ]);

  useEffect(() => {
    dispatch(fetchCenters());
  }, [dispatch]);

  useEffect(() => {
    if (resourceTypesStatus === 'idle') {
      dispatch(fetchResourceTypes());
    }
  }, [dispatch, resourceTypesStatus]);

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    ...Object.values(BOOKING_STATUS).map((status) => ({
      value: status.label,
      label: status.label,
    })),
  ];

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleDateRangeChange = (range) => {
    if (!range) {
      setDateRange({ from: undefined, to: undefined });
      return;
    }
    setDateRange({
      from: range.from ?? undefined,
      to: range.to ?? undefined,
    });
  };

  const handleClearDateRange = () => {
    setDateRange({ from: undefined, to: undefined });
  };

  const handleNewBooking = () => {
    setIsCreateDrawerOpen(true);
  };

  const handleFiltersChange = useCallback((filtersObject) => {
    setAppliedFilters(filtersObject);
  }, []);

  const handleClearFilters = useCallback(() => {
    setAppliedFilters({ center: null, resourceTypes: [] });
    setFilterCount(0);
  }, []);

  return (
    <>
      <div className='flex flex-1 overflow-hidden'>
        <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0 px-6 py-5'>
          <div className='flex flex-col gap-4'>
            {/* Header & Toolbar */}
            <div className='flex items-center justify-between'>
              {/* Left side: Search Input */}
              <div className='flex items-center gap-4'>
                <Input.Root size={size} className='min-w-[276px]'>
                  <Input.Wrapper>
                    <Input.Icon>
                      <RiSearchLine />
                    </Input.Icon>
                    <Input.Input
                      placeholder='Search by title,center'
                      value={searchTerm}
                      onChange={handleSearchChange}
                      aria-label='Search by title, center'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>

              {/* Right side: Date Filter, Status Filter, Filter, Column Manager, Actions */}
              <div className='flex items-center gap-3'>
                {/* Date Filter */}
                <Popover.Root>
                  <Popover.Trigger asChild>
                    <div className='w-[215px] shrink-0 min-w-0'>
                      <Input.Root size={size}>
                        <Input.Wrapper>
                          <Input.Icon>
                            <RiCalendarLine />
                          </Input.Icon>
                          <Input.Input
                            readOnly
                            placeholder='DD/MM/YY - DD/MM/YY'
                            value={
                              dateRange.from || dateRange.to
                                ? formatDateRangeLabel(dateRange.from, dateRange.to)
                                : ''
                            }
                            className='min-w-0 cursor-pointer'
                          />
                          {(dateRange.from || dateRange.to) && (
                            <Input.Affix
                              className='bg-transparent cursor-pointer px-0'
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleClearDateRange();
                              }}
                            >
                              <RiCloseLine
                                size={16}
                                className='text-text-soft-400 hover:text-text-strong-900'
                              />
                            </Input.Affix>
                          )}
                        </Input.Wrapper>
                      </Input.Root>
                    </div>
                  </Popover.Trigger>
                  <Popover.Content className='p-0' align='end' side='bottom' sideOffset={8}>
                    <DatepickerPrimivites.Calendar
                      mode='range'
                      selected={dateRange}
                      onSelect={handleDateRangeChange}
                    />
                  </Popover.Content>
                </Popover.Root>

                {/* Status Filter */}
                <Select.Root value={statusFilter} onValueChange={setStatusFilter} size={size}>
                  <Select.Trigger className='w-[140px]'>
                    <Select.Value placeholder='All Status' />
                  </Select.Trigger>
                  <Select.Content>
                    {statusOptions.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>

                {/* Filter Button with Badge (Center + Resource Type) */}
                <Popover.Root open={isFilterDropdownOpen} onOpenChange={setIsFilterDropdownOpen}>
                  <Filter.TriggerButton
                    filterCount={filterCount}
                    onClear={handleClearFilters}
                    tooltipContent='Filter'
                    ariaLabel='Filter bookings'
                  />
                  <BookingDetailFilterDropdown
                    open={isFilterDropdownOpen}
                    onOpenChange={setIsFilterDropdownOpen}
                    setFilterCount={setFilterCount}
                    appliedFilters={appliedFilters}
                    onFiltersChange={handleFiltersChange}
                  />
                </Popover.Root>

                {/* Column Manager */}
                <ColumnManagerDropdown
                  open={isColumnManagerOpen}
                  onOpenChange={setIsColumnManagerOpen}
                  config={tableRef.current?.columnConfigHook}
                  tooltipContent='Column Manager'
                  trigger={
                    <Button.Root variant='neutral' mode='stroke' size='small' className='shrink-0'>
                      <Button.Icon as={RiLayoutColumnLine} />
                    </Button.Root>
                  }
                />

                {/* New Booking Button */}
                <Button.Root
                  variant='primary'
                  mode='filled'
                  size={size}
                  onClick={handleNewBooking}
                  className='gap-1'
                >
                  <Button.Icon as={RiAddLine} />
                  New Booking
                </Button.Root>
              </div>
            </div>

            <ClientDetailBookingTable
              ref={tableRef}
              clientId={clientId}
              searchTerm={debouncedSearchTerm}
              dateRange={dateRange}
              statusFilter={statusFilter}
              centerFilter={appliedFilters.center}
              resourceTypesFilter={appliedFilters.resourceTypes}
              filtersInitialized={filtersInitialized}
            />
          </div>
        </div>
      </div>

      <ClientDetailBookingCreateDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        clientId={clientId}
        clientName={clientName}
      />
    </>
  );
};

export default ClientDetailBookingTab;
