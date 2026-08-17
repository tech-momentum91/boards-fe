/**
 * Booking Toolbar Component
 * Booking-specific toolbar with filters, date navigation, and actions
 * Supports both Calendar and List views
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  RiListCheck,
  RiCalendar2Line,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowDownSLine,
  RiRefreshLine,
  RiAddLine,
  RiAnticlockwise2Line,
  RiCalendarLine,
  RiSearchLine,
  RiLayoutColumnLine,
  RiCloseLine,
} from 'react-icons/ri';
import { addDays, subDays, format, parse } from 'date-fns';
import * as Button from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Tooltip from '@/components/ui/tooltip';
import * as Filter from '@/components/ui/filter';
import { buttonGroupVariants } from '@/components/ui/button-group';
import { getStatusOptions } from '@/api/dynamic-status';

import {
  toggleLayout,
  setSelectedDate,
  setCenterFilter,
  setCalendarScope,
  setResourceTypeFilter,
  setClientFilter,
  openBookingForm,
  reloadCalendar,
  setListFilters,
  fetchCalendarAllCentersForScope,
  fetchCalendarToolbarClients,
} from '@/redux/bookingSlice';
import { fetchResourceTypes, selectResourceTypesData } from '@/redux/commonSlice';
import { BOOKING_STATUS, defaultBookingFormState } from '@/components/bookings/constants';
import { Datepicker } from '@/components/ui/datepicker';
import * as DatepickerPrimivites from '@/components/ui/calendar';
import { cn } from '@/utils/cn';
import { formatDateRangeLabel } from '@/utils/date-utils';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import GroupByToolbarControl from '@/components/ui/group-by-toolbar-control';
import BookingFilterDropdown from '@/components/bookings/booking-filter-dropdown';
import CenterAccessDropdown from '@/components/center-access-dropdown';

const BOOKING_LIST_GROUP_BY_OPTIONS = [
  { value: 'center_name', label: 'Center' },
  { value: 'status', label: 'Status' },
  { value: 'client_name', label: 'Client' },
  { value: 'resource_type', label: 'Resource Type' },
];

const BookingToolbar = ({
  viewType = 'calendar', // 'calendar' | 'list'
  searchQuery = '',
  onSearchChange,
  dateRange = { from: null, to: null },
  onDateRangeChange,
  statusFilter = 'all',
  onStatusFilterChange,
  filterCount = 0,
  onFilterCountChange,
  tableVariant = 'compact',
  onTableVariantToggle,
  tableRef, // For column manager
  groupByField = '',
  onGroupByFieldChange,
  groupOrder = 'asc',
  onGroupOrderChange,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { calendarView, shared, listView } = useSelector((state) => state.booking);
  const centersList = shared.centers.data;
  const toolbarClientsData = calendarView.toolbarClients?.data || [];
  const toolbarClientsStatus = calendarView.toolbarClients?.status;
  const { layout } = calendarView.settings;
  const resourceTypesList = useSelector(selectResourceTypesData);
  const resourceTypesStatus = useSelector((state) => state.common.resourceTypes.status);
  const selectedDateValue = calendarView.settings.selectedDate;
  const sortedCentersList = useMemo(
    () => [...(centersList || [])].sort((a, b) => (a.label || '').localeCompare(b.label || '')),
    [centersList],
  );

  const centersOptionsForCalendarPicker = useMemo(() => {
    if (calendarView.filters.calendarScope === 'all_centers') {
      const raw = calendarView.allCentersForScope?.data || [];
      return [...raw].sort((a, b) => (a.label || '').localeCompare(b.label || ''));
    }
    return sortedCentersList;
  }, [
    calendarView.filters.calendarScope,
    calendarView.allCentersForScope?.data,
    sortedCentersList,
  ]);

  const allCalendarCenterIds = useMemo(
    () => (centersOptionsForCalendarPicker || []).map((c) => c.value ?? c.name).filter(Boolean),
    [centersOptionsForCalendarPicker],
  );

  /** Maps Redux `centerIds: null` (all centers) to full id list so CenterAccessDropdown matches “All Centers”. */
  const calendarCenterIdsForDropdown = useMemo(() => {
    const ids = calendarView.filters.centerIds;
    if (ids == null || ids.length === 0) {
      return allCalendarCenterIds;
    }
    return ids;
  }, [calendarView.filters.centerIds, allCalendarCenterIds]);

  const handleCalendarCenterAccessChange = useCallback(
    (vals) => {
      const next = [...vals];
      const allSelected =
        allCalendarCenterIds.length > 0 &&
        next.length === allCalendarCenterIds.length &&
        allCalendarCenterIds.every((id) => next.includes(id));

      if (next.length === 0 || allSelected) {
        dispatch(setCenterFilter(null));
      } else {
        dispatch(setCenterFilter(next));
      }
      dispatch(setResourceTypeFilter(null));
      dispatch(setClientFilter(null));
    },
    [allCalendarCenterIds, dispatch],
  );
  const sortedClientsList = useMemo(
    () =>
      [...(toolbarClientsData || [])].sort((a, b) => (a.label || '').localeCompare(b.label || '')),
    [toolbarClientsData],
  );
  const sortedResourceTypesList = useMemo(
    () =>
      [...(resourceTypesList || [])].sort((a, b) => (a.label || '').localeCompare(b.label || '')),
    [resourceTypesList],
  );
  const selectedDate = useMemo(() => {
    // We store calendar selectedDate as `yyyy-MM-dd` (date-only) in Redux.
    if (typeof selectedDateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(selectedDateValue)) {
      return parse(selectedDateValue, 'yyyy-MM-dd', new Date());
    }

    const d = new Date(selectedDateValue);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [selectedDateValue]);

  useEffect(() => {
    if (resourceTypesStatus === 'idle') {
      dispatch(fetchResourceTypes());
    }
  }, [dispatch, resourceTypesStatus]);

  const calendarFilters = calendarView.filters;
  const listFilters = listView?.filters || {};
  const isListView = viewType === 'list';

  const calendarCenterIdsKey = useMemo(() => {
    const ids = calendarFilters.centerIds;
    if (!ids?.length) return '';
    return [...ids].sort().join(',');
  }, [calendarFilters.centerIds]);

  useEffect(() => {
    if (isListView) return;
    dispatch(
      fetchCalendarToolbarClients({
        centerIds: calendarFilters.centerIds,
        calendarScope: calendarFilters.calendarScope,
      }),
    );
  }, [dispatch, isListView, calendarFilters.calendarScope, calendarCenterIdsKey]);

  useEffect(() => {
    if (isListView || calendarFilters.calendarScope !== 'all_centers') return;
    if ((calendarView.allCentersForScope?.data?.length ?? 0) > 0) return;
    if (calendarView.allCentersForScope?.status === 'loading') return;
    dispatch(fetchCalendarAllCentersForScope());
  }, [
    isListView,
    calendarFilters.calendarScope,
    calendarView.allCentersForScope?.data?.length,
    calendarView.allCentersForScope?.status,
    dispatch,
  ]);

  // Local state for filter dropdown
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);

  // Status filter options (API-only dynamic statuses for Space Booking.status)
  const [dynamicStatusOptions, setDynamicStatusOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const fetchLatest = async () => {
      try {
        const opts = await getStatusOptions({ doctype: 'Space Booking', field: 'status' });
        if (!cancelled) setDynamicStatusOptions(Array.isArray(opts) ? opts : []);
      } catch {
        if (!cancelled) setDynamicStatusOptions([]);
      }
    };

    fetchLatest();

    return () => {
      cancelled = true;
    };
  }, []);

  const statusOptions = [{ value: 'all', label: 'All Status' }, ...dynamicStatusOptions];

  const handleViewToggle = (view) => {
    if (view === 'list') {
      navigate('/bookings/list');
    } else {
      navigate('/bookings/calendar');
    }
  };

  const handlePreviousDay = () => {
    const newDate = subDays(selectedDate, 1);
    dispatch(setSelectedDate(format(newDate, 'yyyy-MM-dd')));
  };

  const handleNextDay = () => {
    const newDate = addDays(selectedDate, 1);
    dispatch(setSelectedDate(format(newDate, 'yyyy-MM-dd')));
  };

  const handleToday = () => {
    const today = new Date();
    dispatch(setSelectedDate(format(today, 'yyyy-MM-dd')));
  };

  const handleLayoutToggle = () => {
    dispatch(toggleLayout());
  };

  const handleRefresh = () => {
    dispatch(reloadCalendar());
  };

  const handleNewBooking = () => {
    let initialData = null;

    if (isListView) {
      const c = listFilters.center;
      const toolbarCenterId = Array.isArray(c) ? c[0] : c;
      if (toolbarCenterId != null && toolbarCenterId !== '') {
        initialData = {
          ...defaultBookingFormState.data,
          space: {
            ...defaultBookingFormState.data.space,
            centerId: toolbarCenterId,
          },
        };
      }
    } else if (calendarFilters.calendarScope === 'my_centers') {
      // Prefill from toolbar only when centers are "mine"; All centers view lists tenants user may not book for.
      const toolbarCenterId = calendarFilters.centerIds?.[0];
      if (toolbarCenterId != null && toolbarCenterId !== '') {
        initialData = {
          ...defaultBookingFormState.data,
          space: {
            ...defaultBookingFormState.data.space,
            centerId: toolbarCenterId,
          },
        };
      }
    }

    dispatch(openBookingForm({ mode: 'create', initialData }));
  };

  const size = 'xsmall';

  const handleClearDateRange = () => {
    if (!onDateRangeChange) return;
    onDateRangeChange({ from: null, to: null });
  };

  // Derived list-view date range for range calendar
  const listViewDateRange = isListView
    ? {
        from: dateRange?.from ? new Date(dateRange.from) : undefined,
        to: dateRange?.to ? new Date(dateRange.to) : undefined,
      }
    : undefined;

  const handleListViewDateRangeChange = (range) => {
    if (!onDateRangeChange) return;

    if (!range) {
      onDateRangeChange({ from: null, to: null });
      return;
    }

    onDateRangeChange({
      from: range.from ?? null,
      to: range.to ?? null,
    });
  };

  // Auto-select single client if only one exists (calendar centers default to "all")
  useEffect(() => {
    if (
      !isListView &&
      calendarFilters.calendarScope === 'my_centers' &&
      toolbarClientsStatus === 'succeeded' &&
      toolbarClientsData?.length === 1 &&
      !calendarFilters.client
    ) {
      dispatch(setClientFilter(toolbarClientsData[0].value));
    }
  }, [
    toolbarClientsData,
    toolbarClientsStatus,
    calendarFilters.client,
    calendarFilters.calendarScope,
    isListView,
    dispatch,
  ]);

  // Clear client filter if it is no longer in the accessible list (e.g. after center change)
  useEffect(() => {
    if (isListView || calendarFilters.calendarScope !== 'my_centers') return;
    if (toolbarClientsStatus === 'loading') return;
    const id = calendarFilters.client;
    if (!id) return;
    const ok = sortedClientsList.some((c) => c.value === id);
    if (!ok) dispatch(setClientFilter(null));
  }, [
    isListView,
    calendarFilters.calendarScope,
    calendarFilters.client,
    toolbarClientsStatus,
    sortedClientsList,
    dispatch,
  ]);

  // Calendar View Toolbar — 2 columns: date nav + scope tabs (centered) | filters & actions
  if (!isListView) {
    return (
      <div className={cn('flex justify-between w-full min-w-0 items-center gap-x-3 gap-y-2')}>
        {/* Column 1: List/Calendar toggle + Today + Date */}
        <div className='flex min-w-0 flex-wrap items-center gap-2 justify-self-start'>
          <ButtonGroup.Root size={size} className='shrink-0'>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <ButtonGroup.Item
                  onClick={() => handleViewToggle('list')}
                  className={cn(isListView && 'bg-bg-weak-100')}
                >
                  <ButtonGroup.Icon as={RiListCheck} />
                </ButtonGroup.Item>
              </Tooltip.Trigger>
              <Tooltip.Content>List view</Tooltip.Content>
            </Tooltip.Root>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <ButtonGroup.Item
                  onClick={() => handleViewToggle('calendar')}
                  className={cn('shrink-0', !isListView && 'bg-bg-weak-100')}
                >
                  <ButtonGroup.Icon as={RiCalendar2Line} />
                </ButtonGroup.Item>
              </Tooltip.Trigger>
              <Tooltip.Content>Calendar view</Tooltip.Content>
            </Tooltip.Root>
          </ButtonGroup.Root>

          <Button.Root
            variant='neutral'
            mode='stroke'
            size={size}
            onClick={handleToday}
            className='shrink-0'
          >
            Today
          </Button.Root>

          <ButtonGroup.Root size={size} className='shrink-0'>
            <div
              className={cn(
                buttonGroupVariants({ size }).item({ class: '' }),
                'first:rounded-l-lg p-0 overflow-hidden',
              )}
            >
              <Datepicker
                value={selectedDate}
                onChange={(date) => {
                  if (!date) return;
                  dispatch(setSelectedDate(format(date, 'yyyy-MM-dd')));
                }}
                size={size}
                className='border-none! shadow-none! px-2'
                prefixIcon={<RiCalendarLine size={20} />}
                suffixIcon={<RiArrowDownSLine size={20} />}
              />
            </div>
            <ButtonGroup.Item onClick={handlePreviousDay}>
              <ButtonGroup.Icon as={RiArrowLeftSLine} />
            </ButtonGroup.Item>
            <ButtonGroup.Item onClick={handleNextDay}>
              <ButtonGroup.Icon as={RiArrowRightSLine} />
            </ButtonGroup.Item>
          </ButtonGroup.Root>
          <ButtonGroup.Root size={size} className='shrink-0'>
            <ButtonGroup.Item
              className={cn(calendarFilters.calendarScope === 'my_centers' && 'bg-bg-weak-100')}
              onClick={() => {
                dispatch(setCalendarScope('my_centers'));
                dispatch(setResourceTypeFilter(null));
              }}
            >
              My centers
            </ButtonGroup.Item>
            <ButtonGroup.Item
              className={cn(calendarFilters.calendarScope === 'all_centers' && 'bg-bg-weak-100')}
              onClick={() => {
                dispatch(setCalendarScope('all_centers'));
                dispatch(setResourceTypeFilter(null));
                dispatch(fetchCalendarAllCentersForScope());
              }}
            >
              All centers
            </ButtonGroup.Item>
          </ButtonGroup.Root>
        </div>

        {/* Column 2: Center picker, resource, client, layout, refresh, new booking */}
        <div className='flex min-w-0 flex-wrap items-center gap-2 justify-end justify-self-end lg:min-w-0'>
          <CenterAccessDropdown
            centers={centersOptionsForCalendarPicker || []}
            selectedCenters={calendarCenterIdsForDropdown}
            onChange={handleCalendarCenterAccessChange}
            isLoading={
              calendarFilters.calendarScope === 'all_centers'
                ? calendarView.allCentersForScope?.status === 'loading'
                : shared.centers.isLoading
            }
            buttonVariant='neutral'
            buttonMode='stroke'
            className='w-[150px] min-w-auto'
          />

          <div className='w-36 shrink-0 min-w-0'>
            <SearchableSelect
              value={calendarFilters.resourceType || '__none__'}
              onValueChange={(value) => {
                dispatch(setResourceTypeFilter(value || null));
              }}
              options={[{ value: '__none__', label: 'All Resources' }, ...sortedResourceTypesList]}
              valueSentinel='__none__'
              size={size}
              showArrow={true}
            />
          </div>

          {calendarFilters.calendarScope === 'my_centers' && (
            <div className='w-36 shrink-0 min-w-0'>
              <SearchableSelect
                value={calendarFilters.client || '__none__'}
                onValueChange={(value) => {
                  dispatch(setClientFilter(value || null));
                }}
                options={[{ value: '__none__', label: 'All Clients' }, ...sortedClientsList]}
                valueSentinel='__none__'
                size={size}
                showArrow={true}
              />
            </div>
          )}

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size={size}
                onClick={handleLayoutToggle}
                className='shrink-0'
              >
                <Button.Icon
                  as={RiAnticlockwise2Line}
                  className={layout === 'time-x-resources-y' ? 'scale-x-[-1] -rotate-90' : ''}
                />
              </Button.Root>
            </Tooltip.Trigger>
            <Tooltip.Content>Rotate view</Tooltip.Content>
          </Tooltip.Root>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size={size}
                onClick={handleRefresh}
                className='shrink-0'
              >
                <Button.Icon as={RiRefreshLine} />
              </Button.Root>
            </Tooltip.Trigger>
            <Tooltip.Content>Refresh</Tooltip.Content>
          </Tooltip.Root>

          <Button.Root
            variant='primary'
            mode='filled'
            size={size}
            onClick={handleNewBooking}
            className='gap-1 shrink-0'
          >
            <Button.Icon as={RiAddLine} />
            New Booking
          </Button.Root>
        </div>
      </div>
    );
  }

  // List View Toolbar
  return (
    <div className='flex w-full min-w-0 flex-wrap items-center justify-between gap-2'>
      {/* Left Section */}
      <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
        {/* View Toggle Button Group (List/Calendar) */}
        <ButtonGroup.Root size={size} className='shrink-0'>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <ButtonGroup.Item
                onClick={() => handleViewToggle('list')}
                className={cn(isListView && 'bg-bg-weak-100')}
              >
                <ButtonGroup.Icon as={RiListCheck} />
              </ButtonGroup.Item>
            </Tooltip.Trigger>
            <Tooltip.Content>List view</Tooltip.Content>
          </Tooltip.Root>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <ButtonGroup.Item
                onClick={() => handleViewToggle('calendar')}
                className={cn('shrink-0', !isListView && 'bg-bg-weak-100')}
              >
                <ButtonGroup.Icon as={RiCalendar2Line} />
              </ButtonGroup.Item>
            </Tooltip.Trigger>
            <Tooltip.Content>Calendar view</Tooltip.Content>
          </Tooltip.Root>
        </ButtonGroup.Root>

        {/* Search Input */}
        <Input.Root size={size} className='min-w-0 flex-1 max-w-[320px]'>
          <Input.Wrapper>
            <Input.Icon>
              <RiSearchLine />
            </Input.Icon>
            <Input.Input
              placeholder='Search by booking title, client'
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              aria-label='Search by booking title, client'
            />
          </Input.Wrapper>
        </Input.Root>
      </div>

      {/* Right Section - wraps so all options stay accessible */}
      <div className='flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2'>
        {/* Date Range Picker (List View) with inline clear icon */}
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
                      listViewDateRange?.from || listViewDateRange?.to
                        ? formatDateRangeLabel(listViewDateRange.from, listViewDateRange.to)
                        : ''
                    }
                    className='min-w-0'
                  />
                  {(dateRange?.from || dateRange?.to) && (
                    <Input.Affix
                      className='bg-transparent cursor-pointer px-0'
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleClearDateRange();
                      }}
                    >
                      <RiCloseLine size={20} className='text-text-soft-400' />
                    </Input.Affix>
                  )}
                </Input.Wrapper>
              </Input.Root>
            </div>
          </Popover.Trigger>
          <Popover.Content className='p-0' align='start' side='bottom' sideOffset={8}>
            <DatepickerPrimivites.Calendar
              mode='range'
              selected={listViewDateRange}
              onSelect={handleListViewDateRangeChange}
            />
          </Popover.Content>
        </Popover.Root>

        {/* Status Dropdown */}
        <div className='w-[140px] shrink-0 min-w-0'>
          <SearchableSelect
            value={statusFilter}
            onValueChange={onStatusFilterChange}
            options={statusOptions}
            placeholder='All Status'
            size={size}
            showArrow={true}
          />
        </div>

        {/* Download Button */}
        {/* <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Button.Root variant='neutral' mode='stroke' size={size} className='shrink-0'>
              <Button.Icon as={RiDownloadLine} />
            </Button.Root>
          </Tooltip.Trigger>
          <Tooltip.Content>Download</Tooltip.Content>
        </Tooltip.Root> */}

        <GroupByToolbarControl
          options={BOOKING_LIST_GROUP_BY_OPTIONS}
          groupBy={groupByField}
          onGroupByChange={onGroupByFieldChange}
          groupOrder={groupOrder}
          onGroupOrderChange={onGroupOrderChange}
          size='xsmall'
        />

        {/* Filter Button with Badge */}
        <Popover.Root open={isFilterDropdownOpen} onOpenChange={setIsFilterDropdownOpen}>
          <Filter.TriggerButton
            filterCount={filterCount}
            onClear={() => {
              onFilterCountChange?.(0);
              dispatch(
                setListFilters({
                  center: null,
                  clients: [],
                  resourceTypes: [],
                }),
              );
            }}
            tooltipContent='Filter'
            ariaLabel='Filter bookings'
          />
          <BookingFilterDropdown
            open={isFilterDropdownOpen}
            onOpenChange={setIsFilterDropdownOpen}
            setFilterCount={onFilterCountChange}
            appliedFilters={listFilters}
            onFiltersChange={(filtersArray, newFilters) => {
              // Update Redux filters state
              dispatch(setListFilters(newFilters));
            }}
          />
        </Popover.Root>

        {/* Column Manager Button */}
        {tableRef && (
          <ColumnManagerDropdown
            open={isColumnManagerOpen}
            onOpenChange={setIsColumnManagerOpen}
            config={tableRef.current?.columnConfigHook}
            tooltipContent={'Column Manager'}
            trigger={
              <Button.Root variant='neutral' mode='stroke' size={size} className='shrink-0'>
                <Button.Icon as={RiLayoutColumnLine} />
              </Button.Root>
            }
          />
        )}

        {/* Table Variant Toggle */}
        {/* <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <TableVariantToggle
              variant={tableVariant}
              onToggle={onTableVariantToggle}
              size={size}
            />
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Table Variant</p>
          </Tooltip.Content>
        </Tooltip.Root> */}

        {/* New Booking Button */}
        <Button.Root
          variant='primary'
          mode='filled'
          size={size}
          onClick={handleNewBooking}
          className='gap-1 shrink-0'
        >
          <Button.Icon as={RiAddLine} />
          New Booking
        </Button.Root>
      </div>
    </div>
  );
};

export default BookingToolbar;
