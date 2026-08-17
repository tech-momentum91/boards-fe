import React, { useState } from 'react';
import { RiFilter3Line, RiCheckDoubleLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import * as Tooltip from '@/components/ui/tooltip';
import InboxFilterDropdown from './inbox-filter-dropdown';

const InboxToolbar = ({ appliedFilters = [], onFiltersChange, onClearAll }) => {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterCount = Array.isArray(appliedFilters) ? appliedFilters.length : 0;

  const handleClearAllFilters = (e) => {
    e?.stopPropagation();
    onFiltersChange?.([]);
    onClearAll?.();
    setIsFilterDropdownOpen(false);
  };

  return (
    <header className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
      <div className='flex items-center gap-3'>
        <Popover.Root open={isFilterDropdownOpen} onOpenChange={setIsFilterDropdownOpen}>
          <Filter.TriggerButton
            filterCount={filterCount}
            onClear={handleClearAllFilters}
            tooltipContent='Filter'
            ariaLabel='Filter inbox'
          />
          <Popover.Content
            align='start'
            side='bottom'
            sideOffset={8}
            className='p-0'
            showArrow={false}
          >
            <InboxFilterDropdown
              appliedFilters={appliedFilters}
              onFiltersChange={onFiltersChange}
            />
          </Popover.Content>
        </Popover.Root>
      </div>

      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            className='gap-2'
            onClick={onClearAll}
          >
            <Button.Icon>
              <RiCheckDoubleLine size={18} />
            </Button.Icon>
            Clear All
          </Button.Root>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>Clear all notifications</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </header>
  );
};

export default InboxToolbar;
