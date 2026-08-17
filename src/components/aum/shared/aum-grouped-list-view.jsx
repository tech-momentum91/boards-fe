import React from 'react';
import { RiArrowDownSLine } from 'react-icons/ri';

import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';

/**
 * Renders Stocks-style grouped sections around a list table component.
 */
export default function AumGroupedListView({
  sections = [],
  TableComponent,
  columnConfig,
  onRowClick,
  emptyTable,
}) {
  if (sections.length === 0) {
    return emptyTable ?? null;
  }

  return (
    <div className='flex flex-col gap-4'>
      {sections.map((section) => (
        <section
          key={section.id}
          className='flex w-full flex-col overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'
        >
          <div className='flex flex-wrap items-center justify-between gap-3 border-b border-stroke-soft-200 px-3 py-1.5 sm:px-3'>
            <div className='flex min-w-0 flex-1 flex-wrap items-center gap-1.5'>
              <h3 className='truncate text-label-sm font-medium text-text-main-900'>
                {section.groupName}
              </h3>
              <Badge.Root
                size='small'
                variant='lighter'
                className='border border-stroke-soft-200'
                color='gray'
              >
                {`${section.count} items`}
              </Badge.Root>
            </div>
            <Button.Root
              variant='borderless'
              size='small'
              type='button'
              className='gap-2 px-1.5 text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-main-900 focus-visible:ring-2 focus-visible:ring-primary-base/30'
            >
              <Button.Icon as={RiArrowDownSLine} className='text-text-sub-600' />
            </Button.Root>
          </div>
          <TableComponent
            rows={section.rows}
            columnConfig={columnConfig}
            onRowClick={onRowClick}
            embedded
          />
        </section>
      ))}
    </div>
  );
}
