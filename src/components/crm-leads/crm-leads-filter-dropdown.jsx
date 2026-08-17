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
  LEAD_FILTER_TABS,
  LEAD_FILTER_TAB_CONFIG,
  LIFECYCLE_STAGE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  INDIA_CITY_OPTIONS,
} from './constants';

const CrmLeadsFilterDropdown = React.forwardRef(
  (
    {
      open,
      onOpenChange: _onOpenChange,
      setFilterCount,
      onFiltersChange,
      appliedFilters = {},
      leadOptions = {},
      showLifecycleStageFilter = true,
    },
    ref,
  ) => {
    const visibleFilterTabs = useMemo(
      () =>
        showLifecycleStageFilter
          ? LEAD_FILTER_TAB_CONFIG
          : LEAD_FILTER_TAB_CONFIG.filter((tab) => tab.value !== LEAD_FILTER_TABS.LIFECYCLE_STAGE),
      [showLifecycleStageFilter],
    );

    const defaultActiveTab = visibleFilterTabs[0]?.value ?? LEAD_FILTER_TABS.STATUS;
    const [activeTab, setActiveTab] = useState(defaultActiveTab);
    const [searchText, setSearchText] = useState('');
    const [filters, setFilters] = useState({
      lifecycle_stage: [],
      status: [],
      lead_of: [],
      sales_owner: [],
      inside_sales: [],
      product: [],
      lead_source: [],
      city: [],
      lead_relevance: [],
      need_urgency: [],
      info_call_status: [],
      lost_reason: [],
      created_at: { ...DEFAULT_DATETIME_FILTER },
      last_modified_at: { ...DEFAULT_DATETIME_FILTER },
    });
    const previousOpenRef = useRef(open);
    const debouncedSearch = useDebounce(searchText, 300);

    useEffect(() => {
      if (!visibleFilterTabs.some((tab) => tab.value === activeTab)) {
        setActiveTab(defaultActiveTab);
      }
    }, [activeTab, defaultActiveTab, visibleFilterTabs]);

    useEffect(() => {
      setFilters({
        lifecycle_stage: showLifecycleStageFilter
          ? Array.isArray(appliedFilters.lifecycle_stage)
            ? appliedFilters.lifecycle_stage
            : []
          : [],
        status: Array.isArray(appliedFilters.status) ? appliedFilters.status : [],
        lead_of: Array.isArray(appliedFilters.lead_of) ? appliedFilters.lead_of : [],
        sales_owner: Array.isArray(appliedFilters.sales_owner) ? appliedFilters.sales_owner : [],
        inside_sales: Array.isArray(appliedFilters.inside_sales) ? appliedFilters.inside_sales : [],
        product: Array.isArray(appliedFilters.product) ? appliedFilters.product : [],
        lead_source: Array.isArray(appliedFilters.lead_source) ? appliedFilters.lead_source : [],
        city: Array.isArray(appliedFilters.city) ? appliedFilters.city : [],
        lead_relevance: Array.isArray(appliedFilters.lead_relevance)
          ? appliedFilters.lead_relevance
          : [],
        need_urgency: Array.isArray(appliedFilters.need_urgency) ? appliedFilters.need_urgency : [],
        info_call_status: Array.isArray(appliedFilters.info_call_status)
          ? appliedFilters.info_call_status
          : [],
        lost_reason: Array.isArray(appliedFilters.lost_reason) ? appliedFilters.lost_reason : [],
        created_at: normalizeDatetimeFilter(appliedFilters.created_at),
        last_modified_at: normalizeDatetimeFilter(appliedFilters.last_modified_at),
      });
    }, [appliedFilters, showLifecycleStageFilter]);

    useEffect(() => {
      const arrayCount = Object.entries(filters).reduce((accumulator, [key, current]) => {
        if (key === 'created_at' || key === 'last_modified_at') return accumulator;
        if (key === 'lifecycle_stage' && !showLifecycleStageFilter) return accumulator;
        return accumulator + (Array.isArray(current) ? current.length : 0);
      }, 0);
      const count =
        arrayCount +
        countActiveDatetimeFilter(filters.created_at) +
        countActiveDatetimeFilter(filters.last_modified_at);
      setFilterCount?.(count);
    }, [filters, setFilterCount, showLifecycleStageFilter]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    const buildFiltersObject = useCallback(
      () => ({
        lifecycle_stage: showLifecycleStageFilter ? filters.lifecycle_stage : [],
        status: filters.status,
        lead_of: filters.lead_of,
        sales_owner: filters.sales_owner,
        inside_sales: filters.inside_sales,
        product: filters.product,
        lead_source: filters.lead_source,
        city: filters.city,
        lead_relevance: filters.lead_relevance,
        need_urgency: filters.need_urgency,
        info_call_status: filters.info_call_status,
        lost_reason: filters.lost_reason,
        created_at: normalizeDatetimeFilter(filters.created_at),
        last_modified_at: normalizeDatetimeFilter(filters.last_modified_at),
      }),
      [filters, showLifecycleStageFilter],
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
        case LEAD_FILTER_TABS.LIFECYCLE_STAGE:
          options = leadOptions.stages?.length ? leadOptions.stages : LIFECYCLE_STAGE_OPTIONS;
          break;
        case LEAD_FILTER_TABS.STATUS:
          options = leadOptions.allStatuses?.length ? leadOptions.allStatuses : LEAD_STATUS_OPTIONS;
          break;
        case LEAD_FILTER_TABS.LEAD_OF:
          options = leadOptions.lead_of ?? [];
          break;
        case LEAD_FILTER_TABS.SALES_OWNER:
          options = leadOptions.sales_owner?.length ? leadOptions.sales_owner : [];
          break;
        case LEAD_FILTER_TABS.INSIDE_SALES:
          options = leadOptions.inside_sales?.length ? leadOptions.inside_sales : [];
          break;
        case LEAD_FILTER_TABS.PRODUCT:
          options = leadOptions.product ?? [];
          break;
        case LEAD_FILTER_TABS.LEAD_SOURCE:
          options = leadOptions.lead_source ?? [];
          break;
        case LEAD_FILTER_TABS.CITY:
          options = INDIA_CITY_OPTIONS;
          break;
        case LEAD_FILTER_TABS.LEAD_RELEVANCE:
          options = leadOptions.lead_relevance ?? [];
          break;
        case LEAD_FILTER_TABS.NEED_URGENCY:
          options = leadOptions.need_urgency ?? [];
          break;
        case LEAD_FILTER_TABS.INFO_CALL_STATUS:
          options = leadOptions.info_call_status ?? [];
          break;
        case LEAD_FILTER_TABS.LOST_REASON:
          options = leadOptions.lost_reason ?? [];
          break;
        default:
          options = [];
      }

      if (debouncedSearch.trim()) {
        const needle = debouncedSearch.toLowerCase();
        options = options.filter(
          (opt) =>
            opt.label?.toLowerCase().includes(needle) || opt.value?.toLowerCase().includes(needle),
        );
      }
      return options;
    }, [activeTab, debouncedSearch, leadOptions]);

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
        lifecycle_stage: [],
        status: [],
        lead_of: [],
        sales_owner: [],
        inside_sales: [],
        product: [],
        lead_source: [],
        city: [],
        lead_relevance: [],
        need_urgency: [],
        info_call_status: [],
        lost_reason: [],
        created_at: { ...DEFAULT_DATETIME_FILTER },
        last_modified_at: { ...DEFAULT_DATETIME_FILTER },
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
      activeTab === LEAD_FILTER_TABS.CREATED_AT || activeTab === LEAD_FILTER_TABS.LAST_MODIFIED;

    if (!open) return null;

    return (
      <Filter.Root onInteractOutside={handlePopoverClose} onEscapeKeyDown={handlePopoverClose}>
        <Filter.Header title='FILTERS' onClear={handleClear} />
        <Filter.Body className={isDatetimeTab ? 'h-auto min-h-[420px]' : undefined}>
          <Filter.Sidebar width='180px'>
            <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
              <TabMenuVertical.List className='p-2 border-r-0'>
                {visibleFilterTabs.map((tab) => {
                  const count =
                    tab.value === LEAD_FILTER_TABS.CREATED_AT ||
                    tab.value === LEAD_FILTER_TABS.LAST_MODIFIED
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
                searchPlaceholder={
                  activeTab === LEAD_FILTER_TABS.CITY ? 'Search city...' : 'Search...'
                }
                emptyMessage={
                  activeTab === LEAD_FILTER_TABS.CITY && debouncedSearch.trim()
                    ? 'No cities found'
                    : `No ${activeTab.replaceAll('_', ' ')} found`
                }
              />
            )}
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

CrmLeadsFilterDropdown.displayName = 'CrmLeadsFilterDropdown';

export default CrmLeadsFilterDropdown;
