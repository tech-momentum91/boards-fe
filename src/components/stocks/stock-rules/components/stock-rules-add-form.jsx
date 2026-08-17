import React, { useCallback, useMemo, useState } from 'react';
import {
  RiDeleteBin6Line,
  RiInformationLine,
  RiListCheck2,
  RiStickyNoteLine,
} from 'react-icons/ri';

import {
  STOCKS_RULE_CONSUMPTION_OPTIONS,
  STOCKS_RULE_FREQUENCY_OPTIONS,
} from '@/components/stocks/constants';
import { InlineFieldInput, InlineFieldSelect } from '@/components/stocks/stocks-helper';
import StocksSearchableCategorySelect from '@/components/stocks/shared/stocks-searchable-category-select';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/multi-select';
import * as Textarea from '@/components/ui/textarea';

const FieldLabel = ({ children, required }) => (
  <span className='flex items-center gap-px text-label-sm font-medium text-text-main-900'>
    {children}
    {required ? <span className='text-text-soft-400'>*</span> : null}
  </span>
);

const ROW_GRID =
  'pl-2 grid min-h-12 items-center gap-0 border-b border-stroke-soft-200 last:border-b-0 [grid-template-columns:minmax(140px,1.2fr)_minmax(72px,0.75fr)_minmax(88px,0.85fr)_minmax(88px,0.85fr)_minmax(110px,1fr)_minmax(100px,0.95fr)_52px_80px_40px]';

