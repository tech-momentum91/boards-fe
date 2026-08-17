import React from 'react';
import { RiDeleteBinLine, RiEdit2Line, RiFileCopyLine } from 'react-icons/ri';

import * as CompactButton from '@/components/ui/compact-button';
import * as Tooltip from '@/components/ui/tooltip';

const BoqTemplateRowActions = ({ onEdit, onDuplicate, onDelete }) => {
  return (
    <div
      className='flex items-center justify-end gap-0.5'
      onClick={(event) => event.stopPropagation()}
    >
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <CompactButton.Root
            type='button'
            variant='ghost'
            size='medium'
            onClick={(event) => {
              event.stopPropagation();
              onEdit?.();
            }}
            aria-label='Rename template'
          >
            <CompactButton.Icon as={RiEdit2Line} />
          </CompactButton.Root>
        </Tooltip.Trigger>
        <Tooltip.Content size='xsmall' side='top'>
          Rename
        </Tooltip.Content>
      </Tooltip.Root>

      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <CompactButton.Root
            type='button'
            variant='ghost'
            size='medium'
            onClick={(event) => {
              event.stopPropagation();
              onDuplicate?.();
            }}
            aria-label='Duplicate template'
          >
            <CompactButton.Icon as={RiFileCopyLine} />
          </CompactButton.Root>
        </Tooltip.Trigger>
        <Tooltip.Content size='xsmall' side='top'>
          Duplicate
        </Tooltip.Content>
      </Tooltip.Root>

      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <CompactButton.Root
            type='button'
            variant='ghost'
            size='medium'
            onClick={(event) => {
              event.stopPropagation();
              onDelete?.();
            }}
            aria-label='Delete template'
          >
            <CompactButton.Icon as={RiDeleteBinLine} className='text-error-base' />
          </CompactButton.Root>
        </Tooltip.Trigger>
        <Tooltip.Content size='xsmall' side='top'>
          Delete
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  );
};

export default BoqTemplateRowActions;
