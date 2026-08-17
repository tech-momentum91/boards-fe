import React from 'react';
import { RiErrorWarningLine } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';

/**
 * Reusable delete confirmation modal for Space (and similar flows).
 * Matches the style used in center-view-space, center-detail-floors, etc.
 */
const DeleteSpaceModal = ({
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
  title = 'Delete Space?',
  description = 'Are you sure you want to delete this space? This action cannot be undone.',
  confirmLabel = 'Delete',
  loadingLabel = 'Deleting...',
}) => {
  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[450px]'>
        <Modal.Header
          variant='center'
          title={title}
          description={description}
          icon={
            <span className='p-2 bg-warning-base/10 rounded-lg'>
              <RiErrorWarningLine size={24} className='text-warning-base' />
            </span>
          }
        />
        <Modal.Footer>
          <Button.Root
            variant='neutral'
            onClick={() => onOpenChange(false)}
            mode='stroke'
            size='small'
            className='w-full'
            disabled={isDeleting}
          >
            Cancel
          </Button.Root>
          <Button.Root
            variant='primary'
            onClick={onConfirm}
            mode='filled'
            size='small'
            className='w-full'
            disabled={isDeleting}
          >
            {isDeleting ? (
              <span className='flex items-center justify-center gap-2'>
                <span className='h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin' />
                {loadingLabel}
              </span>
            ) : (
              confirmLabel
            )}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default DeleteSpaceModal;
