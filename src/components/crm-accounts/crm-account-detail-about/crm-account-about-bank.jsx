import React, { useState } from 'react';
import { RiBankLine, RiAddLine, RiDeleteBinLine, RiAlertFill } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as Switch from '@/components/ui/switch';
import * as CompactButton from '@/components/ui/compact-button';
import * as Modal from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import CrmAccountAddBankModal from './crm-account-add-bank-modal';

const CrmAccountAboutBank = ({ account, banks = [], onAddBank, onUpdateBank, onDeleteBank }) => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bankToDelete, setBankToDelete] = useState(null);

  const handleBankAdded = async (newBank) => {
    if (!account?.name || !onAddBank) return;
    await onAddBank(account.name, {
      bank_name: newBank.bank_name,
      bank_account_number: newBank.bank_account_number,
      account_type: newBank.account_type,
      ifsc_code: newBank.ifsc_code,
      is_primary: newBank.is_primary ?? banks.length === 0,
    });
    setAddModalOpen(false);
  };

  const handleDeleteClick = (bank) => {
    setBankToDelete(bank);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!account?.name || !bankToDelete || !onDeleteBank) return;
    await onDeleteBank(account.name, bankToDelete.id);
    setDeleteModalOpen(false);
    setBankToDelete(null);
  };

  const handleTogglePrimary = (bank) => {
    if (!account?.name || !onUpdateBank) return;
    onUpdateBank(account.name, bank.id, { is_primary: 1 });
  };

  return (
    <div className='flex flex-col gap-4 py-5'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <RiBankLine size={20} className='text-text-sub-500' />
          <span className='text-label-md text-text-sub-500'>Bank Details</span>
        </div>
        <Button.Root
          variant='neutral'
          mode='stroke'
          size='xsmall'
          onClick={() => setAddModalOpen(true)}
        >
          <Button.Icon as={RiAddLine} className='mr-0.5' />
          Add Bank
        </Button.Root>
      </div>

      {banks.length > 0 ? (
        <div className='grid grid-cols-2 gap-4'>
          {banks.map((bank) => (
            <div
              key={bank.id}
              className={cn(
                'group border rounded-xl bg-bg-weak-100 overflow-hidden',
                'border-stroke-soft-200 shadow-[0px_2px_4px_0px_rgba(27,28,29,0.04)]',
              )}
            >
              <div className='bg-bg-weak-100 flex items-center justify-between px-4 py-3'>
                <div className='flex items-center gap-3 flex-1 min-w-0'>
                  <div className='flex items-center justify-center p-1.5 rounded-full bg-white ring-1 ring-stroke-soft-200 shrink-0'>
                    <RiBankLine size={20} className='text-text-sub-500' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-1.5 mb-1'>
                      <span className='label-small text-text-main-900 truncate'>
                        {bank.bank_name || '--'}
                      </span>
                      {bank.is_primary && (
                        <Badge.Root variant='stroke' color='green' className='uppercase shrink-0'>
                          Primary
                        </Badge.Root>
                      )}
                    </div>
                    <div className='text-label-xs text-text-soft-400'>
                      A/C No. {bank.bank_account_number || '--'}
                    </div>
                  </div>
                </div>

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

              <div className='bg-white border-t border-stroke-soft-200 p-4'>
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex flex-col gap-1 flex-1'>
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
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>No Bank Accounts</h3>
          <p className='max-w-md text-sm text-text-sub-600'>
            No bank account information has been added yet.
          </p>
        </div>
      )}

      {/* Add Bank Modal */}
      <CrmAccountAddBankModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSave={handleBankAdded}
        existingBanks={banks}
      />

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
                  Are you sure you want to remove{' '}
                  <strong>{bankToDelete?.bank_name || 'this bank account'}</strong>?
                </p>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div className='flex items-center justify-end gap-3 w-full'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </Button.Root>
              <Button.Root variant='error' size='small' onClick={handleConfirmDelete}>
                Remove
              </Button.Root>
            </div>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
};

export default CrmAccountAboutBank;
