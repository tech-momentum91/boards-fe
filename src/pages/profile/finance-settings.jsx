import React, { useState, useEffect } from 'react';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import apiClient from '@/api/axios';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const FinanceSettings = () => {
  const [creditValue, setCreditValue] = useState('');
  const [initialValue, setInitialValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const { data } = await apiClient.post('/method/frappe.client.get', {
          doctype: 'Devx Setting',
          name: 'Devx Setting',
        });
        const message = data?.message ?? data ?? {};
        const val = message.credit_value ?? 0;
        setCreditValue(String(val));
        setInitialValue(String(val));
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to fetch finance settings.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleUpdate = async () => {
    const numericVal = Number(creditValue);
    if (
      !creditValue ||
      Number.isNaN(numericVal) ||
      numericVal <= 0 ||
      !Number.isInteger(numericVal)
    ) {
      showErrorToast(new Error('Please enter a valid whole number greater than 0.'));
      return;
    }
    try {
      setIsUpdating(true);
      await apiClient.post('/method/frappe.client.set_value', {
        doctype: 'Devx Setting',
        name: 'Devx Setting',
        fieldname: 'credit_value',
        value: numericVal,
      });
      showSuccessToast('Credit value updated successfully.');
      setInitialValue(creditValue);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to update credit value.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const isButtonDisabled =
    isLoading ||
    isUpdating ||
    creditValue === initialValue ||
    !creditValue ||
    Number.isNaN(Number(creditValue)) ||
    Number(creditValue) <= 0;

  return (
    <div className='flex w-full min-w-0 flex-col gap-6'>
      <div className='flex flex-col items-start justify-center'>
        <span className='text-[var(--color-text-main-900)] label-small'>Finance Settings</span>
        <span className='text-[var(--color-text-sub-500)] paragraph-xsmall'>
          Manage global finance settings.
        </span>
      </div>

      {isLoading ? (
        <div className='h-40 w-[400px] bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
      ) : (
        <div className='flex flex-col gap-6 max-w-[400px] w-full'>
          {/* Info Banner: 1 Credit = ₹Value */}
          <div className='rounded-lg bg-[var(--color-bg-weak-50)] p-3 text-paragraph-sm text-text-sub-600 border border-stroke-soft-200'>
            1 Credit = ₹{initialValue || '0'}
          </div>

          <div className='flex flex-col gap-2'>
            <Label.Root>
              Value of 1 credit <Label.Asterisk />
            </Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.InlineAffix>₹</Input.InlineAffix>
                <Input.Input
                  type='number'
                  min='1'
                  value={creditValue}
                  onChange={(e) => setCreditValue(e.target.value)}
                  placeholder='Enter value'
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div className='flex'>
            <Button.Root
              variant='primary'
              mode='filled'
              size='small'
              onClick={handleUpdate}
              disabled={isButtonDisabled}
            >
              Update Credit Value
            </Button.Root>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceSettings;
