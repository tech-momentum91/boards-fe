import React, { useCallback, useState } from 'react';
import { LuExpand } from 'react-icons/lu';
import { RiExpandDiagonalLine, RiExpandUpDownFill } from 'react-icons/ri';

import ExpandableClampText from '@/components/boq/shared/expandable-clamp-text';
import {
  formatBoqPriceRangeTooltip,
  formatBoqRupeeAmount,
} from '@/components/boq/boq-templates/components/boq-template-product-master-utils';
import { isBoqProductAlreadyAdded } from '@/components/boq/boq-templates/components/boq-template-products-utils';
import { PRODUCTS_TAB_IDS } from '@/components/products/constants';
import * as Badge from '@/components/ui/badge';
import * as Checkbox from '@/components/ui/checkbox';
import * as CompactButton from '@/components/ui/compact-button';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

const TABLE_GRID_CLASS =
  'grid items-stretch [grid-template-columns:minmax(200px,220px)_minmax(108px,128px)_minmax(180px,1fr)_minmax(120px,150px)_minmax(120px,150px)_76px_112px_112px]';

const TOOLTIP_CONTENT_CLASS = 'z-[70] max-w-[320px]';

const SkeletonBar = ({ className }) => (
  <div className={cn('animate-pulse rounded-md bg-bg-weak-50', className)} />
);

