import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { z } from 'zod';
import { RiBankLine } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Checkbox from '@/components/ui/checkbox';
import * as Label from '@/components/ui/label';
import { ACCOUNT_TYPE_OPTIONS } from '@/components/clients-management/constants';
import { closeAddBankModal, addOrUpdateClientBankThunk } from '@/redux/clientDetailSlice';
import { addLandlordBankDetailsThunk, updateLandlordBankDetailsThunk } from '@/redux/landlordSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const bankSchema = z.object({
  bank_name: z.string().min(1, 'Bank name is required'),
  account_number: z.string().min(1, 'Account number is required'),
  account_type: z.string().min(1, 'Account type is required'),
  ifsc_code: z.string().min(1, 'IFSC code is required'),
  is_primary: z.boolean().default(false),
});

/**
 * AddBankModal - reusable for both Client and Landlord.
 * Client mode (default): uses Redux addBankModal, pass clientId + onSuccess.
 * Landlord mode: pass isOpen, onOpenChange, entityId (landlordId), onSuccess, existingBanks.
 */
const AddBankModal = ({
  entityType = 'client',
  entityId,
  isOpen: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  editingBank: controlledEditingBank,
  onSuccess,
  existingBanks = [],
}) => {
  const dispatch = useDispatch();
  const addBankModal = useSelector((state) => state.clientDetail?.addBankModal);

  const isClientMode = entityType === 'client';
  const isOpen = isClientMode ? addBankModal?.isOpen : controlledOpen;
  const editingBank = isClientMode ? addBankModal?.bank : controlledEditingBank;

  const handleClose = (open) => {
    if (!open) {
      if (isClientMode) {
        dispatch(closeAddBankModal());
      } else {
        controlledOnOpenChange?.(false);
      }
    }
  };

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      bank_name: '',
      account_number: '',
      account_type: '',
      ifsc_code: '',
      is_primary: false,
    },
  });

  useEffect(() => {
    if (isOpen && editingBank) {
      reset({
        bank_name: editingBank.bank_name || '',
        account_number: editingBank.bank_account_number || editingBank.account_number || '',
        account_type: editingBank.account_type || '',
        ifsc_code: editingBank.ifsc_code || '',
        is_primary: Boolean(editingBank.is_primary),
      });
    } else if (isOpen) {
      reset({
        bank_name: '',
        account_number: '',
        account_type: '',
        ifsc_code: '',
        is_primary: existingBanks.length === 0,
      });
    }
  }, [isOpen, editingBank, existingBanks.length, reset]);

  const onSubmit = async (data) => {
    const id = entityId;
    if (!id) {
      showErrorToast(`${entityType === 'client' ? 'Client' : 'Landlord'} ID is required`);
      return;
    }

    try {
      if (entityType === 'client') {
        const bankDetailsName = editingBank?.originalBank?.name || null;
        const result = await dispatch(
          addOrUpdateClientBankThunk({
            clientId: id,
            bankData: {
              bank_name: data.bank_name,
              account_number: data.account_number,
              account_type: data.account_type,
              ifsc_code: data.ifsc_code || '',
              micr_code: '',
              swift_code: '',
              is_primary: data.is_primary,
            },
            bankDetailsName,
          }),
        );

        if (addOrUpdateClientBankThunk.rejected.match(result)) {
          showErrorToast(result.payload, {
            defaultMessage: 'Failed to save bank account. Please try again.',
          });
          return;
        }
        dispatch(closeAddBankModal());
      } else {
        const bankId = editingBank?.name || editingBank?.originalBank?.name;
        if (bankId) {
          const isPrimary =
            data.is_primary !== undefined && data.is_primary !== null
              ? data.is_primary
                ? 1
                : 0
              : editingBank.is_primary
                ? 1
                : 0;
          const result = await dispatch(
            updateLandlordBankDetailsThunk({
              bank_id: bankId,
              fields: {
                bank_name: data.bank_name,
                account_number: data.account_number,
                account_type: data.account_type,
                ifsc_code: data.ifsc_code || '',
                is_primary: isPrimary,
              },
            }),
          );
          if (updateLandlordBankDetailsThunk.rejected.match(result)) {
            showErrorToast(result.payload, {
              defaultMessage: 'Failed to update bank account. Please try again.',
            });
            return;
          }
        } else {
          const result = await dispatch(
            addLandlordBankDetailsThunk({
              landlord: id,
              bank_name: data.bank_name,
              account_number: data.account_number,
              account_type: data.account_type,
              ifsc_code: data.ifsc_code || '',
              is_primary: data.is_primary ? 1 : 0,
            }),
          );
          if (addLandlordBankDetailsThunk.rejected.match(result)) {
            showErrorToast(result.payload, {
              defaultMessage: 'Failed to add bank account. Please try again.',
            });
            return;
          }
        }
        controlledOnOpenChange?.(false);
      }

      showSuccessToast('Bank account saved successfully');
      onSuccess?.();
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Failed to save bank account. Please try again.',
      });
    }
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={handleClose}>
      <Modal.Content className='max-w-[450px] max-h-[90vh] overflow-hidden flex flex-col'>
        <Modal.Header
          icon={RiBankLine}
          title={editingBank ? 'Edit Bank Account' : 'Add Bank Account'}
          description={
            editingBank
              ? 'Update the bank account details below.'
              : 'Add below details to add new bank account.'
          }
        />
        <Modal.Body className='overflow-y-auto'>
          <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-4 h-full'>
            <div className='flex flex-col gap-1'>
              <Label.Root>
                Bank Name
                <Label.Asterisk />
              </Label.Root>
              <Controller
                name='bank_name'
                control={control}
                render={({ field }) => (
                  <Input.Root hasError={Boolean(errors.bank_name)} size='medium'>
                    <Input.Wrapper>
                      <Input.Input
                        {...field}
                        placeholder='Enter bank name'
                        disabled={isSubmitting}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                )}
              />
              {errors.bank_name && (
                <span className='text-paragraph-xs text-error-base'>
                  {errors.bank_name.message}
                </span>
              )}
            </div>

            <div className='flex flex-col gap-1'>
              <Label.Root>
                Account Number
                <Label.Asterisk />
              </Label.Root>
              <Controller
                name='account_number'
                control={control}
                render={({ field }) => (
                  <Input.Root hasError={Boolean(errors.account_number)} size='medium'>
                    <Input.Wrapper>
                      <Input.Input
                        {...field}
                        placeholder='Enter account number'
                        disabled={isSubmitting}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                )}
              />
              {errors.account_number && (
                <span className='text-paragraph-xs text-error-base'>
                  {errors.account_number.message}
                </span>
              )}
            </div>

            <div className='flex flex-col gap-1'>
              <Label.Root>
                Account Type
                <Label.Asterisk />
              </Label.Root>
              <Controller
                name='account_type'
                control={control}
                render={({ field }) => (
                  <Select.Root
                    value={field.value}
                    onValueChange={field.onChange}
                    size='medium'
                    hasError={Boolean(errors.account_type)}
                  >
                    <Select.Trigger className='w-full'>
                      <Select.Value placeholder='Select' />
                    </Select.Trigger>
                    <Select.Content>
                      {ACCOUNT_TYPE_OPTIONS.map((option) => (
                        <Select.Item key={option.value} value={option.value}>
                          {option.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              />
              {errors.account_type && (
                <span className='text-paragraph-xs text-error-base'>
                  {errors.account_type.message}
                </span>
              )}
            </div>

            <div className='flex flex-col gap-1'>
              <Label.Root>
                IFSC Code
                <Label.Asterisk />
              </Label.Root>
              <Controller
                name='ifsc_code'
                control={control}
                render={({ field }) => (
                  <Input.Root hasError={Boolean(errors.ifsc_code)} size='medium'>
                    <Input.Wrapper>
                      <Input.Input
                        {...field}
                        placeholder='Enter IFSC code'
                        disabled={isSubmitting}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                )}
              />
              {errors.ifsc_code && (
                <span className='text-paragraph-xs text-error-base'>
                  {errors.ifsc_code.message}
                </span>
              )}
            </div>

            <div className='flex items-center gap-2'>
              <Controller
                name='is_primary'
                control={control}
                render={({ field }) => (
                  <Checkbox.Root
                    id='is_primary'
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                  />
                )}
              />
              <Label.Root htmlFor='is_primary' className='text-paragraph-sm text-text-sub-500'>
                Set as Primary
              </Label.Root>
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <div className='flex items-center justify-end gap-3 w-full'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='submit'
              variant='primary'
              size='small'
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              {editingBank ? 'Update' : 'Add'}
            </Button.Root>
          </div>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

const ClientAddBankModal = ({ clientId, onSuccess }) => (
  <AddBankModal entityType='client' entityId={clientId} onSuccess={onSuccess} />
);

export default ClientAddBankModal;
export { AddBankModal };
