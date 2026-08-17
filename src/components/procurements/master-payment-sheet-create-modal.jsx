import React, { useCallback, useMemo, useState } from 'react';
import { RiFileSettingsLine } from 'react-icons/ri';

import { createMasterPaymentSheet } from '@/api/masterPaymentSheets';
import { MASTER_PAYMENT_SHEET_MONTH_OPTIONS } from '@/components/procurements/constants';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Modal from '@/components/ui/modal';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const THOUSAND = 1_000;
const LAKH = 1_00_000;
const CRORE = 1_00_00_000;

function formatCompactLabel(value, suffix) {
  const rounded = Math.round(value * 100) / 100;
  if (!Number.isFinite(rounded) || rounded <= 0) return '';
  const label = Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded)
        .replace(/(\.\d*?[1-9])0+$/, '$1')
        .replace(/\.$/, '');
  return `${label}${suffix}`;
}

/** Indian-style budget hint: 1k, 10k, 1L, 10L, 1CR, 10CR */
export function formatBudgetShorthand(rawValue) {
  const amount = Number(
    String(rawValue ?? '')
      .replaceAll(',', '')
      .trim(),
  );
  if (!Number.isFinite(amount) || amount < THOUSAND) return '';

  if (amount >= CRORE) return formatCompactLabel(amount / CRORE, 'CR');
  if (amount >= LAKH) return formatCompactLabel(amount / LAKH, 'L');
  return formatCompactLabel(amount / THOUSAND, 'k');
}

export default function MasterPaymentSheetCreateModal({ open, onOpenChange, onCreated }) {
  const [sheetName, setSheetName] = useState('');
  const [month, setMonth] = useState('july');
  const [budget, setBudget] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const budgetShorthand = useMemo(() => formatBudgetShorthand(budget), [budget]);

  const resetForm = useCallback(() => {
    setSheetName('');
    setMonth('july');
    setBudget('');
    setRemarks('');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onOpenChange?.(false);
  }, [onOpenChange, resetForm]);

  const handleCreate = useCallback(async () => {
    const trimmedName = sheetName.trim();
    if (!trimmedName) {
      showErrorToast(null, { defaultMessage: 'Sheet Name is required.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await createMasterPaymentSheet({
        sheetName: trimmedName,
        month,
        year: new Date().getFullYear(),
        budget,
        remarks,
      });
      showSuccessToast('Master payment sheet created successfully.');
      await onCreated?.();
      handleClose();
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to create master payment sheet.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [budget, handleClose, month, onCreated, remarks, sheetName]);

  return (
    <Modal.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) onOpenChange?.(nextOpen);
        else handleClose();
      }}
    >
      <Modal.Content className='max-w-[480px]'>
        <Modal.Header
          icon={RiFileSettingsLine}
          title='Create Payment Sheet'
          description='Add below details to create a payment sheet.'
        />

        <Modal.Body>
          <div className='flex w-full flex-col gap-4'>
            <div className='flex w-full flex-col gap-1'>
              <Label.Root>
                Sheet Name
                <Label.Asterisk />
              </Label.Root>
              <Input.Root size='small'>
                <Input.Wrapper>
                  <Input.Input
                    value={sheetName}
                    onChange={(event) => setSheetName(event.target.value)}
                    placeholder='Enter sheet name'
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>

            <div className='flex w-full flex-col gap-1'>
              <Label.Root>Month</Label.Root>
              <SearchableSelect
                size='small'
                showArrow
                value={month}
                onValueChange={setMonth}
                options={MASTER_PAYMENT_SHEET_MONTH_OPTIONS}
                placeholder='Select month'
                triggerClassName='w-full'
              />
            </div>

            <div className='flex w-full flex-col gap-1'>
              <Label.Root>Budget</Label.Root>
              <Input.Root size='small'>
                <Input.Wrapper className='pr-2'>
                  <Input.Input
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                    placeholder='Enter budget'
                    inputMode='decimal'
                  />
                  <span className='flex shrink-0 items-center gap-1.5 text-paragraph-xs text-text-soft-400'>
                    {budgetShorthand ? (
                      <span className='font-medium text-text-sub-500'>{budgetShorthand}</span>
                    ) : null}
                    <span>₹</span>
                  </span>
                </Input.Wrapper>
              </Input.Root>
            </div>

            <div className='flex w-full flex-col gap-1'>
              <Label.Root>Remarks</Label.Root>
              <Input.Root size='small'>
                <Input.Wrapper>
                  <Input.Input
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    placeholder='Type here...'
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer className='gap-3'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            className='flex-1'
            disabled={isSubmitting}
            onClick={handleClose}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            size='small'
            className='flex-1'
            disabled={isSubmitting || !sheetName.trim()}
            onClick={handleCreate}
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