function StockRuleAddLineItemsTable({ category, ruleRows, onRuleRowsChange, productOptions }) {
  const updateRow = useCallback(
    (draftKey, patch) => {
      onRuleRowsChange(
        ruleRows.map((row) => {
          if (row.draftKey !== draftKey) return row;
          const merged = { ...row, ...patch };
          if ('productValue' in patch && patch.productValue) {
            const opt = productOptions.find((o) => o.value === patch.productValue);
            if (opt) {
              merged.product = opt.label;
              merged.unit = opt.unit || merged.unit;
            }
          }
          return merged;
        }),
      );
    },
    [ruleRows, onRuleRowsChange, productOptions],
  );

  const removeRow = useCallback(
    (draftKey) => {
      onRuleRowsChange(ruleRows.filter((row) => row.draftKey !== draftKey));
    },
    [ruleRows, onRuleRowsChange],
  );

  return (
    <div className='overflow-x-auto rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
      <div className='min-w-full'>
        <div className={`${ROW_GRID} bg-bg-weak-50`}>
          <div className='px-2 py-2 text-left text-label-sm font-medium text-text-sub-600'>
            Product
          </div>
          <div className='px-2 py-2 text-left text-label-sm  font-medium text-text-sub-600'>
            Min
          </div>
          <div className='px-2 py-2 text-left text-label-sm  font-medium text-text-sub-600'>
            Trigger
          </div>
          <div className='px-2 py-2 text-left text-label-sm  font-medium text-text-sub-600'>
            Target
          </div>
          <div className='px-2 py-2 text-left text-label-sm  font-medium text-text-sub-600'>
            Consumption
          </div>
          <div className='px-2 py-2 text-left text-label-sm  font-medium text-text-sub-600'>
            Frequency
          </div>
          <div className='px-2 py-2 text-center text-label-sm  font-medium text-text-sub-600'>
            FIFO
          </div>
          <div className='px-2 py-2 text-center text-label-sm  font-medium text-text-sub-600'>
            Critical
          </div>
          <div className='px-1 py-2' />
        </div>

        {ruleRows.map((row) => {
          const isCatalogRow = Boolean(
            row.productValue && productOptions.some((o) => o.value === row.productValue),
          );
          const selectedElsewhere = new Set(
            ruleRows
              .filter((candidate) => candidate.draftKey !== row.draftKey)
              .map((candidate) => String(candidate.productValue || '').trim())
              .filter(Boolean),
          );
          const rowProductOptions = productOptions.filter((option) => {
            const value = String(option?.value ?? '').trim();
            if (!value) return false;
            if (value === row.productValue) return true;
            return !selectedElsewhere.has(value);
          });
          return (
            <div key={row.draftKey} className={ROW_GRID}>
              <div className='px-2 py-2.5'>
                {isCatalogRow ? (
                  <span className='paragraph-small text-text-sub-600'>{row.product}</span>
                ) : (
                  <InlineFieldSelect
                    value={row.productValue}
                    size='small'
                    onValueChange={(value) => updateRow(row.draftKey, { productValue: value })}
                    options={rowProductOptions}
                    placeholder='Select product'
                  />
                )}
              </div>
              <div className='px-2 py-2.5'>
                <InlineFieldInput
                  type='number'
                  min={0}
                  value={row.min}
                  onChange={(event) => updateRow(row.draftKey, { min: event.target.value })}
                  placeholder='—'
                />
              </div>
              <div className='px-2 py-2.5'>
                <InlineFieldInput
                  type='number'
                  min={0}
                  value={row.trigger}
                  onChange={(event) => updateRow(row.draftKey, { trigger: event.target.value })}
                  placeholder='—'
                />
              </div>
              <div className='px-2 py-2.5'>
                <InlineFieldInput
                  type='number'
                  min={0}
                  value={row.target}
                  onChange={(event) => updateRow(row.draftKey, { target: event.target.value })}
                  placeholder='—'
                />
              </div>
              <div className='px-2 py-2.5'>
                <InlineFieldSelect
                  value={row.consumption}
                  onValueChange={(value) => updateRow(row.draftKey, { consumption: value })}
                  options={STOCKS_RULE_CONSUMPTION_OPTIONS}
                />
              </div>
              <div className='px-2 py-2.5'>
                <InlineFieldSelect
                  value={row.frequency}
                  onValueChange={(value) => updateRow(row.draftKey, { frequency: value })}
                  options={STOCKS_RULE_FREQUENCY_OPTIONS}
                />
              </div>
              <div className='flex items-center justify-center px-2 py-2.5'>
                <Checkbox.Root
                  checked={row.fifo === true}
                  onCheckedChange={(checked) => updateRow(row.draftKey, { fifo: checked === true })}
                  aria-label='FIFO (first in, first out)'
                />
              </div>
              <div className='flex items-center justify-center px-2 py-2.5'>
                <Checkbox.Root
                  checked={row.critical === true}
                  onCheckedChange={(checked) =>
                    updateRow(row.draftKey, { critical: checked === true })
                  }
                />
              </div>
              <div className='flex items-center justify-center px-2 py-2.5'>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='ghost'
                  size='xsmall'
                  className='text-text-sub-600 hover:text-red-600'
                  onClick={() => removeRow(row.draftKey)}
                  aria-label='Remove line'
                >
                  <Button.Icon as={RiDeleteBin6Line} />
                </Button.Root>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const StockRulesAddForm = ({
  centers,
  onCentersChange,
  centerOptions = [],
  centersLoading = false,
  category,
  onCategoryChange,
  ruleRows,
  onRuleRowsChange,
  notes,
  onNotesChange,
  onAddRuleRow,
  isLoadingProducts = false,
  productsError = null,
  categoryProductOptions = [],
  categoryOptions = [],
}) => {
  const [showNotes, setShowNotes] = useState(false);
  const lineItemsReady = Boolean(category && Array.isArray(centers) && centers.length > 0);

  const productOptions = useMemo(() => {
    const fromApi = (Array.isArray(categoryProductOptions) ? categoryProductOptions : []).map(
      (opt) => ({
        value: opt.value,
        label: opt.label,
        unit: opt.unit || '',
      }),
    );
    const seen = new Set(fromApi.map((o) => o.value));
    for (const row of ruleRows) {
      if (!row.productValue || seen.has(row.productValue)) continue;
      seen.add(row.productValue);
      fromApi.push({
        value: row.productValue,
        label: row.product || row.productValue,
        unit: row.unit || '',
      });
    }
    return fromApi;
  }, [categoryProductOptions, ruleRows]);

  return (
    <div className='flex flex-col gap-5'>
      <section className='flex flex-col gap-3'>
        <div className='flex items-center gap-2 text-label-md font-medium text-text-sub-500'>
          <RiInformationLine className='size-5 shrink-0 text-text-sub-600' />
          Basic Information
        </div>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <div className='flex flex-col gap-1'>
            <FieldLabel required>Center</FieldLabel>
            <MultiSelect
              options={centerOptions}
              value={Array.isArray(centers) ? centers : []}
              onValueChange={onCentersChange}
              placeholder={centersLoading ? 'Loading centers…' : 'Select'}
              size='medium'
              variant='default'
              disabled={centersLoading || centerOptions.length === 0}
            />
          </div>
          <div className='flex flex-col gap-1'>
            <FieldLabel required>Category</FieldLabel>
            <StocksSearchableCategorySelect
              value={category}
              onValueChange={onCategoryChange}
              options={categoryOptions}
              size='medium'
              variant='default'
            />
          </div>
        </div>
      </section>

      <section className='flex flex-col gap-3'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2 text-label-md font-medium text-text-sub-500'>
            <RiListCheck2 className='size-5 shrink-0 text-text-sub-600' />
            Product Line Items
          </div>
          {lineItemsReady ? (
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={onAddRuleRow}
              disabled={isLoadingProducts}
            >
              Add
            </Button.Root>
          ) : null}
        </div>
        {productsError ? (
          <p className='text-paragraph-sm text-error-base'>{productsError}</p>
        ) : null}
        {lineItemsReady ? (
          isLoadingProducts ? (
            <div className='flex flex-col items-center justify-center gap-1 rounded-xl bg-bg-weak-100 py-10 text-center'>
              <p className='text-label-md font-medium text-text-sub-500'>Loading products…</p>
            </div>
          ) : ruleRows.length === 0 ? (
            <div className='flex flex-col items-center justify-center gap-1 rounded-xl bg-bg-weak-100 py-10 text-center'>
              <p className='text-label-md font-medium text-text-sub-500'>
                No products in this category.
              </p>
              <p className='text-label-xs font-medium text-text-soft-400'>
                Add a line or choose another category.
              </p>
            </div>
          ) : (
            <StockRuleAddLineItemsTable
              category={category}
              ruleRows={ruleRows}
              onRuleRowsChange={onRuleRowsChange}
              productOptions={productOptions}
            />
          )
        ) : (
          <div className='flex flex-col items-center justify-center gap-1 rounded-xl bg-bg-weak-100 py-10 text-center'>
            <p className='text-label-md font-medium text-text-sub-500'>No products yet.</p>
            <p className='text-label-xs font-medium text-text-soft-400'>
              Choose a center and category to get started.
            </p>
          </div>
        )}
      </section>

      <section className='flex flex-col gap-2'>
        <div className='flex items-start gap-2 rounded-lg px-2 py-2'>
          {!showNotes ? (
            <Button.Root
              type='button'
              mode='borderless'
              size='small'
              className='flex items-center gap-2 text-text-soft-400'
              onClick={() => setShowNotes(!showNotes)}
            >
              <RiStickyNoteLine className=' size-5 shrink-0' />
              {showNotes ? 'Hide Notes' : 'Add Notes'}
            </Button.Root>
          ) : null}

          {showNotes ? (
            <Textarea.Root
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder='Add notes'
              rows={3}
              containerClassName='min-h-[88px]'
            />
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default StockRulesAddForm;
