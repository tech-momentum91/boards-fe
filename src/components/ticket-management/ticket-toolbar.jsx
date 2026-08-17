import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  RiAddLine,
  RiDownloadLine,
  RiLayoutColumnLine,
  RiLineHeight,
  RiMore2Fill,
  RiSearchLine,
  RiMicLine,
} from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import * as Dropdown from '@/components/ui/dropdown';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import TableVariantToggle from '@/components/ui/table-variant-toggle';
import TicketFilterDropdown from '@/components/ticket-management/ticket-filter-dropdown';
import * as AssigneeFilter from '@/components/ui/assignee-filter';
import { isSuperAdminOrAdminRole } from '@/utils/user-role-utils';
import { getCountableFilterKeys } from '@/components/ticket-management/constants';

const EMPTY_LOCKED_FILTERS = {};

const TicketToolbar = ({
  filters,
  permissions,
  isExporting = false,
  hasListData = true,
  activeStatusTab = 'all',
  onSearchChange,
  onCreateTicket,
  onExport,
  onVoiceClick,
  onColumnsClick,
  tableRef, // Reference to the table component
  tableVariant, // Current table variant
  onTableVariantToggle, // Callback to toggle table variant
  onFiltersChange, // New callback for filter changes
  appliedFilters = {}, // Applied filters object
  currentUser = null,
  lockedFilters = EMPTY_LOCKED_FILTERS, // Locked filters that cannot be removed (e.g. { center: [centerId] } or { client: [clientId] })
}) => {
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const canShowVoiceNote = isSuperAdminOrAdminRole(userSideBarPerm);

  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  // In-flight count published by the dropdown while it's open (reflects the
  // user's staged selections inside the popover before they apply / dismiss).
  const [stagedFilterCount, setStagedFilterCount] = useState(null);
  const filterDropdownRef = useRef(null);

  // Count derived from the actually-applied filters. Mirrors the same logic
  // the dropdown uses internally (`countableKeys` + locked-filter exclusion +
  // status-tab gating) so the trigger badge stays accurate even before the
  // popover is opened — important for sessionStorage hydration on refresh.
  const appliedFilterCount = useMemo(() => {
    const keys = getCountableFilterKeys(activeStatusTab === 'all');
    return keys.reduce((sum, key) => {
      const isLocked = Array.isArray(lockedFilters[key]) && lockedFilters[key].length > 0;
      if (isLocked) return sum;
      const value = appliedFilters?.[key];
      return sum + (Array.isArray(value) ? value.length : 0);
    }, 0);
  }, [appliedFilters, lockedFilters, activeStatusTab]);

  // Show the staged count while the popover is open so per-keystroke edits
  // are visible in the trigger badge; otherwise show the applied count.
  const filterCount =
    isFilterDropdownOpen && stagedFilterCount !== null ? stagedFilterCount : appliedFilterCount;
  const canCreate = permissions?.canCreate;
  const canExport = permissions?.canExport;
  const isExportDisabled = isExporting || !hasListData;
  const isColumnManagerDisabled = !hasListData;

  const exportTooltip = !hasListData
    ? 'No tickets available to export'
    : isExporting
      ? 'Exporting...'
      : 'Export';
  const columnManagerTooltip = !hasListData
    ? 'No tickets available to manage columns'
    : 'Column Manager';

  useEffect(() => {
    if (!hasListData && isColumnManagerOpen) {
      setIsColumnManagerOpen(false);
    }
  }, [hasListData, isColumnManagerOpen]);

  const [isAssigneePopoverOpen, setIsAssigneePopoverOpen] = useState(false);

  const selectedAssignees = useMemo(() => {
    const raw = appliedFilters.assignee;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    return [raw];
  }, [appliedFilters.assignee]);

  const handleSearch = (event) => {
    onSearchChange?.(event.target.value);
  };

  const handleClearAllFilters = (e) => {
    e.stopPropagation();
    const cleared = {
      center: [],
      zone: [],
      status: [],
      assignee: [],
      priority: [],
      custom_ticket_type: [],
      client: [],
      category: [],
      sub_category: [],
      sub_sub_category: [],
      severity: [],
      resolution_time: [],
      custom_requires_rm: false,
    };
    // Preserve locked filters when clearing
    onFiltersChange?.({ ...cleared, ...lockedFilters });
    setStagedFilterCount(null);
    setIsFilterDropdownOpen(false);
  };

  const secondaryActions = (
    <>
      {canExport && (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <span className='inline-flex'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                className='shrink-0 gap-1'
                onClick={onExport}
                disabled={isExportDisabled}
                aria-busy={isExporting}
              >
                <Button.Icon>
                  <RiDownloadLine size={20} />
                </Button.Icon>
              </Button.Root>
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>{exportTooltip}</p>
          </Tooltip.Content>
        </Tooltip.Root>
      )}

      {isColumnManagerDisabled ? (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <span className='inline-flex'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                className='shrink-0 gap-1'
                disabled
                aria-label='Column Manager'
              >
                <Button.Icon>
                  <RiLayoutColumnLine size={20} />
                </Button.Icon>
              </Button.Root>
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>{columnManagerTooltip}</p>
          </Tooltip.Content>
        </Tooltip.Root>
      ) : (
        <ColumnManagerDropdown
          open={isColumnManagerOpen}
          onOpenChange={setIsColumnManagerOpen}
          config={tableRef?.current?.columnConfigHook}
          tooltipContent={<p>{columnManagerTooltip}</p>}
          trigger={
            <Button.Root variant='neutral' mode='stroke' size='small' className='shrink-0 gap-1'>
              <Button.Icon>
                <RiLayoutColumnLine size={20} />
              </Button.Icon>
            </Button.Root>
          }
        />
      )}

      {/* <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <TableVariantToggle variant={tableVariant} onToggle={onTableVariantToggle} />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>Table Variant</p>
        </Tooltip.Content>
      </Tooltip.Root> */}
    </>
  );

  return (
    <header className='flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between'>
      <Input.Root className='w-full min-w-0 md:max-w-[372px]'>
        <Input.Wrapper>
          <Input.Icon>
            <RiSearchLine />
          </Input.Icon>
          <Input.Input
            placeholder='Search by ticket ID, Title'
            value={filters.search}
            onChange={handleSearch}
            aria-label='Search tickets'
          />
        </Input.Wrapper>
      </Input.Root>

      <div className='flex min-w-0 shrink-0 flex-wrap items-center gap-2 sm:gap-3'>
        {canShowVoiceNote && (
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button.Root
                type='button'
                variant='neutral'
                mode='ghost'
                size='medium'
                aria-label='Voice note'
                onClick={onVoiceClick}
              >
                <Button.Icon as={RiMicLine} />
              </Button.Root>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Voice note</p>
            </Tooltip.Content>
          </Tooltip.Root>
        )}

        <AssigneeFilter.Toolbar
          selectedAssignees={selectedAssignees}
          currentUser={currentUser}
          popoverOpen={isAssigneePopoverOpen}
          onPopoverOpenChange={setIsAssigneePopoverOpen}
          onAssigneesChange={(assignees) => onFiltersChange?.({ assignee: assignees })}
        />
        <Popover.Root
          open={isFilterDropdownOpen}
          onOpenChange={(open) => {
            const wasOpen = isFilterDropdownOpen;
            setIsFilterDropdownOpen(open);
            if (wasOpen && !open) {
              if (filterDropdownRef.current) {
                filterDropdownRef.current.handleClose();
              }
              // Drop the staged count so the trigger immediately reflects the
              // applied state once the popover is dismissed.
              setStagedFilterCount(null);
            }
          }}
        >
          <Filter.TriggerButton
            filterCount={filterCount}
            onClear={handleClearAllFilters}
            tooltipContent='Filter'
            ariaLabel='Filter tickets'
          />

          <TicketFilterDropdown
            ref={filterDropdownRef}
            open={isFilterDropdownOpen}
            setFilterCount={setStagedFilterCount}
            onFiltersChange={onFiltersChange}
            appliedFilters={appliedFilters}
            activeStatusTab={activeStatusTab}
            lockedFilters={lockedFilters}
          />
        </Popover.Root>

        {/* Secondary actions: dropdown on small screens, inline from md up */}
        <div className='hidden md:flex md:items-center md:gap-3'>{secondaryActions}</div>

        <Dropdown.Root>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Dropdown.Trigger asChild>
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='small'
                  className='shrink-0 gap-1 md:hidden'
                  aria-label='More actions'
                >
                  <Button.Icon>
                    <RiMore2Fill size={20} />
                  </Button.Icon>
                </Button.Root>
              </Dropdown.Trigger>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>More</p>
            </Tooltip.Content>
          </Tooltip.Root>
          <Dropdown.Content align='end' className='min-w-[180px]'>
            {canExport && (
              <Dropdown.Item
                onSelect={(e) => {
                  onExport?.();
                }}
                disabled={isExportDisabled}
              >
                <Dropdown.ItemIcon as={RiDownloadLine} />
                Export
              </Dropdown.Item>
            )}
            <Dropdown.Item
              onSelect={() => {
                setIsColumnManagerOpen(true);
              }}
              disabled={isColumnManagerDisabled}
            >
              <Dropdown.ItemIcon as={RiLayoutColumnLine} />
              Column Manager
            </Dropdown.Item>
            <Dropdown.Item onSelect={() => onTableVariantToggle?.()}>
              <Dropdown.ItemIcon as={RiLineHeight} />
              Table variant
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Root>

        {canCreate && (
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button.Root size='small' className='shrink-0 gap-1' onClick={onCreateTicket}>
                <Button.Icon>
                  <RiAddLine size={20} />
                </Button.Icon>
                <span className='hidden sm:inline'>Create Ticket</span>
              </Button.Root>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Create Ticket</p>
            </Tooltip.Content>
          </Tooltip.Root>
        )}
      </div>
    </header>
  );
};

export default TicketToolbar;
