import { useEffect, useState } from 'react';
import { RiErrorWarningFill } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';

export const SKIP_DELETE_BOARD_CONFIRM_KEY = 'boards_skip_delete_confirm';

export function shouldSkipDeleteBoardConfirm() {
  try {
    return localStorage.getItem(SKIP_DELETE_BOARD_CONFIRM_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSkipDeleteBoardConfirm(skip) {
  try {
    if (skip) {
      localStorage.setItem(SKIP_DELETE_BOARD_CONFIRM_KEY, 'true');
    } else {
      localStorage.removeItem(SKIP_DELETE_BOARD_CONFIRM_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export default function DeleteBoardModal({
  isOpen,
  onOpenChange,
  board = null,
  onConfirm,
  isLoading = false,
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDontShowAgain(false);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm?.({ board, dontShowAgain });
  };

  const handleCancel = () => {
    onOpenChange?.(false);
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[480px]' showClose={false}>
        <Modal.Body className='p-5'>
          <div className='flex items-start gap-4'>
            <div className='flex shrink-0 items-center justify-center rounded-[10px] bg-error-lighter p-2'>
              <RiErrorWarningFill size={24} className='text-error-base' />
            </div>
            <div className='flex min-w-0 flex-1 flex-col gap-1'>
              <Modal.Title className='text-label-md text-text-main-900'>Delete Board?</Modal.Title>
              <Modal.Description className='text-paragraph-sm text-text-sub-500'>
                Are you sure you want to delete this board? This action cannot be undone.
              </Modal.Description>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer className='flex-row items-center gap-3 px-5 py-4'>
          <label className='flex shrink-0 cursor-pointer items-center gap-2'>
            <Checkbox.Root
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              disabled={isLoading}
            />
            <span className='text-label-sm text-text-main-900 whitespace-nowrap'>
              Don&apos;t show it again
            </span>
          </label>

          <div className='flex min-w-0 flex-1 items-center justify-end gap-3'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='xsmall'
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              variant='error'
              mode='filled'
              size='xsmall'
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className='flex items-center justify-center gap-2'>
                  <span className='h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white' />
                  Deleting...
                </span>
              ) : (
                'Yes'
              )}
            </Button.Root>
          </div>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
