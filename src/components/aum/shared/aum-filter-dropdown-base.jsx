import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';

import * as Badge from '@/components/ui/badge';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const getInitialLocalFilters = (appliedFilters, filterKeys) => {
  const initial = {};
  for (const key of filterKeys) {
    initial[key] = ensureArray(appliedFilters[key]);
  }
  return initial;
};

const AumFilterDropdownBase = React.forwardRef(
  (
    {
      setFilterCount,
      open,
      onFiltersChange,
      appliedFilters,
      filterOptions,
      filterTabs,
      filterKeys,
      bodyClassName = 'h-[280px]',
      renderOptionLabel,
      resolveRenderOptionLabel,
      getEmptyMessage,
      treatUndefinedFilterOptionsAsEmpty = false,
    },
    ref,
  ) => {
    const [activeTab, setActiveTab] = useState(filterTabs[0]?.value ?? 'center');
    const [localFilters, setLocalFilters] = useState(() =>
      getInitialLocalFilters(appliedFilters, filterKeys),
    );
    const [searchText, setSearchText] = useState('');
    const popoverRef = useRef(null);

    const optionsByTab = useMemo(() => {
      if (filterOptions === undefined && treatUndefinedFilterOptionsAsEmpty) {
        return filterKeys.reduce((accumulator, key) => {
          accumulator[key] = [];
          return accumulator;
        }, {});
      }

      return filterKeys.reduce((accumulator, key) => {
        accumulator[key] = Array.isArray(filterOptions?.[key]) ? filterOptions[key] : [];
        return accumulator;
      }, {});
    }, [filterKeys, filterOptions, treatUndefinedFilterOptionsAsEmpty]);

    const totalFilterCount = useMemo(
      () => filterKeys.reduce((sum, key) => sum + (localFilters[key]?.length ?? 0), 0),
      [filterKeys, localFilters],
    );

    useEffect(() => {
      setFilterCount?.(totalFilterCount);
    }, [totalFilterCount, setFilterCount]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    useEffect(() => {
      setLocalFilters(getInitialLocalFilters(appliedFilters, filterKeys));
    }, [appliedFilters, filterKeys]);

    const currentOptions = useMemo(() => {
      const options = optionsByTab[activeTab] || [];
      if (!searchText.trim()) return options;
      const lower = searchText.toLowerCase().trim();
      return options.filter((option) => {
        const label = option.label?.toLowerCase() || '';
        const value = option.value?.toLowerCase() || '';
        const code = option.centerCode?.toLowerCase() || '';
        return label.includes(lower) || value.includes(lower) || code.includes(lower);
      });
    }, [activeTab, optionsByTab, searchText]);

    const emptyMessage = useMemo(() => {
      if (typeof getEmptyMessage === 'function') {
        return getEmptyMessage(activeTab, filterTabs);
      }
      return `No ${activeTab} options found`;
    }, [activeTab, filterTabs, getEmptyMessage]);

    const activeRenderOptionLabel = useMemo(() => {
      if (typeof resolveRenderOptionLabel === 'function') {
        return resolveRenderOptionLabel(activeTab);
      }
      return renderOptionLabel;
    }, [activeTab, renderOptionLabel, resolveRenderOptionLabel]);

    const handleClear = useCallback(() => {
      setLocalFilters(
        filterKeys.reduce((accumulator, key) => {
          accumulator[key] = [];
          return accumulator;
        }, {}),
      );
      setSearchText('');
    }, [filterKeys]);

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
      onFiltersChange?.(localFilters);
    }, [localFilters, onFiltersChange]);

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

    if (!open) return null;

    return (
      <Filter.Root
        ref={popoverRef}
        onInteractOutside={handlePopoverClose}
        onEscapeKeyDown={handlePopoverClose}
      >
        <Filter.Header title='FILTERS' onClear={handleClear} />
        <Filter.Body className={bodyClassName}>
          <Filter.Sidebar width='180px'>
            <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
              <TabMenuVertical.List className='border-r-0 p-2'>
                {filterTabs.map((item) => {
                  const selectedCount = Array.isArray(localFilters[item.value])
                    ? localFilters[item.value].length
                    : 0;
                  return (
                    <TabMenuVertical.Trigger
                      key={item.value}
                      value={item.value}
                      className='flex w-full items-center justify-between'
                    >
                      {item.label}
                      {selectedCount > 0 ? (
                        <Badge.Root
                          size='medium'
                          variant='filled'
                          className='shrink-0 rounded-full bg-black'
                        >
                          {selectedCount}
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
              selectedValues={localFilters[activeTab] || []}
              onToggle={handleToggle}
              searchValue={searchText}
              onSearchChange={setSearchText}
              searchPlaceholder='Search...'
              emptyMessage={emptyMessage}
              renderOptionLabel={activeRenderOptionLabel}
            />
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

AumFilterDropdownBase.displayName = 'AumFilterDropdownBase';

export default AumFilterDropdownBase;
