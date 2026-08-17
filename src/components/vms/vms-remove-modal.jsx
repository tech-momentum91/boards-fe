import { RiAlertFill, RiErrorWarningLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';

const VmsRemoveModal = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isLoading = false,
}) => (
  <Modal.Root open={open} onOpenChange={onOpenChange}>
    <Modal.Content className='max-w-[450px]'>
      <Modal.Header
        variant='center'
        title='Cancel Visit?'
        description='Are you sure you want to cancel this visit?'
        icon={
          <span className='p-2 bg-warning-base/10 rounded-lg'>
            <RiAlertFill size={24} className='text-warning-base' />
          </span>
        }
      />
      <Modal.Footer>
        <Button.Root
          variant='neutral'
          mode='stroke'
          size='small'
          className='w-full'
          onClick={() => onOpenChange(false)}
          disabled={isLoading}
        >
          Cancel
        </Button.Root>
        <Button.Root
          variant='primary'
          mode='filled'
          size='small'
          className='w-full'
          onClick={onConfirm}
          disabled={isLoading}
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
      </Modal.Footer>
    </Modal.Content>
  </Modal.Root>
);

export default VmsRemoveModal;
