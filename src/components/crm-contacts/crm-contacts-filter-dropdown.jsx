import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useImperativeHandle,
} from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import { DateTimeFilterPanel } from '@/components/ui/datetime-filter-panel';
import { useDebounce } from '@/hooks/use-debounce';
import { countActiveDatetimeFilter, normalizeDatetimeFilter } from '@/utils/date-utils';
import { DEFAULT_DATETIME_FILTER } from '@/components/crm-accounts/constants';
import {
  CONTACT_FILTER_TABS,
  CONTACT_FILTER_TAB_CONFIG,
  DEFAULT_CONTACT_FILTERS,
  SELECT_NONE_VALUE,
  SUBSCRIPTION_STATUS_OPTIONS,
} from './constants';
import { INDIA_CITY_OPTIONS } from '@/components/crm-leads/constants';

const CrmContactsFilterDropdown = React.forwardRef(
  (
    {
      open,
      onOpenChange: _onOpenChange,
      setFilterCount,
      onFiltersChange,
      appliedFilters = {},
      contactOptions = {},
      hideAccountFilter = false,
    },
    ref,
  ) => {
    const [activeTab, setActiveTab] = useState(CONTACT_FILTER_TABS.SALES_OWNER);
    const [searchText, setSearchText] = useState('');
    const [filters, setFilters] = useState({ ...DEFAULT_CONTACT_FILTERS });
    const previousOpenRef = useRef(open);
    const debouncedSearch = useDebounce(searchText, 300);

    useEffect(() => {
      setFilters({
        account: Array.isArray(appliedFilters.account) ? appliedFilters.account : [],
        sales_owner: Array.isArray(appliedFilters.sales_owner) ? appliedFilters.sales_owner : [],
        designation: Array.isArray(appliedFilters.designation) ? appliedFilters.designation : [],
        department: Array.isArray(appliedFilters.department) ? appliedFilters.department : [],
        city: Array.isArray(appliedFilters.city) ? appliedFilters.city : [],
        subscription_status: Array.isArray(appliedFilters.subscription_status)
          ? appliedFilters.subscription_status
          : [],
        created_at: normalizeDatetimeFilter(appliedFilters.created_at),
        last_modified_at: normalizeDatetimeFilter(appliedFilters.last_modified_at),
      });
    }, [appliedFilters]);

    useEffect(() => {
      const arrayCount = Object.entries(filters).reduce((accumulator, [key, current]) => {
        if (key === 'created_at' || key === 'last_modified_at') return accumulator;
        if (hideAccountFilter && key === 'account') return accumulator;
        return accumulator + (Array.isArray(current) ? current.length : 0);
      }, 0);
      const count =
        arrayCount +
        countActiveDatetimeFilter(filters.created_at) +
        countActiveDatetimeFilter(filters.last_modified_at);
      setFilterCount?.(count);
    }, [filters, hideAccountFilter, setFilterCount]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    useEffect(() => {
      if (hideAccountFilter && activeTab === CONTACT_FILTER_TABS.ACCOUNT) {
        setActiveTab(CONTACT_FILTER_TABS.SALES_OWNER);
      }
    }, [hideAccountFilter, activeTab]);

    const buildFiltersObject = useCallback(
      () => ({
        account: filters.account,
        sales_owner: filters.sales_owner,
        designation: filters.designation,
        department: filters.department,
        city: filters.city,
        subscription_status: filters.subscription_status,
        created_at: normalizeDatetimeFilter(filters.created_at),
        last_modified_at: normalizeDatetimeFilter(filters.last_modified_at),
      }),
      [filters],
    );

    const handlePopoverClose = useCallback(() => {
      onFiltersChange?.(buildFiltersObject());
    }, [buildFiltersObject, onFiltersChange]);

    useImperativeHandle(ref, () => ({
      handleClose: handlePopoverClose,
    }));

    useEffect(() => {
      if (previousOpenRef.current && !open) {
        handlePopoverClose();
      }
      previousOpenRef.current = open;
    }, [open, handlePopoverClose]);

    const currentOptions = useMemo(() => {
      let options = [];
      switch (activeTab) {
        case CONTACT_FILTER_TABS.ACCOUNT:
          options = contactOptions?.account?.length > 0 ? contactOptions.account : [];
          break;
        case CONTACT_FILTER_TABS.SALES_OWNER:
          options = contactOptions?.sales_owner?.length > 0 ? contactOptions.sales_owner : [];
          break;
        case CONTACT_FILTER_TABS.DESIGNATION:
          options = contactOptions?.designation?.length > 0 ? contactOptions.designation : [];
          break;
        case CONTACT_FILTER_TABS.DEPARTMENT:
          options = contactOptions?.department?.length > 0 ? contactOptions.department : [];
          break;
        case CONTACT_FILTER_TABS.CITY:
          options = INDIA_CITY_OPTIONS;
          break;
        case CONTACT_FILTER_TABS.SUBSCRIPTION_STATUS:
          options =
            contactOptions?.subscription_status?.length > 0
              ? contactOptions.subscription_status
              : SUBSCRIPTION_STATUS_OPTIONS.filter((opt) => opt.value !== SELECT_NONE_VALUE);
          break;
        default:
          options = [];
      }

      if (debouncedSearch.trim()) {
        const needle = debouncedSearch.toLowerCase();
        options = options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(needle) || opt.value.toLowerCase().includes(needle),
        );
      }

      return options;
    }, [activeTab, debouncedSearch, contactOptions]);

    const handleToggle = useCallback(
      (value) => {
        setFilters((previous) => {
          const current = previous[activeTab] || [];
          const isSelected = current.includes(value);
          return {
            ...previous,
            [activeTab]: isSelected
              ? current.filter((item) => item !== value)
              : [...current, value],
          };
        });
      },
      [activeTab],
    );

    const handleClear = () => {
      const cleared = {
        ...DEFAULT_CONTACT_FILTERS,
        ...(hideAccountFilter ? { account: filters.account } : {}),
      };
      setFilters(cleared);
      setSearchText('');
      onFiltersChange?.(cleared);
    };

    const handleDatetimeFilterChange = useCallback((tab, nextValue) => {
      setFilters((previous) => ({
        ...previous,
        [tab]: normalizeDatetimeFilter(nextValue),
      }));
    }, []);

    const isDatetimeTab =
      activeTab === CONTACT_FILTER_TABS.CREATED_AT ||
      activeTab === CONTACT_FILTER_TABS.LAST_MODIFIED;

    if (!open) return null;

    return (
      <Filter.Root onInteractOutside={handlePopoverClose} onEscapeKeyDown={handlePopoverClose}>
        <Filter.Header title='FILTERS' onClear={handleClear} />

        <Filter.Body className={isDatetimeTab ? 'h-auto min-h-[420px]' : undefined}>
          <Filter.Sidebar width='180px'>
            <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
              <TabMenuVertical.List className='p-2 border-r-0'>
                {CONTACT_FILTER_TAB_CONFIG.filter(
                  (tab) => !(hideAccountFilter && tab.value === CONTACT_FILTER_TABS.ACCOUNT),
                ).map((tab) => {
                  const count =
                    tab.value === CONTACT_FILTER_TABS.CREATED_AT ||
                    tab.value === CONTACT_FILTER_TABS.LAST_MODIFIED
                      ? countActiveDatetimeFilter(filters[tab.value])
                      : filters[tab.value]?.length || 0;
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

          <Filter.Content width={isDatetimeTab ? '320px' : '300px'}>
            {isDatetimeTab ? (
              <DateTimeFilterPanel
                value={filters[activeTab]}
                onChange={(nextValue) => handleDatetimeFilterChange(activeTab, nextValue)}
              />
            ) : (
              <Filter.List
                options={currentOptions}
                selectedValues={filters[activeTab] || []}
                onToggle={handleToggle}
                searchValue={searchText}
                onSearchChange={setSearchText}
                virtualized
                emptyMessage={`No ${activeTab.replaceAll('_', ' ')} found`}
              />
            )}
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

CrmContactsFilterDropdown.displayName = 'CrmContactsFilterDropdown';

export default CrmContactsFilterDropdown;
