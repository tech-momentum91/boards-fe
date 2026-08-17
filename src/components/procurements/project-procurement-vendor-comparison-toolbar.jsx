import React, { memo, useState } from 'react';
import { RiDownloadLine, RiFilter3Fill, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';

import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import { cn } from '@/utils/cn';

const iconButtonClassName = 'size-8 shrink-0 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]';

const ProjectProcurementVendorComparisonToolbar = memo(
  ({ searchValue = '', onSearchChange, columnConfig, onFilter, onDownload, className }) => {
    const [columnManagerOpen, setColumnManagerOpen] = useState(false);

    return (
      <div
        className={cn(
          'flex w-full min-w-0 flex-wrap items-center justify-between gap-3',
          className,
        )}
      >
        <Input.Root size='medium' className='w-full max-w-[370px]'>
          <Input.Wrapper>
            <Input.Icon as={RiSearchLine} />
            <Input.Input
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder='Search products..'
              aria-label='Search products'
              autoComplete='off'
            />
          </Input.Wrapper>
        </Input.Root>

        <div className='flex shrink-0 items-center gap-2'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='xsmall'
            className={iconButtonClassName}
            aria-label='Filter products'
            onClick={onFilter}
          >
            <Button.Icon as={RiFilter3Fill} />
          </Button.Root>

          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='xsmall'
            className={iconButtonClassName}
            aria-label='Download comparison'
            onClick={onDownload}
          >
            <Button.Icon as={RiDownloadLine} />
          </Button.Root>

          <ColumnManagerDropdown
            open={columnManagerOpen}
            onOpenChange={setColumnManagerOpen}
            config={columnConfig}
            pinnedColumnId='item'
            tooltipContent={<p>Columns</p>}
            trigger={
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='xsmall'
                className={cn(
                  iconButtonClassName,
                  columnManagerOpen && 'ring-2 ring-inset ring-stroke-strong-950',
                )}
                aria-label='Manage columns'
                aria-expanded={columnManagerOpen}
              >
                <Button.Icon as={RiLayoutColumnLine} />
              </Button.Root>
            }
          />
        </div>
      </div>
    );
  },
);

ProjectProcurementVendorComparisonToolbar.displayName = 'ProjectProcurementVendorComparisonToolbar';

export default ProjectProcurementVendorComparisonToolbar;
