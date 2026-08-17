import React, { useState } from 'react';
import { RiAlertFill } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { deleteLandlordThunk } from '@/redux/landlordSlice';

const RemoveLandlordModal = ({
  isLoading: externalLoading,
  handleOpenChange,
  handleRemove,
  isOpen: externalIsOpen,
  selectedLandlord: externalSelectedLandlord,
  centerDetails: externalCenterDetails,
  removalType = 'delete', // 'delete' for landlords page, 'update' for center view
}) => {
  const dispatch = useDispatch();
  // Fetch data from landlordSlice (fallback if not provided as props)
  const reduxState = useSelector((state) => state.landlord.removeLandlordDrawer);
  const reduxCenterDetails = useSelector((state) => state.center.centerDetails)?.data;
  const [isLoading, setIsLoading] = useState(false);

  // Use external props if provided, otherwise use Redux state
  const isOpen = externalIsOpen === undefined ? reduxState.isOpen : externalIsOpen;
  const selectedLandlord =
    externalSelectedLandlord === undefined ? reduxState.selectedLandlord : externalSelectedLandlord;
  const centerDetails =
    externalCenterDetails === undefined ? reduxCenterDetails : externalCenterDetails;

  const loading = isLoading || externalLoading;

  const onSubmit = async () => {
    if (!selectedLandlord) {
      return;
    }

    setIsLoading(true);
    try {
      // If removalType is 'update' (from center view), just call handleRemove which handles updateCenterThunk
      if (removalType === 'update' && handleRemove) {
        await handleRemove(selectedLandlord);
      } else {
        // If removalType is 'delete' (from landlords page), call deleteLandlordThunk
        // Get landlord ID (use 'name' field as Frappe document ID, fallback to 'landlord')
        const landlordId = selectedLandlord?.name;

        if (!landlordId) {
          throw new Error('Landlord ID is required for deletion');
        }

        const response = await dispatch(deleteLandlordThunk({ landlord_id: landlordId })).unwrap();

        // Call handleRemove callback if provided to refresh list, passing the selectedLandlord
        if (handleRemove) {
          await handleRemove(selectedLandlord);
        }
      }

      showSuccessToast('Landlord removed successfully.');

      handleOpenChange?.(false);
    } catch (error) {
      if (error?.exception && error?.exc_type == 'LinkExistsError') {
        showErrorToast(
          "You can't delete this landlord because one or more centers are currently assigned to them.",
        );
        return;
      }

      showErrorToast(error, { defaultMessage: 'Failed to remove landlord. Please try again.' });
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
          title='Remove Landlord?'
          description='Are you sure you want to remove this landlord? This action cannot be undone.'
        />
        {/* <Modal.Body>
          {selectedLandlord && (
            <div className='w-full flex flex-col gap-2'>
              <div className='p-3 bg-[var(--color-stroke-soft-200)] rounded-[8px]'>
                <span className='text-[var(--color-text-main-900)] paragraph-small'>
                  {selectedLandlord.name} ({selectedLandlord.email})
                </span>
              </div>
            </div>
          )}
        </Modal.Body> */}
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
            variant='primary'
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

export default RemoveLandlordModal;
