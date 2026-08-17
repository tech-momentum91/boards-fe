import React, { memo, useState } from 'react';
import { RiInformationFill } from 'react-icons/ri';

import { formatProjectBoqOverviewRupee } from '@/components/boq/project-boqs/components/project-boq-overview-utils';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

const ProjectBoqOverviewCostBreakdownTooltip = memo(({ items = [], iconColor, className }) => {
  const [open, setOpen] = useState(false);
  const breakdownItems = Array.isArray(items) ? items : [];

  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root open={open} onOpenChange={setOpen}>
        <Tooltip.Trigger asChild>
          <button
            type='button'
            className={cn('inline-flex shrink-0 items-center justify-center', className)}
            aria-label='View cost breakdown'
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen((previous) => !previous);
            }}
          >
            <RiInformationFill className={cn('size-4', iconColor)} />
          </button>
        </Tooltip.Trigger>
        {breakdownItems.length > 0 ? (
          <Tooltip.Content
            size='xsmall'
            variant='dark'
            side='top'
            align='start'
            sideOffset={6}
            className='rounded bg-[#20232d] px-1.5 py-0.5 shadow-[0px_12px_24px_0px_rgba(134,140,152,0.12),0px_1px_2px_0px_rgba(228,229,231,0.24)]'
            onPointerDownOutside={() => setOpen(false)}
          >
            <div className='flex flex-col'>
              {breakdownItems.map((item) => (
                <p key={item.label} className='whitespace-nowrap text-[12px] leading-4'>
                  <span className='text-[#cdd0d5]'>{item.label}:</span>{' '}
                  <span className='font-bold text-white'>
                    {formatProjectBoqOverviewRupee(item.value)}
                  </span>
                </p>
              ))}
            </div>
          </Tooltip.Content>
        ) : null}
      </Tooltip.Root>
    </Tooltip.Provider>
  );
});

ProjectBoqOverviewCostBreakdownTooltip.displayName = 'ProjectBoqOverviewCostBreakdownTooltip';

export default ProjectBoqOverviewCostBreakdownTooltip;
