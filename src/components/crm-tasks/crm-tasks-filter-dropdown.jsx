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
import { useDebounce } from '@/hooks/use-debounce';
import {
  TASK_FILTER_TABS,
  TASK_FILTER_TAB_CONFIG,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from './constants';

function normalizeTaskTypeOptions(taskTypeOptions) {
  const list = Array.isArray(taskTypeOptions) ? taskTypeOptions : [];
  return list
    .map((opt) => {
      if (typeof opt === 'string') {
        return { label: opt, value: opt };
      }
      const value = opt?.name ?? opt?.type ?? opt?.value ?? '';
      const label = opt?.type ?? opt?.name ?? String(value);
      return value ? { label, value } : null;
    })
    .filter(Boolean);
}

const CrmTasksFilterDropdown = React.forwardRef(
  (
    {
      open,
      onOpenChange: _onOpenChange,
      setFilterCount,
      onFiltersChange,
      appliedFilters = {},
      taskTypeOptions = [],
    },
    ref,
  ) => {
    const [activeTab, setActiveTab] = useState(TASK_FILTER_TABS.TYPE);
    const [searchText, setSearchText] = useState('');
    const [filters, setFilters] = useState({
      type: [],
      priority: [],
      status: [],
    });
    const previousOpenRef = useRef(open);
    const debouncedSearch = useDebounce(searchText, 300);

    useEffect(() => {
      setFilters({
        type: Array.isArray(appliedFilters.type) ? appliedFilters.type : [],
        priority: Array.isArray(appliedFilters.priority) ? appliedFilters.priority : [],
        status: Array.isArray(appliedFilters.status) ? appliedFilters.status : [],
      });
    }, [appliedFilters]);

    useEffect(() => {
      const count =
        (filters.type?.length || 0) +
        (filters.priority?.length || 0) +
        (filters.status?.length || 0);
      setFilterCount?.(count);
    }, [filters, setFilterCount]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    const buildFiltersObject = useCallback(() => ({ ...filters }), [filters]);

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

    const typeOptionsNormalized = useMemo(
      () => normalizeTaskTypeOptions(taskTypeOptions),
      [taskTypeOptions],
    );

    const priorityOptions = useMemo(
      () => TASK_PRIORITY_OPTIONS.map((p) => ({ label: p, value: p })),
      [],
    );

    const statusOptions = useMemo(
      () => TASK_STATUS_OPTIONS.map((s) => ({ label: s, value: s })),
      [],
    );

    const currentOptions = useMemo(() => {
      let options = [];
      switch (activeTab) {
        case TASK_FILTER_TABS.TYPE:
          options = typeOptionsNormalized;
          break;
        case TASK_FILTER_TABS.PRIORITY:
          options = priorityOptions;
          break;
        case TASK_FILTER_TABS.STATUS:
          options = statusOptions;
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
    }, [activeTab, debouncedSearch, typeOptionsNormalized, priorityOptions, statusOptions]);

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
        type: [],
        priority: [],
        status: [],
      });
      setSearchText('');
    };

    const tabLabelForEmpty = useMemo(() => {
      const cfg = TASK_FILTER_TAB_CONFIG.find((t) => t.value === activeTab);
      return cfg?.label?.toLowerCase() ?? activeTab;
    }, [activeTab]);

    if (!open) return null;

    return (
      <Filter.Root onInteractOutside={handlePopoverClose} onEscapeKeyDown={handlePopoverClose}>
        <Filter.Header title='FILTERS' onClear={handleClear} />

        <Filter.Body>
          <Filter.Sidebar width='180px'>
            <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
              <TabMenuVertical.List className='p-2 border-r-0'>
                {TASK_FILTER_TAB_CONFIG.map((tab) => {
                  const count = filters[tab.value]?.length || 0;
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

          <Filter.Content width='300px'>
            <Filter.List
              options={currentOptions}
              selectedValues={filters[activeTab] || []}
              onToggle={handleToggle}
              searchValue={searchText}
              onSearchChange={setSearchText}
              virtualized
              emptyMessage={`No ${tabLabelForEmpty} found`}
            />
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

CrmTasksFilterDropdown.displayName = 'CrmTasksFilterDropdown';

export default CrmTasksFilterDropdown;
