import React, { useCallback, useEffect, useRef, useState } from 'react';

import { updateProductFields } from '@/api/products';
import {
  PriceRangeField,
  SinglePriceField,
  JobPricingFields,
} from '@/components/products/products-pricing-variations';
import { syncJobPurchasePrices } from '@/components/products/products-job-pricing';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Textarea from '@/components/ui/textarea';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';

export const LABEL_CLASS = 'text-label-sm font-medium leading-5 text-text-sub-500 opacity-72';
export const VALUE_CLASS = 'text-label-sm font-medium leading-5 text-text-main-900';

export function EditableFieldShell({ label, children, className }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className={LABEL_CLASS}>{label}</span>
      <div className={cn('min-w-0', VALUE_CLASS)}>{children}</div>
    </div>
  );
}

export function activateEditField(onActivate) {
  return {
    onClick: onActivate,
    onKeyDown: (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onActivate();
      }
    },
    role: 'button',
    tabIndex: 0,
  };
}

export function ProductDetailEditField({
  label,
  fieldKey,
  editingField,
  onStartEdit,
  display,
  children,
  className,
}) {
  const isEditing = editingField === fieldKey;

  if (isEditing) {
    return (
      <EditableFieldShell label={label} className={className}>
        {children}
      </EditableFieldShell>
    );
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className={LABEL_CLASS}>{label}</span>
      <EditableFieldWrapper editable className='flex min-w-0 cursor-pointer items-center'>
        <div
          className={cn('min-w-0 flex-1', VALUE_CLASS)}
          {...activateEditField(() => onStartEdit(fieldKey))}
        >
          {display}
        </div>
      </EditableFieldWrapper>
    </div>
  );
}

export function ReadOnlyPriceField({ label, value, onEdit, editable = Boolean(onEdit) }) {
  if (!editable) {
    return <ReadOnlyDisplayField label={label} value={value} />;
  }

  return (
    <div className='flex min-w-0 flex-col gap-1'>
      <span className={LABEL_CLASS}>{label}</span>
      <EditableFieldWrapper editable className='flex min-w-0 cursor-pointer items-center'>
        <div className={cn('min-w-0 flex-1', VALUE_CLASS)} {...activateEditField(onEdit)}>
          {value}
        </div>
      </EditableFieldWrapper>
    </div>
  );
}

export function normalizeGstDraft(value) {
  return String(value ?? '')
    .replaceAll('%', '')
    .trim();
}

export function ReadOnlyDisplayField({ label, value }) {
  return (
    <div className='flex min-w-0 flex-col gap-1'>
      <span className={LABEL_CLASS}>{label}</span>
      <span className={VALUE_CLASS}>{value}</span>
    </div>
  );
}

export function useProductFieldSave(productId, onProductUpdated) {
  const [savingKey, setSavingKey] = useState(null);

  const saveFields = useCallback(
    async (fieldKey, payload, { successMessage = 'Saved' } = {}) => {
      if (!productId) return false;
      setSavingKey(fieldKey);
      try {
        const result = await updateProductFields(productId, payload);
        onProductUpdated?.(result.product);
        if (successMessage) showSuccessToast(successMessage);
        return true;
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to save changes.' });
        return false;
      } finally {
        setSavingKey(null);
      }
    },
    [onProductUpdated, productId],
  );

  return { saveFields, savingKey };
}

export function useEditingField(productId) {
  const [editingField, setEditingField] = useState(null);

  useEffect(() => {
    setEditingField(null);
  }, [productId]);

  const startEdit = useCallback((fieldKey) => setEditingField(fieldKey), []);
  const endEdit = useCallback(() => setEditingField(null), []);

  return { editingField, startEdit, endEdit };
}

export function EditTextInput({ value, placeholder, onSave, onEndEdit, autoFocus = true }) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const commit = async () => {
    const trimmed = draft.trim();
    await onSave(trimmed);
    onEndEdit();
  };

  return (
    <Input.Root size='medium'>
      <Input.Wrapper>
        <Input.Input
          ref={inputRef}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              inputRef.current?.blur();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              onEndEdit();
            }
          }}
        />
      </Input.Wrapper>
    </Input.Root>
  );
}

