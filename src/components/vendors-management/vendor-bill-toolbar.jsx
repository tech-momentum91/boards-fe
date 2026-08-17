import React, { useState } from 'react';
import { RiSearchLine, RiLayoutColumnLine } from 'react-icons/ri';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import * as Button from '@/components/ui/button';
import TableVariantToggle from '@/components/ui/table-variant-toggle';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';

const VendorBillToolbar = ({
  searchValue,
  onSearchChange,
  tableVariant,
  onTableVariantToggle,
  tableRef,
}) => {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);

  return (
    <header className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
      <Input.Root className='w-full lg:w-[372px]'>
        <Input.Wrapper>
          <Input.Icon>
            <RiSearchLine />
          </Input.Icon>
          <Input.Input
            placeholder='Search bills by sub category or center'
            value={searchValue || ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            aria-label='Search bills by sub category or center'
          />
        </Input.Wrapper>
      </Input.Root>

      <div className='flex items-center gap-3'>
        {/* <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <TableVariantToggle variant={tableVariant} onToggle={onTableVariantToggle} />
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Table Variant</p>
          </Tooltip.Content>
        </Tooltip.Root> */}

        <ColumnManagerDropdown
          open={isColumnManagerOpen}
          onOpenChange={setIsColumnManagerOpen}
          columns={tableRef?.current?.columnConfig || []}
          onReorder={(start, end) => tableRef?.current?.reorderColumns?.(start, end)}
          onToggleVisibility={(id) => tableRef?.current?.toggleColumnVisibility?.(id)}
          onShowAll={() => tableRef?.current?.showAllColumns?.()}
          onHideAll={() => tableRef?.current?.hideAllColumns?.()}
          tooltipContent={<p>Column Manager</p>}
          pinnedColumnId='subcategory'
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
        />
      </div>
    </header>
  );
};

export default VendorBillToolbar;
