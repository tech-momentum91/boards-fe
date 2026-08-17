import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';

import {
  BOQ_FILTER_TAB_IDS,
  BOQ_FILTER_TABS,
  DEFAULT_BOQ_TEMPLATE_FILTERS,
} from '@/components/boq/constants';
import {
  cloneBoqTemplateFilters,
  countBoqActiveFilters,
  EMPTY_BOQ_FILTER_OPTIONS_BY_TAB,
} from '@/components/boq/boq-helper';
import { fetchBoqTemplateFilterTabOptions } from '@/api/boqTemplates';
import { useDebounce } from '@/hooks/use-debounce';
import * as Filter from '@/components/ui/filter';

const DYNAMIC_FILTER_TABS = new Set([BOQ_FILTER_TAB_IDS.PRODUCTS, BOQ_FILTER_TAB_IDS.TAGS]);
const FILTER_OPTIONS_PAGE_SIZE = 20;

const mergeFilterOptions = (previous, nextRows) => {
  const seen = new Set(previous.map((option) => option.value));
  const merged = [...previous];
  for (const row of nextRows) {
    const value = row.value;
    if (!value || seen.has(value)) continue;
    seen.add(value);
    merged.push({
      value,
      label: row.label || value,
    });
  }
  return merged;
};

const BoqTemplatesFilterDropdown = React.forwardRef(
  (
    {
      open,
      onFiltersChange,
      appliedFilters = DEFAULT_BOQ_TEMPLATE_FILTERS,
      filterOptionsByTab,
      setFilterCount,
    },
    ref,
  ) => {
    const [activeTab, setActiveTab] = useState(BOQ_FILTER_TAB_IDS.TYPE);
    const [searchText, setSearchText] = useState('');
    const [listOptions, setListOptions] = useState([]);
    const [optionsLoading, setOptionsLoading] = useState(false);
    const [optionsLoadingMore, setOptionsLoadingMore] = useState(false);
    const [hasMoreOptions, setHasMoreOptions] = useState(false);
    const [optionsPage, setOptionsPage] = useState(1);
    const [localFilters, setLocalFilters] = useState(() => cloneBoqTemplateFilters(appliedFilters));
    const popoverRef = useRef(null);
    const previousOpenRef = useRef(open);
    const previousOpenForSyncRef = useRef(open);
    const optionsRequestIdRef = useRef(0);
    const debouncedSearch = useDebounce(searchText, 300);

    useEffect(() => {
      if (!open) return;
      setActiveTab(BOQ_FILTER_TAB_IDS.TYPE);
    }, [open]);

    useEffect(() => {
      if (!open) {
        previousOpenForSyncRef.current = false;
        return;
      }
      const justOpened = previousOpenForSyncRef.current === false;
      previousOpenForSyncRef.current = true;
      if (!justOpened) return;
      setLocalFilters(cloneBoqTemplateFilters(appliedFilters));
    }, [open, appliedFilters]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    useEffect(() => {
      if (!open) return;
      setFilterCount?.(countBoqActiveFilters(localFilters));
    }, [open, localFilters, setFilterCount]);

    useEffect(() => {
      if (!open || !DYNAMIC_FILTER_TABS.has(activeTab)) {
        setListOptions([]);
        setHasMoreOptions(false);
        setOptionsPage(1);
        return undefined;
      }

      const requestId = optionsRequestIdRef.current + 1;
      optionsRequestIdRef.current = requestId;
      setOptionsLoading(true);
      setOptionsLoadingMore(false);
      setOptionsPage(1);

      fetchBoqTemplateFilterTabOptions({
        tab: activeTab,
        search: debouncedSearch,
        page: 1,
        limit: FILTER_OPTIONS_PAGE_SIZE,
      })
        .then((result) => {
          if (optionsRequestIdRef.current !== requestId) return;
          setListOptions(mergeFilterOptions([], result.rows));
          setHasMoreOptions(result.hasMore);
          setOptionsPage(result.page);
        })
        .catch(() => {
          if (optionsRequestIdRef.current !== requestId) return;
          setListOptions([]);
          setHasMoreOptions(false);
        })
        .finally(() => {
          if (optionsRequestIdRef.current === requestId) {
            setOptionsLoading(false);
          }
        });

      return () => {
        optionsRequestIdRef.current += 1;
      };
    }, [activeTab, debouncedSearch, open]);

    const loadMoreOptions = useCallback(() => {
      if (!open || !DYNAMIC_FILTER_TABS.has(activeTab)) return;
      if (optionsLoading || optionsLoadingMore || !hasMoreOptions) return;

      const requestId = optionsRequestIdRef.current + 1;
      optionsRequestIdRef.current = requestId;
      const nextPage = optionsPage + 1;
      setOptionsLoadingMore(true);

      fetchBoqTemplateFilterTabOptions({
        tab: activeTab,
        search: debouncedSearch,
        page: nextPage,
        limit: FILTER_OPTIONS_PAGE_SIZE,
      })
        .then((result) => {
          if (optionsRequestIdRef.current !== requestId) return;
          setListOptions((previous) => mergeFilterOptions(previous, result.rows));
          setHasMoreOptions(result.hasMore);
          setOptionsPage(result.page);
        })
        .catch(() => {
          if (optionsRequestIdRef.current !== requestId) return;
          setHasMoreOptions(false);
        })
        .finally(() => {
          if (optionsRequestIdRef.current === requestId) {
            setOptionsLoadingMore(false);
          }
        });
    }, [
      activeTab,
      debouncedSearch,
      hasMoreOptions,
      open,
      optionsLoading,
      optionsLoadingMore,
      optionsPage,
    ]);

    const handlePopoverClose = useCallback(() => {
      const next = cloneBoqTemplateFilters(localFilters);
      const applied = cloneBoqTemplateFilters(appliedFilters);
      if (JSON.stringify(next) !== JSON.stringify(applied)) {
        onFiltersChange?.(next);
      }
    }, [appliedFilters, localFilters, onFiltersChange]);

    useImperativeHandle(ref, () => ({
      handleClose: handlePopoverClose,
    }));

    useEffect(() => {
      if (previousOpenRef.current && !open) {
        handlePopoverClose();
      }
      previousOpenRef.current = open;
    }, [open, handlePopoverClose]);

    const handleClear = useCallback(() => {
      setLocalFilters(cloneBoqTemplateFilters(DEFAULT_BOQ_TEMPLATE_FILTERS));
      setSearchText('');
      setActiveTab(BOQ_FILTER_TAB_IDS.TYPE);
      onFiltersChange?.(cloneBoqTemplateFilters(DEFAULT_BOQ_TEMPLATE_FILTERS));
    }, [onFiltersChange]);

    const optionsByTab = filterOptionsByTab ?? EMPTY_BOQ_FILTER_OPTIONS_BY_TAB;

    const currentOptions = useMemo(() => {
      if (DYNAMIC_FILTER_TABS.has(activeTab)) {
        return listOptions;
      }

      const options = optionsByTab[activeTab] ?? [];
      const sorted = [...options].sort((a, b) => String(a.label).localeCompare(String(b.label)));
      if (!searchText.trim()) return sorted;
      const needle = searchText.toLowerCase().trim();
      return sorted.filter(
        (option) =>
          String(option.label).toLowerCase().includes(needle) ||
          String(option.value).toLowerCase().includes(needle),
      );
    }, [activeTab, listOptions, optionsByTab, searchText]);

    const selectedValuesForTab = useMemo(
      () => localFilters[activeTab] ?? [],
      [activeTab, localFilters],
    );

    const handleToggle = useCallback(
      (value) => {
        setLocalFilters((previous) => {
          const current = previous[activeTab] ?? [];
          const isSelected = current.includes(value);
          const nextValues = isSelected
            ? current.filter((item) => item !== value)
            : [...current, value];
          return { ...previous, [activeTab]: nextValues };
        });
      },
      [activeTab],
    );

    if (!open) return null;

    return (
      <Filter.Root
        ref={popoverRef}
        align='end'
        sideOffset={8}
        onInteractOutside={handlePopoverClose}
        onEscapeKeyDown={handlePopoverClose}
        className='p-0'
      >
        <Filter.Header title='FILTERS' onClear={handleClear} />

        <Filter.Body className='h-[320px]'>
          <Filter.Sidebar width='153px' className='gap-0.5 p-2'>
            {BOQ_FILTER_TABS.map((tab) => (
              <Filter.SidebarItem
                key={tab.value}
                isActive={activeTab === tab.value}
                count={localFilters[tab.value]?.length ?? 0}
                icon={RiArrowRightSLine}
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </Filter.SidebarItem>
            ))}
          </Filter.Sidebar>

          <Filter.Content width='312px' className='p-2'>
            <Filter.List
              options={currentOptions}
              selectedValues={selectedValuesForTab}
              onToggle={handleToggle}
              searchValue={searchText}
              onSearchChange={setSearchText}
              searchPlaceholder='Search...'
              emptyMessage={`No ${BOQ_FILTER_TABS.find((tab) => tab.value === activeTab)?.label?.toLowerCase() ?? 'options'} found`}
              isLoading={DYNAMIC_FILTER_TABS.has(activeTab) ? optionsLoading : false}
              isLoadingMore={DYNAMIC_FILTER_TABS.has(activeTab) ? optionsLoadingMore : false}
              hasMore={DYNAMIC_FILTER_TABS.has(activeTab) ? hasMoreOptions : false}
              onLoadMore={DYNAMIC_FILTER_TABS.has(activeTab) ? loadMoreOptions : undefined}
              virtualized={DYNAMIC_FILTER_TABS.has(activeTab)}
            />
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

BoqTemplatesFilterDropdown.displayName = 'BoqTemplatesFilterDropdown';

export default BoqTemplatesFilterDropdown;
