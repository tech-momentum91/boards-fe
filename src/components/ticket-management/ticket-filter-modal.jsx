import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiFilter3Line, RiCloseLine } from 'react-icons/ri';
import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import { cn } from '@/utils/cn';
import {
  fetchTicketDropdownData,
  fetchSubCategories,
  fetchSubSubCategories,
  selectTicketDropdownData,
  selectSubCategories,
  selectSubSubCategories,
} from '@/redux/ticketManagementSlice';
import { fetchCenterAccess, selectCenterAccess } from '@/redux/centerSlice';
import {
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  RESOLUTION_TIME_FILTER_OPTIONS,
} from '@/components/ticket-management/constants';
import { isClient } from '@/constants/users-constants';
import { getStatusOptions } from '@/api/dynamic-status';

const FilterRow = ({ label, children, isLast = false, onClear, hasValue = false }) => {
  return (
    <div
      className={cn(
        'flex h-11 items-center border-b border-stroke-soft-200',
        isLast && 'border-b-0',
      )}
    >
      <div className='w-40 shrink-0 border-r border-stroke-soft-200 pl-3 pr-0 flex items-center h-full'>
        <span className='label-small text-text-main-900 whitespace-nowrap'>{label}</span>
      </div>
      <div className='flex-1 flex items-center py-1 gap-2 pr-2 overflow-y-auto'>{children}</div>
      {hasValue && onClear && (
        <>
          <div className='shrink-0 w-px h-6 bg-stroke-soft-200' />
          <button
            onClick={onClear}
            className='shrink-0 w-8 h-8 flex items-center justify-center rounded hover:bg-stroke-soft-200 transition-colors mr-2'
            aria-label={`Clear ${label}`}
          >
            <RiCloseLine className='size-4 text-text-sub-600' />
          </button>
        </>
      )}
    </div>
  );
};

