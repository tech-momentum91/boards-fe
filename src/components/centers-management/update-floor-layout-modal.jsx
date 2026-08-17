import React from 'react';
import { RiInformationLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';

/**
 * Confirm replacing a center floor layout image while preserving coordinates.
 */
export default function UpdateFloorLayoutModal({
  open,
  onOpenChange,
  onConfirm,
  isUpdating = false,
}) {
  return (
    <Modal.Root
      open={open}
      onOpenChange={(next) => {
        if (!isUpdating) onOpenChange?.(next);
      }}
    >
      <Modal.Content className='max-w-[450px]'>
        <Modal.Header
          variant='default'
          icon={
            <span className='items-center rounded-lg bg-primary-base/10 p-2'>
              <RiInformationLine size={24} className='text-primary-base' />
            </span>
          }
          title='Update floor layout?'
        />

        <Modal.Body>
          <div className='flex flex-col gap-3'>
            <span className='text-paragraph-sm text-text-sub-600'>
              By performing this action the layout image changes and the coordinates remains as it
              is.
            </span>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            disabled={isUpdating}
            onClick={() => onOpenChange?.(false)}
            className='w-full'
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            size='small'
            disabled={isUpdating}
            onClick={onConfirm}
            className='w-full'
          >
            {isUpdating ? 'Updating…' : 'Continue'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
