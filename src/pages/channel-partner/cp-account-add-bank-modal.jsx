import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RiBankLine } from 'react-icons/ri';

import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Checkbox from '@/components/ui/checkbox';
import * as Label from '@/components/ui/label';

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'Savings', label: 'Savings' },
  { value: 'Current', label: 'Current' },
  { value: 'Fixed Deposit', label: 'Fixed Deposit' },
  { value: 'Recurring Deposit', label: 'Recurring Deposit' },
];

const bankSchema = z.object({
  bank_name: z.string().min(1, 'Bank name is required'),
  account_number: z.string().min(1, 'Account number is required'),
  account_type: z.string().min(1, 'Account type is required'),
  ifsc_code: z.string().min(1, 'IFSC code is required'),
  is_primary: z.boolean().default(false),
});

const CpAccountAddBankModal = ({ open, onOpenChange, onSave, existingBanks = [] }) => {
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
    if (open) {
      reset({
        bank_name: '',
        account_number: '',
        account_type: '',
        ifsc_code: '',
        is_primary: existingBanks.length === 0,
      });
    }
  }, [open, existingBanks.length, reset]);

  const handleClose = () => onOpenChange?.(false);

  const onSubmit = async (data) => {
    await onSave?.({
      id: `bank-${Date.now()}`,
      bank_name: data.bank_name,
      bank_account_number: data.account_number,
      account_type: data.account_type,
      ifsc_code: data.ifsc_code,
      is_primary: data.is_primary,
    });
    handleClose();
  };

  return (
    <Modal.Root open={open} onOpenChange={handleClose}>
      <Modal.Content className='max-w-[450px]' showClose>
        <Modal.Header
          icon={RiBankLine}
          title='Add Bank Account'
          description='Add below details to add new bank account.'
        />

        <Modal.Body>
          <form id='cp-bank-form' onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-4'>
            {/* Bank Name */}
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

            {/* Account Number */}
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

            {/* Account Type */}
            <div className='flex flex-col gap-1'>
              <Label.Root>
                Account Type
                <Label.Asterisk />
              </Label.Root>
              <Controller
                name='account_type'
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    size='medium'
                    hasError={Boolean(errors.account_type)}
                    options={ACCOUNT_TYPE_OPTIONS}
                    placeholder='Select'
                    triggerClassName='w-full'
                  />
                )}
              />
              {errors.account_type && (
                <span className='text-paragraph-xs text-error-base'>
                  {errors.account_type.message}
                </span>
              )}
            </div>

            {/* IFSC Code */}
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
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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

            {/* Set as Primary */}
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
              <Label.Root
                htmlFor='is_primary'
                className='text-paragraph-sm text-text-sub-500 cursor-pointer'
              >
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
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='submit'
              form='cp-bank-form'
              variant='primary'
              size='small'
              disabled={isSubmitting}
            >
              Add
            </Button.Root>
          </div>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default CpAccountAddBankModal;
