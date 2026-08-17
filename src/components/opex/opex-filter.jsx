import React, { useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiArrowRightSLine } from 'react-icons/ri';

import * as Filter from '@/components/ui/filter';
import * as Select from '@/components/ui/select';
import * as Label from '@/components/ui/label';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import { MONTH_OPTIONS } from '@/constants/constants';
import {
  areOpexPopoverFiltersEqual,
  BILL_UPLOADED_OPTIONS,
  APPROVAL_OPTIONS,
  ZOHO_OPTIONS,
  getEmptyOpexPopoverFilters,
  getOpexPopoverFiltersFromApplied,
  normalizeOpexPopoverFilters,
  OPEX_FILTER_SECTIONS,
} from '@/components/opex/constants';
import {
  fetchOpexFilterSupplierOptions,
  selectOpexFilterSupplierListStatus,
  selectOpexFilterSupplierOptions,
} from '@/redux/opexSlice';
import { showErrorToast } from '@/utils/error-utils';

const MONTH_OPTIONS_WITH_ALL = [
  { value: 'All', label: 'All' },
  ...MONTH_OPTIONS.map((m) => ({ value: m, label: m })),
];

const getLast10Years = () => {
  const current = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, i) => String(current - i));
};

const OpexFilter = React.forwardRef(
  (
    {
      open = false,
      filters = {},
      onFilterChange,
      onClearFilters,
      centerOptions = [],
      hideCenterSection = false,
      categoryOptions = [],
      subcategoryOptions = [],
      onInteractOutside,
      onEscapeKeyDown,
    },
    ref,
  ) => {
    const dispatch = useDispatch();
    const supplierFilterOptions = useSelector(selectOpexFilterSupplierOptions);
    const supplierListStatus = useSelector(selectOpexFilterSupplierListStatus);

    const visibleSections = useMemo(
      () =>
        hideCenterSection
          ? OPEX_FILTER_SECTIONS.filter((s) => s.id !== 'center')
          : OPEX_FILTER_SECTIONS,
      [hideCenterSection],
    );
    const defaultSection = visibleSections[0]?.id ?? 'creation';
    const [activeSection, setActiveSection] = useState(defaultSection);
    const [searchValue, setSearchValue] = useState('');

    const [localFilters, setLocalFilters] = useState(getEmptyOpexPopoverFilters);

    // Sync local state from applied filters when dropdown opens
    useEffect(() => {
      if (open) {
        setLocalFilters(getOpexPopoverFiltersFromApplied(filters));
      }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- sync from latest filters when opened

    useEffect(() => {
      if (!open) return;
      if (supplierFilterOptions.length > 0) return;
      dispatch(fetchOpexFilterSupplierOptions())
        .unwrap()
        .catch((error) =>
          showErrorToast(error, { defaultMessage: 'Failed to load vendors for filter.' }),
        );
    }, [open, dispatch, supplierFilterOptions.length]);

    // When center section is hidden and current section is center, switch to first visible
    useEffect(() => {
      if (hideCenterSection && activeSection === 'center') {
        setActiveSection(defaultSection);
      }
    }, [hideCenterSection, activeSection, defaultSection]);

    const handleClose = () => {
      const applied = normalizeOpexPopoverFilters(filters);
      const local = normalizeOpexPopoverFilters(localFilters);
      if (!areOpexPopoverFiltersEqual(local, applied)) {
        onFilterChange?.({ ...local });
      }
    };

    useImperativeHandle(ref, () => ({ handleClose }), [localFilters, onFilterChange, filters]);

    const handleToggle = (key, value) => {
      setLocalFilters((previous) => {
        const currentValues = previous[key] || [];
        const newValues = currentValues.includes(value)
          ? currentValues.filter((v) => v !== value)
          : [...currentValues, value];
        return { ...previous, [key]: newValues };
      });
    };

    const handleDateChange = (type, value) => {
      setLocalFilters((previous) => ({ ...previous, [type]: value ?? '' }));
    };

    const handleClearAll = () => {
      const cleared = getEmptyOpexPopoverFilters();
      setLocalFilters(cleared);
      setSearchValue('');
      onFilterChange?.(cleared);
    };

    const getSectionCount = (sectionId) => {
      if (sectionId === 'creation') {
        let count = 0;
        if (localFilters.triggered_year) count++;
        if (localFilters.triggered_month) count++;
        return count;
      }
      const values = localFilters[sectionId];
      return Array.isArray(values) ? values.length : 0;
    };

    const currentOptions = useMemo(() => {
      let options = [];
      switch (activeSection) {
        case 'center':
          options = centerOptions;
          break;
        case 'category':
          options = categoryOptions;
          break;
        case 'subcategory':
          options = subcategoryOptions;
          break;
        case 'vendor':
          options = supplierFilterOptions;
          break;
        case 'bill_uploaded':
          options = BILL_UPLOADED_OPTIONS;
          break;
        case 'zone_head_check':
        case 'purchase_check':
          options = APPROVAL_OPTIONS;
          break;
        case 'zoho_uploaded':
          options = ZOHO_OPTIONS;
          break;
        default:
          options = [];
      }

      if (!searchValue.trim()) return options;
      const needle = searchValue.toLowerCase().trim();
      return options.filter(
        (opt) =>
          String(opt.label).toLowerCase().includes(needle) ||
          String(opt.value).toLowerCase().includes(needle),
      );
    }, [
      activeSection,
      centerOptions,
      categoryOptions,
      subcategoryOptions,
      supplierFilterOptions,
      searchValue,
    ]);

    const renderContent = () => {
      if (activeSection === 'creation') {
        return (
          <div className='p-4 flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <Label.Root>Month</Label.Root>
              <Select.Root
                value={localFilters.triggered_month}
                onValueChange={(value) => handleDateChange('triggered_month', value)}
              >
                <Select.Trigger>
                  <Select.Value placeholder='Select Month' />
                </Select.Trigger>
                <Select.Content>
                  {MONTH_OPTIONS_WITH_ALL.map((opt) => (
                    <Select.Item key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
            <div className='flex flex-col gap-2'>
              <Label.Root>Year</Label.Root>
              <Select.Root
                value={localFilters.triggered_year}
                onValueChange={(value) => handleDateChange('triggered_year', value)}
              >
                <Select.Trigger>
                  <Select.Value placeholder='Select Year' />
                </Select.Trigger>
                <Select.Content>
                  {getLast10Years().map((y) => (
                    <Select.Item key={y} value={y}>
                      {y}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
          </div>
        );
      }

      if (activeSection === 'vendor') {
        if (supplierListStatus === 'loading' && supplierFilterOptions.length === 0) {
          return (
            <div className='flex flex-1 items-center justify-center p-8'>
              <span className='text-paragraph-sm text-text-soft-400'>Loading vendors...</span>
            </div>
          );
        }
        if (supplierListStatus === 'failed' && supplierFilterOptions.length === 0) {
          return (
            <div className='flex flex-1 items-center justify-center p-8'>
              <span className='text-paragraph-sm text-text-soft-400'>Could not load vendors.</span>
            </div>
          );
        }
      }

      return (
        <Filter.List
          options={currentOptions}
          selectedValues={localFilters[activeSection] || []}
          onToggle={(value) => handleToggle(activeSection, value)}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder={`Search ${activeSection.replaceAll('_', ' ')}...`}
        />
      );
    };

    return (
      <Filter.Root onInteractOutside={onInteractOutside} onEscapeKeyDown={onEscapeKeyDown}>
        <Filter.Header onClear={handleClearAll} />
        <Filter.Body>
          <Filter.Sidebar width='200px'>
            <TabMenuVertical.Root
              value={activeSection}
              onValueChange={(value) => {
                setActiveSection(value);
                setSearchValue('');
              }}
            >
              <TabMenuVertical.List className='p-2 border-r-0'>
                {visibleSections.map((section) => {
                  const count = getSectionCount(section.id);
                  return (
                    <TabMenuVertical.Trigger
                      className='w-full flex items-center justify-between'
                      key={section.id}
                      value={section.id}
                    >
                      {section.label}
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
          <Filter.Content width='340px'>{renderContent()}</Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

OpexFilter.displayName = 'OpexFilter';

export default OpexFilter;
