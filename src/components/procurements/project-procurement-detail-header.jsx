import React, { memo } from 'react';
import { RiArrowLeftSLine } from 'react-icons/ri';

import { colorForProjectStage } from '@/components/projects/shared';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';

function colorForProcurementStatusBadge(stage) {
  const normalized = String(stage ?? '').toLowerCase();
  if (normalized === 'e1') return 'orange';
  return colorForProjectStage(stage);
}

const ProjectProcurementDetailHeader = memo(({ title, stage, city, onBack }) => (
  <header className='shrink-0 border-b border-stroke-soft-200 bg-bg-white-0 px-6 py-5'>
    <div className='flex items-center gap-4'>
      <Button.Root
        type='button'
        variant='neutral'
        mode='stroke'
        size='xsmall'
        className='size-8 shrink-0 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
        aria-label='Back to project procurements'
        onClick={onBack}
      >
        <Button.Icon as={RiArrowLeftSLine} className='size-5' />
      </Button.Root>

      <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
        <div className='flex min-w-0 items-center gap-2'>
          <h1 className='truncate text-label-lg font-medium tracking-[-0.27px] text-text-main-900'>
            {title}
          </h1>
          {stage ? (
            <Badge.Root
              size='small'
              variant='light'
              color={colorForProcurementStatusBadge(stage)}
              className='uppercase'
            >
              {stage}
            </Badge.Root>
          ) : null}
        </div>

        {city ? (
          <span className='text-subheading-sm font-medium uppercase tracking-[0.84px] text-text-sub-500 opacity-72'>
            {city}
          </span>
        ) : null}
      </div>
    </div>
  </header>
));

ProjectProcurementDetailHeader.displayName = 'ProjectProcurementDetailHeader';

export default ProjectProcurementDetailHeader;
