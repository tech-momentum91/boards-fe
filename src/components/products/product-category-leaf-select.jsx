import React, { useCallback, useMemo, useRef } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';

import { PRODUCT_FORM_FIELDS } from '@/api/productFormOptions';
import ProductFormSearchableSelect from '@/components/products/product-form-searchable-select';
import {
  PRODUCT_CATEGORY_LEVELS,
  applyMainCategorySelection,
  buildProductTypeOptionId,
  getProductCategoryDisplayLabel,
  parseProductCategoryPath,
} from '@/components/products/product-category-utils';
import { cn } from '@/utils/cn';

const LEAF_LEVEL_INDEX = PRODUCT_CATEGORY_LEVELS.length - 1;

function CategoryBreadcrumb({ breadcrumb }) {
  const parts = (breadcrumb || '')
    .split('>')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <span className='flex min-w-0 flex-wrap items-center gap-0.5'>
      {parts.map((part, index) => (
        <React.Fragment key={`${part}-${index}`}>
          {index > 0 ? (
            <RiArrowRightSLine className='size-4 shrink-0 text-text-sub-500' aria-hidden />
          ) : null}
          <span className='text-paragraph-xs text-text-sub-500'>{part}</span>
        </React.Fragment>
      ))}
    </span>
  );
}

function CategoryOptionLabel({ title, breadcrumb, selectable }) {
  return (
    <span className='flex min-w-0 w-full flex-col gap-1 py-0.5'>
      <span
        className={cn(
          'truncate text-paragraph-sm font-medium',
          selectable ? 'text-text-main-900' : 'text-text-soft-400',
        )}
      >
        {title}
      </span>
      {breadcrumb ? <CategoryBreadcrumb breadcrumb={breadcrumb} /> : null}
      {!selectable ? (
        <span className='text-paragraph-xs text-text-soft-400'>
          Select a Product Type (level 4)
        </span>
      ) : null}
    </span>
  );
}

function isLeafCategoryOption(option) {
  const level = Number(option?.selectedLevel ?? option?.selected_level);
  if (Number.isFinite(level)) return level === LEAF_LEVEL_INDEX;
  const productType = String(option?.row?.productType ?? '').trim();
  const value = String(option?.value ?? option?.title ?? '').trim();
  return Boolean(productType) && productType === value;
}

/**
 * Same Category Master searchable dropdown used on product add, but leaf-only:
 * L1–L3 remain searchable/visible; only L4 (Product Type) can be selected.
 * Value stored/emitted is the L4 leaf name (not the full path).
 * Does not change ProductCategoryCascade behavior.
 */
export default function ProductCategoryLeafSelect({
  value = '',
  onValueChange,
  hasError = false,
  disabled = false,
  placeholder = 'Select product category',
  size = 'xsmall',
  variant = 'borderless',
  className,
  assetType,
  excludeOpex = true,
}) {
  const latestOptionsRef = useRef([]);
  const categoryValues = useMemo(() => parseProductCategoryPath(value), [value]);
  const selectedId = useMemo(() => buildProductTypeOptionId(categoryValues), [categoryValues]);
  const displayValue = useMemo(
    () => getProductCategoryDisplayLabel(value) || categoryValues.productType || '',
    [categoryValues.productType, value],
  );

  const handleOptionsLoaded = useCallback((options) => {
    latestOptionsRef.current = options;
  }, []);

  const handleChange = useCallback(
    (optionId, pickedOption) => {
      if (!optionId) return;
      const picked =
        pickedOption ??
        latestOptionsRef.current.find((opt) => opt.id === optionId) ??
        latestOptionsRef.current.find((opt) => opt.value === optionId);
      if (!picked || !isLeafCategoryOption(picked)) return;

      const { values } = applyMainCategorySelection(picked);
      const leaf = String(values.productType ?? '').trim();
      if (!leaf) return;
      // Persist leaf Item Group name only — Link/Data field expects the doc name.
      onValueChange?.(leaf, values);
    },
    [onValueChange],
  );

  return (
    <div className={cn('min-w-0 w-full', className)}>
      <ProductFormSearchableSelect
        field={PRODUCT_FORM_FIELDS.CATEGORY}
        value={selectedId}
        onValueChange={handleChange}
        categoryGroup={categoryValues.categoryGroup}
        categoryType={categoryValues.categoryType}
        productGroup={categoryValues.productGroup}
        assetType={assetType}
        excludeOpex={excludeOpex}
        hasError={hasError}
        disabled={disabled}
        placeholder={placeholder}
        size={size}
        variant={variant}
        allowCreate={false}
        getOptionValue={(opt) => opt.id}
        getOptionLabel={(opt) => opt.label}
        isOptionDisabled={(opt) => !isLeafCategoryOption(opt)}
        renderOptionLabel={(opt) => (
          <CategoryOptionLabel
            title={opt.title ?? opt.value}
            breadcrumb={opt.breadcrumb}
            selectable={isLeafCategoryOption(opt)}
          />
        )}
        renderTriggerValue={({ placeholder: triggerPlaceholder }) => (
          <span className='block min-w-0 max-w-full truncate'>
            {displayValue || triggerPlaceholder}
          </span>
        )}
        onOptionsLoaded={handleOptionsLoaded}
      />
    </div>
  );
}
