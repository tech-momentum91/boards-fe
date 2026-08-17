import React from 'react';

import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

export function ProductPackageDetailFieldGrid({ children, columns = 2 }) {
  return (
    <div
      className={cn(
        'grid w-full gap-x-3 gap-y-5',
        columns === 5
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
          : columns === 4
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-2',
      )}
    >
      {children}
    </div>
  );
}

export function ProductPackageDetailField({ label, value, fullWidth = false }) {
  const display = value == null || value === '' ? '--' : String(value);

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', fullWidth && 'col-span-full')}>
      <span className='text-label-sm font-medium leading-5 text-text-sub-500 opacity-72'>
        {label}
      </span>
      {display === '--' ? (
        <span className='text-label-sm font-medium leading-5 text-text-main-900'>{display}</span>
      ) : (
        <Tooltip.Provider delayDuration={200}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <span
                className='block min-w-0 truncate text-label-sm font-medium leading-5 text-text-main-900'
                title={display}
              >
                {display}
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content side='bottom' className='max-w-sm break-words'>
              {display}
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      )}
    </div>
  );
}

// Backward-compatible aliases used across product detail forms.
export const PackageDetailFieldGrid = ProductPackageDetailFieldGrid;
export const PackageDetailField = ProductPackageDetailField;
