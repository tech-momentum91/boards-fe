import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';

import {
  PRODUCT_FORM_FIELDS,
  PRODUCT_FORM_CREATE_LABELS,
  getCategoryFieldForLevel,
} from '@/api/productFormOptions';
import ProductFormSearchableSelect from '@/components/products/product-form-searchable-select';
import {
  PRODUCT_CATEGORY_LEVELS,
  applyMainCategorySelection,
  buildMainCategoryOptionId,
  clearLevelsBelow,
  getChildLevelIndices,
  getLevelValue,
  getMainCategoryDisplayValue,
  isCategorySelectionStarted,
} from '@/components/products/product-category-utils';
import * as Label from '@/components/ui/label';
import ErrorText from '@/components/ui/error-text';
import { cn } from '@/utils/cn';

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

function CategoryOptionLabel({ title, breadcrumb }) {
  return (
    <span className='flex min-w-0 w-full flex-col gap-1 py-0.5'>
      <span className='truncate text-paragraph-sm font-medium text-text-main-900'>{title}</span>
      {breadcrumb ? <CategoryBreadcrumb breadcrumb={breadcrumb} /> : null}
    </span>
  );
}

function applyChildLevelSelection(values, levelIndex, option) {
  if (option?.row && String(option.id || '').includes('::')) {
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
  next.hsnCode =
    levelIndex === PRODUCT_CATEGORY_LEVELS.length - 1 ? option?.row?.hsnCode || '' : '';
  return next;
}

function MainCategorySelect({
  values,
  anchorLevel,
  onAnchorChange,
  onChange,
  hasError,
  disabled,
  assetType,
}) {
  const latestOptionsRef = useRef([]);
  const mainSelectedId = useMemo(
    () => buildMainCategoryOptionId(values, anchorLevel),
    [anchorLevel, values],
  );
  const displayValue = useMemo(
    () => getMainCategoryDisplayValue(values, anchorLevel),
    [anchorLevel, values],
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
      if (!picked) return;

      const { values: nextValues, anchorLevel: nextAnchor } = applyMainCategorySelection(picked);
      onAnchorChange(nextAnchor);
      onChange(nextValues);
    },
    [onAnchorChange, onChange],
  );

  return (
    <ProductFormSearchableSelect
      field={PRODUCT_FORM_FIELDS.CATEGORY}
      value={mainSelectedId}
      onValueChange={handleChange}
      categoryGroup={values.categoryGroup}
      categoryType={values.categoryType}
      productGroup={values.productGroup}
      assetType={assetType}
      hasError={hasError}
      disabled={disabled}
      getOptionValue={(opt) => opt.id}
      getOptionLabel={(opt) => opt.label}
      renderOptionLabel={(opt) => (
        <CategoryOptionLabel title={opt.title ?? opt.value} breadcrumb={opt.breadcrumb} />
      )}
      renderTriggerValue={({ placeholder }) => (
        <span className='block min-w-0 max-w-full truncate'>{displayValue || placeholder}</span>
      )}
      onOptionsLoaded={handleOptionsLoaded}
      allowCreate
      createNewLabel={PRODUCT_FORM_CREATE_LABELS[PRODUCT_FORM_FIELDS.CATEGORY]}
    />
  );
}

function CategoryLevelSelect({
  levelIndex,
  values,
  onChange,
  hasError,
  disabled = false,
  assetType,
}) {
  const currentValue = getLevelValue(values, levelIndex);
  const latestOptionsRef = useRef([]);

  const selectedOptionId = useMemo(() => {
    if (!currentValue) return '';
    const pathId = PRODUCT_CATEGORY_LEVELS.map(({ key }) => values[key]).join('|');
    return `${currentValue}::${pathId}`;
  }, [currentValue, values]);

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
      if (!picked) return;
      onChange(applyChildLevelSelection(values, levelIndex, picked));
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
      assetType={assetType}
      hasError={hasError}
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
      allowCreate
      createNewLabel={PRODUCT_FORM_CREATE_LABELS[getCategoryFieldForLevel(levelIndex)]}
    />
  );
}

