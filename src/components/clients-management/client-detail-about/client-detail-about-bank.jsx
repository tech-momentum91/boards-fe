import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { RiBankLine, RiAddLine, RiDeleteBinLine, RiAlertFill } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as Switch from '@/components/ui/switch';
import * as CompactButton from '@/components/ui/compact-button';
import * as Modal from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import {
  selectBankDetails,
  openAddBankModal,
  selectClientDetail,
  deleteClientBankThunk,
  getClientDetailThunk,
  addOrUpdateClientBankThunk,
} from '@/redux/clientDetailSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { CLIENT_DETAIL_EMPTY_STATES } from '@/components/clients-management/constants';

const ClientDetailAboutBank = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const banks = useSelector(selectBankDetails);
  const clientDetail = useSelector(selectClientDetail);
  const client = clientDetail.data;
  const clientId = client?.name || id;
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bankToDelete, setBankToDelete] = useState(null);

  const handleAddBank = () => {
    dispatch(openAddBankModal(null));
  };

  const handleDeleteClick = (bank) => {
    setBankToDelete(bank);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!bankToDelete?.name || !clientId) {
      showErrorToast('Unable to delete bank account');
      setDeleteModalOpen(false);
      setBankToDelete(null);
      return;
    }

    try {
      const result = await dispatch(
        deleteClientBankThunk({
          customer: clientId,
          bank_id: bankToDelete.name,
        }),
      );

      if (deleteClientBankThunk.rejected.match(result)) {
        showErrorToast(result.payload, {
          defaultMessage: 'Failed to delete bank account. Please try again.',
        });
        return;
      }

      showSuccessToast('Bank account deleted successfully');
      setDeleteModalOpen(false);
      setBankToDelete(null);
      // Refresh client details
      if (clientId) {
        await dispatch(getClientDetailThunk(clientId));
      }
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Failed to delete bank account. Please try again.',
      });
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setBankToDelete(null);
  };

  const handleTogglePrimary = async (bank) => {
    if (!bank.name || !clientId) {
      showErrorToast('Unable to update bank account');
      return;
    }

    try {
      const result = await dispatch(
        addOrUpdateClientBankThunk({
          clientId,
          bankData: {
            is_primary: bank.is_primary ? 0 : 1,
          },
          bankDetailsName: bank.name,
        }),
      );

      if (addOrUpdateClientBankThunk.rejected.match(result)) {
        showErrorToast(result.payload, {
          defaultMessage: 'Failed to update bank account. Please try again.',
        });
        return;
      }

      showSuccessToast('Bank account updated successfully');
      // Refresh client details
      if (clientId) {
        await dispatch(getClientDetailThunk(clientId));
      }
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Failed to update bank account. Please try again.',
      });
    }
  };

  return (
    <div className='flex flex-col gap-4 py-5'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <RiBankLine size={20} className='text-text-sub-500' />
          <span className='text-label-md text-text-sub-500'>Bank Details</span>
        </div>
        <Button.Root variant='neutral' mode='stroke' size='xsmall' onClick={handleAddBank}>
          <Button.Icon as={RiAddLine} className='mr-0.5' />
          Add Bank
        </Button.Root>
      </div>

      {banks.length > 0 ? (
        <div className='grid grid-cols-2 gap-4'>
          {banks.map((bank) => (
            <div
              key={bank.name}
              className={cn(
                'group border rounded-xl bg-bg-weak-100 overflow-hidden',
                'border-stroke-soft-200',
                !bank.is_primary && 'shadow-[0px_2px_4px_0px_rgba(27,28,29,0.04)]',
              )}
            >
              {/* Header */}
              <div className='bg-bg-weak-100 flex items-center justify-between px-4 py-3'>
                <div className='flex items-center gap-3 flex-1 min-w-0'>
                  <div className='flex items-center justify-center p-1.5 rounded-full bg-white ring-1 ring-stroke-soft-200 shrink-0'>
                    <RiBankLine size={20} className='text-text-sub-500' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-1.5 mb-1'>
                      <span className='label-small text-text-main-900'>
                        {bank.bank_name || '--'}
                      </span>
                      {bank.is_primary && (
                        <Badge.Root variant='stroke' color='green' className='uppercase'>
                          Primary
                        </Badge.Root>
                      )}
                    </div>
                    <div className='text-label-xs text-text-soft-400'>
                      A/C No. {bank.bank_account_number || '--'}
                    </div>
                  </div>
                </div>
                {/* Toggle (only for non-primary) and Delete (for all banks) */}
                <div className='flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
                  {!bank.is_primary && (
                    <>
                      <div className='flex items-center gap-2'>
                        <Switch.Root
                          checked={false}
                          onCheckedChange={() => handleTogglePrimary(bank)}
                        />
                        <span className='text-paragraph-sm text-text-sub-500 whitespace-nowrap'>
                          Set as Primary
                        </span>
                      </div>
                      <div className='h-4 w-px bg-stroke-sub-300' />
                    </>
                  )}
                  <CompactButton.Root
                    size='small'
                    variant='neutral'
                    onClick={() => handleDeleteClick(bank)}
                    className='shrink-0'
                  >
                    <CompactButton.Icon as={RiDeleteBinLine} />
                  </CompactButton.Root>
                </div>
              </div>

              {/* Details Section - Always Visible */}
              <div className='bg-white border-t border-stroke-soft-200 p-4'>
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex flex-col gap-1 flex-1 min-h-[40px]'>
                    <label className='text-paragraph-xs opacity-72 text-text-sub-500'>
                      Account Type
                    </label>
                    <span className='text-label-sm text-text-main-900'>
                      {bank.account_type || '--'}
                    </span>
                  </div>
                  <div className='flex flex-col gap-1 flex-1'>
                    <label className='text-paragraph-xs opacity-72 text-text-sub-500'>
                      IFSC Code
                    </label>
                    <span className='text-label-sm text-text-main-900'>
                      {bank.ifsc_code || '--'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>
            {CLIENT_DETAIL_EMPTY_STATES.bankDetails.title}
          </h3>
          <p className='max-w-md text-sm text-text-sub-600'>
            {CLIENT_DETAIL_EMPTY_STATES.bankDetails.description}
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal.Root open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <Modal.Content className='max-w-[450px]' showClose={false}>
          <Modal.Body className='px-5 py-8'>
            <div className='flex flex-col items-center gap-4'>
              <div className='flex items-center justify-center p-2 bg-warning-base/10 rounded-lg'>
                <RiAlertFill size={24} className='text-warning-base' />
              </div>
              <div className='flex flex-col gap-1 items-center text-center'>
                <h3 className='text-label-md text-text-sub-500'>Remove Bank Account?</h3>
                <p className='text-paragraph-sm text-text-sub-500'>
                  Are you sure you want to remove this bank account?
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
                onClick={handleCancelDelete}
              >
                Cancel
              </Button.Root>
              <Button.Root
                type='button'
                variant='primary'
                size='small'
                onClick={handleConfirmDelete}
              >
                Confirm
              </Button.Root>
            </div>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
};

export default ClientDetailAboutBank;
