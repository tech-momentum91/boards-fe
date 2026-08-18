import { RiAlertFill } from 'react-icons/ri';
import type { FormEvent, ReactNode } from 'react';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  /** Optional second paragraph (e.g. Important: …) — same layout as ticket delete modal. */
  note?: ReactNode;
  item?: unknown;
  onConfirm?: (item: unknown) => void;
  isLoading?: boolean;
  confirmLabel?: ReactNode;
  loadingLabel?: ReactNode;
}

/**
 * Reusable delete confirmation modal (same pattern as DeleteTicketModal).
 * Use for CRM Account, Contact, or any entity delete confirmation.
 */
const DeleteConfirmModal = ({
  isOpen,
  onOpenChange,
  title = 'Delete?',
  description = 'Are you sure you want to delete this? This action cannot be undone.',
  note = null,
  item = null,
  onConfirm,
  isLoading = false,
  confirmLabel = 'Delete',
  loadingLabel = 'Deleting...',
}: DeleteConfirmModalProps) => {
  const handleConfirm = () => {
    if (isLoading) {
      return;
    }
    onConfirm?.(item);
  };

  const handleCancel = () => {
    onOpenChange?.(false);
  };

  const handleFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    handleConfirm();
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[450px]' showClose={false} overlayClassName='z-[100]'>
        <form onSubmit={handleFormSubmit}>
          <Modal.Body className='px-5 py-8'>
            <div className='flex flex-col items-center gap-4'>
              <div className='flex items-center justify-center bg-warning-lighter rounded-[10px] p-2'>
                <RiAlertFill size={32} className='text-warning-base' />
              </div>
              <div className='flex flex-col gap-1 items-center text-center'>
                <p className='text-label-md text-text-sub-500'>{title}</p>
                <p className='text-paragraph-sm text-text-sub-500'>{description}</p>
                {note ? (
                  <p className='text-paragraph-sm text-text-sub-500 mt-2 max-w-[400px]'>
                    <span className='font-semibold text-text-main-900'>Important: </span>
                    {note}
                  </p>
                ) : null}
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
                type='submit'
                variant='primary'
                mode='filled'
                size='small'
                disabled={isLoading}
                className='flex-1'
              >
                {isLoading ? (
                  <span className='flex items-center justify-center gap-2'>
                    <span className='h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin' />
                    {loadingLabel}
                  </span>
                ) : (
                  confirmLabel
                )}
              </Button.Root>
            </div>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
};

export default DeleteConfirmModal;