function CategoryLevelField({
  levelIndex,
  values,
  onChange,
  hasError,
  disabled = false,
  assetType,
}) {
  const { label: levelLabel } = PRODUCT_CATEGORY_LEVELS[levelIndex];

  return (
    <div className='flex min-w-0 flex-col gap-1'>
      <Label.Root>{levelLabel}</Label.Root>
      <CategoryLevelSelect
        levelIndex={levelIndex}
        values={values}
        onChange={onChange}
        hasError={hasError}
        disabled={disabled}
        assetType={assetType}
      />
    </div>
  );
}

function ProductCategoryField({
  values,
  anchorLevel,
  onAnchorChange,
  onChange,
  hasError,
  disabled,
  assetType,
}) {
  return (
    <div className='flex min-w-0 w-full flex-col gap-1'>
      <Label.Root>
        Product Category
        <Label.Asterisk />
      </Label.Root>
      <MainCategorySelect
        values={values}
        anchorLevel={anchorLevel}
        onAnchorChange={onAnchorChange}
        onChange={onChange}
        hasError={hasError}
        disabled={disabled}
        assetType={assetType}
      />
    </div>
  );
}

function SecondaryFieldsRow({ children, columns = 4 }) {
  const gridClass =
    columns === 4
      ? 'sm:grid-cols-4'
      : columns === 3
        ? 'sm:grid-cols-3'
        : columns === 2
          ? 'sm:grid-cols-2'
          : 'sm:grid-cols-1';

  return <div className={cn('grid grid-cols-1 gap-4', gridClass)}>{children}</div>;
}

export default function ProductCategoryCascade({
  values,
  onChange,
  error,
  brandSlot,
  vendorSlot,
  uomSlot,
  className,
  disabled = false,
  assetType,
}) {
  const [anchorLevel, setAnchorLevel] = useState(null);

  useEffect(() => {
    if (!isCategorySelectionStarted(values)) {
      setAnchorLevel(null);
    }
  }, [values]);

  const childLevelIndices = useMemo(() => {
    if (anchorLevel == null || values.productType) return [];
    return getChildLevelIndices(anchorLevel);
  }, [anchorLevel, values.productType]);

  const isFirstLevelSelection = anchorLevel === 0 && childLevelIndices.length > 0;
  const categoryHasError = Boolean(error) && !values.productType;

  const categoryField = (
    <ProductCategoryField
      values={values}
      anchorLevel={anchorLevel}
      onAnchorChange={setAnchorLevel}
      onChange={onChange}
      hasError={categoryHasError}
      disabled={disabled}
      assetType={assetType}
    />
  );

  const childFields = childLevelIndices.map((levelIndex) => (
    <CategoryLevelField
      key={PRODUCT_CATEGORY_LEVELS[levelIndex].key}
      levelIndex={levelIndex}
      values={values}
      onChange={onChange}
      hasError={Boolean(error) && levelIndex === PRODUCT_CATEGORY_LEVELS.length - 1}
      disabled={disabled}
      assetType={assetType}
    />
  ));

  const secondarySlots = [brandSlot, vendorSlot, uomSlot].filter(Boolean);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {isFirstLevelSelection ? (
        <SecondaryFieldsRow columns={2}>
          {categoryField}
          {childFields}
        </SecondaryFieldsRow>
      ) : (
        categoryField
      )}

      {!isFirstLevelSelection && childFields.length > 0 ? (
        <SecondaryFieldsRow columns={childFields.length > 1 ? 2 : 1}>
          {childFields}
        </SecondaryFieldsRow>
      ) : null}

      {error ? <ErrorText className='w-full'>{error}</ErrorText> : null}

      {secondarySlots.length > 0 ? (
        <SecondaryFieldsRow columns={secondarySlots.length}>
          {brandSlot}
          {vendorSlot}
          {uomSlot}
        </SecondaryFieldsRow>
      ) : null}
    </div>
  );
}
