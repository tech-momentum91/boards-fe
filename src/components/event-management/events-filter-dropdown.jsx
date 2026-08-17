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
import {
  EVENT_CATEGORY_OPTIONS,
  EVENT_ENGAGEMENT_MODE_OPTIONS,
  EVENT_FILTER_VERTICAL_TABS,
  EVENT_REVENUE_MODE_OPTIONS,
  PARTICIPATION_TYPE_OPTIONS,
} from '@/components/event-management/constant';

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const normalizeOptions = (options = []) => {
  const rows = Array.isArray(options) ? options : [];
  const mapped = rows
    .map((opt) => {
      if (typeof opt === 'string') return { label: opt, value: opt };
      if (!opt || typeof opt !== 'object') return null;
      const label = opt.label ?? opt.value;
      const value = opt.value ?? opt.label;
      if (!label || !value) return null;
      return { label: String(label), value: String(value) };
    })
    .filter(Boolean);

  const seen = new Set();
  return mapped.filter((opt) => {
    if (seen.has(opt.value)) return false;
    seen.add(opt.value);
    return true;
  });
};

const EventsFilterDropdown = React.forwardRef(
  (
    {
      setFilterCount,
      open,
      onFiltersChange,
      appliedFilters = {},
      filterConfig = [],
      centerOptions = [],
      partnerOptions = [],
      engagementModeOptions = [],
      revenueModeOptions = [],
      categoryOptions = [],
      participationTypeOptions = [],
    },
    ref,
  ) => {
    const [activeTab, setActiveTab] = useState('center');
    const [localFilters, setLocalFilters] = useState({
      center: ensureArray(appliedFilters.center),
      partner: ensureArray(appliedFilters.partner),
      engagement_mode: ensureArray(appliedFilters.engagement_mode),
      revenue_mode: ensureArray(appliedFilters.revenue_mode),
      category: ensureArray(appliedFilters.category),
      participation_type: ensureArray(appliedFilters.participation_type),
    });
    const [searchText, setSearchText] = useState('');
    const popoverRef = useRef(null);

    useEffect(() => {
      setFilterCount?.(
        localFilters.center.length +
          localFilters.partner.length +
          localFilters.engagement_mode.length +
          localFilters.revenue_mode.length +
          localFilters.category.length +
          localFilters.participation_type.length,
      );
    }, [
      localFilters.center.length,
      localFilters.partner.length,
      localFilters.engagement_mode.length,
      localFilters.revenue_mode.length,
      localFilters.category.length,
      localFilters.participation_type.length,
      setFilterCount,
    ]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    const verticalTabs = useMemo(
      () =>
        EVENT_FILTER_VERTICAL_TABS.filter((tab) =>
          filterConfig.length > 0 ? filterConfig.includes(tab.value) : true,
        ),
      [filterConfig],
    );

    const optionsByTab = useMemo(
      () => ({
        center: normalizeOptions(centerOptions),
        partner: normalizeOptions(partnerOptions),
        engagement_mode: normalizeOptions(EVENT_ENGAGEMENT_MODE_OPTIONS),
        revenue_mode: normalizeOptions(EVENT_REVENUE_MODE_OPTIONS),
        category: normalizeOptions(EVENT_CATEGORY_OPTIONS),
        participation_type: normalizeOptions(PARTICIPATION_TYPE_OPTIONS),
      }),
      [
        centerOptions,
        partnerOptions,
        engagementModeOptions,
        revenueModeOptions,
        categoryOptions,
        participationTypeOptions,
      ],
    );

    useEffect(() => {
      setLocalFilters({
        center: ensureArray(appliedFilters.center),
        partner: ensureArray(appliedFilters.partner),
        engagement_mode: ensureArray(appliedFilters.engagement_mode),
        revenue_mode: ensureArray(appliedFilters.revenue_mode),
        category: ensureArray(appliedFilters.category),
        participation_type: ensureArray(appliedFilters.participation_type),
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
        center: [],
        partner: [],
        engagement_mode: [],
        revenue_mode: [],
        category: [],
        participation_type: [],
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

EventsFilterDropdown.displayName = 'EventsFilterDropdown';

export default EventsFilterDropdown;
