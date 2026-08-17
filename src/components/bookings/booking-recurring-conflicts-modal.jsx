import React from 'react';
import { format } from 'date-fns';
import { RiAlertFill } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';

const formatConflictDateLabel = (dateString) => {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) {
    return dateString;
  }
  return format(d, 'do MMM yy, EEEE');
};

const VIEW_DESCRIPTION = 'Few dates are unavailable at your selected time slot.';
const CONFIRM_DESCRIPTION =
  'A few dates are unavailable. Would you like to continue and exclude those dates?';

const BookingRecurringConflictsModal = ({
  isOpen,
  onClose,
  onContinue,
  conflicts = [],
  mode = 'view',
  isSubmitting = false,
}) => {
  const isConfirmMode = mode === 'confirm';
  const description = isConfirmMode ? CONFIRM_DESCRIPTION : VIEW_DESCRIPTION;

  const handleContinue = () => {
    if (isSubmitting) return;
    onContinue?.();
    // In confirm mode parent closes modal on API success; do not close here
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onClose}>
      <Modal.Content className='max-w-[480px]'>
        <Modal.Header
          variant='center'
          icon={<RiAlertFill className='fill-warning-base rounded-full w-10 h-10' />}
          title={`${conflicts?.length || 0} Dates Are Unavailable.`}
          description={description}
        />
        <Modal.Body>
          {conflicts?.length > 0 && (
            <div className='bg-warning-lighter rounded-[10px] p-3 text-[12px] text-warning-dark flex flex-col gap-2'>
              <ul className='list-disc list-inside'>
                {conflicts.map((date) => (
                  <li key={date} className=''>
                    <span>{formatConflictDateLabel(date)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {isConfirmMode ? (
            <>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='medium'
                className='w-full'
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button.Root>
              <Button.Root
                type='button'
                variant='primary'
                mode='filled'
                size='medium'
                className='w-full'
                onClick={handleContinue}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Continuing...' : 'Continue'}
              </Button.Root>
            </>
          ) : (
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='medium'
              className='w-full'
              onClick={onClose}
            >
              Ok
            </Button.Root>
          )}
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default BookingRecurringConflictsModal;
