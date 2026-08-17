import React, { useMemo, useRef, useState } from 'react';
import { RiDownloadLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import * as ButtonGroup from '@/components/ui/button-group';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';

import PnlFilter from '@/components/pnl/pnl-filter';

import { PNL_PERIOD_OPTIONS } from '@/components/pnl/constants';

const ensureString = (value) => (value === null || value === undefined ? '' : String(value));

const isDefaultMonth = (month) => {
  const m = ensureString(month);
  return !m || m === 'All' || m === 'Last 12 months';
};

const PnlToolbar = ({
  period = 'monthly',
  onPeriodChange,
  searchValue = '',
  onSearchChange,
  isExporting = false,
  onExport,
  tableRef,
  filters = {},
  onFilterChange,
  onClearFilters,
}) => {
  const filterDropdownRef = useRef(null);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const isMonthRangeApplied = !isDefaultMonth(filters?.month);

  const totalFilterCount = useMemo(() => {
    const month = ensureString(filters?.month);
    if (isDefaultMonth(month)) return 0;
    return 1;
  }, [filters?.month]);

  const handleClearAllFilters = (e) => {
    e.stopPropagation();
    onClearFilters?.();
    setIsFilterDropdownOpen(false);
  };

  return (
    <div className='flex flex-row justify-between gap-3 mt-5'>
      <ButtonGroup.Root>
        {PNL_PERIOD_OPTIONS.map((opt) => (
          <ButtonGroup.Item
            key={opt.value}
            data-state={period === opt.value ? 'on' : 'off'}
            disabled={isMonthRangeApplied}
            onClick={() => {
              if (isMonthRangeApplied) return;
              onPeriodChange?.(opt.value);
            }}
            className='data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base disabled:opacity-60'
          >
            {opt.label}
          </ButtonGroup.Item>
        ))}
      </ButtonGroup.Root>

      <div className='flex items-center gap-3 justify-between'>
        <div className='flex items-center gap-2 min-w-[240px] max-w-md flex-1'>
          <Input.Root size='small'>
            <Input.Wrapper>
              <Input.Icon>
                <RiSearchLine className='size-4' />
              </Input.Icon>
              <Input.Input
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder='Search here...'
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <Popover.Root
          open={isFilterDropdownOpen}
          onOpenChange={(open) => {
            const wasOpen = isFilterDropdownOpen;
            if (wasOpen && !open && filterDropdownRef.current) {
              filterDropdownRef.current.handleClose();
            }
            setIsFilterDropdownOpen(open);
          }}
        >
          <Filter.TriggerButton filterCount={totalFilterCount} onClear={handleClearAllFilters} />
          <PnlFilter
            ref={filterDropdownRef}
            open={isFilterDropdownOpen}
            filters={filters}
            onFilterChange={onFilterChange}
            onClearFilters={onClearFilters}
            onInteractOutside={() => setIsFilterDropdownOpen(false)}
            onEscapeKeyDown={() => setIsFilterDropdownOpen(false)}
          />
        </Popover.Root>

        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              className='shrink-0 gap-1'
              onClick={onExport}
              disabled={isExporting}
              aria-busy={isExporting}
              aria-label='Export P&L'
            >
              <Button.Icon>
                <RiDownloadLine size={20} />
              </Button.Icon>
            </Button.Root>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Export as PDF</p>
          </Tooltip.Content>
        </Tooltip.Root>

        <ColumnManagerDropdown
          open={isColumnManagerOpen}
          onOpenChange={setIsColumnManagerOpen}
          config={tableRef?.current?.columnConfigHook}
          tooltipContent={<p>Column Manager</p>}
          trigger={
            <Button.Root variant='neutral' mode='stroke' size='small' className='shrink-0 gap-1'>
              <Button.Icon>
                <RiLayoutColumnLine size={20} />
              </Button.Icon>
            </Button.Root>
          }
        />
      </div>
    </div>
  );
};

export default PnlToolbar;
