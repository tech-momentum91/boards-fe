import React, { useState } from 'react';
import { RiAlertFill } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { deleteVendorThunk } from '@/redux/vendorSlice';

const RemoveVendorModal = ({
  isLoading: externalLoading,
  handleOpenChange,
  handleRemove,
  isOpen: externalIsOpen,
  selectedVendor: externalSelectedVendor,
  removalType = 'delete',
}) => {
  const dispatch = useDispatch();

  const reduxState = useSelector((state) => state.vendor.removeVendorDrawer);
  const [isLoading, setIsLoading] = useState(false);

  // Use external props if provided, otherwise fall back to Redux state
  const isOpen = externalIsOpen === undefined ? reduxState.isOpen : externalIsOpen;
  const selectedVendor =
    externalSelectedVendor === undefined ? reduxState.vendor : externalSelectedVendor;

  const loading = isLoading || externalLoading;

  const onSubmit = async () => {
    if (!selectedVendor) return;

    setIsLoading(true);
    try {
      if (removalType === 'update' && handleRemove) {
        await handleRemove(selectedVendor);
      } else {
        const vendorId = selectedVendor?.id;

        if (!vendorId) {
          throw new Error('Vendor ID is required for deletion');
        }

        await dispatch(deleteVendorThunk({ vendorId })).unwrap();

        if (handleRemove) {
          await handleRemove(selectedVendor);
        }
      }

      showSuccessToast('Vendor removed successfully.');
      handleOpenChange?.(false);
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Content className='max-w-[450px]'>
        <Modal.Header
          variant='center'
          icon={
            <span className='p-2 bg-warning-base/10 rounded-lg'>
              <RiAlertFill size={24} className='text-warning-base' />
            </span>
          }
          title='Remove Vendor?'
          description='Are you sure you want to remove this vendor? This action cannot be undone.'
        />
        <Modal.Footer>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={() => handleOpenChange(false)}
            className='w-full'
            disabled={loading}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            variant='error'
            mode='filled'
            size='small'
            onClick={onSubmit}
            disabled={loading}
            className='w-full'
          >
            {loading ? (
              <span className='flex items-center justify-center gap-2'>
                <span className='h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin' />
                Removing...
              </span>
            ) : (
              'Remove'
            )}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default RemoveVendorModal;
