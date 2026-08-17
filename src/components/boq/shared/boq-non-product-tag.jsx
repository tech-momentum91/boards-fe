import React, { memo } from 'react';
import { RiCloseLine } from 'react-icons/ri';

import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

/** Corner icon for custom (non-master) BOQ lines — matches split line styling. */
const BoqNonProductTag = memo(({ className }) => (
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      <span
        className={cn(
          'pointer-events-auto absolute right-[3px] top-1 z-[1] inline-flex size-5 items-center justify-center rounded border border-stroke-soft-200 bg-bg-white-0 text-text-soft-400',
          className,
        )}
        aria-label='Not a product'
      >
        <RiCloseLine className='size-3.5' aria-hidden />
      </span>
    </Tooltip.Trigger>
    <Tooltip.Content size='xsmall' variant='dark' side='top' className='z-[80] max-w-xs'>
      Not added from product master — convert before procurement
    </Tooltip.Content>
  </Tooltip.Root>
));

BoqNonProductTag.displayName = 'BoqNonProductTag';

export default BoqNonProductTag;
