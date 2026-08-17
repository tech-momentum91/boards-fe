import React, { useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RiErrorWarningFill, RiLayoutGridLine } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Hint from '@/components/ui/hint';
import { CURRENCY } from '@/constants/constants';
import {
  formatBillingDecimal,
  formatBillingPercentFromAmount,
  computeBillingAmountFromPercent,
  computeBillingInvoiceAmount,
  computeBillingTotalAmount,
  DISCOUNT_EXCEEDS_INVOICE_ERROR,
  DISCOUNT_PLUS_TDS_EXCEEDS_INVOICE_ERROR,
  TDS_AMOUNT_EXCEEDS_BASIC_ERROR,
} from '@/components/billing/constants';

// Required amount: must have a value (empty string not allowed), then valid non-negative number.
const requiredAmount = (message = 'Required') =>
  z
    .union([z.string(), z.number()])
    .refine(
      (v) =>
        v !== '' &&
        v !== undefined &&
        v !== null &&
        (typeof v !== 'string' || String(v).trim() !== ''),
      { message },
    )
    .transform((v) => (typeof v === 'string' ? Number(String(v).trim()) : v))
    .refine((n) => !Number.isNaN(n), { message: 'Must be a valid number' })
    .refine((n) => n >= 0, { message: 'Cannot be negative' });

const parseAmount = (v) => {
  if (v === '' || v === undefined || v === null) return 0;
  const n = Number(String(v).trim());
  return Number.isNaN(n) ? 0 : n;
};

/** Invoice = basic + GST (discount applied only on total/outstanding). */
const computeInvoiceAmount = ({ basic_amount, gst_amount }) =>
  computeBillingInvoiceAmount(basic_amount, gst_amount);