const TicketFilterModal = ({ open, onOpenChange, filters, onApply, onClear }) => {
  const dispatch = useDispatch();
  const dropdownData = useSelector(selectTicketDropdownData);
  const subCategories = useSelector(selectSubCategories);
  const subSubCategories = useSelector(selectSubSubCategories);
  const centerAccess = useSelector(selectCenterAccess);
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const roleMap = userSideBarPerm?.data?.message?.role;
  const isClientUser = isClient(roleMap);

  const [dynamicStatusOptions, setDynamicStatusOptions] = useState([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const fetchLatest = async () => {
      try {
        const opts = await getStatusOptions({ doctype: 'HD Ticket', field: 'status' });
        if (!cancelled) setDynamicStatusOptions(Array.isArray(opts) ? opts : []);
      } catch {
        if (!cancelled) setDynamicStatusOptions([]);
      }
    };

    fetchLatest();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Local state for filter values
  // Convert to arrays for multi-select
  const getFilterValue = (filterValue) => {
    if (Array.isArray(filterValue)) {
      return filterValue.filter(Boolean).map(String);
    }
    if (filterValue === null || filterValue === undefined || filterValue === '') {
      return [];
    }
    return [String(filterValue)];
  };

  const [localFilters, setLocalFilters] = useState(() => ({
    custom_ticket_type: getFilterValue(filters?.custom_ticket_type),
    client: getFilterValue(filters?.client),
    center: getFilterValue(filters?.center),
    zone: getFilterValue(filters?.zone),
    status: getFilterValue(filters?.status),
    resolution_time: getFilterValue(filters?.resolution_time),
    assignee: getFilterValue(filters?.assignee),
    priority: getFilterValue(filters?.priority),
    sub_category: getFilterValue(filters?.sub_category),
    severity: getFilterValue(filters?.severity),
  }));

  // Fetch dropdown data when drawer opens
  useEffect(() => {
    if (open) {
      if (dropdownData.status === 'idle') {
        dispatch(fetchTicketDropdownData());
      }
      if (centerAccess.status === 'idle') {
        dispatch(fetchCenterAccess());
      }
    }
  }, [open, dispatch, dropdownData.status, centerAccess.status]);

  // Reset local filters when drawer opens or filters prop changes
  useEffect(() => {
    if (open) {
      const getValue = (value) => {
        if (Array.isArray(value)) {
          return value.filter(Boolean).map(String);
        }
        if (value === null || value === undefined || value === '') {
          return [];
        }
        return [String(value)];
      };
      const newFilters = {
        custom_ticket_type: getValue(filters?.custom_ticket_type),
        client: getValue(filters?.client),
        center: getValue(filters?.center),
        zone: getValue(filters?.zone),
        status: getValue(filters?.status),
        resolution_time: getValue(filters?.resolution_time),
        assignee: getValue(filters?.assignee),
        priority: getValue(filters?.priority),
        sub_category: getValue(filters?.sub_category),
        severity: getValue(filters?.severity),
      };
      setLocalFilters(newFilters);
    }
  }, [open, filters]);

  // Get options from dropdown data with fallbacks
  const ticketTypeOptions = useMemo(() => {
    const options = dropdownData.data?.ticket_types || [];
    // Fallback options if API doesn't return data
    return options.length > 0
      ? options
      : [
          { label: 'Client Ticket', value: 'client_ticket' },
          { label: 'Internal Snag', value: 'internal_snag' },
        ];
  }, [dropdownData.data?.ticket_types]);

  const clientOptions = useMemo(() => {
    // Try to get clients from dropdown data, or use raised_by field
    return dropdownData.data?.clients || dropdownData.data?.customers || [];
  }, [dropdownData.data?.clients, dropdownData.data?.customers]);

  const centerOptions = useMemo(() => {
    return dropdownData.data?.centers || [];
  }, [dropdownData.data?.centers]);

  const statusOptions = useMemo(() => {
    const apiStatuses =
      dynamicStatusOptions.length > 0 ? dynamicStatusOptions : dropdownData.data?.statuses || [];
    const options = apiStatuses;

    // Ensure "Breached" is always included as it's a special computed status
    const hasBreached = options.some((opt) => opt.value === 'Breached');
    if (!hasBreached) {
      return [...options, { label: 'Breached', value: 'Breached', color: 'red' }];
    }

    return options;
  }, [dropdownData.data?.statuses, dynamicStatusOptions]);

  const priorityOptions = useMemo(() => {
    const options = dropdownData.data?.priorities || PRIORITY_OPTIONS;
    return options.length > 0 ? options : PRIORITY_OPTIONS;
  }, [dropdownData.data?.priorities]);

  const categoryOptions = useMemo(() => {
    return dropdownData.data?.categories || [];
  }, [dropdownData.data?.categories]);

  const severityOptions = useMemo(() => {
    return dropdownData.data?.severities || [];
  }, [dropdownData.data?.severities]);

  const zoneOptions = useMemo(() => {
    if (!Array.isArray(centerAccess.data)) return [];
    const zones = new Set();
    centerAccess.data.forEach((center) => {
      if (center.zone) {
        zones.add(center.zone);
      }
    });
    return [...zones]
      .map((zone) => ({ value: zone, label: zone }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [centerAccess.data]);

  const handleFilterChange = useCallback((field, value) => {
    setLocalFilters((previous) => ({ ...previous, [field]: value }));
  }, []);

  const handleClearFilter = useCallback((field) => {
    const clearValue = [];

    if (field === 'category') {
      setLocalFilters((previous) => ({
        ...previous,
        [field]: clearValue,
        sub_category: clearValue,
        sub_sub_category: clearValue,
      }));
    } else if (field === 'sub_category') {
      setLocalFilters((previous) => ({
        ...previous,
        [field]: clearValue,
        sub_sub_category: clearValue,
      }));
    } else {
      setLocalFilters((previous) => ({ ...previous, [field]: clearValue }));
    }
  }, []);

  const handleClear = useCallback(() => {
    // Only reset local selections; parent data updates when user clicks Apply
    setLocalFilters({
      custom_ticket_type: [],
      client: [],
      center: [],
      zone: [],
      status: [],
      resolution_time: [],
      assignee: [],
      priority: [],
      sub_category: [],
      severity: [],
    });
  }, []);

  const handleApply = useCallback(() => {
    if (onApply) {
      // For client users, only allow specific filters
      const filtersToApply = isClientUser
        ? {
            center: localFilters.center,
            zone: localFilters.zone,
            status: localFilters.status,
            // Clear all other filters for client users (including assignee)
            assignee: [],
            custom_ticket_type: [],
            client: [],
            priority: [],
            category: [],
            sub_category: [],
            sub_sub_category: [],
            severity: [],
            resolution_time: [],
          }
        : localFilters;
      onApply(filtersToApply);
    }
    onOpenChange(false);
  }, [localFilters, onApply, onOpenChange, isClientUser]);

  const isLoading = dropdownData.status === 'loading';

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Drawer.Header className='gap-4 px-6 py-5'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-white-0 ring-1 ring-inset ring-stroke-soft-200'>
            <RiFilter3Line className='size-5 text-text-sub-600' />
          </div>
          <div className='flex-1 space-y-1'>
            <Drawer.Title>Filter</Drawer.Title>
            <p className='paragraph-small text-text-sub-600'>
              Select filters to view specific items
            </p>
          </div>
        </Drawer.Header>

        <Drawer.Body className='flex-1 overflow-y-auto px-6 py-6'>
          <div className='border border-stroke-soft-200 rounded-xl bg-bg-white-0'>
            {!isClientUser && (
              <FilterRow
                label='Ticket Type'
                isLast={false}
                hasValue={localFilters.custom_ticket_type.length > 0}
                onClear={() => handleClearFilter('custom_ticket_type')}
              >
                <MultiSelect
                  options={ticketTypeOptions}
                  value={localFilters.custom_ticket_type}
                  onValueChange={(value) => handleFilterChange('custom_ticket_type', value)}
                  disabled={isLoading}
                  variant='borderless'
                  placeholder='Select'
                  className='w-full'
                />
              </FilterRow>
            )}

            {!isClientUser && (
              <FilterRow
                label='Client'
                isLast={false}
                hasValue={localFilters.client.length > 0}
                onClear={() => handleClearFilter('client')}
              >
                <MultiSelect
                  options={clientOptions}
                  value={localFilters.client}
                  onValueChange={(value) => handleFilterChange('client', value)}
                  disabled={isLoading}
                  variant='borderless'
                  placeholder='Select'
                  className='max-w-full'
                />
              </FilterRow>
            )}

            <FilterRow
              label='Center'
              isLast={false}
              hasValue={localFilters.center.length > 0}
              onClear={() => handleClearFilter('center')}
            >
              <MultiSelect
                options={centerOptions}
                value={localFilters.center}
                onValueChange={(value) => handleFilterChange('center', value)}
                disabled={isLoading}
                variant='borderless'
                placeholder='Select'
                className='w-full'
              />
            </FilterRow>

            <FilterRow
              label='Zone'
              isLast={false}
              hasValue={localFilters.zone.length > 0}
              onClear={() => handleClearFilter('zone')}
            >
              <MultiSelect
                options={zoneOptions}
                value={localFilters.zone}
                onValueChange={(value) => handleFilterChange('zone', value)}
                disabled={isLoading}
                variant='borderless'
                placeholder='Select'
                className='w-full'
              />
            </FilterRow>

            <FilterRow
              label='Status'
              isLast={false}
              hasValue={localFilters.status.length > 0}
              onClear={() => handleClearFilter('status')}
            >
              <MultiSelect
                options={statusOptions}
                value={localFilters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
                disabled={isLoading}
                variant='borderless'
                placeholder='Select'
                className='w-full'
              />
            </FilterRow>

            {!isClientUser && (
              <FilterRow
                label='Resolution Time'
                isLast={false}
                hasValue={localFilters.resolution_time.length > 0}
                onClear={() => handleClearFilter('resolution_time')}
              >
                <MultiSelect
                  options={RESOLUTION_TIME_FILTER_OPTIONS}
                  value={localFilters.resolution_time}
                  onValueChange={(value) => handleFilterChange('resolution_time', value)}
                  disabled={isLoading}
                  variant='borderless'
                  placeholder='Select'
                  className='w-full'
                />
              </FilterRow>
            )}

            {!isClientUser && (
              <FilterRow
                label='Assignee'
                isLast={false}
                hasValue={localFilters.assignee.length > 0}
                onClear={() => handleClearFilter('assignee')}
              >
                <AssigneeMultiSelect
                  value={localFilters.assignee}
                  onChange={(value) => handleFilterChange('assignee', value)}
                  onBlur={(value) => handleFilterChange('assignee', value)}
                  disabled={isLoading}
                  placeholder='Select assignees'
                  size='small'
                  maxVisibleAvatars={3}
                />
              </FilterRow>
            )}

            {!isClientUser && (
              <>
                <FilterRow
                  label='Priority'
                  isLast={false}
                  hasValue={localFilters.priority.length > 0}
                  onClear={() => handleClearFilter('priority')}
                >
                  <MultiSelect
                    options={priorityOptions}
                    value={localFilters.priority}
                    onValueChange={(value) => handleFilterChange('priority', value)}
                    disabled={isLoading}
                    variant='borderless'
                    placeholder='Select'
                    className='w-full'
                  />
                </FilterRow>

                <FilterRow
                  label='Category'
                  isLast={false}
                  hasValue={localFilters.sub_category.length > 0}
                  onClear={() => handleClearFilter('sub_category')}
                >
                  <MultiSelect
                    options={dropdownData.data?.sub_categories || []}
                    value={localFilters.sub_category}
                    onValueChange={(value) => handleFilterChange('sub_category', value)}
                    disabled={isLoading}
                    variant='borderless'
                    placeholder='Select'
                    className='w-full'
                  />
                </FilterRow>

                <FilterRow
                  label='Severity'
                  isLast={true}
                  hasValue={localFilters.severity.length > 0}
                  onClear={() => handleClearFilter('severity')}
                >
                  <MultiSelect
                    options={severityOptions}
                    value={localFilters.severity}
                    onValueChange={(value) => handleFilterChange('severity', value)}
                    disabled={isLoading}
                    variant='borderless'
                    placeholder='Select'
                    className='w-full'
                  />
                </FilterRow>
              </>
            )}
          </div>
        </Drawer.Body>

        <Drawer.Footer className='border-t border-stroke-soft-200 px-6 py-6'>
          <div className='flex items-center justify-end gap-3 w-full'>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='medium'
              onClick={handleClear}
              className='w-[76px]'
            >
              Clear
            </Button.Root>
            <Button.Root
              variant='primary'
              mode='filled'
              size='medium'
              onClick={handleApply}
              className='w-[76px]'
            >
              Apply
            </Button.Root>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default TicketFilterModal;