/** Loading placeholder that mirrors the product-master section + table layout. */
export function BoqTemplateProductMasterProductsSkeleton({ sectionCount = 2, rowCount = 5 }) {
  return (
    <div
      className='flex w-max min-w-full flex-col gap-6'
      aria-busy='true'
      aria-label='Loading products'
    >
      {Array.from({ length: sectionCount }).map((_, sectionIndex) => (
        <section
          key={`section-${sectionIndex}`}
          className='flex w-[1280px] max-w-none shrink-0 flex-col'
        >
          <div className='flex items-center gap-2.5 py-3'>
            <SkeletonBar className='h-8 w-36 rounded-lg' />
            <div className='h-px min-w-0 flex-1 bg-stroke-soft-200' aria-hidden />
          </div>

          <div className='w-[1280px] max-w-none shrink-0 overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
            <div className={cn(TABLE_GRID_CLASS, 'border-b border-stroke-soft-200 bg-bg-weak-50')}>
              <div className='flex items-center gap-3 border-r border-black/[0.08] px-3 py-2'>
                <SkeletonBar className='size-4 shrink-0 rounded' />
                <SkeletonBar className='h-4 w-12' />
              </div>
              <div className='flex items-center border-r border-black/[0.08] px-3 py-2'>
                <SkeletonBar className='h-4 w-10' />
              </div>
              <div className='flex min-w-0 items-center border-r border-black/[0.08] px-3 py-2'>
                <SkeletonBar className='h-4 w-24' />
              </div>
              <div className='flex items-center border-r border-black/[0.08] px-3 py-2'>
                <SkeletonBar className='h-4 w-12' />
              </div>
              <div className='flex items-center border-r border-black/[0.08] px-3 py-2'>
                <SkeletonBar className='h-4 w-12' />
              </div>
              <div className='flex items-center border-r border-black/[0.08] px-3 py-2'>
                <SkeletonBar className='h-4 w-8' />
              </div>
              <div className='flex items-center justify-end border-r border-black/[0.08] px-3 py-2'>
                <SkeletonBar className='h-4 w-14' />
              </div>
              <div className='flex items-center justify-end px-3 py-2'>
                <SkeletonBar className='h-4 w-14' />
              </div>
            </div>

            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <div
                key={`row-${sectionIndex}-${rowIndex}`}
                className={cn(
                  TABLE_GRID_CLASS,
                  'border-b border-[#ededed] bg-bg-white-0 last:border-b-0',
                )}
              >
                <div className='flex items-start gap-3 border-r border-black/[0.07] px-3 py-3'>
                  <SkeletonBar className='mt-0.5 size-4 shrink-0 rounded' />
                  <SkeletonBar className='size-8 shrink-0 rounded' />
                  <div className='flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5'>
                    <SkeletonBar className='h-4 w-3/4' />
                    <SkeletonBar className='h-4 w-1/2' />
                  </div>
                </div>
                <div className='flex items-center border-r border-black/[0.07] px-3 py-3'>
                  <SkeletonBar className='h-5 w-16 rounded-full' />
                </div>
                <div className='flex min-w-0 flex-col gap-1.5 border-r border-black/[0.07] px-3 py-3'>
                  <SkeletonBar className='h-3.5 w-full' />
                  <SkeletonBar className='h-3.5 w-5/6' />
                  <SkeletonBar className='h-3.5 w-2/3' />
                </div>
                <div className='flex items-center border-r border-black/[0.07] px-3 py-3'>
                  <SkeletonBar className='h-4 w-3/4' />
                </div>
                <div className='flex items-center border-r border-black/[0.07] px-3 py-3'>
                  <SkeletonBar className='h-4 w-2/3' />
                </div>
                <div className='flex items-center border-r border-black/[0.07] px-3 py-3'>
                  <SkeletonBar className='h-8 w-12 rounded-lg' />
                </div>
                <div className='flex items-center justify-end border-r border-black/[0.07] px-3 py-3'>
                  <SkeletonBar className='h-4 w-16' />
                </div>
                <div className='flex items-center justify-end px-3 py-3'>
                  <SkeletonBar className='h-4 w-16' />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const DEVX_PRODUCT_TYPE_BADGES = {
  [PRODUCTS_TAB_IDS.PRODUCT]: { label: 'Product', color: 'blue' },
  [PRODUCTS_TAB_IDS.PRODUCT_PACKAGE]: { label: 'Product Package', color: 'purple' },
  [PRODUCTS_TAB_IDS.JOB]: { label: 'Job', color: 'orange' },
};

const SortableHeaderLabel = ({ label }) => (
  <div className='flex min-w-0 items-center gap-0.5'>
    <span className='truncate text-label-sm font-medium text-text-soft-400'>{label}</span>
    <RiExpandUpDownFill className='size-5 shrink-0 text-text-soft-400' aria-hidden />
  </div>
);

const PriceHeaderLabel = ({ label }) => (
  <span className='whitespace-nowrap text-label-sm font-medium text-text-soft-400'>{label}</span>
);

const ProductTypeBadge = ({ devxProductType }) => {
  const config =
    DEVX_PRODUCT_TYPE_BADGES[devxProductType] ?? DEVX_PRODUCT_TYPE_BADGES[PRODUCTS_TAB_IDS.PRODUCT];

  return (
    <Badge.Root
      size='small'
      variant='light'
      color={config.color}
      className='w-fit max-w-full whitespace-normal leading-4'
    >
      {config.label}
    </Badge.Root>
  );
};

const ProductPlaceholderImage = ({ imageUrl }) =>
  imageUrl ? (
    <img src={imageUrl} alt='' className='size-8 shrink-0 rounded object-cover' />
  ) : (
    <div className='size-8 shrink-0 rounded bg-bg-weak-100' aria-hidden />
  );

const UnitsPill = ({ units }) => {
  const displayUnits = String(units ?? '').trim() || '--';
  const hasUnits = displayUnits !== '--';

  const pill = (
    <span className='inline-flex h-8 min-w-[52px] max-w-full items-center justify-center rounded-lg bg-bg-weak-100 px-2.5 py-1.5 text-label-sm font-medium text-text-sub-500'>
      <span className='truncate'>{displayUnits}</span>
    </span>
  );

  if (!hasUnits) return pill;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span tabIndex={0} className='inline-flex max-w-full min-w-0 cursor-default'>
          {pill}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content size='xsmall' side='top' className={TOOLTIP_CONTENT_CLASS}>
        {displayUnits}
      </Tooltip.Content>
    </Tooltip.Root>
  );
};

const RateValueWithTooltip = ({ value, min, max, label }) => {
  const displayValue = formatBoqRupeeAmount(value);
  const tooltipText = formatBoqPriceRangeTooltip(min, max);

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type='button'
          className='cursor-default whitespace-nowrap text-right text-label-sm font-medium tabular-nums text-text-main-900'
          aria-label={`${label}: ${displayValue}. ${tooltipText}`}
        >
          {displayValue}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content
        size='xsmall'
        side='top'
        className={cn(TOOLTIP_CONTENT_CLASS, 'text-center')}
      >
        {tooltipText}
      </Tooltip.Content>
    </Tooltip.Root>
  );
};

const BrandValueWithTooltip = ({ brand }) => {
  const displayBrand = String(brand ?? '').trim() || '--';
  const hasBrand = displayBrand !== '--';

  if (!hasBrand) {
    return <span className='text-label-sm font-medium text-text-main-900'>--</span>;
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span
          tabIndex={0}
          className='block w-full min-w-0 cursor-default truncate text-label-sm font-medium text-text-main-900'
        >
          {displayBrand}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content size='xsmall' side='top' className={TOOLTIP_CONTENT_CLASS}>
        {displayBrand}
      </Tooltip.Content>
    </Tooltip.Root>
  );
};

const MakeValueWithTooltip = ({ make }) => {
  const displayMake = String(make ?? '').trim() || '--';
  const hasMake = displayMake !== '--';

  if (!hasMake) {
    return <span className='text-label-sm font-medium text-text-main-900'>--</span>;
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span
          tabIndex={0}
          className='block w-full min-w-0 cursor-default truncate text-label-sm font-medium text-text-main-900'
        >
          {displayMake}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content size='xsmall' side='top' className={TOOLTIP_CONTENT_CLASS}>
        {displayMake}
      </Tooltip.Content>
    </Tooltip.Root>
  );
};

const BoqTemplateProductMasterTableRow = ({
  row,
  isSelected,
  isAlreadyAdded = false,
  allowExistingSelection = false,
  onToggle,
  descriptionExpanded,
  onDescriptionExpandedChange,
}) => (
  <div
    className={cn(
      TABLE_GRID_CLASS,
      'border-b border-[#ededed] bg-bg-white-0 last:border-b-0',
      isAlreadyAdded && !allowExistingSelection && 'bg-bg-weak-50 opacity-60',
    )}
  >
    <div className='flex items-start gap-3 border-r border-black/[0.07] px-3 py-3'>
      {isAlreadyAdded && !allowExistingSelection ? (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <span className='mt-0.5 inline-flex'>
              <Checkbox.Root
                checked={false}
                disabled
                aria-label={`${row.product} already in BOQ`}
              />
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content size='xsmall' side='top' className={TOOLTIP_CONTENT_CLASS}>
            Already added to BOQ
          </Tooltip.Content>
        </Tooltip.Root>
      ) : (
        <Checkbox.Root
          checked={isSelected}
          onCheckedChange={() => onToggle(row)}
          aria-label={`Select ${row.product}`}
          className='mt-0.5'
        />
      )}
      <ProductPlaceholderImage imageUrl={row.imageUrl} />
      <span
        className={cn(
          'line-clamp-2 min-w-0 flex-1 text-label-sm font-medium leading-5',
          isAlreadyAdded && !allowExistingSelection ? 'text-text-sub-500' : 'text-[#16201b]',
        )}
      >
        {row.product}
      </span>
    </div>

    <div className='flex items-center border-r border-black/[0.07] px-3 py-3'>
      <ProductTypeBadge devxProductType={row.devxProductType} />
    </div>

    <div className='min-w-0 border-r border-black/[0.07] px-3 py-3'>
      <ExpandableClampText
        text={row.description}
        lines={3}
        expanded={descriptionExpanded}
        onExpandedChange={onDescriptionExpandedChange}
      />
    </div>

    <div className='flex min-w-0 items-center border-r border-black/[0.07] px-3 py-3'>
      <BrandValueWithTooltip brand={row.brand} />
    </div>

    <div className='flex min-w-0 items-center border-r border-black/[0.07] px-3 py-3'>
      <MakeValueWithTooltip make={row.make} />
    </div>

    <div className='flex min-w-0 items-center border-r border-black/[0.07] px-3 py-3'>
      <UnitsPill units={row.units} />
    </div>

    <div className='flex min-w-0 items-center justify-end border-r border-black/[0.07] px-3 py-3'>
      <RateValueWithTooltip
        value={row.purchaseRate}
        min={row.minPurchasePrice}
        max={row.maxPurchasePrice}
        label='Purchase price'
      />
    </div>

    <div className='flex min-w-0 items-center justify-end px-3 py-3'>
      <RateValueWithTooltip
        value={row.sellingRate}
        min={row.minSellingPrice}
        max={row.maxSellingPrice}
        label='Selling price'
      />
    </div>
  </div>
);

const BoqTemplateProductMasterTable = ({
  products = [],
  selectedIds,
  existingItemCodes,
  allowExistingSelection = false,
  onToggle,
  onToggleGroup,
}) => {
  const [descriptionsExpanded, setDescriptionsExpanded] = useState(false);
  const [rowDescriptionExpanded, setRowDescriptionExpanded] = useState({});

  const resolvedExistingItemCodes =
    existingItemCodes instanceof Set ? existingItemCodes : new Set();

  const selectableProducts = allowExistingSelection
    ? products
    : products.filter((row) => !isBoqProductAlreadyAdded(row, resolvedExistingItemCodes));
  const groupIds = selectableProducts.map((row) => row.id);
  const selectedInGroup = groupIds.filter((id) => selectedIds.has(id)).length;
  const allSelected = groupIds.length > 0 && selectedInGroup === groupIds.length;
  const someSelected = selectedInGroup > 0 && !allSelected;

  const handleToggleAllDescriptions = useCallback(() => {
    setDescriptionsExpanded((previous) => {
      const next = !previous;
      if (!next) setRowDescriptionExpanded({});
      return next;
    });
  }, []);

  const getRowDescriptionExpanded = useCallback(
    (rowId) => {
      if (descriptionsExpanded) return true;
      return Boolean(rowDescriptionExpanded[rowId]);
    },
    [descriptionsExpanded, rowDescriptionExpanded],
  );

  const handleRowDescriptionExpandedChange = useCallback((rowId, next) => {
    setDescriptionsExpanded(false);
    setRowDescriptionExpanded((previous) => ({
      ...previous,
      [rowId]: next,
    }));
  }, []);

  if (products.length === 0) return null;

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className='w-[1280px] max-w-none shrink-0 overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
        <div className={cn(TABLE_GRID_CLASS, 'border-b border-stroke-soft-200 bg-bg-weak-50')}>
          <div className='flex items-center gap-3 border-r border-black/[0.08] px-3 py-2'>
            <Checkbox.Root
              checked={allSelected ? true : someSelected ? 'indeterminate' : false}
              disabled={groupIds.length === 0}
              onCheckedChange={() => onToggleGroup?.(groupIds)}
              aria-label='Select all products'
            />
            <SortableHeaderLabel label='Name' />
          </div>
          <div className='flex items-center border-r border-black/[0.08] px-3 py-2'>
            <SortableHeaderLabel label='Type' />
          </div>
          <div className='relative flex min-w-0 items-center border-r border-black/[0.08] px-3 py-2 pr-10'>
            <SortableHeaderLabel label='Description' />
            <CompactButton.Root
              type='button'
              variant='ghost'
              size='medium'
              className='absolute right-2 top-1/2 -translate-y-1/2'
              aria-label={descriptionsExpanded ? 'Collapse descriptions' : 'Expand descriptions'}
              aria-pressed={descriptionsExpanded}
              onClick={handleToggleAllDescriptions}
            >
              <CompactButton.Icon
                as={descriptionsExpanded ? RiExpandDiagonalLine : LuExpand}
                className='size-4 text-text-soft-400'
              />
            </CompactButton.Root>
          </div>
          <div className='flex items-center border-r border-black/[0.08] px-3 py-2'>
            <SortableHeaderLabel label='Brand' />
          </div>
          <div className='flex items-center border-r border-black/[0.08] px-3 py-2'>
            <SortableHeaderLabel label='Make' />
          </div>
          <div className='flex items-center border-r border-black/[0.08] px-3 py-2'>
            <SortableHeaderLabel label='Unit' />
          </div>
          <div className='flex items-center justify-end border-r border-black/[0.08] px-3 py-2'>
            <PriceHeaderLabel label='Purchase' />
          </div>
          <div className='flex items-center justify-end px-3 py-2'>
            <PriceHeaderLabel label='Selling' />
          </div>
        </div>

        {products.map((row) => {
          const isAlreadyAdded = isBoqProductAlreadyAdded(row, resolvedExistingItemCodes);
          return (
            <BoqTemplateProductMasterTableRow
              key={row.id}
              row={row}
              isSelected={selectedIds.has(row.id)}
              isAlreadyAdded={isAlreadyAdded}
              allowExistingSelection={allowExistingSelection}
              onToggle={onToggle}
              descriptionExpanded={getRowDescriptionExpanded(row.id)}
              onDescriptionExpandedChange={(next) =>
                handleRowDescriptionExpandedChange(row.id, next)
              }
            />
          );
        })}
      </div>
    </Tooltip.Provider>
  );
};

export default BoqTemplateProductMasterTable;
