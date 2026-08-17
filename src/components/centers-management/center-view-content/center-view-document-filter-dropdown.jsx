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
import * as LinkButton from '@/components/ui/link-button';
import { Calendar } from '@/components/ui/calendar';

const FILTER_TABS = [
  { value: 'documentType', label: 'Document Type' },
  { value: 'status', label: 'Status' },
  { value: 'expiryDate', label: 'Expiry Date' },
];

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const toIsoDateString = (date) => {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const toDateOrUndefined = (value) => {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const formatRangePart = (value) => {
  const date = toDateOrUndefined(value);
  if (!date) return null;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const CenterViewDocumentFilterDropdown = React.forwardRef(
  (
    {
      open,
      setFilterCount,
      onFiltersChange,
      appliedFilters = {},
      documentTypeOptions = [],
      statusOptions = [],
      isLoadingDocumentTypes = false,
    },
    ref,
  ) => {
    const [activeTab, setActiveTab] = useState('documentType');
    const [localFilters, setLocalFilters] = useState(() => ({
      documentType: ensureArray(appliedFilters.documentType),
      status: ensureArray(appliedFilters.status),
      expiryDateFrom: appliedFilters.expiryDateFrom || null,
      expiryDateTo: appliedFilters.expiryDateTo || null,
    }));
    const [searchText, setSearchText] = useState('');
    const popoverRef = useRef(null);

    // Re-seed local state from applied filters when they change externally
    // (e.g. session-storage rehydration on tab switch).
    useEffect(() => {
      setLocalFilters({
        documentType: ensureArray(appliedFilters.documentType),
        status: ensureArray(appliedFilters.status),
        expiryDateFrom: appliedFilters.expiryDateFrom || null,
        expiryDateTo: appliedFilters.expiryDateTo || null,
      });
    }, [
      appliedFilters.documentType,
      appliedFilters.status,
      appliedFilters.expiryDateFrom,
      appliedFilters.expiryDateTo,
    ]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    const expiryActive = Boolean(localFilters.expiryDateFrom || localFilters.expiryDateTo);

    const totalCount =
      localFilters.documentType.length + localFilters.status.length + (expiryActive ? 1 : 0);

    useEffect(() => {
      setFilterCount?.(totalCount);
    }, [totalCount, setFilterCount]);

    const currentOptions = useMemo(() => {
      let options = [];
      if (activeTab === 'documentType') options = documentTypeOptions;
      else if (activeTab === 'status') options = statusOptions;

      if (!searchText.trim()) return options;
      const q = searchText.toLowerCase().trim();
      return options.filter(
        (option) =>
          String(option.label).toLowerCase().includes(q) ||
          String(option.value).toLowerCase().includes(q),
      );
    }, [activeTab, documentTypeOptions, statusOptions, searchText]);

    const handleToggle = useCallback(
      (value) => {
        if (activeTab !== 'documentType' && activeTab !== 'status') return;
        setLocalFilters((previous) => {
          const currentList = ensureArray(previous[activeTab]);
          const isSelected = currentList.includes(value);
          return {
            ...previous,
            [activeTab]: isSelected
              ? currentList.filter((v) => v !== value)
              : [...currentList, value],
          };
        });
      },
      [activeTab],
    );

    const handleExpiryRangeChange = useCallback((range) => {
      setLocalFilters((previous) => ({
        ...previous,
        expiryDateFrom: range?.from ? toIsoDateString(range.from) : null,
        expiryDateTo: range?.to ? toIsoDateString(range.to) : null,
      }));
    }, []);

    const handleExpiryClear = useCallback(() => {
      setLocalFilters((previous) => ({
        ...previous,
        expiryDateFrom: null,
        expiryDateTo: null,
      }));
    }, []);

    const handleClear = useCallback(() => {
      setLocalFilters({
        documentType: [],
        status: [],
        expiryDateFrom: null,
        expiryDateTo: null,
      });
      setSearchText('');
    }, []);

    const emitFilters = useCallback(() => {
      onFiltersChange?.({
        documentType: [...localFilters.documentType],
        status: [...localFilters.status],
        expiryDateFrom: localFilters.expiryDateFrom,
        expiryDateTo: localFilters.expiryDateTo,
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

    if (!open) return null;

    const selectedValues =
      activeTab === 'documentType' || activeTab === 'status' ? localFilters[activeTab] || [] : [];

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
        <Filter.Body className={activeTab === 'expiryDate' ? 'h-auto min-h-[420px]' : undefined}>
          <Filter.Sidebar width='180px'>
            <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
              <TabMenuVertical.List className='border-r-0 p-2'>
                {FILTER_TABS.map((tab) => {
                  let count = 0;
                  if (tab.value === 'documentType') count = localFilters.documentType.length;
                  else if (tab.value === 'status') count = localFilters.status.length;
                  else if (tab.value === 'expiryDate' && expiryActive) count = 1;
                  const showCount = count > 0;
                  return (
                    <TabMenuVertical.Trigger
                      className='flex w-full items-center justify-between'
                      key={tab.value}
                      value={tab.value}
                    >
                      {tab.label}
                      {showCount ? (
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
            {activeTab === 'expiryDate' ? (
              (() => {
                const fromDate = toDateOrUndefined(localFilters.expiryDateFrom);
                const toDate = toDateOrUndefined(localFilters.expiryDateTo);
                const fromText = formatRangePart(localFilters.expiryDateFrom);
                const toText = formatRangePart(localFilters.expiryDateTo);
                return (
                  <div className='flex flex-col gap-3 p-3'>
                    <div className='flex items-center justify-between'>
                      <span className='paragraph-small text-text-sub-500'>Expiry Date</span>
                      {expiryActive && (
                        <LinkButton.Root variant='primary' size='small' onClick={handleExpiryClear}>
                          Clear
                        </LinkButton.Root>
                      )}
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
                        onSelect={(next) => handleExpiryRangeChange(next || null)}
                        defaultMonth={fromDate || toDate || new Date()}
                        initialFocus
                      />
                    </div>

                    <p className='paragraph-xsmall text-text-soft-400'>
                      Shows documents whose expiry date falls within the selected window.
                    </p>
                  </div>
                );
              })()
            ) : (
              <Filter.List
                options={currentOptions}
                selectedValues={selectedValues}
                onToggle={handleToggle}
                searchValue={searchText}
                onSearchChange={setSearchText}
                isLoading={activeTab === 'documentType' && isLoadingDocumentTypes}
                emptyMessage={
                  activeTab === 'documentType' ? 'No document types' : 'No status options'
                }
              />
            )}
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

CenterViewDocumentFilterDropdown.displayName = 'CenterViewDocumentFilterDropdown';

export default CenterViewDocumentFilterDropdown;
