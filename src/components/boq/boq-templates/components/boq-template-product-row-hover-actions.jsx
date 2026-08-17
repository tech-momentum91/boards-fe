import React from 'react';
import { RiDeleteBinLine } from 'react-icons/ri';

import * as CompactButton from '@/components/ui/compact-button';
import * as Tooltip from '@/components/ui/tooltip';

const BoqTemplateProductRowHoverActions = ({ onDelete, skipTabStop = false }) => (
  <div className='pointer-events-none absolute inset-y-0 right-0 z-10 flex w-[min(251px,42%)] items-center justify-end pr-3 opacity-0 transition-opacity duration-200 group-hover/row:opacity-100'>
    <div
      aria-hidden
      className='absolute inset-0 bg-gradient-to-r from-bg-weak-100/0 to-bg-weak-100'
    />
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <CompactButton.Root
          type='button'
          variant='error'
          size='medium'
          tabIndex={skipTabStop ? -1 : 0}
          className='pointer-events-auto relative z-10'
          onClick={(event) => {
            event.stopPropagation();
            onDelete?.();
          }}
          aria-label='Delete product'
        >
          <CompactButton.Icon as={RiDeleteBinLine} />
        </CompactButton.Root>
      </Tooltip.Trigger>
      <Tooltip.Content size='xsmall' side='top'>
        Delete
      </Tooltip.Content>
    </Tooltip.Root>
  </div>
);

export default BoqTemplateProductRowHoverActions;
