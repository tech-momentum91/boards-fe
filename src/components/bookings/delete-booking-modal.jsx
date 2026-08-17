import React, { useState, useEffect } from 'react';
import { RiAlertFill } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Radio from '@/components/ui/radio';
import { BOOKING_EDIT_SCOPE, DELETE_SCOPE_OPTIONS } from '@/components/bookings/constants';

const DeleteBookingModal = ({
  isOpen,
  onOpenChange,
  onConfirm,
  isLoading = false,
  isRecurring = false,
}) => {
  const [selectedOption, setSelectedOption] = useState('THIS_ONLY');

  // Reset to default when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedOption(BOOKING_EDIT_SCOPE.THIS_ONLY);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    // Non-recurring: always delete this booking only
    const scope = isRecurring ? selectedOption : BOOKING_EDIT_SCOPE.THIS_ONLY;
    onConfirm?.(scope);
  };

  const handleCancel = () => {
    onOpenChange?.(false);
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[450px]' showClose={false} overlayClassName='z-[100]'>
        <Modal.Body className='px-5 py-8'>
          <div className='flex flex-col items-center gap-4'>
            {/* Warning Icon - Orange triangle */}
            <div className='flex items-center justify-center bg-warning-lighter rounded-[10px] p-2'>
              <RiAlertFill size={32} className='text-warning-base' />
            </div>
            {/* Title and Description */}
            <div className='flex flex-col gap-1 items-center text-center'>
              <p className='text-label-md text-text-sub-500'>Cancel Booking?</p>
              <p className='text-paragraph-sm text-text-sub-500'>
                Are you sure you want to cancel this booking?
              </p>
            </div>
            {isRecurring && (
              <Radio.Group
                value={selectedOption}
                onValueChange={setSelectedOption}
                className='flex flex-col items-center w-full divide-y divide-stroke-soft-200 border border-stroke-soft-200 rounded-lg'
              >
                {DELETE_SCOPE_OPTIONS.map((option) => (
                  <Radio.Label
                    key={option.value}
                    className='flex items-center gap-2 cursor-pointer flex-1 py-2.5 px-1.5 w-full'
                    noBg={true}
                    htmlFor={option.value}
                  >
                    <Radio.Item value={option.value} id={option.value} />
                    <span className='text-label-sm text-text-main-900 whitespace-nowrap'>
                      {option.label}
                    </span>
                  </Radio.Label>
                ))}
              </Radio.Group>
            )}
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
                  Cancelling...
                </span>
              ) : (
                'Confirm'
              )}
            </Button.Root>
          </div>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default DeleteBookingModal;
