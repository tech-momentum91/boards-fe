import React, { useState, useEffect, useRef, useImperativeHandle, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiArrowRightSLine, RiSearchLine } from 'react-icons/ri';
import { getCenterListThunk } from '@/redux/centerSlice';
import * as Popover from '@/components/ui/popover';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Input from '@/components/ui/input';
import * as LinkButton from '@/components/ui/link-button';
import * as Checkbox from '@/components/ui/checkbox';
import * as Badge from '@/components/ui/badge';
import { getRolesWithDescription } from '@/redux/settingSlice';
const STATUS_OPTIONS = [
  { label: 'Active', value: '1' },
  { label: 'Inactive', value: '0' },
];

const UsersFilterDropdown = React.forwardRef(
  (
    { setFilterCount, open, onOpenChange: _onOpenChange, onFiltersChange, appliedFilters = {} },
    ref,
  ) => {
    const dispatch = useDispatch();
    const { data: centerListData, isLoading: isLoadingCenters } = useSelector(
      (state) => state.center.centerListData,
    );

    const [activeTab, setActiveTab] = useState('center');
    const [localFilters, setLocalFilters] = useState({
      center: Array.isArray(appliedFilters.center)
        ? appliedFilters.center
        : appliedFilters.center
          ? [appliedFilters.center]
          : [],
      status: Array.isArray(appliedFilters.status)
        ? appliedFilters.status
        : appliedFilters.status
          ? [appliedFilters.status]
          : [],
      role: Array.isArray(appliedFilters.role)
        ? appliedFilters.role
        : appliedFilters.role
          ? [appliedFilters.role]
          : [],
    });
    const { data, isLoading: isLoadingRoles } = useSelector(
      (state) => state.setting.rolesWithDescription,
    );

    const rolesData = Array.isArray(data) ? data : data?.message || [];
    const [centerSearch, setCenterSearch] = useState('');
    const [statusSearch, setStatusSearch] = useState('');
    const [roleSearch, setRoleSearch] = useState('');
    const popoverRef = useRef(null);

    useEffect(() => {
      setFilterCount(
        localFilters.center.length + localFilters.status.length + localFilters.role.length,
      );
    }, [localFilters.center.length, localFilters.status.length, localFilters.role.length]);

    // Reset search when tab changes
    useEffect(() => {
      if (activeTab !== 'center') {
        setCenterSearch('');
      }
      if (activeTab !== 'status') {
        setStatusSearch('');
      }
      if (activeTab !== 'role') {
        setRoleSearch('');
      }
    }, [activeTab]);

    const verticalTabs = [
      {
        value: 'center',
        label: 'Center',
      },
      {
        value: 'status',
        label: 'Status',
      },
      {
        value: 'role',
        label: 'Role',
      },
    ];

    // Fetch centers and roles when popover opens
    useEffect(() => {
      if (open) {
        if (centerListData?.length === 0) {
          dispatch(getCenterListThunk({ keyword: '', filters: [], pageSize: 999 }));
        }

        if (rolesData.length === 0 && !isLoadingRoles) {
          dispatch(getRolesWithDescription());
        }
      }
    }, [open, dispatch]);

    // Update local filters when appliedFilters change
    useEffect(() => {
      setLocalFilters({
        center: Array.isArray(appliedFilters.center)
          ? appliedFilters.center
          : appliedFilters.center
            ? [appliedFilters.center]
            : [],
        status: Array.isArray(appliedFilters.status)
          ? appliedFilters.status
          : appliedFilters.status
            ? [appliedFilters.status]
            : [],
        role: Array.isArray(appliedFilters.role)
          ? appliedFilters.role
          : appliedFilters.role
            ? [appliedFilters.role]
            : [],
      });
    }, [appliedFilters]);

    // Get center options with search filtering
    const centerOptions = React.useMemo(() => {
      if (!Array.isArray(centerListData)) return [];
      let centers = centerListData.map((c) => ({
        value: c.center_name || c.name || c.center_code || '',
        label: c.center_name || c.name || 'Unnamed Center',
      }));

      // Filter centers based on search
      if (centerSearch.trim()) {
        const searchLower = centerSearch.toLowerCase().trim();
        centers = centers.filter(
          (center) =>
            center.label.toLowerCase().includes(searchLower) ||
            center.value.toLowerCase().includes(searchLower),
        );
      }

      return centers;
    }, [centerListData, centerSearch]);

    // Get filtered status options with search
    const filteredStatusOptions = React.useMemo(() => {
      let options = [...STATUS_OPTIONS];

      if (statusSearch.trim()) {
        const searchLower = statusSearch.toLowerCase().trim();
        options = options.filter(
          (option) =>
            option.label.toLowerCase().includes(searchLower) ||
            option.value.toLowerCase().includes(searchLower),
        );
      }

      return options;
    }, [statusSearch]);

    // Get filtered role options with search
    const filteredRoleOptions = React.useMemo(() => {
      if (!Array.isArray(rolesData)) return [];

      let options = rolesData.map((role) => ({
        label: role.name,
        value: role.name,
      }));

      if (roleSearch.trim()) {
        const searchLower = roleSearch.toLowerCase().trim();
        options = options.filter(
          (option) =>
            option.label.toLowerCase().includes(searchLower) ||
            option.value.toLowerCase().includes(searchLower),
        );
      }

      return options;
    }, [rolesData, roleSearch]);

    // Helper function to build filters array from filter object
    const buildFiltersArrayForFilters = (filters) => {
      const filtersArray = [];
      // Add center filters
      if (Array.isArray(filters.center) && filters.center.length > 0) {
        if (filters.center.length === 1) {
          filtersArray.push(['center_name', '=', filters.center[0]]);
        } else {
          filtersArray.push(['center_name', 'in', filters.center]);
        }
      }
      // Add status filters
      if (Array.isArray(filters.status) && filters.status.length > 0) {
        filters.status.forEach((status) => {
          const enabled = status === '1' ? 1 : 0;
          filtersArray.push(['enabled', '=', enabled]);
        });
      }
      // Add role filters
      if (Array.isArray(filters.role) && filters.role.length > 0) {
        if (filters.role.length === 1) {
          filtersArray.push(['role', '=', filters.role[0]]);
        } else {
          filtersArray.push(['role', 'in', filters.role]);
        }
      }
      return filtersArray;
    };

    // Helper function to build filters array from current localFilters
    const buildFiltersArray = useCallback(() => {
      return buildFiltersArrayForFilters(localFilters);
    }, [localFilters]);

    const handleCenterToggle = (centerValue) => {
      setLocalFilters((previous) => {
        const currentCenters = Array.isArray(previous.center) ? previous.center : [];
        const isSelected = currentCenters.includes(centerValue);
        return {
          ...previous,
          center: isSelected
            ? currentCenters.filter((c) => c !== centerValue)
            : [...currentCenters, centerValue],
        };
      });
    };

    const handleStatusToggle = (statusValue) => {
      setLocalFilters((previous) => {
        const currentStatus = Array.isArray(previous.status) ? previous.status : [];
        const isSelected = currentStatus.includes(statusValue);
        return {
          ...previous,
          status: isSelected
            ? currentStatus.filter((s) => s !== statusValue)
            : [...currentStatus, statusValue],
        };
      });
    };

    const handleRoleToggle = (roleValue) => {
      setLocalFilters((previous) => {
        const currentRoles = Array.isArray(previous.role) ? previous.role : [];
        const isSelected = currentRoles.includes(roleValue);
        return {
          ...previous,
          role: isSelected
            ? currentRoles.filter((r) => r !== roleValue)
            : [...currentRoles, roleValue],
        };
      });
    };

    const handleClear = () => {
      const clearedFilters = {
        center: [],
        status: [],
        role: [],
      };
      setLocalFilters(clearedFilters);
      setCenterSearch('');
      setStatusSearch('');
      setRoleSearch('');
    };

    // Handle when popover closes (blur/interact outside)
    const handlePopoverClose = useCallback(() => {
      const filtersArray = buildFiltersArray();
      onFiltersChange?.(filtersArray, localFilters);
    }, [localFilters, onFiltersChange, buildFiltersArray]);

    // Track previous open state to detect when popover closes
    const previousOpenRef = useRef(open);
    useEffect(() => {
      if (previousOpenRef.current && !open) {
        handlePopoverClose();
      }
      previousOpenRef.current = open;
    }, [open, handlePopoverClose]);

    // Expose handleClose method via ref
    useImperativeHandle(ref, () => ({
      handleClose: handlePopoverClose,
    }));

    if (!open) return null;

    return (
      <Popover.Content ref={popoverRef} className='p-0'>
        <div className='w-full rounded-xl border border-stroke-soft-200 flex flex-col'>
          <div className='w-full rounded-t-xl flex justify-between bg-[#F6F8FA] p-4 items-center border-b border-stroke-soft-200'>
            <span className='subheading-2xs w-full text-text-soft-400'>FILTERS</span>
            <LinkButton.Root variant='primary' size='small' onClick={handleClear}>
              Clear All
            </LinkButton.Root>
          </div>
          <div className='flex h-[400px]'>
            {/* Left sidebar with tabs */}
            <div className='w-[200px] border-r border-stroke-soft-200'>
              <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
                <TabMenuVertical.List className='p-2'>
                  {verticalTabs.map((item) => {
                    const selectedCenterCount =
                      item.value === 'center' && Array.isArray(localFilters.center)
                        ? localFilters.center.length
                        : 0;
                    const showCenterCount = item.value === 'center' && selectedCenterCount > 0;

                    const selectedStatusCount =
                      item.value === 'status' && Array.isArray(localFilters.status)
                        ? localFilters.status.length
                        : 0;
                    const showStatusCount = item.value === 'status' && selectedStatusCount > 0;

                    const selectedRoleCount =
                      item.value === 'role' && Array.isArray(localFilters.role)
                        ? localFilters.role.length
                        : 0;
                    const showRoleCount = item.value === 'role' && selectedRoleCount > 0;

                    const showCount = showCenterCount || showStatusCount || showRoleCount;
                    const countValue = showCenterCount
                      ? selectedCenterCount
                      : showStatusCount
                        ? selectedStatusCount
                        : showRoleCount
                          ? selectedRoleCount
                          : 0;

                    return (
                      <TabMenuVertical.Trigger
                        className='w-full flex items-center justify-between'
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
            </div>

            {/* Right content area */}
            <div className='w-[356px] flex flex-col'>
              <div className='flex-1 overflow-y-auto p-2'>
                {activeTab === 'center' && (
                  <div className='flex flex-col gap-4'>
                    <div className='flex flex-col gap-2'>
                      <Input.Root>
                        <Input.Wrapper>
                          <Input.Icon>
                            <RiSearchLine />
                          </Input.Icon>
                          <Input.Input
                            placeholder='Search...'
                            value={centerSearch}
                            onChange={(e) => setCenterSearch(e.target.value)}
                          />
                        </Input.Wrapper>
                      </Input.Root>

                      <div className='w-full flex py-3 flex-col gap-3'>
                        {isLoadingCenters ? (
                          <div className='p-2 text-paragraph-sm text-text-sub-600 text-center'>
                            Loading centers...
                          </div>
                        ) : centerOptions.length > 0 ? (
                          centerOptions.map((option) => {
                            const isChecked = Array.isArray(localFilters.center)
                              ? localFilters.center.includes(option.value)
                              : false;
                            return (
                              <div
                                key={option.value}
                                className='w-full flex items-center gap-2 rounded hover:bg-bg-weak-50 cursor-pointer'
                                onClick={() => handleCenterToggle(option.value)}
                              >
                                <Checkbox.Root
                                  size='medium'
                                  checked={isChecked}
                                  onCheckedChange={() => handleCenterToggle(option.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className='shrink-0'
                                />
                                <span className='label-small text-text-main-900 flex-1'>
                                  {option.label}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className='p-2 text-paragraph-sm text-text-sub-600 text-center'>
                            No centers found
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'status' && (
                  <div className='flex flex-col gap-4'>
                    <div className='flex flex-col gap-2'>
                      <Input.Root>
                        <Input.Wrapper>
                          <Input.Icon>
                            <RiSearchLine />
                          </Input.Icon>
                          <Input.Input
                            placeholder='Search...'
                            value={statusSearch}
                            onChange={(e) => setStatusSearch(e.target.value)}
                          />
                        </Input.Wrapper>
                      </Input.Root>

                      <div className='w-full flex py-3 flex-col gap-3'>
                        {filteredStatusOptions.length > 0 ? (
                          filteredStatusOptions.map((option) => {
                            const isChecked = Array.isArray(localFilters.status)
                              ? localFilters.status.includes(option.value)
                              : false;
                            return (
                              <div
                                key={option.value}
                                className='w-full flex items-center gap-2 rounded hover:bg-bg-weak-50 cursor-pointer'
                                onClick={() => handleStatusToggle(option.value)}
                              >
                                <Checkbox.Root
                                  size='medium'
                                  checked={isChecked}
                                  onCheckedChange={() => handleStatusToggle(option.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className='shrink-0'
                                />
                                <span className='label-small text-text-main-900 flex-1'>
                                  {option.label}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className='p-2 text-paragraph-sm text-text-sub-600 text-center'>
                            No status options found
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'role' && (
                  <div className='flex flex-col gap-4'>
                    <div className='flex flex-col gap-2'>
                      <Input.Root>
                        <Input.Wrapper>
                          <Input.Icon>
                            <RiSearchLine />
                          </Input.Icon>
                          <Input.Input
                            placeholder='Search...'
                            value={roleSearch}
                            onChange={(e) => setRoleSearch(e.target.value)}
                          />
                        </Input.Wrapper>
                      </Input.Root>

                      <div className='w-full flex py-3 flex-col gap-3'>
                        {filteredRoleOptions.length > 0 ? (
                          filteredRoleOptions.map((option) => {
                            const isChecked = Array.isArray(localFilters.role)
                              ? localFilters.role.includes(option.value)
                              : false;
                            return (
                              <div
                                key={option.value}
                                className='w-full flex items-center gap-2 rounded hover:bg-bg-weak-50 cursor-pointer'
                                onClick={() => handleRoleToggle(option.value)}
                              >
                                <Checkbox.Root
                                  size='medium'
                                  checked={isChecked}
                                  onCheckedChange={() => handleRoleToggle(option.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className='shrink-0'
                                />
                                <span className='label-small text-text-main-900 flex-1'>
                                  {option.label}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className='p-2 text-paragraph-sm text-text-sub-600 text-center'>
                            No role options found
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Popover.Content>
    );
  },
);

UsersFilterDropdown.displayName = 'UsersFilterDropdown';

export default UsersFilterDropdown;
