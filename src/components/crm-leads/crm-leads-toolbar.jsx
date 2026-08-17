import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAddLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseLine,
  RiLayoutColumnLine,
  RiSearchLine,
  RiStackLine,
} from 'react-icons/ri';
import * as Avatar from '@/components/ui/avatar';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Switch from '@/components/ui/switch';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import * as Select from '@/components/ui/select';
import * as LinkButton from '@/components/ui/link-button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Filter from '@/components/ui/filter';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import CrmLeadsFilterDropdown from './crm-leads-filter-dropdown';
import { GROUP_BY_OPTIONS, DEFAULT_LEAD_FILTERS, LEAD_FILTER_TABS } from './constants';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  countActiveDatetimeFilter,
  datetimeFilterFromDateRange,
  getDatetimeFilterDateRange,
} from '@/utils/date-utils';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/utils/cn';

const DATE_FILTER_FIELD_OPTIONS = [
  { value: LEAD_FILTER_TABS.CREATED_AT, label: 'Created At' },
  { value: LEAD_FILTER_TABS.LAST_MODIFIED, label: 'Last Modified' },
];

const toolbarButtonClassName =
  'flex items-center justify-center rounded-lg border border-stroke-soft-200 bg-bg-white-0 text-icon-sub-500 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)] transition hover:bg-bg-weak-50';

function getProfileInitials(fullName = '') {
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  if (nameParts.length === 0) return '?';
  const firstInitial = nameParts[0]?.[0]?.toUpperCase() ?? '';
  const lastInitial =
    nameParts.length > 1 ? (nameParts[nameParts.length - 1]?.[0]?.toUpperCase() ?? '') : '';
  return `${firstInitial}${lastInitial}`;
}

function MeModeAvatarButton({ user, active = false, disabled = false, onClick, onClear }) {
  const profileImage = typeof user?.user_image === 'string' ? user.user_image.trim() : '';
  const [imageFailed, setImageFailed] = useState(false);
  const initials = useMemo(
    () => getProfileInitials(user?.full_name || user?.email || ''),
    [user?.email, user?.full_name],
  );
  const showImage = Boolean(profileImage) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [profileImage]);

  return (
    <div
      role='group'
      aria-label='Me mode filter'
      className={cn(
        'flex h-9 items-center justify-center gap-1.5 rounded-lg border transition',
        active
          ? 'border-primary-base bg-primary-lighter px-2 ring-1 ring-primary-base'
          : cn(toolbarButtonClassName, 'p-1.5'),
        disabled && 'opacity-50',
      )}
    >
      <button
        type='button'
        disabled={disabled}
        aria-label={
          active
            ? 'Me filter active (Sales Owner or Inside Sales)'
            : 'Show leads where I am Sales Owner or Inside Sales'
        }
        aria-pressed={active}
        onClick={onClick}
        className='flex items-center justify-center rounded-md disabled:cursor-not-allowed'
      >
        {showImage ? (
          <Avatar.Root size={24} className='overflow-hidden'>
            <Avatar.Image
              src={profileImage}
              alt={user?.full_name || 'User avatar'}
              onError={() => setImageFailed(true)}
            />
          </Avatar.Root>
        ) : (
          <span className='flex size-6 items-center justify-center rounded-full bg-blue-light text-xs font-medium leading-4 text-blue-darker'>
            {initials}
          </span>
        )}
      </button>
      {active ? (
        <button
          type='button'
          disabled={disabled}
          aria-label='Remove me filter'
          onClick={onClear}
          className='flex size-4 shrink-0 items-center justify-center rounded-sm text-primary-dark hover:bg-primary-light disabled:cursor-not-allowed'
        >
          <RiCloseLine size={16} />
        </button>
      ) : null}
    </div>
  );
}

