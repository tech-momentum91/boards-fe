import React, { useCallback, useMemo, useState } from 'react';
import { RiCheckLine, RiCloseLine, RiLoader4Line } from 'react-icons/ri';

import { applySelectedProductMetaFields, metaFieldKey } from '@/api/productMetaFields';
import { getProduct } from '@/api/products';
import { PackageDetailFieldGrid } from '@/components/products/product-package/product-package-detail-fields';
import { ReadOnlyDisplayField } from '@/components/products/product-detail-editable-fields/shared';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import { cn } from '@/utils/cn';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

function SuggestionChip({ label, disabled, onAccept, onReject }) {
  return (
    <div className='group flex min-w-0 items-center gap-1'>
      <button
        type='button'
        disabled={disabled}
        onClick={onAccept}
        title='Click to accept'
        className={cn(
          'inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-3 py-1.5 text-left transition',
          'bg-gradient-to-r from-primary-lighter via-primary-alpha-10 to-primary-light/40',
          'text-label-sm font-medium text-text-strong-950',
          'ring-1 ring-inset ring-primary-base/25',
          'hover:from-primary-light/50 hover:via-primary-alpha-10 hover:to-primary-lighter hover:ring-primary-base/45',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        <span className='min-w-0 flex-1 truncate'>{label}</span>
        <RiCheckLine className='size-3.5 shrink-0 text-primary-base' aria-hidden />
      </button>
      <CompactButton.Root
        type='button'
        variant='ghost'
        size='medium'
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onReject?.();
        }}
        className='shrink-0 text-error-base hover:text-error-dark'
        aria-label={`Reject ${label}`}
      >
        <CompactButton.Icon as={RiCloseLine} />
      </CompactButton.Root>
    </div>
  );
}

export function ProductDetailMetaFieldsSection({
  product,
  suggestions = [],
  isSuggesting = false,
  onSuggestionsChange,
  onProductUpdated,
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [savingKey, setSavingKey] = useState(null);

  const metaFields = Array.isArray(product?.metaFields) ? product.metaFields : [];
  const pendingSuggestions = useMemo(() => {
    const savedKeys = new Set(metaFields.map(metaFieldKey));
    return (suggestions || []).filter((row) => !savedKeys.has(metaFieldKey(row)));
  }, [metaFields, suggestions]);

  const refreshProduct = useCallback(async () => {
    if (!product?.id) return null;
    const refreshed = await getProduct(product.id);
    if (refreshed) onProductUpdated?.(refreshed);
    return refreshed;
  }, [onProductUpdated, product?.id]);

  const handleDismissAll = useCallback(() => {
    onSuggestionsChange?.([]);
  }, [onSuggestionsChange]);

  const handleRejectOne = useCallback(
    (row) => {
      const key = metaFieldKey(row);
      onSuggestionsChange?.(pendingSuggestions.filter((item) => metaFieldKey(item) !== key));
    },
    [onSuggestionsChange, pendingSuggestions],
  );

  const handleAcceptRows = useCallback(
    async (rows) => {
      if (!product?.id || !rows?.length || isSaving) return;

      setIsSaving(true);
      setSavingKey(rows.length === 1 ? metaFieldKey(rows[0]) : 'all');
      try {
        await applySelectedProductMetaFields(product.id, rows, { replaceExisting: false });
        await refreshProduct();
        const acceptedKeys = new Set(rows.map(metaFieldKey));
        onSuggestionsChange?.(
          pendingSuggestions.filter((item) => !acceptedKeys.has(metaFieldKey(item))),
        );
        showSuccessToast(rows.length === 1 ? 'Meta field added' : 'Meta fields added');
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to add meta fields.' });
      } finally {
        setIsSaving(false);
        setSavingKey(null);
      }
    },
    [isSaving, onSuggestionsChange, pendingSuggestions, product?.id, refreshProduct],
  );

  const hasSuggestions = pendingSuggestions.length > 0;

  return (
    <div className='flex flex-col gap-4'>
      {isSuggesting ? (
        <div className='flex items-center gap-2 rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-label-sm text-text-sub-600'>
          <RiLoader4Line className='size-4 animate-spin text-primary-base' aria-hidden />
          Generating meta field suggestions…
        </div>
      ) : null}

      {hasSuggestions ? (
        <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-3'>
          <div className='mb-3 flex items-center justify-between gap-3'>
            <p className='text-label-sm font-semibold text-text-strong-950'>
              {pendingSuggestions.length} suggestion
              {pendingSuggestions.length === 1 ? '' : 's'} available
            </p>
            <div className='flex items-center gap-1'>
              <Button.Root
                type='button'
                variant='primary'
                mode='filled'
                size='xsmall'
                disabled={isSaving}
                onClick={() => handleAcceptRows(pendingSuggestions)}
              >
                {savingKey === 'all' ? 'Saving…' : 'Accept all'}
              </Button.Root>
              <CompactButton.Root
                type='button'
                variant='ghost'
                size='medium'
                disabled={isSaving}
                onClick={handleDismissAll}
                aria-label='Dismiss suggestions'
              >
                <CompactButton.Icon as={RiCloseLine} />
              </CompactButton.Root>
            </div>
          </div>

          <PackageDetailFieldGrid columns={4}>
            {pendingSuggestions.map((row) => {
              const key = metaFieldKey(row);
              return (
                <div key={key} className='flex min-w-0 flex-col gap-1.5'>
                  <p className='text-label-xs font-medium text-text-sub-600'>{row.label}</p>
                  <SuggestionChip
                    label={row.value}
                    disabled={isSaving}
                    onAccept={() => handleAcceptRows([row])}
                    onReject={() => handleRejectOne(row)}
                  />
                </div>
              );
            })}
          </PackageDetailFieldGrid>
        </div>
      ) : null}

      {metaFields.length === 0 ? (
        !hasSuggestions && !isSuggesting ? (
          <p className='whitespace-pre-wrap text-label-sm font-medium leading-5 text-text-soft-400'>
            No meta fields have been added for this item.
          </p>
        ) : null
      ) : (
        <PackageDetailFieldGrid columns={4}>
          {metaFields.map((row, index) => (
            <ReadOnlyDisplayField
              key={`${row.field || row.label}-${index}`}
              label={row.label}
              value={row.value}
            />
          ))}
        </PackageDetailFieldGrid>
      )}
    </div>
  );
}
