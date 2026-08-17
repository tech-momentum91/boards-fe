import React, { useState, useEffect, useRef, useImperativeHandle, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiArrowRightSLine, RiSearchLine } from 'react-icons/ri';
import { fetchCenterAccess, selectCenterAccess } from '@/redux/centerSlice';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Input from '@/components/ui/input';
import * as LinkButton from '@/components/ui/link-button';
import * as Checkbox from '@/components/ui/checkbox';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import { STATUS_OPTIONS, ROLE_OPTIONS, ensureArray } from '@/components/team-management/constants';
import { normalizeRoleEntry } from '@/utils/user-utils';

/** Coerce API / caller shapes into `{ label, value }` strings for Filter.List. */
const toRoleFilterOption = (option) => {
  if (option == null) return null;

  if (typeof option === 'string') {
    const name = option.trim();
    return name ? { label: name, value: name } : null;
  }

  if (typeof option !== 'object') return null;

  const rawValue = option.value ?? option.label ?? option.name;
  if (typeof rawValue === 'string' && rawValue.trim()) {
    const label =
      typeof option.label === 'string' && option.label.trim()
        ? option.label.trim()
        : rawValue.trim();
    return { label, value: rawValue.trim() };
  }

  if (rawValue && typeof rawValue === 'object') {
    const { name } = normalizeRoleEntry(rawValue);
    return name ? { label: name, value: name } : null;
  }

  const { name } = normalizeRoleEntry(option);
  return name ? { label: name, value: name } : null;
};

