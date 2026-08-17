import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from 'react';
import { RiArrowRightSLine, RiSearchLine } from 'react-icons/ri';
import { State, City } from 'country-state-city';

import * as Input from '@/components/ui/input';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import { DateTimeFilterPanel } from '@/components/ui/datetime-filter-panel';
import { getIndustryTypeList } from '@/api/crmAccounts';
import { DEFAULT_DATETIME_FILTER } from '@/components/crm-accounts/constants';
import { countActiveDatetimeFilter, normalizeDatetimeFilter } from '@/utils/date-utils';
import { CP_TYPE_SELECT_OPTIONS, DEFAULT_CP_ACCOUNTS_FILTERS } from './constants';
import { formatAndSortIndustryOptionGroups } from '@/lib/utils';

const ARRAY_FILTER_KEYS = [
  { key: 'state', label: 'State' },
  { key: 'city', label: 'City' },
  { key: 'type', label: 'Type' },
  { key: 'industry', label: 'Industry' },
  { key: 'salesOwner', label: 'Sales Owner' },
];

const DATETIME_FILTER_KEYS = [
  { key: 'created_at', label: 'Created At' },
  { key: 'last_modified_at', label: 'Last Modified' },
];

const FILTER_TABS = [...ARRAY_FILTER_KEYS, ...DATETIME_FILTER_KEYS];

const DEFAULT_OPTIONS = {
  type: CP_TYPE_SELECT_OPTIONS,
  industry: [],
  city: null,
  state: null,
  salesOwner: [],
};

