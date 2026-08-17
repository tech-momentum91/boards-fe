import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import { State, City } from 'country-state-city';
import { getSalesTeamUserList } from '@/api/crmAccounts';

import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import { DateTimeFilterPanel } from '@/components/ui/datetime-filter-panel';
import { countActiveDatetimeFilter, normalizeDatetimeFilter } from '@/utils/date-utils';
import { DEFAULT_CP_CONTACTS_FILTERS } from './constants-cp-contacts';

const ARRAY_FILTER_KEYS = [
  { key: 'salesOwner', label: 'Sales Owner' },
  { key: 'designation', label: 'Designation' },
  { key: 'department', label: 'Department' },
  { key: 'state', label: 'State' },
  { key: 'city', label: 'City' },
];

const DATETIME_FILTER_KEYS = [
  { key: 'created_at', label: 'Created At' },
  { key: 'last_modified_at', label: 'Last Modified' },
];

const FILTER_TABS = [...ARRAY_FILTER_KEYS, ...DATETIME_FILTER_KEYS];

function toArray(v) {
  if (Array.isArray(v)) return v;
  if (v != null && v !== '') return [v];
  return [];
}

const CpContactsFilterDropdown = React.forwardRef(
  (
    {
      setFilterCount,
      open,
      onFiltersChange,
      appliedFilters = {},
      filterOptions = {},
      filterOptionsLoading = false,
    },
    ref,
  ) => {
    const [activeTab, setActiveTab] = useState('salesOwner');
    const [localFilters, setLocalFilters] = useState(() => ({
      ...DEFAULT_CP_CONTACTS_FILTERS,
      cpAccount: toArray(appliedFilters.cpAccount),
      salesOwner: toArray(appliedFilters.salesOwner),
      designation: toArray(appliedFilters.designation),
      department: toArray(appliedFilters.department),
      state: toArray(appliedFilters.state),
      city: toArray(appliedFilters.city),
      created_at: normalizeDatetimeFilter(appliedFilters.created_at),
      last_modified_at: normalizeDatetimeFilter(appliedFilters.last_modified_at),
    }));
    const [searchText, setSearchText] = useState('');
    const [salesOwnerOptions, setSalesOwnerOptions] = useState([]);
    const [salesOwnerOptionsLoading, setSalesOwnerOptionsLoading] = useState(false);
    const [hasLoadedSalesOwners, setHasLoadedSalesOwners] = useState(false);
    const popoverRef = useRef(null);

    const totalFilterCount = useMemo(() => {
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
      setFilterCount?.(totalFilterCount);
    }, [totalFilterCount, setFilterCount]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    useEffect(() => {
      setLocalFilters({
        ...DEFAULT_CP_CONTACTS_FILTERS,
        cpAccount: toArray(appliedFilters.cpAccount),
        salesOwner: toArray(appliedFilters.salesOwner),
        designation: toArray(appliedFilters.designation),
        department: toArray(appliedFilters.department),
        state: toArray(appliedFilters.state),
        city: toArray(appliedFilters.city),
        created_at: normalizeDatetimeFilter(appliedFilters.created_at),
        last_modified_at: normalizeDatetimeFilter(appliedFilters.last_modified_at),
      });
    }, [appliedFilters]);

    useEffect(() => {
      let mounted = true;
      const shouldLoadSalesOwners = open && !hasLoadedSalesOwners;
      if (!shouldLoadSalesOwners) return () => {};

      const loadSalesOwners = async () => {
        setSalesOwnerOptionsLoading(true);
        try {
          const response = await getSalesTeamUserList();
          if (!mounted) return;
          const normalized = Array.isArray(response)
            ? response
                .map((opt) => {
                  if (typeof opt === 'string') {
                    return { value: opt, label: opt };
                  }
                  const value = opt?.value ?? opt?.name ?? opt?.email ?? '';
                  const label = opt?.label ?? opt?.full_name ?? value;
                  return value ? { value, label } : null;
                })
                .filter(Boolean)
            : [];
          setSalesOwnerOptions(normalized);
        } catch {
          if (mounted) setSalesOwnerOptions([]);
        } finally {
          if (mounted) {
            setSalesOwnerOptionsLoading(false);
            setHasLoadedSalesOwners(true);
          }
        }
      };

      loadSalesOwners();
      return () => {
        mounted = false;
      };
    }, [open, hasLoadedSalesOwners]);

    const stateOptions = useMemo(
      () =>
        State.getStatesOfCountry('IN').map((s) => ({
          value: s.isoCode,
          label: s.name,
        })),
      [],
    );

    const cityOptions = useMemo(() => {
      const states = State.getStatesOfCountry('IN');
      const cityList = [];
      const seen = new Set();
      states.forEach((s) => {
        City.getCitiesOfState('IN', s.isoCode).forEach((c) => {
          if (!seen.has(c.name)) {
            seen.add(c.name);
            cityList.push({ value: c.name, label: c.name });
          }
        });
      });
      return cityList.sort((a, b) => a.label.localeCompare(b.label));
    }, []);

    const optionsForTab = useMemo(() => {
      if (activeTab === 'state') return stateOptions;
      if (activeTab === 'city') return cityOptions;
      if (activeTab === 'salesOwner') return salesOwnerOptions;
      return filterOptions[activeTab] ?? [];
    }, [activeTab, stateOptions, cityOptions, salesOwnerOptions, filterOptions]);

    const currentOptions = useMemo(() => {
      if (!searchText.trim()) return optionsForTab;
      const q = searchText.toLowerCase();
      return optionsForTab.filter(
        (opt) =>
          (opt.label && String(opt.label).toLowerCase().includes(q)) ||
          (opt.value && String(opt.value).toLowerCase().includes(q)),
      );
    }, [optionsForTab, searchText]);

    const handleToggle = useCallback(
      (value) => {
        setLocalFilters((prev) => {
          const current = prev[activeTab] ?? [];
          const isSelected = current.includes(value);
          return {
            ...prev,
            [activeTab]: isSelected ? current.filter((s) => s !== value) : [...current, value],
          };
        });
      },
      [activeTab],
    );

    const handleClear = useCallback(() => {
      const cleared = { ...DEFAULT_CP_CONTACTS_FILTERS };
      setLocalFilters(cleared);
      setSearchText('');
      onFiltersChange?.(cleared);
    }, [onFiltersChange]);

    const buildFiltersObject = useCallback(
      () => ({
        ...DEFAULT_CP_CONTACTS_FILTERS,
        cpAccount: localFilters.cpAccount ?? [],
        salesOwner: localFilters.salesOwner ?? [],
        designation: localFilters.designation ?? [],
        department: localFilters.department ?? [],
        state: localFilters.state ?? [],
        city: localFilters.city ?? [],
        lifecycleStage: localFilters.lifecycleStage ?? [],
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

          <Filter.Content width={isDatetimeTab ? '320px' : '300px'}>
            {isDatetimeTab ? (
              <DateTimeFilterPanel
                value={localFilters[activeTab]}
                onChange={(nextValue) => handleDatetimeFilterChange(activeTab, nextValue)}
              />
            ) : filterOptionsLoading || (activeTab === 'salesOwner' && salesOwnerOptionsLoading) ? (
              <div className='flex items-center justify-center py-8 paragraph-small text-text-sub-500'>
                Loading options...
              </div>
            ) : (
              <Filter.List
                options={currentOptions}
                selectedValues={localFilters[activeTab] ?? []}
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

CpContactsFilterDropdown.displayName = 'CpContactsFilterDropdown';

export default CpContactsFilterDropdown;