export function EditTextareaInput({ value, placeholder, onSave, onEndEdit }) {
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const commit = async () => {
    await onSave(draft.trim());
    onEndEdit();
  };

  return (
    <Textarea.Root
      ref={textareaRef}
      size='medium'
      value={draft}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onEndEdit();
        }
      }}
      rows={4}
    />
  );
}

export function EditSinglePriceInput({
  price,
  label = 'Price',
  requirePrice = false,
  onSave,
  onEndEdit,
}) {
  const initial = price ?? '';
  const [draft, setDraft] = useState(initial);

  useEffect(() => {
    setDraft(price ?? '');
  }, [price]);

  const handleSave = async () => {
    const value = String(draft ?? '').trim();
    const saved = await onSave({
      minPurchasePrice: value,
      maxPurchasePrice: value,
    });
    if (saved !== false) onEndEdit();
  };

  return (
    <div className='flex flex-col gap-3'>
      <SinglePriceField
        label={label}
        value={draft}
        onChange={setDraft}
        required={requirePrice}
        placeholder='Enter price'
      />
      <div className='flex items-center gap-2'>
        <Button.Root
          type='button'
          variant='primary'
          mode='filled'
          size='xsmall'
          onClick={handleSave}
        >
          Save
        </Button.Root>
        <Button.Root type='button' variant='neutral' mode='ghost' size='xsmall' onClick={onEndEdit}>
          Cancel
        </Button.Root>
      </div>
    </div>
  );
}

export function EditPriceRangeInput({
  minPurchasePrice,
  maxPurchasePrice,
  minSellingPrice,
  maxSellingPrice,
  requirePrices = false,
  onSave,
  onEndEdit,
}) {
  const [draft, setDraft] = useState({
    minPurchasePrice: minPurchasePrice ?? '',
    maxPurchasePrice: maxPurchasePrice ?? '',
    minSellingPrice: minSellingPrice ?? '',
    maxSellingPrice: maxSellingPrice ?? '',
  });

  useEffect(() => {
    setDraft({
      minPurchasePrice: minPurchasePrice ?? '',
      maxPurchasePrice: maxPurchasePrice ?? '',
      minSellingPrice: minSellingPrice ?? '',
      maxSellingPrice: maxSellingPrice ?? '',
    });
  }, [maxPurchasePrice, maxSellingPrice, minPurchasePrice, minSellingPrice]);

  const handleSave = async () => {
    const saved = await onSave(draft);
    if (saved !== false) onEndEdit();
  };

  return (
    <div className='flex flex-col gap-3'>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <PriceRangeField
          label='Purchase Price'
          minValue={draft.minPurchasePrice}
          maxValue={draft.maxPurchasePrice}
          onMinChange={(value) => setDraft((current) => ({ ...current, minPurchasePrice: value }))}
          onMaxChange={(value) => setDraft((current) => ({ ...current, maxPurchasePrice: value }))}
          required={requirePrices}
        />
        <PriceRangeField
          label='Selling Price'
          minValue={draft.minSellingPrice}
          maxValue={draft.maxSellingPrice}
          onMinChange={(value) => setDraft((current) => ({ ...current, minSellingPrice: value }))}
          onMaxChange={(value) => setDraft((current) => ({ ...current, maxSellingPrice: value }))}
          required={requirePrices}
        />
      </div>
      <div className='flex items-center gap-2'>
        <Button.Root
          type='button'
          variant='primary'
          mode='filled'
          size='xsmall'
          onClick={handleSave}
        >
          Save
        </Button.Root>
        <Button.Root type='button' variant='neutral' mode='ghost' size='xsmall' onClick={onEndEdit}>
          Cancel
        </Button.Root>
      </div>
    </div>
  );
}