const CpAccountsFilterDropdown = React.forwardRef(
  ({ setFilterCount, open, onFiltersChange, appliedFilters = {}, filterOptions = null }, ref) => {
    const [activeTab, setActiveTab] = useState('state');
    const [localFilters, setLocalFilters] = useState(() => ({
      ...DEFAULT_CP_ACCOUNTS_FILTERS,
      ...ARRAY_FILTER_KEYS.reduce(
        (acc, { key }) => ({
          ...acc,
          [key]: Array.isArray(appliedFilters[key])
            ? appliedFilters[key]
            : appliedFilters[key]
              ? [appliedFilters[key]]
              : [],
        }),
        {},
      ),
      created_at: normalizeDatetimeFilter(appliedFilters.created_at),
      last_modified_at: normalizeDatetimeFilter(appliedFilters.last_modified_at),
    }));
    const [searchText, setSearchText] = useState('');
    const [industryGroups, setIndustryGroups] = useState([]);
    const [industryGroupsLoading, setIndustryGroupsLoading] = useState(false);
    const popoverRef = useRef(null);

    const totalCount = useMemo(() => {
      const arrayCount = ARRAY_FILTER_KEYS.reduce(
        (sum, { key }) => sum + (localFilters[key]?.length ?? 0),
        0,
      );
      return (
        arrayCount +
        countActiveDatetimeFilter(localFilters.created_at) +
        countActiveDatetimeFilter(localFilters.last_modified_at)
      );
    }, [localFilters]);

    useEffect(() => {
      setFilterCount?.(totalCount);
    }, [totalCount, setFilterCount]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    useEffect(() => {
      if (!open) return;
      let isMounted = true;
      setIndustryGroupsLoading(true);
      getIndustryTypeList({ grouped: true, scope: 'cp' })
        .then((options) => {
          if (!isMounted) return;
          const groups = Array.isArray(options?.industry_type)
            ? options.industry_type.filter(
                (group) => Array.isArray(group?.industry_name) && group.industry_name.length > 0,
              )
            : [];
          setIndustryGroups(groups);
        })
        .catch(() => {
          if (isMounted) setIndustryGroups([]);
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
      const q = searchText.trim().toLowerCase();
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
    }, [industryOptionGroups, searchText]);

    useEffect(() => {
      setLocalFilters({
        ...DEFAULT_CP_ACCOUNTS_FILTERS,
        ...ARRAY_FILTER_KEYS.reduce(
          (acc, { key }) => ({
            ...acc,
            [key]: Array.isArray(appliedFilters[key])
              ? appliedFilters[key]
              : appliedFilters[key]
                ? [appliedFilters[key]]
                : [],
          }),
          {},
        ),
        created_at: normalizeDatetimeFilter(appliedFilters.created_at),
        last_modified_at: normalizeDatetimeFilter(appliedFilters.last_modified_at),
      });
    }, [appliedFilters]);

    const defaultStateOptions = useMemo(
      () =>
        State.getStatesOfCountry('IN').map((s) => ({
          value: s.name,
          label: s.name,
        })),
      [],
    );

    const defaultCityOptions = useMemo(() => {
      const states = State.getStatesOfCountry('IN');
      const cityList = [];
      const seen = new Set();
      states.forEach((s) => {
        City.getCitiesOfState('IN', s.isoCode).forEach((c) => {
          const cityName = c?.name?.trim();
          if (cityName && !seen.has(cityName)) {
            seen.add(cityName);
            cityList.push({ value: cityName, label: cityName });
          }
        });
      });
      return cityList.sort((a, b) => a.label.localeCompare(b.label));
    }, []);

    const mergeOptions = useCallback((baseOptions, extraOptions) => {
      const optionMap = new Map();
      [...(baseOptions || []), ...(extraOptions || [])].forEach((option) => {
        const value = typeof option === 'object' ? option.value : option;
        const label = typeof option === 'object' ? option.label : option;
        if (!value) return;
        optionMap.set(value, { value, label: label || value });
      });
      return [...optionMap.values()].sort((a, b) => a.label.localeCompare(b.label));
    }, []);

    const optionsByTab = useMemo(() => {
      const merged = { ...DEFAULT_OPTIONS, ...filterOptions };
      merged.state = mergeOptions(defaultStateOptions, filterOptions?.state);
      merged.city = mergeOptions(defaultCityOptions, filterOptions?.city);
      return merged;
    }, [filterOptions, defaultStateOptions, defaultCityOptions, mergeOptions]);

    const currentOptions = useMemo(() => {
      if (activeTab === 'industry') return [];
      const options = optionsByTab[activeTab] ?? [];
      if (!searchText.trim()) return options;
      const q = searchText.toLowerCase();
      return options.filter(
        (opt) =>
          (opt.label || '').toLowerCase().includes(q) ||
          (opt.value || '').toLowerCase().includes(q),
      );
    }, [optionsByTab, activeTab, searchText]);

    const handleToggle = useCallback(
      (value) => {
        setLocalFilters((prev) => {
          const current = Array.isArray(prev[activeTab]) ? prev[activeTab] : [];
          const isSelected = current.includes(value);
          return {
            ...prev,
            [activeTab]: isSelected ? current.filter((t) => t !== value) : [...current, value],
          };
        });
      },
      [activeTab],
    );

    const handleClear = useCallback(() => {
      const cleared = { ...DEFAULT_CP_ACCOUNTS_FILTERS };
      setLocalFilters(cleared);
      setSearchText('');
      onFiltersChange?.(cleared);
    }, [onFiltersChange]);

    const buildFiltersObject = useCallback(
      () => ({
        type: localFilters.type,
        industry: localFilters.industry,
        city: localFilters.city,
        state: localFilters.state,
        salesOwner: localFilters.salesOwner,
        created_at: normalizeDatetimeFilter(localFilters.created_at),
        last_modified_at: normalizeDatetimeFilter(localFilters.last_modified_at),
      }),
      [localFilters],
    );

    const handlePopoverClose = useCallback(() => {
      onFiltersChange?.(buildFiltersObject());
    }, [buildFiltersObject, onFiltersChange]);

    const handleDatetimeFilterChange = useCallback((tab, nextValue) => {
      setLocalFilters((previous) => ({
        ...previous,
        [tab]: normalizeDatetimeFilter(nextValue),
      }));
    }, []);

    const prevOpenRef = useRef(open);
    useEffect(() => {
      if (prevOpenRef.current && !open) {
        handlePopoverClose();
      }
      prevOpenRef.current = open;
    }, [open, handlePopoverClose]);

    useImperativeHandle(ref, () => ({
      handleClose: handlePopoverClose,
    }));

    const isDatetimeTab = activeTab === 'created_at' || activeTab === 'last_modified_at';

    if (!open) return null;

    return (
      <Filter.Root
        ref={popoverRef}
        onInteractOutside={handlePopoverClose}
        onEscapeKeyDown={handlePopoverClose}
      >
        <Filter.Header title='FILTERS' onClear={handleClear} />
        <Filter.Body className={isDatetimeTab ? 'h-auto min-h-[420px]' : undefined}>
          <Filter.Sidebar width='180px'>
            <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
              <TabMenuVertical.List className='p-2 border-r-0'>
                {FILTER_TABS.map((item) => {
                  const count =
                    item.key === 'created_at' || item.key === 'last_modified_at'
                      ? countActiveDatetimeFilter(localFilters[item.key])
                      : (localFilters[item.key]?.length ?? 0);
                  const showCount = count > 0;
                  return (
                    <TabMenuVertical.Trigger
                      className='w-full flex items-center justify-between'
                      key={item.key}
                      value={item.key}
                    >
                      {item.label}
                      {showCount ? (
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
                value={localFilters[activeTab]}
                onChange={(nextValue) => handleDatetimeFilterChange(activeTab, nextValue)}
              />
            ) : activeTab === 'industry' ? (
              <div className='flex flex-col gap-4 h-full'>
                <div className='flex flex-col gap-2 overflow-y-auto min-h-0'>
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
                  <div className='flex w-full min-h-0 flex-col gap-1 overflow-y-auto'>
                    {industryGroupsLoading ? (
                      <div className='p-2 text-center text-paragraph-sm text-text-sub-600'>
                        Loading...
                      </div>
                    ) : filteredIndustryOptionGroups.length === 0 ? (
                      <div className='p-2 text-center text-paragraph-sm text-text-sub-600'>
                        No options found
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
                            const selected = (localFilters.industry || []).includes(optionValue);
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
                selectedValues={localFilters[activeTab] || []}
                onToggle={handleToggle}
                searchValue={searchText}
                onSearchChange={setSearchText}
                searchPlaceholder='Search...'
                emptyMessage='No options found'
              />
            )}
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

CpAccountsFilterDropdown.displayName = 'CpAccountsFilterDropdown';

export default CpAccountsFilterDropdown;
