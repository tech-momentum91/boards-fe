import React from 'react';
import { RiAlertFill } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';

const DeleteTicketModal = ({
  isOpen,
  onOpenChange,
  ticket = null,
  onConfirm,
  isLoading = false,
}) => {
  const handleConfirm = () => {
    onConfirm?.(ticket);
  };

  const handleCancel = () => {
    onOpenChange?.(false);
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[450px]' showClose={false} overlayClassName='z-[100]'>
        <Modal.Body className='px-5 py-8'>
          <div className='flex flex-col items-center gap-4'>
            <div className='flex items-center justify-center bg-warning-lighter rounded-[10px] p-2'>
              <RiAlertFill size={32} className='text-warning-base' />
            </div>
            <div className='flex flex-col gap-1 items-center text-center'>
              <p className='text-label-md text-text-sub-500'>Delete Ticket?</p>
              <p className='text-paragraph-sm text-text-sub-500'>
                Are you sure you want to delete this ticket? This action cannot be undone.
              </p>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div className='flex items-center justify-end gap-3 w-full'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={handleCancel}
              disabled={isLoading}
              className='flex-1'
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='small'
              onClick={handleConfirm}
              disabled={isLoading}
              className='flex-1'
            >
              {isLoading ? (
                <span className='flex items-center justify-center gap-2'>
                  <span className='h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin' />
                  Deleting...
                </span>
              ) : (
                'Delete'
              )}
            </Button.Root>
          </div>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default DeleteTicketModal;
