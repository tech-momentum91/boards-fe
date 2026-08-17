// React
import React, { useEffect, useImperativeHandle, useMemo, useState } from 'react';

// Third-party
import { useDispatch, useSelector } from 'react-redux';
import { RiArrowRightSLine } from 'react-icons/ri';

// UI Components
import * as Badge from '@/components/ui/badge';
import * as Filter from '@/components/ui/filter';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';

import { MONTH_OPTIONS } from '@/constants/constants';
import {
  areBillingPopoverFiltersEqual,
  BILLING_FILTER_SECTIONS,
  BILLING_SIGNOFF_OPTIONS,
  getBillingPopoverFiltersFromApplied,
  getEmptyBillingPopoverFilters,
  normalizeBillingPopoverFilters,
} from '@/components/billing/constants';

import {
  fetchBillingFilterOptions,
  resetBillingFilters,
  selectBillingFilterOptions,
  selectBillingList,
  setBillingFilters,
} from '@/redux/billingSlice';

import { fetchCenterAccess, selectCenterAccess } from '@/redux/centerSlice';
import { getStatusOptions } from '@/api/dynamic-status';

import { getClientListThunk, selectClientListData } from '@/redux/clientSlice';

const ensureArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const MONTH_OPTIONS_WITH_ALL = [
  { value: 'All', label: 'All' },
  ...MONTH_OPTIONS.map((m) => ({ value: m, label: m })),
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS_WITH_ALL = [
  { value: 'all', label: 'All Years' },
  ...Array.from({ length: 5 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
  })),
];

const BillingFilterPopover = React.forwardRef(
  (
    {
      open = false,
      onInteractOutside,
      onEscapeKeyDown,
      hideClientSection = false,
      hideCenterSection = false,
      onPopoverClearFilters,
    },
    ref,
  ) => {
    const dispatch = useDispatch();
    const { filters } = useSelector(selectBillingList);
    const { categories } = useSelector(selectBillingFilterOptions);
    const centerAccess = useSelector(selectCenterAccess);
    const clientListData = useSelector(selectClientListData);

    const centers = centerAccess?.data || [];
    const clients = clientListData?.data || [];

    useEffect(() => {
      dispatch(fetchBillingFilterOptions());
      dispatch(fetchCenterAccess({ silent: true }));
      dispatch(
        getClientListThunk({
          page: 1,
          pageSize: 100,
          append: false,
        }),
      );
    }, [dispatch]);

    const defaultSection = 'center';
    const [activeSection, setActiveSection] = useState(defaultSection);
    const [searchValue, setSearchValue] = useState('');

    const [localFilters, setLocalFilters] = useState(getEmptyBillingPopoverFilters);
    const [dynamicPaymentStatusOptions, setDynamicPaymentStatusOptions] = useState([]);

    useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          const opts = await getStatusOptions({
            doctype: 'Client Billing',
            field: 'payment_status',
          });
          if (!cancelled) setDynamicPaymentStatusOptions(Array.isArray(opts) ? opts : []);
        } catch {
          if (!cancelled) setDynamicPaymentStatusOptions([]);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []);

    const visibleSections = useMemo(() => {
      let list = BILLING_FILTER_SECTIONS;
      if (hideClientSection) list = list.filter((s) => s.id !== 'client');
      if (hideCenterSection) list = list.filter((s) => s.id !== 'center');
      return list;
    }, [hideClientSection, hideCenterSection]);

    useEffect(() => {
      if (open) {
        setLocalFilters(getBillingPopoverFiltersFromApplied(filters));
        setActiveSection(visibleSections[0]?.id || defaultSection);
        setSearchValue('');
      }
    }, [open, filters, visibleSections]); // eslint-disable-line react-hooks/exhaustive-deps -- sync when opened

    const handleClose = () => {
      const applied = normalizeBillingPopoverFilters(filters);
      const local = normalizeBillingPopoverFilters(localFilters);
      if (!areBillingPopoverFiltersEqual(local, applied)) {
        dispatch(setBillingFilters(local));
      }
    };

    useImperativeHandle(ref, () => ({ handleClose }), [localFilters, dispatch, filters]);

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
      const cleared = getEmptyBillingPopoverFilters();
      setLocalFilters(cleared);
      setSearchValue('');
      if (onPopoverClearFilters) {
        onPopoverClearFilters();
      } else {
        dispatch(resetBillingFilters());
      }
    };

    const getSectionCount = (sectionId) => {
      if (hideClientSection && sectionId === 'client') return 0;
      if (hideCenterSection && sectionId === 'center') return 0;
      if (sectionId === 'date') {
        let count = 0;
        if (localFilters.trigger_year) count++;
        if (localFilters.trigger_month) count++;
        return count;
      }
      const values = localFilters[sectionId];
      return Array.isArray(values) ? values.length : 0;
    };

    const currentOptions = useMemo(() => {
      let options = [];
      let labelKey = 'label';
      let valueKey = 'value';

      switch (activeSection) {
        case 'center':
          if (!hideCenterSection) {
            options = centers;
            labelKey = 'center_name';
            valueKey = 'name';
          }
          break;
        case 'client':
          if (!hideClientSection) {
            options = clients;
            labelKey = 'customer_name';
            valueKey = 'name';
          }
          break;
        case 'billing_category':
          options = categories || [];
          break;
        case 'payment_status':
          options = dynamicPaymentStatusOptions;
          break;
        case 'operations_signoff':
        case 'legal_signoff':
        case 'accounts_signoff':
          options = BILLING_SIGNOFF_OPTIONS;
          break;
        default:
          options = [];
      }

      const formattedOptions = options.map((opt) => ({
        label: opt[labelKey] || opt.label,
        value: opt[valueKey] || opt.value,
      }));

      if (!searchValue.trim()) return formattedOptions;
      const needle = searchValue.toLowerCase().trim();
      return formattedOptions.filter(
        (opt) =>
          String(opt.label).toLowerCase().includes(needle) ||
          String(opt.value).toLowerCase().includes(needle),
      );
    }, [
      activeSection,
      centers,
      clients,
      categories,
      searchValue,
      hideClientSection,
      dynamicPaymentStatusOptions,
      hideCenterSection,
    ]);

    const renderContent = () => {
      if (activeSection === 'date') {
        return (
          <div className='p-4 flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <Label.Root>Month</Label.Root>
              <Select.Root
                value={localFilters.trigger_month}
                onValueChange={(value) => handleDateChange('trigger_month', value)}
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
                value={localFilters.trigger_year}
                onValueChange={(value) => handleDateChange('trigger_year', value)}
              >
                <Select.Trigger>
                  <Select.Value placeholder='Select Year' />
                </Select.Trigger>
                <Select.Content>
                  {YEAR_OPTIONS_WITH_ALL.map((y) => (
                    <Select.Item key={y.value} value={y.value}>
                      {y.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
          </div>
        );
      }

      return (
        <Filter.List
          options={currentOptions}
          selectedValues={localFilters[activeSection] || []}
          onToggle={(value) => handleToggle(activeSection, value)}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder={`Search ${
            visibleSections.find((s) => s.id === activeSection)?.label
          }...`}
        />
      );
    };

    const sections = visibleSections;

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
                {sections.map((section) => {
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

BillingFilterPopover.displayName = 'BillingFilterPopover';

export default BillingFilterPopover;