const CrmLeadsToolbar = ({
  searchValue = '',
  onSearchChange,
  tableRef,
  onAddLead,
  onFiltersChange,
  appliedFilters = {},
  groupBy = '',
  onGroupByChange,
  groupOrder = 'asc',
  onGroupOrderChange,
  leadOptions = {},
  resizeColumnsEnabled = true,
  onResizeEnabledChange,
  onResetColumnSizes,
  hideGroupBy = false,
  hideColumnManagerFooter = false,
  saveViewSlot = null,
  showLifecycleStageFilter = true,
  showAssignedToMeOnly = false,
  onShowAssignedToMeOnlyChange,
}) => {
  const { user } = useAuth();
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [dateFilterField, setDateFilterField] = useState(LEAD_FILTER_TABS.CREATED_AT);
  const filterDropdownRef = useRef(null);

  useEffect(() => {
    const createdActive = countActiveDatetimeFilter(appliedFilters.created_at) > 0;
    const modifiedActive = countActiveDatetimeFilter(appliedFilters.last_modified_at) > 0;
    if (modifiedActive && !createdActive) {
      setDateFilterField(LEAD_FILTER_TABS.LAST_MODIFIED);
    } else if (createdActive && !modifiedActive) {
      setDateFilterField(LEAD_FILTER_TABS.CREATED_AT);
    } else if (modifiedActive && createdActive) {
      // Prefer Last Modified when both are active (e.g. from filter dropdown).
      setDateFilterField(LEAD_FILTER_TABS.LAST_MODIFIED);
    }
    // When neither is active, keep the user's toggle selection (defaults to Created At).
  }, [appliedFilters.created_at, appliedFilters.last_modified_at]);

  const activeDateRange = useMemo(
    () => getDatetimeFilterDateRange(appliedFilters[dateFilterField]),
    [appliedFilters, dateFilterField],
  );

  const dateFilterLabel =
    DATE_FILTER_FIELD_OPTIONS.find((option) => option.value === dateFilterField)?.label ||
    'Created At';

  const handleDateFilterFieldChange = (field) => {
    if (field === dateFilterField) return;
    const previousField = dateFilterField;
    const previousRange = getDatetimeFilterDateRange(appliedFilters[previousField]);
    const nextRange = getDatetimeFilterDateRange(appliedFilters[field]);
    // Prefer the target field's existing range; otherwise move the previous range over.
    const rangeToKeep = nextRange || previousRange || null;

    setDateFilterField(field);
    // Always clear the non-selected field so only one datetime filter stays active.
    onFiltersChange?.({
      ...appliedFilters,
      [field]: rangeToKeep
        ? datetimeFilterFromDateRange(rangeToKeep)
        : { ...DEFAULT_LEAD_FILTERS[field] },
      [previousField]: { ...DEFAULT_LEAD_FILTERS[previousField] },
    });
  };

  const handleDateRangeChange = (range) => {
    const otherField =
      dateFilterField === LEAD_FILTER_TABS.CREATED_AT
        ? LEAD_FILTER_TABS.LAST_MODIFIED
        : LEAD_FILTER_TABS.CREATED_AT;

    onFiltersChange?.({
      ...appliedFilters,
      [dateFilterField]: datetimeFilterFromDateRange(range),
      [otherField]: { ...DEFAULT_LEAD_FILTERS[otherField] },
    });
  };

  const setOrdButton = (value) =>
    onGroupOrderChange?.(typeof value === 'function' ? value(groupOrder) : value);

  const handleClearAllFilters = (e) => {
    e.stopPropagation();
    onFiltersChange?.(DEFAULT_LEAD_FILTERS);
    setFilterCount(0);
    setIsFilterDropdownOpen(false);
  };

  const activeGroupLabel =
    GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.label || groupBy || '';

  return (
    <header className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
      <Input.Root className='w-full lg:w-[340px] shrink-0'>
        <Input.Wrapper>
          <Input.Icon>
            <RiSearchLine />
          </Input.Icon>
          <Input.Input
            placeholder='Search here...'
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            aria-label='Search leads'
          />
        </Input.Wrapper>
      </Input.Root>

      <div className='flex flex-wrap items-center justify-end gap-3 flex-1 overflow-x-auto pb-1 lg:pb-0'>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <span className='inline-flex shrink-0'>
              <DateRangePicker
                value={activeDateRange}
                onChange={handleDateRangeChange}
                className='shrink-0'
                draftResetKey={dateFilterField}
                header={
                  <ButtonGroup.Root size='xsmall' className='w-full'>
                    {DATE_FILTER_FIELD_OPTIONS.map((option) => (
                      <ButtonGroup.Item
                        key={option.value}
                        type='button'
                        data-state={dateFilterField === option.value ? 'on' : 'off'}
                        onClick={() => handleDateFilterFieldChange(option.value)}
                        className='w-full data-[state=on]:z-1 data-[state=on]:bg-primary-lighter data-[state=on]:ring-1 data-[state=on]:ring-primary-base data-[state=on]:text-primary-base'
                      >
                        {option.label}
                      </ButtonGroup.Item>
                    ))}
                  </ButtonGroup.Root>
                }
              />
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <span className='paragraph-xsmall'>{dateFilterLabel} Filter</span>
          </Tooltip.Content>
        </Tooltip.Root>
      </div>

      <div className='flex flex-wrap items-center gap-3'>
        {saveViewSlot}

        {typeof onShowAssignedToMeOnlyChange === 'function' ? (
          <MeModeAvatarButton
            user={user}
            active={showAssignedToMeOnly}
            disabled={!user?.email}
            onClick={() => onShowAssignedToMeOnlyChange?.(!showAssignedToMeOnly)}
            onClear={() => onShowAssignedToMeOnlyChange?.(false)}
          />
        ) : null}

        <Popover.Root
          open={isFilterDropdownOpen}
          onOpenChange={(open) => {
            const wasOpen = isFilterDropdownOpen;
            setIsFilterDropdownOpen(open);
            if (wasOpen && !open && filterDropdownRef.current) {
              filterDropdownRef.current.handleClose();
            }
          }}
        >
          <Filter.TriggerButton
            filterCount={filterCount}
            onClear={handleClearAllFilters}
            tooltipContent='Filter'
            ariaLabel='Filter leads'
          />
          <CrmLeadsFilterDropdown
            ref={filterDropdownRef}
            open={isFilterDropdownOpen}
            setFilterCount={setFilterCount}
            onOpenChange={setIsFilterDropdownOpen}
            onFiltersChange={onFiltersChange}
            appliedFilters={appliedFilters}
            leadOptions={leadOptions}
            showLifecycleStageFilter={showLifecycleStageFilter}
          />
        </Popover.Root>

        {!hideGroupBy && (
          <Popover.Root open={isGroupByOpen} onOpenChange={setIsGroupByOpen}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Popover.Trigger asChild>
                  <Button.Root
                    variant={groupBy ? 'primary' : 'neutral'}
                    mode={groupBy ? 'lighter' : 'stroke'}
                    size='small'
                    className={`gap-2 flex items-center justify-center ${groupBy ? 'ring-1 ring-primary-base' : ''}`}
                    aria-label='Group By'
                  >
                    <Button.Icon as={RiStackLine} />
                    {groupBy && <span className='label-small'>{activeGroupLabel}</span>}
                    {groupBy ? (
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <span
                            className='cursor-pointer flex items-center justify-center'
                            onClick={(e) => {
                              e.stopPropagation();
                              setOrdButton((previous) => (previous === 'asc' ? 'desc' : 'asc'));
                            }}
                          >
                            {groupOrder === 'asc' ? (
                              <RiArrowUpLine size={20} />
                            ) : (
                              <RiArrowDownLine size={20} />
                            )}
                          </span>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          <span className='paragraph-xsmall'>
                            {groupOrder === 'asc' ? 'Asc' : 'Desc'}
                          </span>
                        </Tooltip.Content>
                      </Tooltip.Root>
                    ) : null}
                    {groupBy && (
                      <RiCloseLine
                        onClick={(e) => {
                          e.stopPropagation();
                          onGroupByChange?.('');
                        }}
                        size={18}
                        className='text-primary-dark bg-primary-light rounded-sm'
                      />
                    )}
                  </Button.Root>
                </Popover.Trigger>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <span className='paragraph-xsmall'>Group-By</span>
              </Tooltip.Content>
            </Tooltip.Root>

            <Popover.Content align='end' className='w-[300px] p-3'>
              <div className='flex w-full flex-col gap-2'>
                <div className='w-full flex items-center justify-between'>
                  <span className='text-subheading-2xs text-text-soft-400'>GROUP BY</span>
                  <LinkButton.Root
                    variant='primary'
                    size='small'
                    disabled={!groupBy}
                    onClick={() => {
                      setOrdButton('asc');
                      onGroupByChange?.('');
                      setIsGroupByOpen(false);
                    }}
                  >
                    Clear
                  </LinkButton.Root>
                </div>

                <Select.Root
                  value={groupBy || ''}
                  onValueChange={(value) => {
                    onGroupByChange?.(value);
                    setIsGroupByOpen(false);
                  }}
                  size='small'
                >
                  <Select.Trigger className='w-full'>
                    <Select.Value placeholder='Select group by' />
                  </Select.Trigger>
                  <Select.Content>
                    {GROUP_BY_OPTIONS.filter((o) => o.value !== '').map((opt) => (
                      <Select.Item key={opt.value} value={opt.value}>
                        {opt.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>

                <ButtonGroup.Root>
                  <ButtonGroup.Item
                    data-state={groupOrder === 'asc' ? 'on' : 'off'}
                    onClick={() => setOrdButton('asc')}
                    className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
                  >
                    <ButtonGroup.Icon
                      data-state={groupOrder === 'asc' ? 'on' : 'off'}
                      className='data-[state=on]:text-primary-base'
                      as={RiArrowUpLine}
                    />
                    Ascending
                  </ButtonGroup.Item>
                  <ButtonGroup.Item
                    data-state={groupOrder === 'desc' ? 'on' : 'off'}
                    onClick={() => setOrdButton('desc')}
                    className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
                  >
                    <ButtonGroup.Icon
                      data-state={groupOrder === 'desc' ? 'on' : 'off'}
                      className='data-[state=on]:text-primary-base'
                      as={RiArrowDownLine}
                    />
                    Descending
                  </ButtonGroup.Item>
                </ButtonGroup.Root>
              </div>
            </Popover.Content>
          </Popover.Root>
        )}

        <ColumnManagerDropdown
          open={isColumnManagerOpen}
          onOpenChange={setIsColumnManagerOpen}
          config={tableRef?.current?.columnConfigHook}
          pinnedColumnId='name'
          tooltipContent={<p>Column Manager</p>}
          trigger={
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              className='gap-1'
            >
              <Button.Icon>
                <RiLayoutColumnLine size={18} />
              </Button.Icon>
            </Button.Root>
          }
          footer={
            !hideColumnManagerFooter &&
            (onResizeEnabledChange != null || onResetColumnSizes != null) ? (
              <div className='w-full flex flex-col items-center gap-3'>
                {onResizeEnabledChange != null && (
                  <div className='w-full flex items-center justify-between gap-2'>
                    <span className='text-paragraph-sm text-text-main-900'>Resize columns</span>
                    <Switch.Root
                      checked={resizeColumnsEnabled}
                      onCheckedChange={onResizeEnabledChange}
                      className='h-5 w-8'
                    />
                  </div>
                )}
                {onResetColumnSizes != null && (
                  <Button.Root
                    type='button'
                    variant='neutral'
                    mode='stroke'
                    size='small'
                    className='w-full'
                    onClick={onResetColumnSizes}
                  >
                    Reset column sizes
                  </Button.Root>
                )}
              </div>
            ) : null
          }
        />

        <Button.Root variant='primary' size='small' className='gap-1' onClick={onAddLead}>
          <Button.Icon>
            <RiAddLine size={20} />
          </Button.Icon>
          Add Lead
        </Button.Root>
      </div>
    </header>
  );
};

export default CrmLeadsToolbar;