const TeamFilterDropdown = React.forwardRef(
  (
    {
      setFilterCount,
      open,
      onOpenChange: _onOpenChange,
      onFiltersChange,
      appliedFilters = {},
      showStatusTab = true,
      roleOptions: roleOptionsProperty,
    },
    ref,
  ) => {
    const dispatch = useDispatch();
    const centerAccess = useSelector(selectCenterAccess);

    const verticalTabs = React.useMemo(() => {
      const tabs = [];
      if (showStatusTab) tabs.push({ value: 'status', label: 'Status' });
      tabs.push({ value: 'role', label: 'Role' });
      return tabs;
    }, [showStatusTab]);

    const defaultTab = verticalTabs[0]?.value ?? 'role';

    const [activeTab, setActiveTab] = useState(defaultTab);
    const [localFilters, setLocalFilters] = useState({
      center: ensureArray(appliedFilters.center),
      status: ensureArray(appliedFilters.status),
      role: ensureArray(appliedFilters.role),
    });
    const [searchText, setSearchText] = useState('');
    const popoverRef = useRef(null);

    useEffect(() => {
      const visibleTabValues = new Set(verticalTabs.map((tab) => tab.value));
      if (!visibleTabValues.has(activeTab)) {
        setActiveTab(defaultTab);
      }
    }, [activeTab, defaultTab, verticalTabs]);

    useEffect(() => {
      setFilterCount((showStatusTab ? localFilters.status.length : 0) + localFilters.role.length);
    }, [
      showStatusTab,
      localFilters.center.length,
      localFilters.status.length,
      localFilters.role.length,
      setFilterCount,
    ]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    // Fetch center access on mount when Center tab is shown
    useEffect(() => {
      if (centerAccess.status === 'idle') {
        dispatch(fetchCenterAccess());
      }
    }, [centerAccess.status, dispatch]);

    // Update local filters when appliedFilters change
    useEffect(() => {
      setLocalFilters({
        center: ensureArray(appliedFilters.center),
        status: ensureArray(appliedFilters.status),
        role: ensureArray(appliedFilters.role),
      });
    }, [appliedFilters]);

    // Get center options with search filtering
    const centerOptions = React.useMemo(() => {
      if (!Array.isArray(centerAccess.data)) return [];
      let centers = centerAccess.data.map((c) => ({
        value: c.name || c.center_code || '',
        label: c.center_name || c.name || 'Unnamed Center',
      }));

      if (searchText.trim() && activeTab === 'center') {
        const searchLower = searchText.toLowerCase().trim();
        centers = centers.filter(
          (center) =>
            center.label.toLowerCase().includes(searchLower) ||
            center.value.toLowerCase().includes(searchLower),
        );
      }

      return centers;
    }, [centerAccess.data, searchText, activeTab]);

    // Get filtered status options with search
    const filteredStatusOptions = React.useMemo(() => {
      let options = [...STATUS_OPTIONS];

      if (searchText.trim() && activeTab === 'status') {
        const searchLower = searchText.toLowerCase().trim();
        options = options.filter(
          (option) =>
            option.label.toLowerCase().includes(searchLower) ||
            option.value.toLowerCase().includes(searchLower),
        );
      }

      return options;
    }, [searchText, activeTab]);

    // Role options: from prop (context-specific) or fallback to constants
    const roleOptionsBase = React.useMemo(() => {
      const source =
        Array.isArray(roleOptionsProperty) && roleOptionsProperty.length > 0
          ? roleOptionsProperty
          : ROLE_OPTIONS;
      const seen = new Set();
      return source.map(toRoleFilterOption).filter((option) => {
        if (!option?.value || seen.has(option.value)) return false;
        seen.add(option.value);
        return true;
      });
    }, [roleOptionsProperty]);

    // Get filtered role options with search
    const filteredRoleOptions = React.useMemo(() => {
      let options = [...roleOptionsBase];

      if (searchText.trim() && activeTab === 'role') {
        const searchLower = searchText.toLowerCase().trim();
        options = options.filter(
          (option) =>
            (option.label || option.value || '').toLowerCase().includes(searchLower) ||
            (option.value || option.label || '').toLowerCase().includes(searchLower),
        );
      }

      return options;
    }, [roleOptionsBase, searchText, activeTab]);

    const handleToggle = useCallback(
      (value) => {
        setLocalFilters((previous) => {
          const currentList = previous[activeTab] || [];
          const isSelected = currentList.includes(value);
          const newValues = isSelected
            ? currentList.filter((item) => item !== value)
            : [...currentList, value];

          return { ...previous, [activeTab]: newValues };
        });
      },
      [activeTab],
    );

    const handleClear = useCallback(() => {
      setLocalFilters({
        center: [],
        status: [],
        role: [],
      });
      setSearchText('');
    }, []);

    const handleApply = useCallback(() => {
      const filtersArray = [];

      if (showStatusTab && localFilters.status.length > 0) {
        if (localFilters.status.length === 1) {
          filtersArray.push(['status', '=', localFilters.status[0]]);
        } else {
          filtersArray.push(['status', 'in', localFilters.status]);
        }
      }

      if (localFilters.role.length > 0) {
        if (localFilters.role.length === 1) {
          filtersArray.push(['role', '=', localFilters.role[0]]);
        } else {
          filtersArray.push(['role', 'in', localFilters.role]);
        }
      }

      onFiltersChange?.(filtersArray, localFilters);
      _onOpenChange?.(false);
    }, [localFilters, onFiltersChange, _onOpenChange, showStatusTab]);

    const handlePopoverClose = useCallback(() => {
      handleApply();
    }, [handleApply]);

    useImperativeHandle(ref, () => ({
      handleClose: () => {
        handleApply();
      },
    }));

    if (!open) return null;

    const currentOptions =
      activeTab === 'center'
        ? centerOptions
        : activeTab === 'status'
          ? filteredStatusOptions
          : filteredRoleOptions;

    const selectedValues = localFilters[activeTab] || [];

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
                {verticalTabs.map((tab) => {
                  const selectedCount = localFilters[tab.value]?.length || 0;
                  const showCount = selectedCount > 0;

                  return (
                    <TabMenuVertical.Trigger
                      className='w-full flex items-center justify-between'
                      key={tab.value}
                      value={tab.value}
                    >
                      {tab.label}
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
              selectedValues={selectedValues}
              onToggle={handleToggle}
              searchValue={searchText}
              onSearchChange={setSearchText}
              isLoading={activeTab === 'center' && centerAccess.status === 'loading'}
              emptyMessage={
                activeTab === 'center'
                  ? 'No centers found'
                  : activeTab === 'status'
                    ? 'No status options found'
                    : 'No role options found'
              }
            />
            {/* <div className='p-4 border-t border-stroke-soft-200 flex items-center justify-end'>
              <Button.Root variant='primary' mode='filled' size='small' onClick={handleApply}>
                Apply
              </Button.Root>
            </div> */}
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

TeamFilterDropdown.displayName = 'TeamFilterDropdown';

export default TeamFilterDropdown;
