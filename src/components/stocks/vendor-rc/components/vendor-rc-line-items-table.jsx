import React, { useCallback, useMemo } from 'react';
import { RiDeleteBin6Line } from 'react-icons/ri';

import { InlineFieldInput, InlineFieldSelect } from '@/components/stocks/stocks-helper';
import * as Button from '@/components/ui/button';

const ROW_GRID =
  'grid min-h-12 min-w-[920px] items-center gap-0 border-b border-stroke-soft-200 last:border-b-0 [grid-template-columns:minmax(280px,2.4fr)_minmax(90px,0.85fr)_minmax(90px,0.65fr)_minmax(90px,0.95fr)_minmax(90px,0.55fr)_minmax(72px,0.75fr)_40px]';

function computeEffectiveRate(rcRate, taxPercent) {
  const r = Number.parseFloat(String(rcRate).replaceAll(',', ''));
  const t = Number.parseFloat(String(taxPercent).replaceAll(',', ''));
  if (!Number.isFinite(r)) return '';
  if (!Number.isFinite(t) || t === 0) return r.toFixed(2);
  return (r * (1 + t / 100)).toFixed(2);
}

const VendorRcLineItemsTable = ({ lineItems = [], onChange, productOptions = [] }) => {
  const updateRow = useCallback(
    (id, patch, options = {}) => {
      onChange(
        lineItems.map((row) => {
          if (row.id !== id) return row;
          const merged = { ...row, ...patch };
          if ('rcRate' in patch || 'taxPercent' in patch) {
            merged.effectiveRate = computeEffectiveRate(merged.rcRate, merged.taxPercent);
          }
          return merged;
        }),
        options,
      );
    },
    [lineItems, onChange],
  );

  const patchLocal = useCallback(
    (id, patch) => {
      updateRow(id, patch, { persist: false });
    },
    [updateRow],
  );

  const commitRow = useCallback(
    (id, patch) => {
      updateRow(id, patch, { immediate: true, persist: true });
    },
    [updateRow],
  );

  const removeRow = useCallback(
    (id) => {
      onChange(
        lineItems.filter((row) => row.id !== id),
        { immediate: true, persist: true },
      );
    },
    [lineItems, onChange],
  );

  const useProductSelect = Array.isArray(productOptions) && productOptions.length > 0;

  const selectedProductValues = useMemo(() => {
    const selected = new Set();
    for (const row of lineItems) {
      const value = String(row?.itemCode || row?.product || '').trim();
      if (value) selected.add(value);
    }
    return selected;
  }, [lineItems]);

  const optionsForRow = useCallback(
    (row) => {
      if (!useProductSelect) return [];
      const current = String(row?.itemCode || row?.product || '').trim();
      return productOptions.filter((option) => {
        const value = String(option?.value ?? '').trim();
        if (!value) return false;
        if (value === current) return true;
        return !selectedProductValues.has(value);
      });
    },
    [productOptions, selectedProductValues, useProductSelect],
  );

  return (
    <div className='overflow-x-auto rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
      <div className='min-w-full'>
        <div className={`${ROW_GRID} bg-bg-weak-50`}>
          <div className='px-2 py-2 text-left text-label-sm font-medium whitespace-nowrap text-text-soft-400'>
            Product
          </div>
          <div className='px-2 py-2 text-left text-label-sm font-medium text-text-soft-400'>
            RC Rate (₹)
          </div>
          <div className='px-2 py-2 text-left text-label-sm font-medium whitespace-nowrap text-text-soft-400'>
            Tax (%)
          </div>
          <div className='px-2 py-2 text-left text-label-sm font-medium whitespace-nowrap text-text-soft-400'>
            Effective Rate (₹)
          </div>
          <div className='px-2 py-2 text-left text-label-sm font-medium whitespace-nowrap text-text-soft-400'>
            MOQ
          </div>
          <div className='px-2 py-2 text-left text-label-sm font-medium whitespace-nowrap text-text-soft-400'>
            Remark
          </div>
          <div className='px-1 py-2' />
        </div>

        {lineItems.map((row) => (
          <div key={row.id} className={ROW_GRID}>
            <div className='px-1 py-1'>
              {useProductSelect ? (
                <InlineFieldSelect
                  value={row.itemCode || row.product}
                  size='small'
                  triggerClassName='min-w-0 text-text-main-900'
                  matchTriggerWidth={false}
                  contentClassName='w-[400px] min-w-[400px] max-w-[min(100vw-24px,480px)]'
                  onValueChange={(value) => {
                    const opt = productOptions.find((option) => option.value === value);
                    const hadProduct = Boolean(String(row?.itemCode || row?.product || '').trim());
                    updateRow(
                      row.id,
                      {
                        itemCode: value,
                        product: opt?.label || value,
                      },
                      {
                        immediate: true,
                        persist: true,
                        toast: hadProduct ? undefined : 'Item added.',
                      },
                    );
                  }}
                  options={optionsForRow(row)}
                  placeholder='Select product'
                />
              ) : (
                <InlineFieldInput
                  value={row.product}
                  onChange={(event) =>
                    patchLocal(row.id, {
                      product: event.target.value,
                      itemCode: event.target.value,
                    })
                  }
                  onBlur={(event) =>
                    commitRow(row.id, {
                      product: event.target.value,
                      itemCode: event.target.value,
                    })
                  }
                  placeholder='Product'
                />
              )}
            </div>
            <div className='px-1 py-1'>
              <InlineFieldInput
                type='number'
                min={0}
                value={row.rcRate}
                onChange={(event) => patchLocal(row.id, { rcRate: event.target.value })}
                onBlur={(event) => commitRow(row.id, { rcRate: event.target.value })}
                placeholder='0'
              />
            </div>
            <div className='px-1 py-1'>
              <InlineFieldInput
                type='number'
                min={0}
                value={row.taxPercent}
                onChange={(event) => patchLocal(row.id, { taxPercent: event.target.value })}
                onBlur={(event) => commitRow(row.id, { taxPercent: event.target.value })}
                placeholder='0'
              />
            </div>
            <div className='px-1 py-1'>
              <InlineFieldInput
                type='number'
                min={0}
                value={row.effectiveRate}
                onChange={(event) => patchLocal(row.id, { effectiveRate: event.target.value })}
                onBlur={(event) => commitRow(row.id, { effectiveRate: event.target.value })}
                placeholder='0'
              />
            </div>
            <div className='px-1 py-1'>
              <InlineFieldInput
                type='number'
                min={0}
                value={row.moq}
                onChange={(event) => patchLocal(row.id, { moq: event.target.value })}
                onBlur={(event) => commitRow(row.id, { moq: event.target.value })}
                placeholder='0'
              />
            </div>
            <div className='px-1 py-1'>
              <InlineFieldInput
                value={row.remark}
                onChange={(event) => patchLocal(row.id, { remark: event.target.value })}
                onBlur={(event) => commitRow(row.id, { remark: event.target.value })}
                placeholder='—'
              />
            </div>
            <div className='flex items-center justify-center px-0 py-1'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='ghost'
                size='xsmall'
                className='text-text-sub-600 hover:text-red-600'
                onClick={() => removeRow(row.id)}
                aria-label='Remove line'
              >
                <Button.Icon as={RiDeleteBin6Line} />
              </Button.Root>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VendorRcLineItemsTable;