/** Digits and at most one dot, max 2 digits after decimal. */
const sanitizeInput = (raw) => {
  const v = String(raw ?? '').replaceAll(/[^\d.]/g, '');
  if (!v) return '';
  const parts = v.split('.');
  if (parts.length === 1) return parts[0];
  return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`;
};

// Optional amount: empty becomes 0, otherwise valid non-negative number.
const optionalAmount = z
  .union([z.string(), z.number()])
  .transform((v) => (v === '' || v === undefined || v === null ? 0 : Number(v)))
  .refine((n) => !Number.isNaN(n) && n >= 0, { message: 'Cannot be negative' })
  .default(0);

const invoiceConfirmSchema = z
  .object({
    basic_amount: requiredAmount('Basic amount is required'),
    gst_amount: optionalAmount,
    gst_percent: optionalAmount,
    discount_amount: optionalAmount,
    discount_percent: optionalAmount,
    tds_percent: optionalAmount,
    tds_amount: optionalAmount,
  })
  .superRefine((data, ctx) => {
    const basic = parseAmount(data.basic_amount);
    const gst = parseAmount(data.gst_amount);
    const discount = parseAmount(data.discount_amount);
    const tds = parseAmount(data.tds_amount);

    if (discount > basic + gst) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discount_amount'],
        message: DISCOUNT_EXCEEDS_INVOICE_ERROR,
      });
    }
    if (tds > basic) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tds_amount'],
        message: TDS_AMOUNT_EXCEEDS_BASIC_ERROR,
      });
    }
    if (discount + tds > basic + gst) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discount_amount'],
        message: DISCOUNT_PLUS_TDS_EXCEEDS_INVOICE_ERROR,
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tds_amount'],
        message: DISCOUNT_PLUS_TDS_EXCEEDS_INVOICE_ERROR,
      });
    }
  });

const defaultValues = {
  basic_amount: '',
  gst_amount: '',
  gst_percent: '',
  discount_amount: '',
  discount_percent: '',
  tds_percent: '',
  tds_amount: '',
};

/** Compact editable `( 18 %)` control next to amount labels. */
const PercentInlineInput = ({ registerProps, hasError, onChange }) => (
  <div
    className={`flex h-6 items-center gap-0.5 rounded-md px-1.5 ring-1 ring-inset ${
      hasError ? 'ring-error-base' : 'ring-stroke-soft-200'
    } bg-bg-white-0`}
  >
    <span className='paragraph-small text-text-sub-600'>(</span>
    <input
      type='text'
      inputMode='decimal'
      placeholder='0'
      className='w-9 bg-transparent text-center paragraph-small text-text-sub-600 outline-none'
      {...registerProps}
      onChange={onChange}
    />
    <span className='paragraph-small text-text-sub-600'>%</span>
    <span className='paragraph-small text-text-sub-600'>)</span>
  </div>
);

const InvoiceConfirmModal = ({ open = false, values, onCancel, onConfirm, onOpenChange }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
    getValues,
    trigger,
  } = useForm({
    resolver: zodResolver(invoiceConfirmSchema),
    defaultValues,
    mode: 'onChange',
  });

  // Skip amount→% echo while we intentionally write amounts from a % edit.
  const skipAmountToPercentRef = useRef({ gst: false, tds: false, discount: false });

  const basicAmount = useWatch({ control, name: 'basic_amount' });
  const gstAmount = useWatch({ control, name: 'gst_amount' });
  const discountAmount = useWatch({ control, name: 'discount_amount' });
  const tdsAmount = useWatch({ control, name: 'tds_amount' });

  const computedInvoiceAmount = computeInvoiceAmount({
    basic_amount: basicAmount,
    gst_amount: gstAmount,
  });

  const hasAmountInput = [basicAmount, gstAmount].some(
    (v) => v !== '' && v !== undefined && v !== null && String(v).trim() !== '',
  );
  const invoiceAmountDisplay = hasAmountInput ? formatBillingDecimal(computedInvoiceAmount) : '';
  const outstandingDisplay = hasAmountInput
    ? formatBillingDecimal(
        computeBillingTotalAmount(computedInvoiceAmount, tdsAmount, discountAmount),
      )
    : '';
  const hasDiscountValue = parseAmount(discountAmount) > 0;
  const hasTdsValue = parseAmount(tdsAmount) > 0;

  useEffect(() => {
    if (!open) return;
    void trigger('tds_amount');
    void trigger('discount_amount');
  }, [open, basicAmount, gstAmount, tdsAmount, discountAmount, trigger]);

  // Amount → % only (never rewrite amounts from rounded %). Also refreshes when basic changes.
  useEffect(() => {
    if (!open) return;
    if (skipAmountToPercentRef.current.gst) {
      skipAmountToPercentRef.current.gst = false;
      return;
    }
    const amtStr = String(gstAmount ?? '').trim();
    setValue(
      'gst_percent',
      amtStr === '' ? '' : formatBillingPercentFromAmount(basicAmount, gstAmount),
      { shouldValidate: true },
    );
  }, [open, basicAmount, gstAmount, setValue]);

  useEffect(() => {
    if (!open) return;
    if (skipAmountToPercentRef.current.tds) {
      skipAmountToPercentRef.current.tds = false;
      return;
    }
    const amtStr = String(tdsAmount ?? '').trim();
    setValue(
      'tds_percent',
      amtStr === '' ? '' : formatBillingPercentFromAmount(basicAmount, tdsAmount),
      { shouldValidate: true },
    );
  }, [open, basicAmount, tdsAmount, setValue]);

  useEffect(() => {
    if (!open) return;
    if (skipAmountToPercentRef.current.discount) {
      skipAmountToPercentRef.current.discount = false;
      return;
    }
    const amtStr = String(discountAmount ?? '').trim();
    setValue(
      'discount_percent',
      amtStr === '' ? '' : formatBillingPercentFromAmount(basicAmount, discountAmount),
      { shouldValidate: true },
    );
  }, [open, basicAmount, discountAmount, setValue]);

  useEffect(() => {
    if (open && values) {
      const basic = parseAmount(values.basic_amount);
      const gst = parseAmount(values.gst_amount);
      const discount = parseAmount(values.discount_amount);
      const tds = parseAmount(values.tds_amount);

      // Exact extracted amounts stay as-is; % is display-only (2 dp).
      const gst_percent =
        basic > 0 && gst > 0
          ? formatBillingPercentFromAmount(values.basic_amount, values.gst_amount)
          : '';
      const discount_percent =
        basic > 0 && discount > 0
          ? formatBillingPercentFromAmount(values.basic_amount, values.discount_amount)
          : '';
      const tds_percent =
        basic > 0 && tds > 0
          ? formatBillingPercentFromAmount(values.basic_amount, values.tds_amount)
          : '';

      skipAmountToPercentRef.current = { gst: true, tds: true, discount: true };

      reset({
        basic_amount: formatBillingDecimal(values.basic_amount ?? ''),
        gst_amount: formatBillingDecimal(values.gst_amount ?? ''),
        gst_percent: gst_percent !== '' ? formatBillingDecimal(gst_percent) : '',
        discount_amount: formatBillingDecimal(values.discount_amount ?? ''),
        discount_percent: discount_percent !== '' ? formatBillingDecimal(discount_percent) : '',
        tds_amount: formatBillingDecimal(values.tds_amount ?? ''),
        tds_percent: tds_percent !== '' ? formatBillingDecimal(tds_percent) : '',
      });
    }
  }, [open, values, reset]);

  const basicAmountRegister = register('basic_amount');
  const gstAmountRegister = register('gst_amount');
  const gstPercentRegister = register('gst_percent');
  const discountAmountRegister = register('discount_amount');
  const discountPercentRegister = register('discount_percent');
  const tdsPercentRegister = register('tds_percent');
  const tdsAmountRegister = register('tds_amount');

  const handlePercentChange = (field, registerOnChange) => (e) => {
    const cleaned = sanitizeInput(e.target.value);
    e.target.value = cleaned;
    registerOnChange(e);

    const basic = getValues('basic_amount');
    const amountField =
      field === 'gst' ? 'gst_amount' : field === 'tds' ? 'tds_amount' : 'discount_amount';

    skipAmountToPercentRef.current[field] = true;
    if (cleaned === '') {
      setValue(amountField, '', { shouldValidate: true });
      return;
    }
    setValue(amountField, String(computeBillingAmountFromPercent(basic, cleaned)), {
      shouldValidate: true,
    });
  };

  const onSubmit = (data) => {
    const invoiceAmount = computeInvoiceAmount(data);
    const totalAmount = computeBillingTotalAmount(
      invoiceAmount,
      data.tds_amount,
      data.discount_amount,
    );
    onConfirm?.({
      basic_amount: data.basic_amount,
      gst_amount: data.gst_amount,
      discount_amount: data.discount_amount,
      tds_amount: data.tds_amount,
      tds_percentage: data.tds_percent,
      invoice_amount: invoiceAmount,
      total_amount: totalAmount,
    });
  };

  return (
    <Modal.Root
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange?.(nextOpen);
      }}
    >
      <Modal.Content className='max-w-[860px]' showClose>
        <Modal.Header
          icon={RiLayoutGridLine}
          title='Confirm invoice amount'
          description='Review the extracted values before saving them to the billing record'
        />
        <form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Body className='flex flex-col gap-5'>
            <div className='grid grid-cols-4 gap-3'>
              <div className='flex flex-col gap-1'>
                <Label.Root>
                  Basic Amount
                  <Label.Asterisk />
                </Label.Root>
                <Input.Root size='small' hasError={Boolean(errors.basic_amount)}>
                  <Input.Wrapper>
                    <Input.Input
                      type='text'
                      inputMode='decimal'
                      placeholder='0'
                      {...basicAmountRegister}
                      onChange={(e) => {
                        e.target.value = sanitizeInput(e.target.value);
                        basicAmountRegister.onChange(e);
                      }}
                    />
                    <Input.InlineAffix>{CURRENCY}</Input.InlineAffix>
                  </Input.Wrapper>
                </Input.Root>
                {errors.basic_amount && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.basic_amount.message}
                  </Hint.Root>
                )}
              </div>

              <div className='flex flex-col gap-1'>
                <div className='flex items-center justify-between gap-2'>
                  <Label.Root>GST Amount</Label.Root>
                  <PercentInlineInput
                    registerProps={gstPercentRegister}
                    hasError={Boolean(errors.gst_percent)}
                    onChange={handlePercentChange('gst', gstPercentRegister.onChange)}
                  />
                </div>
                <Input.Root size='small' hasError={Boolean(errors.gst_amount)}>
                  <Input.Wrapper>
                    <Input.Input
                      type='text'
                      inputMode='decimal'
                      placeholder='0'
                      {...gstAmountRegister}
                      onChange={(e) => {
                        e.target.value = sanitizeInput(e.target.value);
                        gstAmountRegister.onChange(e);
                      }}
                    />
                    <Input.InlineAffix>{CURRENCY}</Input.InlineAffix>
                  </Input.Wrapper>
                </Input.Root>
                {errors.gst_amount && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.gst_amount.message}
                  </Hint.Root>
                )}
              </div>

              <div className='flex flex-col gap-1'>
                <div className='flex items-center justify-between gap-2'>
                  <Label.Root>TDS Amount</Label.Root>
                  <PercentInlineInput
                    registerProps={tdsPercentRegister}
                    hasError={Boolean(errors.tds_percent)}
                    onChange={handlePercentChange('tds', tdsPercentRegister.onChange)}
                  />
                </div>
                <Input.Root size='small' hasError={Boolean(errors.tds_amount)}>
                  <Input.Wrapper>
                    {hasTdsValue && (
                      <Input.InlineAffix className='text-error-base'>(-)</Input.InlineAffix>
                    )}
                    <Input.Input
                      type='text'
                      inputMode='decimal'
                      placeholder='0'
                      className={hasTdsValue ? 'text-error-base' : undefined}
                      {...tdsAmountRegister}
                      onChange={(e) => {
                        e.target.value = sanitizeInput(e.target.value);
                        tdsAmountRegister.onChange(e);
                      }}
                    />
                    <Input.InlineAffix>{CURRENCY}</Input.InlineAffix>
                  </Input.Wrapper>
                </Input.Root>
                {errors.tds_amount && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.tds_amount.message}
                  </Hint.Root>
                )}
              </div>

              <div className='flex flex-col gap-1'>
                <div className='flex items-center justify-between gap-2'>
                  <Label.Root>Discount</Label.Root>
                  <PercentInlineInput
                    registerProps={discountPercentRegister}
                    hasError={Boolean(errors.discount_percent)}
                    onChange={handlePercentChange('discount', discountPercentRegister.onChange)}
                  />
                </div>
                <Input.Root size='small' hasError={Boolean(errors.discount_amount)}>
                  <Input.Wrapper>
                    {hasDiscountValue && (
                      <Input.InlineAffix className='text-error-base'>(-)</Input.InlineAffix>
                    )}
                    <Input.Input
                      type='text'
                      inputMode='decimal'
                      placeholder='0'
                      className={hasDiscountValue ? 'text-error-base' : undefined}
                      {...discountAmountRegister}
                      onChange={(e) => {
                        e.target.value = sanitizeInput(e.target.value);
                        discountAmountRegister.onChange(e);
                      }}
                    />
                    <Input.InlineAffix>{CURRENCY}</Input.InlineAffix>
                  </Input.Wrapper>
                </Input.Root>
                {errors.discount_amount && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.discount_amount.message}
                  </Hint.Root>
                )}
              </div>
            </div>

            <div className='ml-auto flex w-full max-w-[440px] flex-col gap-3'>
              <div className='grid grid-cols-[1fr_200px] items-center gap-3'>
                <Label.Root className='justify-self-end whitespace-nowrap text-right'>
                  Total Invoice Amount
                </Label.Root>
                <Input.Root size='small'>
                  <Input.Wrapper>
                    <Input.InlineAffix>{CURRENCY}</Input.InlineAffix>
                    <Input.Input
                      type='text'
                      inputMode='decimal'
                      placeholder='0'
                      readOnly
                      tabIndex={-1}
                      value={invoiceAmountDisplay}
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>
              <div className='grid grid-cols-[1fr_200px] items-center gap-3'>
                <Label.Root className='justify-self-end whitespace-nowrap text-right'>
                  Outstanding Amount
                </Label.Root>
                <Input.Root size='small'>
                  <Input.Wrapper>
                    <Input.InlineAffix>{CURRENCY}</Input.InlineAffix>
                    <Input.Input
                      type='text'
                      readOnly
                      tabIndex={-1}
                      value={outstandingDisplay}
                      placeholder='0'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className='flex-row gap-3'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              className='flex-1'
              onClick={onCancel}
            >
              Cancel
            </Button.Root>
            <Button.Root type='submit' className='flex-1'>
              Add
            </Button.Root>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
};

export default InvoiceConfirmModal;
