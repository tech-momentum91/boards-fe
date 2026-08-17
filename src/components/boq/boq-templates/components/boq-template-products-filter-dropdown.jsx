import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';

import { searchProductFormOptions, PRODUCT_FORM_FIELDS } from '@/api/productFormOptions';
import {
  BOQ_TEMPLATE_PRODUCT_FILTER_TAB_IDS,
  BOQ_TEMPLATE_PRODUCT_FILTER_TABS,
  DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS,
} from '@/components/boq/constants';
import {
  cloneBoqTemplateProductFilters,
  countBoqTemplateProductFilters,
} from '@/components/boq/boq-helper';
import { useDebounce } from '@/hooks/use-debounce';
import * as Filter from '@/components/ui/filter';

const LIST_OPTION_API_FIELDS = {
  [BOQ_TEMPLATE_PRODUCT_FILTER_TAB_IDS.BRAND]: PRODUCT_FORM_FIELDS.BRAND,
  [BOQ_TEMPLATE_PRODUCT_FILTER_TAB_IDS.UNITS]: PRODUCT_FORM_FIELDS.UOM,
};

function getTabFilterCount(tabId, filters) {
  return filters[tabId]?.length ?? 0;
}

function filterStaticOptionsBySearch(options, searchText) {
  const query = String(searchText ?? '')
    .trim()
    .toLowerCase();
  if (!query) return options;
  return options.filter((option) => {
    const label = String(option?.label ?? option?.value ?? '').toLowerCase();
    const value = String(option?.value ?? '').toLowerCase();
    return label.includes(query) || value.includes(query);
  });
}

const BoqTemplateProductsFilterDropdown = React.forwardRef(
  (
    {
      open,
      onFiltersChange,
      appliedFilters = DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS,
      setFilterCount,
      areaOptions,
      boqTypeOptions,
    },
    ref,
  ) => {
    const showAreaTab = Array.isArray(areaOptions);
    const showBoqTypeTab = Array.isArray(boqTypeOptions);
    const visibleTabs = useMemo(
      () =>
        BOQ_TEMPLATE_PRODUCT_FILTER_TABS.filter(
          (tab) =>
            (tab.value !== BOQ_TEMPLATE_PRODUCT_FILTER_TAB_IDS.AREA || showAreaTab) &&
            (tab.value !== BOQ_TEMPLATE_PRODUCT_FILTER_TAB_IDS.BOQ_TYPE || showBoqTypeTab),
        ),
      [showAreaTab, showBoqTypeTab],
    );

    const [activeTab, setActiveTab] = useState(BOQ_TEMPLATE_PRODUCT_FILTER_TAB_IDS.BRAND);
    const [searchText, setSearchText] = useState('');
    const [listOptions, setListOptions] = useState([]);
    const [optionsLoading, setOptionsLoading] = useState(false);
    const [localFilters, setLocalFilters] = useState(() =>
      cloneBoqTemplateProductFilters(appliedFilters),
    );
    const popoverRef = useRef(null);
    const previousOpenRef = useRef(open);
    const previousOpenForSyncRef = useRef(open);
    const debouncedSearch = useDebounce(searchText, 300);

    useEffect(() => {
      if (!open) return;
      setActiveTab(BOQ_TEMPLATE_PRODUCT_FILTER_TAB_IDS.BRAND);
    }, [open]);

    useEffect(() => {
      if (!open) {
        previousOpenForSyncRef.current = false;
        return;
      }
      const justOpened = previousOpenForSyncRef.current === false;
      previousOpenForSyncRef.current = true;
      if (!justOpened) return;
      setLocalFilters(cloneBoqTemplateProductFilters(appliedFilters));
    }, [open, appliedFilters]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    useEffect(() => {
      if (!open) return;
      setFilterCount?.(countBoqTemplateProductFilters(localFilters));
    }, [open, localFilters, setFilterCount]);

    useEffect(() => {
      if (!open) return undefined;

      if (activeTab === BOQ_TEMPLATE_PRODUCT_FILTER_TAB_IDS.AREA) {
        setOptionsLoading(false);
        setListOptions(filterStaticOptionsBySearch(areaOptions ?? [], searchText));
        return undefined;
      }
      if (activeTab === BOQ_TEMPLATE_PRODUCT_FILTER_TAB_IDS.BOQ_TYPE) {
        setOptionsLoading(false);
        setListOptions(filterStaticOptionsBySearch(boqTypeOptions ?? [], searchText));
        return undefined;
      }

      const apiField = LIST_OPTION_API_FIELDS[activeTab];
      if (!apiField) {
        setListOptions([]);
        return undefined;
      }

      let cancelled = false;
      setOptionsLoading(true);

      searchProductFormOptions({
        field: apiField,
        search: debouncedSearch,
        limit: 200,
      })
        .then((rows) => {
          if (cancelled) return;
          setListOptions(
            rows.map((row) => ({
              value: row.value,
              label: row.label || row.value,
            })),
          );
        })
        .catch(() => {
          if (!cancelled) setListOptions([]);
        })
        .finally(() => {
          if (!cancelled) setOptionsLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [activeTab, areaOptions, boqTypeOptions, debouncedSearch, open, searchText]);

    const handlePopoverClose = useCallback(() => {
      const next = cloneBoqTemplateProductFilters(localFilters);
      const applied = cloneBoqTemplateProductFilters(appliedFilters);
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
      setLocalFilters(cloneBoqTemplateProductFilters(DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS));
      setSearchText('');
      setActiveTab(BOQ_TEMPLATE_PRODUCT_FILTER_TAB_IDS.BRAND);
      onFiltersChange?.(cloneBoqTemplateProductFilters(DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS));
    }, [onFiltersChange]);

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

    const activeTabLabel = visibleTabs.find((tab) => tab.value === activeTab)?.label ?? 'options';

    return (
      <Filter.Root
        ref={popoverRef}
        align='end'
        side='bottom'
        sideOffset={8}
        showArrow={false}
        onInteractOutside={handlePopoverClose}
        onEscapeKeyDown={handlePopoverClose}
        className='p-0'
      >
        <Filter.Header title='FILTERS' onClear={handleClear} />

        <Filter.Body className='h-[320px]'>
          <Filter.Sidebar width='153px' className='gap-0.5 p-2'>
            {visibleTabs.map((tab) => (
              <Filter.SidebarItem
                key={tab.value}
                isActive={activeTab === tab.value}
                count={getTabFilterCount(tab.value, localFilters)}
                icon={RiArrowRightSLine}
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </Filter.SidebarItem>
            ))}
          </Filter.Sidebar>

          <Filter.Content width='312px' className='p-2'>
            <Filter.List
              options={listOptions}
              selectedValues={selectedValuesForTab}
              onToggle={handleToggle}
              searchValue={searchText}
              onSearchChange={setSearchText}
              searchPlaceholder='Search...'
              emptyMessage={`No ${activeTabLabel.toLowerCase()} found`}
              isLoading={optionsLoading}
              virtualized
            />
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

BoqTemplateProductsFilterDropdown.displayName = 'BoqTemplateProductsFilterDropdown';

export default BoqTemplateProductsFilterDropdown;
