import React, { useCallback, useMemo, useRef } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';

import { getCategoryFieldForLevel } from '@/api/productFormOptions';
import ProductFormSearchableSelect from '@/components/products/product-form-searchable-select';
import {
  PRODUCT_CATEGORY_LEVELS,
  clearLevelsBelow,
  getLevelValue,
} from '@/components/products/product-category-utils';

const PRODUCT_GROUP_LEVEL = 2;
const PRODUCT_TYPE_LEVEL = 3;

function CategoryBreadcrumb({ breadcrumb }) {
  const parts = String(breadcrumb ?? '')
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

function CategoryOptionLabel({ title, breadcrumb }) {
  return (
    <span className='flex min-w-0 w-full flex-col gap-1 py-0.5'>
      <span className='truncate text-paragraph-sm font-medium text-text-main-900'>{title}</span>
      {breadcrumb ? <CategoryBreadcrumb breadcrumb={breadcrumb} /> : null}
    </span>
  );
}

function applyLevelSelection(values, levelIndex, option) {
  if (option?.row && String(option.id ?? '').includes('::')) {
    return {
      categoryGroup: option.row.categoryGroup || '',
      categoryType: option.row.categoryType || '',
      productGroup: option.row.productGroup || '',
      productType: option.row.productType || '',
      hsnCode: option.row.hsnCode || '',
    };
  }

  const { key } = PRODUCT_CATEGORY_LEVELS[levelIndex];
  const next = clearLevelsBelow(values, levelIndex);
  next[key] = option?.value ?? '';
  return next;
}

function RaisePoCategoryLevelSelect({ levelIndex, values, onChange, disabled = false }) {
  const currentValue = getLevelValue(values, levelIndex);
  const latestOptionsRef = useRef([]);

  const selectedOptionId = useMemo(() => {
    if (!currentValue) return '';
    const pathId = PRODUCT_CATEGORY_LEVELS.map(({ key }) => values[key] ?? '').join('|');
    return `${currentValue}::${pathId}`;
  }, [currentValue, values]);

  const handleOptionsLoaded = useCallback((options) => {
    latestOptionsRef.current = options;
  }, []);

  const handleChange = useCallback(
    (optionId, pickedOption) => {
      if (!optionId) {
        onChange(clearLevelsBelow(values, levelIndex - 1));
        return;
      }
      const picked =
        pickedOption ??
        latestOptionsRef.current.find((opt) => opt.id === optionId) ??
        latestOptionsRef.current.find((opt) => opt.value === optionId);
      if (!picked) return;
      onChange(applyLevelSelection(values, levelIndex, picked));
    },
    [levelIndex, onChange, values],
  );

  return (
    <ProductFormSearchableSelect
      field={getCategoryFieldForLevel(levelIndex)}
      value={selectedOptionId}
      onValueChange={handleChange}
      categoryGroup={values.categoryGroup}
      categoryType={values.categoryType}
      productGroup={values.productGroup}
      disabled={disabled}
      getOptionValue={(opt) => opt.id}
      getOptionLabel={(opt) => opt.label}
      renderOptionLabel={(opt) => (
        <CategoryOptionLabel title={opt.title ?? opt.value} breadcrumb={opt.breadcrumb} />
      )}
      renderTriggerValue={({ selectedOption, placeholder }) => (
        <span className='block min-w-0 max-w-full truncate'>
          {selectedOption?.value || currentValue || placeholder}
        </span>
      )}
      onOptionsLoaded={handleOptionsLoaded}
    />
  );
}

export default function RaisePoProductCategoryFields({ values, onChange, disabled = false }) {
  const productTypeDisabled = disabled || !String(values.productGroup ?? '').trim();

  return (
    <div className='flex gap-4'>
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <span className='text-paragraph-sm tracking-[-0.084px] text-text-sub-500'>
          {PRODUCT_CATEGORY_LEVELS[PRODUCT_GROUP_LEVEL].label}
        </span>
        <RaisePoCategoryLevelSelect
          levelIndex={PRODUCT_GROUP_LEVEL}
          values={values}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <span className='text-paragraph-sm tracking-[-0.084px] text-text-sub-500'>
          {PRODUCT_CATEGORY_LEVELS[PRODUCT_TYPE_LEVEL].label}
        </span>
        <RaisePoCategoryLevelSelect
          levelIndex={PRODUCT_TYPE_LEVEL}
          values={values}
          onChange={onChange}
          disabled={productTypeDisabled}
        />
      </div>
    </div>
  );
}
