import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';

import {
  PRODUCTS_FILTER_FIELD_KEYS,
  PRODUCTS_FILTER_TAB_API_FIELDS,
  createEmptyProductsFilters,
  getProductsFilterTabs,
} from '@/components/products/constants';
import { countActiveProductsFilters } from '@/components/products/products-filters';
import { searchProductFormOptions } from '@/api/productFormOptions';
import { useDebounce } from '@/hooks/use-debounce';
import * as Badge from '@/components/ui/badge';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';

function getFilterParentContext(activeTab, localFilters) {
  const single = (key) => {
    const values = localFilters[key];
    return Array.isArray(values) && values.length === 1 ? values[0] : undefined;
  };

  switch (activeTab) {
    case PRODUCTS_FILTER_FIELD_KEYS.CATEGORY_TYPE:
      return { categoryGroup: single(PRODUCTS_FILTER_FIELD_KEYS.CATEGORY_GROUP) };
    case PRODUCTS_FILTER_FIELD_KEYS.PRODUCT_GROUP:
      return {
        categoryGroup: single(PRODUCTS_FILTER_FIELD_KEYS.CATEGORY_GROUP),
        categoryType: single(PRODUCTS_FILTER_FIELD_KEYS.CATEGORY_TYPE),
      };
    case PRODUCTS_FILTER_FIELD_KEYS.PRODUCT_TYPE:
      return {
        categoryGroup: single(PRODUCTS_FILTER_FIELD_KEYS.CATEGORY_GROUP),
        categoryType: single(PRODUCTS_FILTER_FIELD_KEYS.CATEGORY_TYPE),
        productGroup: single(PRODUCTS_FILTER_FIELD_KEYS.PRODUCT_GROUP),
      };
    default:
      return {};
  }
}

const ProductsFilterDropdown = forwardRef(
  ({ open, tabId, appliedFilters, onFiltersApply, setFilterCount }, ref) => {
    const filterTabs = useMemo(() => getProductsFilterTabs(tabId), [tabId]);
    const [activeTab, setActiveTab] = useState(() => filterTabs[0]?.value ?? '');
    const [localFilters, setLocalFilters] = useState(() =>
      appliedFilters
        ? { ...createEmptyProductsFilters(tabId), ...appliedFilters }
        : createEmptyProductsFilters(tabId),
    );
    const [searchText, setSearchText] = useState('');
    const [options, setOptions] = useState([]);
    const [optionsLoading, setOptionsLoading] = useState(false);
    const debouncedSearch = useDebounce(searchText, 300);

    useEffect(() => {
      if (!appliedFilters) return;
      setLocalFilters({ ...createEmptyProductsFilters(tabId), ...appliedFilters });
    }, [appliedFilters, tabId]);

    useEffect(() => {
      const firstTab = filterTabs[0]?.value;
      if (firstTab) setActiveTab(firstTab);
    }, [filterTabs]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    useEffect(() => {
      setFilterCount?.(countActiveProductsFilters(localFilters, tabId));
    }, [localFilters, setFilterCount, tabId]);

    useEffect(() => {
      if (!open) return undefined;

      const apiField = PRODUCTS_FILTER_TAB_API_FIELDS[activeTab];
      if (!apiField) {
        setOptions([]);
        return undefined;
      }

      let isMounted = true;
      setOptionsLoading(true);

      const parentContext = getFilterParentContext(activeTab, localFilters);

      searchProductFormOptions({
        field: apiField,
        search: debouncedSearch,
        limit: 100,
        ...parentContext,
      })
        .then((rows) => {
          if (!isMounted) return;
          setOptions(
            rows.map((row) => ({
              value: row.value,
              label: row.label || row.value,
            })),
          );
        })
        .catch(() => {
          if (isMounted) setOptions([]);
        })
        .finally(() => {
          if (isMounted) setOptionsLoading(false);
        });

      return () => {
        isMounted = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- parent cascade keys only
    }, [
      activeTab,
      debouncedSearch,
      open,
      localFilters[PRODUCTS_FILTER_FIELD_KEYS.CATEGORY_GROUP],
      localFilters[PRODUCTS_FILTER_FIELD_KEYS.CATEGORY_TYPE],
      localFilters[PRODUCTS_FILTER_FIELD_KEYS.PRODUCT_GROUP],
    ]);

    const handleClear = useCallback(() => {
      setLocalFilters(createEmptyProductsFilters(tabId));
      setSearchText('');
    }, [tabId]);

    const handleToggle = useCallback(
      (value) => {
        setLocalFilters((previous) => {
          const currentList = Array.isArray(previous[activeTab]) ? previous[activeTab] : [];
          const isSelected = currentList.includes(value);
          const nextValues = isSelected
            ? currentList.filter((item) => item !== value)
            : [...currentList, value];

          return { ...previous, [activeTab]: nextValues };
        });
      },
      [activeTab],
    );

    const handlePopoverClose = useCallback(() => {
      onFiltersApply?.(localFilters);
    }, [localFilters, onFiltersApply]);

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

    const emptyMessage = useMemo(() => {
      if (optionsLoading) return 'Loading...';
      const tabLabel = filterTabs.find((tab) => tab.value === activeTab)?.label ?? 'options';
      return `No ${tabLabel.toLowerCase()} found`;
    }, [activeTab, filterTabs, optionsLoading]);

    if (!open) return null;

    return (
      <Filter.Root onInteractOutside={handlePopoverClose} onEscapeKeyDown={handlePopoverClose}>
        <Filter.Header title='FILTERS' onClear={handleClear} clearLabel='Clear All' />
        <Filter.Body className='h-[280px]'>
          <Filter.Sidebar width='177px'>
            <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
              <TabMenuVertical.List className='gap-1 border-0 p-3'>
                {filterTabs.map((tab) => {
                  const selectedCount = Array.isArray(localFilters[tab.value])
                    ? localFilters[tab.value].length
                    : 0;
                  const isActive = activeTab === tab.value;

                  return (
                    <TabMenuVertical.Trigger
                      key={tab.value}
                      value={tab.value}
                      className={`w-full justify-between rounded-lg px-2 py-2 ${
                        isActive ? 'bg-bg-weak-100 text-text-main-900' : 'text-text-sub-500'
                      }`}
                    >
                      <span className='truncate text-left'>{tab.label}</span>
                      {selectedCount > 0 ? (
                        <Badge.Root
                          size='medium'
                          variant='filled'
                          className='size-5 shrink-0 rounded-full bg-bg-surface-700 p-0 text-[11px] text-text-white-0'
                        >
                          {selectedCount}
                        </Badge.Root>
                      ) : (
                        <TabMenuVertical.ArrowIcon
                          as={RiArrowRightSLine}
                          className='text-text-sub-500'
                        />
                      )}
                    </TabMenuVertical.Trigger>
                  );
                })}
              </TabMenuVertical.List>
            </TabMenuVertical.Root>
          </Filter.Sidebar>

          <Filter.Content width='300px'>
            <Filter.List
              options={options}
              selectedValues={localFilters[activeTab] ?? []}
              onToggle={handleToggle}
              searchValue={searchText}
              onSearchChange={setSearchText}
              emptyMessage={emptyMessage}
              searchPlaceholder='Search...'
            />
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

ProductsFilterDropdown.displayName = 'ProductsFilterDropdown';

export default ProductsFilterDropdown;
