import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiArrowDownSLine, RiDeleteBinLine } from 'react-icons/ri';

import { PhotosVideoField } from '@/components/products/products-basic-upload-fields';
import {
  areJobRatesEqual,
  computeJobTotalRate,
  hasJobComponentRates,
} from '@/components/products/products-job-pricing';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Textarea from '@/components/ui/textarea';
import { cn } from '@/utils/cn';

export function PriceRangeField({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  suffix = '₹',
  className,
  required = false,
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Label.Root>
        {label}
        {required ? <Label.Asterisk /> : null}
      </Label.Root>
      <div className='flex gap-1'>
        <Input.Root size='medium' className='min-w-0 flex-1'>
          <Input.Wrapper>
            <Input.Input
              placeholder='Min'
              value={minValue}
              onChange={(e) => onMinChange(e.target.value)}
            />
            <Input.InlineAffix>{suffix}</Input.InlineAffix>
          </Input.Wrapper>
        </Input.Root>
        <Input.Root size='medium' className='min-w-0 flex-1'>
          <Input.Wrapper>
            <Input.Input
              placeholder='Max'
              value={maxValue}
              onChange={(e) => onMaxChange(e.target.value)}
            />
            <Input.InlineAffix>{suffix}</Input.InlineAffix>
          </Input.Wrapper>
        </Input.Root>
      </div>
    </div>
  );
}

export function SinglePriceField({
  label,
  value,
  onChange,
  suffix = '₹',
  className,
  required = false,
  placeholder = 'Enter rate',
  readOnly = false,
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Label.Root>
        {label}
        {required ? <Label.Asterisk /> : null}
      </Label.Root>
      <Input.Root size='medium' disabled={readOnly}>
        <Input.Wrapper>
          <Input.Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            readOnly={readOnly}
          />
          <Input.InlineAffix>{suffix}</Input.InlineAffix>
        </Input.Wrapper>
      </Input.Root>
    </div>
  );
}

function TotalRateField({ label, value, suffix = '₹', className }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Label.Root>{label}</Label.Root>
      <Input.Root size='medium' disabled className='opacity-100'>
        <Input.Wrapper>
          <Input.Input placeholder='--' value={value} disabled readOnly tabIndex={-1} />
          <Input.InlineAffix>{suffix}</Input.InlineAffix>
        </Input.Wrapper>
      </Input.Root>
    </div>
  );
}

export function JobPricingFields({
  materialRate,
  labourRate,
  totalRate,
  onMaterialRateChange,
  onLabourRateChange,
  onTotalRateChange,
  sellingMin,
  sellingMax,
  onSellingMinChange,
  onSellingMaxChange,
  requireRates = false,
  className,
}) {
  const hasComponents = hasJobComponentRates(materialRate, labourRate);
  const computedTotal = useMemo(
    () => computeJobTotalRate(materialRate, labourRate),
    [labourRate, materialRate],
  );

  const syncComputedTotal = useCallback(
    (nextMaterial, nextLabour) => {
      if (!hasJobComponentRates(nextMaterial, nextLabour)) return;

      const nextTotal = computeJobTotalRate(nextMaterial, nextLabour);
      if (!nextTotal || areJobRatesEqual(nextTotal, totalRate)) return;

      onTotalRateChange?.(nextTotal);
    },
    [onTotalRateChange, totalRate],
  );

  const handleMaterialRateChange = useCallback(
    (value) => {
      onMaterialRateChange?.(value);
      syncComputedTotal(value, labourRate);
    },
    [labourRate, onMaterialRateChange, syncComputedTotal],
  );

  const handleLabourRateChange = useCallback(
    (value) => {
      onLabourRateChange?.(value);
      syncComputedTotal(materialRate, value);
    },
    [materialRate, onLabourRateChange, syncComputedTotal],
  );

  const isDirectEdit = !hasComponents;
  const displayTotal = isDirectEdit ? totalRate : computedTotal;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <SinglePriceField
          label='Material Base Rate'
          value={materialRate}
          onChange={handleMaterialRateChange}
          required={requireRates && hasComponents}
        />
        <SinglePriceField
          label='Labour Base Rate'
          value={labourRate}
          onChange={handleLabourRateChange}
          required={requireRates && hasComponents}
        />
      </div>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        {isDirectEdit ? (
          <SinglePriceField
            label='Total Rate'
            value={displayTotal}
            onChange={onTotalRateChange}
            required={requireRates}
          />
        ) : (
          <TotalRateField label='Total Rate' value={displayTotal} />
        )}
        <PriceRangeField
          label='Selling Price'
          minValue={sellingMin}
          maxValue={sellingMax}
          onMinChange={onSellingMinChange}
          onMaxChange={onSellingMaxChange}
          required={requireRates}
        />
      </div>
    </div>
  );
}

