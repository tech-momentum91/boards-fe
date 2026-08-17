import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';

import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import { AGREEMENTS_FILTER_VERTICAL_TABS } from '@/components/agreements/constants';

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const AgreementsFilterDropdown = React.forwardRef(
  (
    {
      setFilterCount,
      open,
      onFiltersChange,
      appliedFilters = {},
      clientOptions = [],
      centerOptions = [],
      membershipPlanOptions = [],
      typeOptions = [],
      statusOptions = [],
    },
    ref,
  ) => {
    const [activeTab, setActiveTab] = useState('center');
    const [localFilters, setLocalFilters] = useState({
      client: ensureArray(appliedFilters.client),
      center: ensureArray(appliedFilters.center),
      membershipPlan: ensureArray(appliedFilters.membershipPlan),
      type: ensureArray(appliedFilters.type),
      status: ensureArray(appliedFilters.status),
    });
    const [searchText, setSearchText] = useState('');
    const popoverRef = useRef(null);

    useEffect(() => {
      setFilterCount?.(
        localFilters.client.length +
          localFilters.center.length +
          localFilters.membershipPlan.length +
          localFilters.type.length +
          localFilters.status.length,
      );
    }, [
      localFilters.client.length,
      localFilters.center.length,
      localFilters.membershipPlan.length,
      localFilters.type.length,
      localFilters.status.length,
      setFilterCount,
    ]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    const verticalTabs = AGREEMENTS_FILTER_VERTICAL_TABS;

    const optionsByTab = useMemo(
      () => ({
        client: clientOptions,
        center: centerOptions,
        membershipPlan: membershipPlanOptions,
        type: typeOptions,
        status: statusOptions,
      }),
      [clientOptions, centerOptions, membershipPlanOptions, typeOptions, statusOptions],
    );

    useEffect(() => {
      setLocalFilters({
        client: ensureArray(appliedFilters.client),
        center: ensureArray(appliedFilters.center),
        membershipPlan: ensureArray(appliedFilters.membershipPlan),
        type: ensureArray(appliedFilters.type),
        status: ensureArray(appliedFilters.status),
      });
    }, [appliedFilters]);

    const currentOptions = useMemo(() => {
      const options = optionsByTab[activeTab] || [];
      if (!searchText.trim()) return options;
      const lower = searchText.toLowerCase().trim();
      return options.filter(
        (opt) =>
          (opt.label && opt.label.toLowerCase().includes(lower)) ||
          (opt.value && opt.value.toLowerCase().includes(lower)),
      );
    }, [activeTab, optionsByTab, searchText]);

    const handleClear = useCallback(() => {
      setLocalFilters({
        client: [],
        center: [],
        membershipPlan: [],
        type: [],
        status: [],
      });
      setSearchText('');
    }, []);

    const handleToggle = useCallback(
      (value) => {
        setLocalFilters((prev) => {
          const currentList = Array.isArray(prev[activeTab]) ? prev[activeTab] : [];
          const isSelected = currentList.includes(value);
          const newValues = isSelected
            ? currentList.filter((item) => item !== value)
            : [...currentList, value];
          return { ...prev, [activeTab]: newValues };
        });
      },
      [activeTab],
    );

    const handlePopoverClose = useCallback(() => {
      onFiltersChange?.(localFilters);
    }, [localFilters, onFiltersChange]);

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

    if (!open) return null;

    return (
      <Filter.Root
        ref={popoverRef}
        onInteractOutside={handlePopoverClose}
        onEscapeKeyDown={handlePopoverClose}
      >
        <Filter.Header title='FILTERS' onClear={handleClear} />
        <Filter.Body>
          <Filter.Sidebar width='180px'>
            <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
              <TabMenuVertical.List className='p-2 border-r-0'>
                {verticalTabs.map((item) => {
                  const value = item.value;
                  const selectedCount = Array.isArray(localFilters[value])
                    ? localFilters[value].length
                    : 0;
                  const showCount = selectedCount > 0;
                  return (
                    <TabMenuVertical.Trigger
                      className='w-full flex items-center justify-between'
                      key={value}
                      value={value}
                    >
                      {item.label}
                      {showCount ? (
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
              emptyMessage={`No ${activeTab} options found`}
            />
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

AgreementsFilterDropdown.displayName = 'AgreementsFilterDropdown';

export default AgreementsFilterDropdown;