export function EditJobPriceInput({
  materialBasicRate,
  labourBaseRate,
  minPurchasePrice,
  maxPurchasePrice,
  minSellingPrice,
  maxSellingPrice,
  requirePrices = false,
  onSave,
  onEndEdit,
}) {
  const [draft, setDraft] = useState({
    materialBasicRate: materialBasicRate ?? '',
    labourBaseRate: labourBaseRate ?? '',
    minPurchasePrice: minPurchasePrice ?? '',
    maxPurchasePrice: maxPurchasePrice ?? '',
    minSellingPrice: minSellingPrice ?? '',
    maxSellingPrice: maxSellingPrice ?? '',
  });

  useEffect(() => {
    setDraft({
      materialBasicRate: materialBasicRate ?? '',
      labourBaseRate: labourBaseRate ?? '',
      minPurchasePrice: minPurchasePrice ?? '',
      maxPurchasePrice: maxPurchasePrice ?? '',
      minSellingPrice: minSellingPrice ?? '',
      maxSellingPrice: maxSellingPrice ?? '',
    });
  }, [
    labourBaseRate,
    materialBasicRate,
    maxPurchasePrice,
    maxSellingPrice,
    minPurchasePrice,
    minSellingPrice,
  ]);

  const handleSave = async () => {
    const synced = syncJobPurchasePrices(draft);
    const saved = await onSave(synced);
    if (saved !== false) onEndEdit();
  };

  return (
    <div className='flex flex-col gap-3'>
      <JobPricingFields
        materialRate={draft.materialBasicRate}
        labourRate={draft.labourBaseRate}
        totalRate={draft.minPurchasePrice || draft.maxPurchasePrice}
        onMaterialRateChange={(value) =>
          setDraft((current) => ({ ...current, materialBasicRate: value }))
        }
        onLabourRateChange={(value) =>
          setDraft((current) => ({ ...current, labourBaseRate: value }))
        }
        onTotalRateChange={(value) =>
          setDraft((current) => ({
            ...current,
            minPurchasePrice: value,
            maxPurchasePrice: value,
          }))
        }
        sellingMin={draft.minSellingPrice}
        sellingMax={draft.maxSellingPrice}
        onSellingMinChange={(value) =>
          setDraft((current) => ({ ...current, minSellingPrice: value }))
        }
        onSellingMaxChange={(value) =>
          setDraft((current) => ({ ...current, maxSellingPrice: value }))
        }
        requireRates={requirePrices}
      />
      <div className='flex items-center gap-2'>
        <Button.Root
          type='button'
          variant='primary'
          mode='filled'
          size='xsmall'
          onClick={handleSave}
        >
          Save
        </Button.Root>
        <Button.Root type='button' variant='neutral' mode='ghost' size='xsmall' onClick={onEndEdit}>
          Cancel
        </Button.Root>
      </div>
    </div>
  );
}

export function formatGstRate(value) {
  if (value == null || value === '') return '--';
  const normalized = String(value).trim();
  return normalized.endsWith('%') ? normalized : `${normalized}%`;
}

function formatMoqQuantity(value) {
  if (value == null || value === '') return '--';
  const qty = Number(value);
  if (!Number.isNaN(qty) && Number.isFinite(qty)) {
    return Number.isInteger(qty) ? String(qty) : String(qty);
  }
  return String(value).trim() || '--';
}

export function formatDetailMoq(product) {
  if (product.minOrderQty != null && product.minOrderQty !== '') {
    return formatMoqQuantity(product.minOrderQty);
  }

  if (product.moq == null || product.moq === '') return '--';

  const moq = String(product.moq).trim();
  const uom = String(product.uom || '').trim();
  if (!uom) return moq;

  const suffix = ` ${uom}`;
  if (moq.toLowerCase().endsWith(suffix.toLowerCase())) {
    const withoutUom = moq.slice(0, -suffix.length).trim();
    return withoutUom || moq;
  }

  return moq;
}

export function formatDetailUom(product) {
  const uom = String(product.uom || '').trim();
  return uom || '--';
}