export function VariationFormFields({
  variant,
  onUpdate,
  onAddFiles,
  onRemoveFile,
  requirePrices = false,
  hideName = false,
  pricingMode = 'product',
}) {
  return (
    <div className='flex flex-col gap-4'>
      {!hideName ? (
        <div className='flex flex-col gap-1'>
          <Label.Root>
            Name
            <Label.Asterisk />
          </Label.Root>
          <Input.Root size='medium'>
            <Input.Wrapper>
              <Input.Input
                value={variant.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder='Enter name'
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
      ) : null}

      <div className='flex flex-col gap-1'>
        <Label.Root>Description</Label.Root>
        <Textarea.Root
          size='medium'
          value={variant.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder='Type here....'
          rows={4}
        />
      </div>

      {pricingMode === 'job' ? (
        <JobPricingFields
          materialRate={variant.materialBasicRate}
          labourRate={variant.labourBaseRate}
          totalRate={variant.minPurchasePrice || variant.maxPurchasePrice}
          onMaterialRateChange={(value) => onUpdate({ materialBasicRate: value })}
          onLabourRateChange={(value) => onUpdate({ labourBaseRate: value })}
          onTotalRateChange={(value) =>
            onUpdate({ minPurchasePrice: value, maxPurchasePrice: value })
          }
          sellingMin={variant.minSellingPrice}
          sellingMax={variant.maxSellingPrice}
          onSellingMinChange={(value) => onUpdate({ minSellingPrice: value })}
          onSellingMaxChange={(value) => onUpdate({ maxSellingPrice: value })}
          requireRates={requirePrices}
        />
      ) : (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <PriceRangeField
            label='Purchase Price'
            minValue={variant.minPurchasePrice}
            maxValue={variant.maxPurchasePrice}
            onMinChange={(value) => onUpdate({ minPurchasePrice: value })}
            onMaxChange={(value) => onUpdate({ maxPurchasePrice: value })}
            required={requirePrices}
          />
          <PriceRangeField
            label='Selling Price'
            minValue={variant.minSellingPrice}
            maxValue={variant.maxSellingPrice}
            onMinChange={(value) => onUpdate({ minSellingPrice: value })}
            onMaxChange={(value) => onUpdate({ maxSellingPrice: value })}
            required={requirePrices}
          />
        </div>
      )}

      <PhotosVideoField
        label='Photos & Video (this variation)'
        files={variant.files || []}
        onAddFiles={(fileList) => onAddFiles(variant.id, fileList)}
        onRemoveFile={(fileId) => onRemoveFile(variant.id, fileId)}
        inputId={`file-input-${variant.id}`}
      />
    </div>
  );
}

function VariationAccordionItem({
  variant,
  index,
  isOpen,
  onToggle,
  onRemove,
  onUpdate,
  onAddFiles,
  onRemoveFile,
  onSave,
  isSaving = false,
  requirePrices = false,
  pricingMode = 'product',
}) {
  const title = variant.name?.trim() || `Variation ${index + 1}`;

  return (
    <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-weak-100 shadow-regular-sm'>
      <div className='flex items-center justify-between py-2 pl-5 pr-3'>
        <button
          type='button'
          onClick={onToggle}
          className='min-w-0 flex-1 truncate text-left text-label-sm font-medium text-text-main-900'
        >
          {title}
        </button>
        <div className='flex shrink-0 items-center gap-1.5'>
          {onSave ? (
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='xsmall'
              disabled={isSaving}
              onClick={(event) => {
                event.stopPropagation();
                onSave();
              }}
              className='h-7 min-w-[52px] px-2.5 text-label-xs shadow-regular-xs'
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Button.Root>
          ) : null}
          <CompactButton.Root
            type='button'
            variant='ghost'
            size='medium'
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            aria-label={`Remove ${title}`}
            className='p-0.5'
          >
            <CompactButton.Icon as={RiDeleteBinLine} />
          </CompactButton.Root>
          <CompactButton.Root
            type='button'
            variant='ghost'
            size='medium'
            onClick={onToggle}
            aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
            aria-expanded={isOpen}
            className='p-0.5'
          >
            <CompactButton.Icon
              as={RiArrowDownSLine}
              className={cn('transition-transform duration-200', isOpen && 'rotate-180')}
            />
          </CompactButton.Root>
        </div>
      </div>

      {isOpen ? (
        <div className='border border-stroke-soft-200 bg-bg-white-0 px-5 py-5'>
          <VariationFormFields
            variant={variant}
            onUpdate={onUpdate}
            onAddFiles={onAddFiles}
            onRemoveFile={onRemoveFile}
            requirePrices={requirePrices}
            hideName={Boolean(variant.optionKey?.trim())}
            pricingMode={pricingMode}
          />
        </div>
      ) : null}
    </div>
  );
}

function VariationsAccordionList({
  variations,
  onUpdate,
  onRemove,
  onAddFiles,
  onRemoveFile,
  onSave,
  getIsSaving,
  requirePrices = false,
  pricingMode = 'product',
}) {
  const [expandedId, setExpandedId] = useState(variations[0]?.id ?? null);

  useEffect(() => {
    if (variations.length === 0) {
      setExpandedId(null);
      return;
    }
    if (!expandedId || !variations.some((item) => item.id === expandedId)) {
      setExpandedId(variations[variations.length - 1]?.id ?? null);
    }
  }, [variations, expandedId]);

  const handleToggle = useCallback((variantId) => {
    setExpandedId((current) => (current === variantId ? null : variantId));
  }, []);

  return (
    <div className='flex flex-col gap-3'>
      {variations.map((variant, index) => (
        <VariationAccordionItem
          key={variant.id}
          variant={variant}
          index={index}
          isOpen={expandedId === variant.id}
          onToggle={() => handleToggle(variant.id)}
          onRemove={() => onRemove(variant)}
          onUpdate={(patch) => onUpdate(variant.id, patch)}
          onAddFiles={onAddFiles}
          onRemoveFile={onRemoveFile}
          onSave={onSave ? () => onSave(variant.id) : undefined}
          isSaving={getIsSaving?.(variant.id) ?? false}
          requirePrices={requirePrices}
          pricingMode={pricingMode}
        />
      ))}
    </div>
  );
}

export function VariationsListContent({
  variations,
  onUpdate,
  onRemove,
  onAddFiles,
  onRemoveFile,
  alwaysAccordion = false,
  onSave,
  getIsSaving,
  requirePrices = false,
  pricingMode = 'product',
}) {
  if (variations.length === 0) {
    return (
      <p className='text-paragraph-sm text-text-soft-400'>
        Add variation options above or use &quot;Add More Variation&quot; to create one.
      </p>
    );
  }

  if (variations.length === 1 && !alwaysAccordion) {
    const variant = variations[0];
    return (
      <VariationFormFields
        variant={variant}
        onUpdate={(patch) => onUpdate(variant.id, patch)}
        onAddFiles={onAddFiles}
        onRemoveFile={onRemoveFile}
        requirePrices={requirePrices}
        pricingMode={pricingMode}
      />
    );
  }

  return (
    <VariationsAccordionList
      variations={variations}
      onUpdate={onUpdate}
      onRemove={onRemove}
      onAddFiles={onAddFiles}
      onRemoveFile={onRemoveFile}
      onSave={onSave}
      getIsSaving={getIsSaving}
      requirePrices={requirePrices}
      pricingMode={pricingMode}
    />
  );
}
