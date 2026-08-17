import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';

import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import * as Slider from '@/components/ui/slider';
import * as LinkButton from '@/components/ui/link-button';
import { Calendar } from '@/components/ui/calendar';
import {
  ASSIGN_SPACE_STATUS_OPTIONS,
  DEFAULT_OCCUPANCY_FILTERS,
} from '@/components/space-management/constants';
import { formatDateToISO, formatDateWithOrdinal, parseToDate } from '@/utils/date-utils';
import { ensureArray } from '@/utils/global-search-utils';

const FILTER_TABS = [
  { value: 'clientName', label: 'Client Name' },
  { value: 'leaseDuration', label: 'Lease Duration' },
  { value: 'status', label: 'Status' },
  { value: 'totalCredits', label: 'Total Credits' },
  { value: 'pricePerSeat', label: 'Price/Seat' },
  { value: 'totalPrice', label: 'Total Price' },
];

const OccupancyHistoryFilterDropdown = React.forwardRef(
  (
    {
      setFilterCount,
      open,
      onFiltersChange,
      appliedFilters = DEFAULT_OCCUPANCY_FILTERS,
      clientOptions = [],
      columnMaxLimits = {},
    },
    ref,
  ) => {
    const [activeTab, setActiveTab] = useState('clientName');
    const [localFilters, setLocalFilters] = useState({
      clientName: ensureArray(appliedFilters.clientName),
      status: ensureArray(appliedFilters.status),
      leaseDateFrom: appliedFilters.leaseDateFrom || null,
      leaseDateTo: appliedFilters.leaseDateTo || null,
      totalCredits: appliedFilters.totalCredits || '',
      pricePerSeat: appliedFilters.pricePerSeat || '',
      totalPrice: appliedFilters.totalPrice || '',
    });
    const [searchText, setSearchText] = useState('');
    const popoverRef = useRef(null);

    const leaseActive = Boolean(localFilters.leaseDateFrom || localFilters.leaseDateTo);

    useEffect(() => {
      setLocalFilters({
        clientName: ensureArray(appliedFilters.clientName),
        status: ensureArray(appliedFilters.status),
        leaseDateFrom: appliedFilters.leaseDateFrom || null,
        leaseDateTo: appliedFilters.leaseDateTo || null,
        totalCredits: appliedFilters.totalCredits || '',
        pricePerSeat: appliedFilters.pricePerSeat || '',
        totalPrice: appliedFilters.totalPrice || '',
      });
    }, [appliedFilters]);

    const resolvedMaxLimits = useMemo(
      () => ({
        totalCredits: columnMaxLimits.totalCredits ?? 0,
        pricePerSeat: columnMaxLimits.pricePerSeat ?? 0,
        totalPrice: columnMaxLimits.totalPrice ?? 0,
      }),
      [columnMaxLimits],
    );

    useEffect(() => {
      setFilterCount(
        localFilters.clientName.length +
          localFilters.status.length +
          (leaseActive ? 1 : 0) +
          (Number(localFilters.totalCredits) > 0 &&
          Number(localFilters.totalCredits) < resolvedMaxLimits.totalCredits
            ? 1
            : 0) +
          (Number(localFilters.pricePerSeat) > 0 &&
          Number(localFilters.pricePerSeat) < resolvedMaxLimits.pricePerSeat
            ? 1
            : 0) +
          (Number(localFilters.totalPrice) > 0 &&
          Number(localFilters.totalPrice) < resolvedMaxLimits.totalPrice
            ? 1
            : 0),
      );
    }, [
      localFilters.clientName.length,
      localFilters.status.length,
      localFilters.totalCredits,
      localFilters.pricePerSeat,
      localFilters.totalPrice,
      leaseActive,
      setFilterCount,
    ]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    const currentOptions = useMemo(() => {
      let options = [];
      if (activeTab === 'clientName') {
        options = clientOptions;
      } else if (activeTab === 'status') {
        options = ASSIGN_SPACE_STATUS_OPTIONS;
      }

      if (!searchText.trim()) return options;
      const lowerSearch = searchText.toLowerCase().trim();
      return options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(lowerSearch) ||
          opt.value.toLowerCase().includes(lowerSearch),
      );
    }, [activeTab, clientOptions, searchText]);

    const handleToggle = useCallback(
      (value) => {
        if (activeTab !== 'clientName' && activeTab !== 'status') return;
        setLocalFilters((previous) => {
          const currentList = ensureArray(previous[activeTab]);
          const isSelected = currentList.includes(value);
          return {
            ...previous,
            [activeTab]: isSelected
              ? currentList.filter((item) => item !== value)
              : [...currentList, value],
          };
        });
      },
      [activeTab],
    );

    const handleLeaseRangeChange = useCallback((range) => {
      setLocalFilters((previous) => ({
        ...previous,
        leaseDateFrom: range?.from ? formatDateToISO(range.from) || null : null,
        leaseDateTo: range?.to ? formatDateToISO(range.to) || null : null,
      }));
    }, []);

    const handleLeaseClear = useCallback(() => {
      setLocalFilters((previous) => ({
        ...previous,
        leaseDateFrom: null,
        leaseDateTo: null,
      }));
    }, []);

    const handleSliderChange = useCallback((key, value) => {
      setLocalFilters((previous) => ({
        ...previous,
        [key]: value?.toString() || '',
      }));
    }, []);

    const handleClear = useCallback(() => {
      setLocalFilters({ ...DEFAULT_OCCUPANCY_FILTERS });
      setSearchText('');
    }, []);

    const emitFilters = useCallback(() => {
      onFiltersChange?.({
        clientName: [...localFilters.clientName],
        status: [...localFilters.status],
        leaseDateFrom: localFilters.leaseDateFrom,
        leaseDateTo: localFilters.leaseDateTo,
        totalCredits: localFilters.totalCredits,
        pricePerSeat: localFilters.pricePerSeat,
        totalPrice: localFilters.totalPrice,
      });
    }, [localFilters, onFiltersChange]);

    const handlePopoverClose = useCallback(() => {
      emitFilters();
    }, [emitFilters]);

    const previousOpenRef = useRef(open);
    useEffect(() => {
      if (previousOpenRef.current && !open) {
        handlePopoverClose();
      }
      previousOpenRef.current = open;
    }, [open, handlePopoverClose]);

    useImperativeHandle(ref, () => ({
      handleClose: handlePopoverClose,
    }));

    const renderSliderTab = (key, label, suffix, maxValue) => {
      const sliderValue = localFilters[key] ? Number(localFilters[key]) : 0;

      return (
        <div className='flex flex-col gap-4 p-4'>
          <div className='flex flex-col gap-4'>
            <label className='paragraph-small text-text-sub-500'>{label}</label>
            {maxValue > 0 ? (
              <div className='flex flex-col gap-3 px-2'>
                <span className='w-full label-large flex gap-1 items-center justify-center text-text-main-900'>
                  {sliderValue.toLocaleString('en-IN')}{' '}
                  <span className='label-medium text-text-soft-400'>{suffix}</span>
                </span>
                <Slider.Root
                  value={[sliderValue]}
                  onValueChange={(values) => handleSliderChange(key, values[0])}
                  min={0}
                  max={maxValue}
                  step={1}
                  className='w-full'
                >
                  <Slider.Thumb />
                </Slider.Root>
                <div className='flex items-center justify-between text-paragraph-xs text-text-sub-500'>
                  <span className='paragraph-small text-text-sub-500'>0</span>
                  <span className='paragraph-small text-text-sub-500'>
                    {maxValue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ) : (
              <p className='paragraph-small text-text-sub-500 px-2'>
                No values available in this list.
              </p>
            )}
          </div>
        </div>
      );
    };

    if (!open) return null;

    const fromDate = parseToDate(localFilters.leaseDateFrom) || undefined;
    const toDate = parseToDate(localFilters.leaseDateTo) || undefined;
    const fromText = formatDateWithOrdinal(localFilters.leaseDateFrom);
    const toText = formatDateWithOrdinal(localFilters.leaseDateTo);

    return (
      <Filter.Root
        ref={popoverRef}
        align='end'
        side='bottom'
        sideOffset={8}
        showArrow={false}
        onInteractOutside={handlePopoverClose}
        onEscapeKeyDown={handlePopoverClose}
        className='w-auto'
      >
        <Filter.Header title='FILTERS' onClear={handleClear} />
        <Filter.Body className={activeTab === 'leaseDuration' ? 'h-auto min-h-[420px]' : undefined}>
          <Filter.Sidebar width='180px'>
            <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
              <TabMenuVertical.List className='border-r-0 p-2'>
                {FILTER_TABS.map((tab) => {
                  let count = 0;
                  if (tab.value === 'clientName') count = localFilters.clientName.length;
                  else if (tab.value === 'status') count = localFilters.status.length;
                  else if (tab.value === 'leaseDuration' && leaseActive) count = 1;
                  else if (
                    tab.value === 'totalCredits' &&
                    Number(localFilters.totalCredits) > 0 &&
                    Number(localFilters.totalCredits) < resolvedMaxLimits.totalCredits
                  ) {
                    count = 1;
                  } else if (
                    tab.value === 'pricePerSeat' &&
                    Number(localFilters.pricePerSeat) > 0 &&
                    Number(localFilters.pricePerSeat) < resolvedMaxLimits.pricePerSeat
                  ) {
                    count = 1;
                  } else if (
                    tab.value === 'totalPrice' &&
                    Number(localFilters.totalPrice) > 0 &&
                    Number(localFilters.totalPrice) < resolvedMaxLimits.totalPrice
                  ) {
                    count = 1;
                  }

                  return (
                    <TabMenuVertical.Trigger
                      className='flex w-full items-center justify-between'
                      key={tab.value}
                      value={tab.value}
                    >
                      {tab.label}
                      {count > 0 ? (
                        <Badge.Root
                          size='medium'
                          variant='filled'
                          className='shrink-0 rounded-full bg-black'
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

          <Filter.Content width='320px'>
            {activeTab === 'leaseDuration' ? (
              <div className='flex flex-col gap-3 p-3'>
                <div className='flex items-center justify-between'>
                  <span className='paragraph-small text-text-sub-500'>Lease Duration</span>
                  {leaseActive ? (
                    <LinkButton.Root variant='primary' size='small' onClick={handleLeaseClear}>
                      Clear
                    </LinkButton.Root>
                  ) : null}
                </div>

                <div className='rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-3 py-2 text-paragraph-sm text-text-strong-950'>
                  {fromText || toText
                    ? `${fromText || '—'} → ${toText || '—'}`
                    : 'Pick a start and end date'}
                </div>

                <div className='flex justify-center'>
                  <Calendar
                    mode='range'
                    numberOfMonths={1}
                    selected={{
                      from: fromDate,
                      to: toDate,
                    }}
                    onSelect={(next) => handleLeaseRangeChange(next || null)}
                    defaultMonth={fromDate || toDate || new Date()}
                    initialFocus
                  />
                </div>

                <p className='paragraph-xsmall text-text-soft-400'>
                  Shows allocations whose lease period overlaps the selected date range.
                </p>
              </div>
            ) : activeTab === 'totalCredits' ? (
              renderSliderTab(
                'totalCredits',
                'Total Credits',
                'Credits',
                resolvedMaxLimits.totalCredits,
              )
            ) : activeTab === 'pricePerSeat' ? (
              renderSliderTab('pricePerSeat', 'Price/Seat', '₹', resolvedMaxLimits.pricePerSeat)
            ) : activeTab === 'totalPrice' ? (
              renderSliderTab('totalPrice', 'Total Price', '₹', resolvedMaxLimits.totalPrice)
            ) : (
              <Filter.List
                options={currentOptions}
                selectedValues={localFilters[activeTab] || []}
                onToggle={handleToggle}
                searchValue={searchText}
                onSearchChange={setSearchText}
                emptyMessage={
                  activeTab === 'clientName' ? 'No clients found' : 'No status options found'
                }
              />
            )}
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

OccupancyHistoryFilterDropdown.displayName = 'OccupancyHistoryFilterDropdown';

export default OccupancyHistoryFilterDropdown;
