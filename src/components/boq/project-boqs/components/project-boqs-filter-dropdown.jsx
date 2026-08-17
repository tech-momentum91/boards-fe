import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';

import { fetchProjectBoqClientFilterOptions } from '@/api/projectBoqs';
import {
  DEFAULT_PROJECT_BOQ_FILTERS,
  PROJECT_BOQ_FILTER_TABS,
  PROJECT_BOQ_FILTER_TAB_IDS,
} from '@/components/boq/constants';
import {
  cloneProjectBoqFilters,
  countProjectBoqActiveFilters,
  EMPTY_PROJECT_BOQ_FILTER_OPTIONS_BY_TAB,
} from '@/components/boq/boq-helper';
import { useDebounce } from '@/hooks/use-debounce';
import * as Filter from '@/components/ui/filter';

const CLIENT_FILTER_PAGE_SIZE = 8;

const ProjectBoqsFilterDropdown = React.forwardRef(
  (
    {
      open,
      onFiltersChange,
      appliedFilters = DEFAULT_PROJECT_BOQ_FILTERS,
      filterOptionsByTab,
      setFilterCount,
    },
    ref,
  ) => {
    const [activeTab, setActiveTab] = useState(PROJECT_BOQ_FILTER_TAB_IDS.CLIENT);
    const [searchText, setSearchText] = useState('');
    const [localFilters, setLocalFilters] = useState(() => cloneProjectBoqFilters(appliedFilters));
    const [clientOptions, setClientOptions] = useState([]);
    const [clientPage, setClientPage] = useState(1);
    const [clientHasMore, setClientHasMore] = useState(false);
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [isLoadingMoreClients, setIsLoadingMoreClients] = useState(false);
    const [clientLoadError, setClientLoadError] = useState('');
    const popoverRef = useRef(null);
    const previousOpenRef = useRef(open);
    const previousOpenForSyncRef = useRef(open);
    const clientRequestIdRef = useRef(0);
    const clientLoadMoreInFlightRef = useRef(false);
    const debouncedSearch = useDebounce(searchText, 300);
    const isClientTab = activeTab === PROJECT_BOQ_FILTER_TAB_IDS.CLIENT;

    useEffect(() => {
      if (!open) return;
      setActiveTab(PROJECT_BOQ_FILTER_TAB_IDS.CLIENT);
    }, [open]);

    useEffect(() => {
      if (!open) {
        previousOpenForSyncRef.current = false;
        return;
      }
      const justOpened = previousOpenForSyncRef.current === false;
      previousOpenForSyncRef.current = true;
      if (!justOpened) return;
      setLocalFilters(cloneProjectBoqFilters(appliedFilters));
    }, [open, appliedFilters]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    useEffect(() => {
      if (!open || !isClientTab) return undefined;

      const requestId = clientRequestIdRef.current + 1;
      clientRequestIdRef.current = requestId;
      clientLoadMoreInFlightRef.current = false;
      setClientOptions([]);
      setClientPage(1);
      setClientHasMore(false);
      setClientLoadError('');
      setIsLoadingClients(true);
      setIsLoadingMoreClients(false);

      fetchProjectBoqClientFilterOptions({
        search: debouncedSearch,
        page: 1,
        limit: CLIENT_FILTER_PAGE_SIZE,
      })
        .then((result) => {
          if (clientRequestIdRef.current !== requestId) return;
          setClientOptions(result.options);
          setClientPage(result.page);
          setClientHasMore(result.hasMore);
        })
        .catch(() => {
          if (clientRequestIdRef.current !== requestId) return;
          setClientLoadError('Failed to load clients');
        })
        .finally(() => {
          if (clientRequestIdRef.current === requestId) setIsLoadingClients(false);
        });

      return () => {
        if (clientRequestIdRef.current === requestId) {
          clientRequestIdRef.current += 1;
        }
      };
    }, [debouncedSearch, isClientTab, open]);

    useEffect(() => {
      if (!open) return;
      setFilterCount?.(countProjectBoqActiveFilters(localFilters));
    }, [open, localFilters, setFilterCount]);

    const handlePopoverClose = useCallback(() => {
      const next = cloneProjectBoqFilters(localFilters);
      const applied = cloneProjectBoqFilters(appliedFilters);
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
      setLocalFilters(cloneProjectBoqFilters(DEFAULT_PROJECT_BOQ_FILTERS));
      setSearchText('');
      setActiveTab(PROJECT_BOQ_FILTER_TAB_IDS.CLIENT);
      onFiltersChange?.(cloneProjectBoqFilters(DEFAULT_PROJECT_BOQ_FILTERS));
    }, [onFiltersChange]);

    const optionsByTab = filterOptionsByTab ?? EMPTY_PROJECT_BOQ_FILTER_OPTIONS_BY_TAB;

    const currentOptions = useMemo(() => {
      if (isClientTab) return clientOptions;
      const options = optionsByTab[activeTab] ?? [];
      const sorted = [...options].sort((a, b) => String(a.label).localeCompare(String(b.label)));
      if (!searchText.trim()) return sorted;
      const needle = searchText.toLowerCase().trim();
      return sorted.filter(
        (option) =>
          String(option.label).toLowerCase().includes(needle) ||
          String(option.value).toLowerCase().includes(needle),
      );
    }, [activeTab, clientOptions, isClientTab, optionsByTab, searchText]);

    const handleLoadMoreClients = useCallback(() => {
      if (
        !open ||
        !isClientTab ||
        !clientHasMore ||
        isLoadingClients ||
        clientLoadMoreInFlightRef.current
      ) {
        return;
      }

      clientLoadMoreInFlightRef.current = true;
      setIsLoadingMoreClients(true);
      const requestId = clientRequestIdRef.current + 1;
      clientRequestIdRef.current = requestId;
      const nextPage = clientPage + 1;

      fetchProjectBoqClientFilterOptions({
        search: debouncedSearch,
        page: nextPage,
        limit: CLIENT_FILTER_PAGE_SIZE,
      })
        .then((result) => {
          if (clientRequestIdRef.current !== requestId) return;
          setClientOptions((previous) => {
            const merged = new Map(previous.map((option) => [option.value, option]));
            result.options.forEach((option) => merged.set(option.value, option));
            return [...merged.values()];
          });
          setClientPage(result.page);
          setClientHasMore(result.hasMore);
          setClientLoadError('');
        })
        .catch(() => {
          if (clientRequestIdRef.current !== requestId) return;
          setClientLoadError('Failed to load more clients');
        })
        .finally(() => {
          if (clientRequestIdRef.current === requestId) {
            clientLoadMoreInFlightRef.current = false;
            setIsLoadingMoreClients(false);
          }
        });
    }, [clientHasMore, clientPage, debouncedSearch, isClientTab, isLoadingClients, open]);

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
            {PROJECT_BOQ_FILTER_TABS.map((tab) => (
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
              emptyMessage={
                clientLoadError ||
                `No ${PROJECT_BOQ_FILTER_TABS.find((tab) => tab.value === activeTab)?.label?.toLowerCase() ?? 'options'} found`
              }
              isLoading={isClientTab && isLoadingClients}
              virtualized={isClientTab}
              hasMore={isClientTab && clientHasMore}
              isLoadingMore={isClientTab && isLoadingMoreClients}
              onLoadMore={isClientTab ? handleLoadMoreClients : undefined}
            />
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

ProjectBoqsFilterDropdown.displayName = 'ProjectBoqsFilterDropdown';

export default ProjectBoqsFilterDropdown;
