import React from 'react';
import { RiAlertFill } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';

/**
 * Confirm removal of a center floor layout (images + marked areas).
 * Shared by center Floors tab and Knowledge Center layout media.
 */
export default function RemoveFloorLayoutModal({
  open,
  onOpenChange,
  onConfirm,
  isRemoving = false,
}) {
  return (
    <Modal.Root
      open={open}
      onOpenChange={(next) => {
        if (!isRemoving) onOpenChange?.(next);
      }}
    >
      <Modal.Content className='max-w-[450px]'>
        <Modal.Header
          variant='default'
          icon={
            <span className='items-center rounded-lg bg-warning-base/10 p-2'>
              <RiAlertFill size={24} className='text-warning-base' />
            </span>
          }
          title='Remove floor layout?'
        />

        <Modal.Body>
          <div className='flex flex-col gap-3'>
            <span className='text-paragraph-sm text-text-sub-600'>
              Deleting this layout will permanently remove all layout images and marked areas.{' '}
              <span className='font-bold text-red-600'>This action cannot be undone. </span>
            </span>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            disabled={isRemoving}
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
            disabled={isRemoving}
            onClick={onConfirm}
            className='w-full'
          >
            {isRemoving ? 'Removing…' : 'Confirm'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
