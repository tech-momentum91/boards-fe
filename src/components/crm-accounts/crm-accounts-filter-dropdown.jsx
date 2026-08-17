import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useImperativeHandle,
} from 'react';
import { RiArrowRightSLine, RiSearchLine } from 'react-icons/ri';
import * as Input from '@/components/ui/input';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import { useDebounce } from '@/hooks/use-debounce';
import { getCustomerGroupList, getIndustryTypeList } from '@/api/crmAccounts';
import { formatAndSortIndustryOptionGroups } from '@/lib/utils';
import { DateTimeFilterPanel } from '@/components/ui/datetime-filter-panel';
import {
  countActiveDatetimeFilter,
  getDatetimeFilterCalendarSelection,
  normalizeDatetimeFilter,
  shouldShowDatetimeCalendar,
  toIsoDateString,
} from '@/utils/date-utils';
import {
  ACCOUNT_FILTER_TABS,
  ACCOUNT_FILTER_TAB_CONFIG,
  DEFAULT_DATETIME_FILTER,
} from './constants';

const CrmAccountsFilterDropdown = React.forwardRef(
  (
    { open, onOpenChange: _onOpenChange, setFilterCount, onFiltersChange, appliedFilters = {} },
    ref,
  ) => {
    const [activeTab, setActiveTab] = useState(ACCOUNT_FILTER_TABS.TYPE_OF_ORGANIZATION);
    const [searchText, setSearchText] = useState('');
    const [typeOfOrgOptions, setTypeOfOrgOptions] = useState([]);
    const [industryGroups, setIndustryGroups] = useState([]);
    const [industryGroupsLoading, setIndustryGroupsLoading] = useState(false);
    const [filters, setFilters] = useState({
      type_of_organization: [],
      industry: [],
      created_at: { ...DEFAULT_DATETIME_FILTER },
      last_modified_at: { ...DEFAULT_DATETIME_FILTER },
    });
    const previousOpenRef = useRef(open);
    const debouncedSearch = useDebounce(searchText, 300);

    useEffect(() => {
      if (!open) return;
      let isMounted = true;
      setIndustryGroupsLoading(true);
      Promise.all([getCustomerGroupList(), getIndustryTypeList({ grouped: true, scope: 'crm' })])
        .then(([orgList, indOptions]) => {
          if (!isMounted) return;
          setTypeOfOrgOptions(orgList);
          const groups = Array.isArray(indOptions?.industry_type)
            ? indOptions.industry_type.filter(
                (group) => Array.isArray(group?.industry_name) && group.industry_name.length > 0,
              )
            : [];
          setIndustryGroups(groups);
        })
        .catch(() => {
          if (isMounted) {
            setTypeOfOrgOptions([]);
            setIndustryGroups([]);
          }
        })
        .finally(() => {
          if (isMounted) setIndustryGroupsLoading(false);
        });
      return () => {
        isMounted = false;
      };
    }, [open]);

    const industryOptionGroups = useMemo(() => {
      return formatAndSortIndustryOptionGroups(industryGroups);
    }, [industryGroups]);

    const filteredIndustryOptionGroups = useMemo(() => {
      const q = debouncedSearch.trim().toLowerCase();
      if (!q) return industryOptionGroups;
      return industryOptionGroups
        .map((g) => ({
          ...g,
          options: (Array.isArray(g.options) ? g.options : []).filter((opt) => {
            const optionValue = typeof opt === 'object' ? opt.value : opt;
            const optionLabel = typeof opt === 'object' ? opt.label : opt;
            return (
              String(optionLabel || '')
                .toLowerCase()
                .includes(q) ||
              String(optionValue || '')
                .toLowerCase()
                .includes(q) ||
              String(g.label || '')
                .toLowerCase()
                .includes(q)
            );
          }),
        }))
        .filter((g) => (g.options || []).length > 0);
    }, [industryOptionGroups, debouncedSearch]);

    // Sync applied filters on open
    useEffect(() => {
      setFilters({
        type_of_organization: Array.isArray(appliedFilters.type_of_organization)
          ? appliedFilters.type_of_organization
          : appliedFilters.type_of_organization
            ? [appliedFilters.type_of_organization]
            : [],
        industry: Array.isArray(appliedFilters.industry)
          ? appliedFilters.industry
          : appliedFilters.industry
            ? [appliedFilters.industry]
            : [],
        created_at: normalizeDatetimeFilter(appliedFilters.created_at),
        last_modified_at: normalizeDatetimeFilter(appliedFilters.last_modified_at),
      });
    }, [appliedFilters]);

    // Update filter count badge
    useEffect(() => {
      const count =
        filters.type_of_organization.length +
        filters.industry.length +
        countActiveDatetimeFilter(filters.created_at) +
        countActiveDatetimeFilter(filters.last_modified_at);
      setFilterCount?.(count);
    }, [
      filters.type_of_organization.length,
      filters.industry.length,
      filters.created_at,
      filters.last_modified_at,
      setFilterCount,
    ]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    const buildFiltersObject = useCallback(
      () => ({
        type_of_organization: filters.type_of_organization,
        industry: filters.industry,
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
      if (activeTab === ACCOUNT_FILTER_TABS.INDUSTRY) return [];

      let options = activeTab === ACCOUNT_FILTER_TABS.TYPE_OF_ORGANIZATION ? typeOfOrgOptions : [];

      if (debouncedSearch.trim()) {
        const needle = debouncedSearch.toLowerCase();
        options = options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(needle) || opt.value.toLowerCase().includes(needle),
        );
      }

      return options;
    }, [activeTab, debouncedSearch, typeOfOrgOptions]);

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
      setFilters({
        type_of_organization: [],
        industry: [],
        created_at: { ...DEFAULT_DATETIME_FILTER },
        last_modified_at: { ...DEFAULT_DATETIME_FILTER },
      });
      setSearchText('');
    };

    const handleDatetimeFilterChange = useCallback((tab, nextValue) => {
      setFilters((previous) => ({
        ...previous,
        [tab]: normalizeDatetimeFilter(nextValue),
      }));
    }, []);

    const isDatetimeTab =
      activeTab === ACCOUNT_FILTER_TABS.CREATED_AT ||
      activeTab === ACCOUNT_FILTER_TABS.LAST_MODIFIED;

    if (!open) return null;

    return (
      <Filter.Root onInteractOutside={handlePopoverClose} onEscapeKeyDown={handlePopoverClose}>
        <Filter.Header title='FILTERS' onClear={handleClear} />

        <Filter.Body className={isDatetimeTab ? 'h-auto min-h-[420px]' : undefined}>
          <Filter.Sidebar width='180px'>
            <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
              <TabMenuVertical.List className='p-2 border-r-0'>
                {ACCOUNT_FILTER_TAB_CONFIG.map((tab) => {
                  const count =
                    tab.value === ACCOUNT_FILTER_TABS.CREATED_AT ||
                    tab.value === ACCOUNT_FILTER_TABS.LAST_MODIFIED
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
            ) : activeTab === ACCOUNT_FILTER_TABS.INDUSTRY ? (
              <div className='flex h-full flex-col gap-4'>
                <div className='flex min-h-0 flex-col gap-2 overflow-y-auto'>
                  <div className='p-2 pb-0'>
                    <Input.Root size='xsmall' className='shrink-0'>
                      <Input.Wrapper>
                        <Input.Icon>
                          <RiSearchLine />
                        </Input.Icon>
                        <Input.Input
                          placeholder='Search...'
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          autoFocus
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  </div>
                  <div className='flex min-h-0 w-full flex-col gap-1 overflow-y-auto'>
                    {industryGroupsLoading ? (
                      <div className='p-2 text-center text-paragraph-sm text-text-sub-600'>
                        Loading...
                      </div>
                    ) : filteredIndustryOptionGroups.length === 0 ? (
                      <div className='p-2 text-center text-paragraph-sm text-text-sub-600'>
                        {`No ${activeTab.replaceAll('_', ' ')} found`}
                      </div>
                    ) : (
                      filteredIndustryOptionGroups.map((g) => (
                        <div key={g.value ?? g.label} className='flex flex-col gap-0.5'>
                          <div className='select-none px-2 pb-1 pt-2 text-paragraph-xs font-medium text-text-soft-400'>
                            {g.label}
                          </div>
                          {(g.options || []).map((option) => {
                            const optionValue = typeof option === 'object' ? option.value : option;
                            const optionLabel = typeof option === 'object' ? option.label : option;
                            const selected = (filters.industry || []).includes(optionValue);
                            return (
                              <Filter.ListItem
                                key={`${g.value ?? g.label}-${optionValue}`}
                                value={optionValue}
                                label={optionLabel}
                                checked={selected}
                                onToggle={handleToggle}
                              />
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
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

CrmAccountsFilterDropdown.displayName = 'CrmAccountsFilterDropdown';

export default CrmAccountsFilterDropdown;
