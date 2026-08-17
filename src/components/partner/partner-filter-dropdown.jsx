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
  PARTNER_FILTER_VERTICAL_TABS,
  PARTNER_FILTER_PRIMARY_CATEGORY_OPTIONS,
  PARTNER_FILTER_SECONDARY_CATEGORY_OPTIONS,
  PARTNER_FILTER_INDUSTRY_OPTIONS,
  PARTNER_FILTER_BASE_CITY_OPTIONS,
  PARTNER_FILTER_COMPANY_SIZE_OPTIONS,
  PARTNER_FILTER_REVENUE_MODEL_OPTIONS,
  PARTNER_FILTER_ENGAGEMENT_FREQUENCY_OPTIONS,
  PARTNER_FILTER_OWNER_OPTIONS,
} from '@/components/partner/constants';

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const PARTNER_FILTER_KEYS = [
  'primaryCategory',
  'secondaryCategory',
  'industry',
  'baseCity',
  'companySize',
  'revenueModel',
  'engagementFrequency',
  // 'onboardingStage',
  'owner',
];

const getInitialLocalFilters = (appliedFilters) => {
  const initial = {};
  for (const key of PARTNER_FILTER_KEYS) {
    initial[key] = ensureArray(appliedFilters[key]);
  }
  return initial;
};

const PartnerFilterDropdown = React.forwardRef(
  (
    {
      setFilterCount,
      open,
      onFiltersChange,
      appliedFilters = {},
      ownerOptions = [],
      onboardingStageOptions,
    },
    ref,
  ) => {
    const [activeTab, setActiveTab] = useState('primaryCategory');
    const [localFilters, setLocalFilters] = useState(() => getInitialLocalFilters(appliedFilters));
    const [searchText, setSearchText] = useState('');
    const popoverRef = useRef(null);

    const optionsByTab = useMemo(
      () => ({
        primaryCategory: PARTNER_FILTER_PRIMARY_CATEGORY_OPTIONS,
        secondaryCategory: PARTNER_FILTER_SECONDARY_CATEGORY_OPTIONS,
        industry: PARTNER_FILTER_INDUSTRY_OPTIONS,
        baseCity: PARTNER_FILTER_BASE_CITY_OPTIONS,
        companySize: PARTNER_FILTER_COMPANY_SIZE_OPTIONS,
        revenueModel: PARTNER_FILTER_REVENUE_MODEL_OPTIONS,
        engagementFrequency: PARTNER_FILTER_ENGAGEMENT_FREQUENCY_OPTIONS,
        onboardingStage: Array.isArray(onboardingStageOptions) ? onboardingStageOptions : [],
        owner: ownerOptions?.length ? ownerOptions : PARTNER_FILTER_OWNER_OPTIONS,
      }),
      [ownerOptions, onboardingStageOptions],
    );

    const totalFilterCount = useMemo(
      () => PARTNER_FILTER_KEYS.reduce((sum, key) => sum + (localFilters[key]?.length ?? 0), 0),
      [localFilters],
    );

    useEffect(() => {
      setFilterCount?.(totalFilterCount);
    }, [totalFilterCount, setFilterCount]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    useEffect(() => {
      setLocalFilters(getInitialLocalFilters(appliedFilters));
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
      setLocalFilters(
        PARTNER_FILTER_KEYS.reduce((acc, key) => {
          acc[key] = [];
          return acc;
        }, {}),
      );
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
        <Filter.Body className='h-[320px]'>
          <Filter.Sidebar width='180px'>
            <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
              <TabMenuVertical.List className='p-2 border-r-0'>
                {PARTNER_FILTER_VERTICAL_TABS.map((item) => {
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

PartnerFilterDropdown.displayName = 'PartnerFilterDropdown';

export default PartnerFilterDropdown;
