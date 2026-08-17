import React from 'react';
import { RiArrowLeftSLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import { cn } from '@/utils/cn';

/**
 * Full-viewport shell for center and client floor layout editors (no app sidebar).
 *
 * @param {{
 *   title?: string,
 *   subtitle?: string,
 *   onBack?: () => void,
 *   backAriaLabel?: string,
 *   headerFilters?: React.ReactNode,
 *   headerActions?: React.ReactNode,
 *   children?: React.ReactNode,
 *   className?: string,
 * }} props
 */
export default function FloorLayoutPageShell({
  title,
  subtitle,
  onBack,
  backAriaLabel = 'Go back',
  headerFilters,
  headerActions,
  children,
  className,
}) {
  return (
    <div className={cn('flex h-dvh w-full  flex-col overflow-hidden bg-bg-white-0', className)}>
      <header className='grid shrink-0 grid-cols-1 gap-3 border-b border-stroke-soft-200 px-4 py-3 sm:px-6 sm:py-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] 2xl:items-center 2xl:gap-4'>
        <div className='flex max-w-[40%]  items-center gap-3'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='ghost'
            size='small'
            className='shrink-0 p-2'
            onClick={onBack}
            aria-label={backAriaLabel}
          >
            <RiArrowLeftSLine className='size-5' aria-hidden />
          </Button.Root>
          <div className='min-w-0 flex-1'>
            <h1 className='truncate text-label-lg font-semibold text-text-strong-950'>
              {title || 'Floor layout'}
            </h1>
            {subtitle ? (
              <p className='truncate text-paragraph-sm text-text-sub-600'>{subtitle}</p>
            ) : null}
          </div>
        </div>
        <div className='min-w-0 w-full overflow-hidden'>
          <div className='flex flex-row flex-nowrap items-center justify-end gap-2 overflow-x-auto'>
            {headerFilters}
            {headerActions}
          </div>
        </div>
      </header>
      <main className='flex min-h-0 flex-1 flex-col overflow-hidden'>{children}</main>
    </div>
  );
}
