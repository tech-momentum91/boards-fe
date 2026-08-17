import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';

import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import {
  SUPPORT_FEEDBACK_STATUS_OPTIONS,
  SUPPORT_MODULE_OPTIONS,
} from '@/components/support/support-feedback-constants';

const SupportFeedbackFilterDropdown = React.forwardRef(
  (
    {
      open,
      onFiltersChange,
      appliedFilters,
      setFilterCount,
      moduleOptions = SUPPORT_MODULE_OPTIONS,
    },
    ref,
  ) => {
    const [activeTab, setActiveTab] = useState('module');
    const [searchText, setSearchText] = useState('');
    const [localFilters, setLocalFilters] = useState({
      module: Array.isArray(appliedFilters?.module) ? appliedFilters.module : [],
      status: Array.isArray(appliedFilters?.status) ? appliedFilters.status : [],
    });

    useEffect(() => {
      setLocalFilters({
        module: Array.isArray(appliedFilters?.module) ? appliedFilters.module : [],
        status: Array.isArray(appliedFilters?.status) ? appliedFilters.status : [],
      });
    }, [appliedFilters]);

    useEffect(() => {
      setFilterCount?.(localFilters.module.length + localFilters.status.length);
    }, [localFilters.module.length, localFilters.status.length, setFilterCount]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    const mappedModuleOptions = useMemo(
      () =>
        moduleOptions.map((opt) => ({
          value: opt.value,
          label: opt.label,
        })),
      [moduleOptions],
    );

    const statusOptions = useMemo(
      () =>
        SUPPORT_FEEDBACK_STATUS_OPTIONS.map((opt) => ({
          value: opt.value,
          label: opt.label,
        })),
      [],
    );

    const verticalTabs = useMemo(
      () => [
        { value: 'module', label: 'Module' },
        { value: 'status', label: 'Status' },
      ],
      [],
    );

    const currentOptions = useMemo(() => {
      const options = activeTab === 'module' ? mappedModuleOptions : statusOptions;
      if (!searchText.trim()) return options;
      const q = searchText.toLowerCase().trim();
      return options.filter(
        (opt) => opt.label.toLowerCase().includes(q) || String(opt.value).toLowerCase().includes(q),
      );
    }, [activeTab, mappedModuleOptions, statusOptions, searchText]);

    const handleModuleToggle = useCallback((moduleValue) => {
      setLocalFilters((previous) => {
        const current = Array.isArray(previous.module) ? previous.module : [];
        const isSelected = current.includes(moduleValue);
        return {
          ...previous,
          module: isSelected ? current.filter((m) => m !== moduleValue) : [...current, moduleValue],
        };
      });
    }, []);

    const handleStatusToggle = useCallback((statusValue) => {
      setLocalFilters((previous) => {
        const current = Array.isArray(previous.status) ? previous.status : [];
        const isSelected = current.includes(statusValue);
        return {
          ...previous,
          status: isSelected ? current.filter((s) => s !== statusValue) : [...current, statusValue],
        };
      });
    }, []);

    const handleClear = useCallback(() => {
      setLocalFilters({ module: [], status: [] });
      setSearchText('');
    }, []);

    const buildFiltersPayload = useCallback(() => ({ ...localFilters }), [localFilters]);

    const handlePopoverClose = useCallback(() => {
      onFiltersChange?.(buildFiltersPayload());
    }, [buildFiltersPayload, onFiltersChange]);

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
        align='end'
        sideOffset={8}
        className='w-[min(480px,calc(100vw-2rem))]'
        onInteractOutside={handlePopoverClose}
        onEscapeKeyDown={handlePopoverClose}
      >
        <Filter.Header title='FILTERS' onClear={handleClear} />
        <Filter.Body>
          <Filter.Sidebar width='180px'>
            <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
              <TabMenuVertical.List className='border-r-0 p-2'>
                {verticalTabs.map((item) => {
                  const selectedModuleCount =
                    item.value === 'module' && Array.isArray(localFilters.module)
                      ? localFilters.module.length
                      : 0;
                  const showModuleCount = item.value === 'module' && selectedModuleCount > 0;

                  const selectedStatusCount =
                    item.value === 'status' && Array.isArray(localFilters.status)
                      ? localFilters.status.length
                      : 0;
                  const showStatusCount = item.value === 'status' && selectedStatusCount > 0;

                  const showCount = showModuleCount || showStatusCount;
                  const countValue = showModuleCount ? selectedModuleCount : selectedStatusCount;

                  return (
                    <TabMenuVertical.Trigger
                      className='flex w-full items-center justify-between'
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                      {showCount ? (
                        <Badge.Root
                          size='medium'
                          variant='filled'
                          className='shrink-0 rounded-full bg-black'
                        >
                          {countValue}
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
              onToggle={activeTab === 'module' ? handleModuleToggle : handleStatusToggle}
              searchValue={searchText}
              onSearchChange={setSearchText}
              virtualized
              emptyMessage={activeTab === 'module' ? 'No modules found' : 'No status options found'}
            />
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

SupportFeedbackFilterDropdown.displayName = 'SupportFeedbackFilterDropdown';

export default SupportFeedbackFilterDropdown;
