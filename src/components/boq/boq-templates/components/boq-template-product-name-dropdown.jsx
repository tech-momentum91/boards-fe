import React, { useCallback, useMemo } from 'react';

import { listProducts } from '@/api/products';
import { mapProductToBoqMasterRow } from '@/api/boqProductMaster';
import { applyBoqMasterProductToForm } from '@/api/boqProductPayload';
import ProductFormSearchableSelect from '@/components/products/product-form-searchable-select';
import { BOQ_TEMPLATE_EDIT_FIELD_ATTR } from '@/components/boq/boq-templates/components/boq-template-product-edit-utils';
import { BOQ_DEFAULT_PRODUCT_SECTION, BOQ_PRODUCT_SOURCE } from '@/components/boq/constants';
import { cn } from '@/utils/cn';

function buildCustomLineOption(name) {
  const product = String(name ?? '').trim();
  if (!product) return null;
  return {
    product,
    item: product,
    itemCode: '',
    productSource: BOQ_PRODUCT_SOURCE.CUSTOM,
    isCustomLine: true,
  };
}

function buildProductMasterFilters({ categoryType, categoryGroup, productGroup }) {
  const filters = {};
  const type = String(categoryType ?? '').trim();
  const group = String(categoryGroup ?? '').trim();
  const section = String(productGroup ?? '').trim();

  // Prefer the section (product group) — it matches the BOQ table section the user is in.
  if (section && section.toLowerCase() !== BOQ_DEFAULT_PRODUCT_SECTION.toLowerCase()) {
    filters.product_group = [section];
    return filters;
  }

  if (type) filters.category_type = [type];
  else if (group) filters.category_group = [group];

  return Object.keys(filters).length > 0 ? filters : undefined;
}

const BoqTemplateProductNameDropdown = ({
  categoryId = '',
  categoryType = '',
  categoryGroup = '',
  section = '',
  value = '',
  selectedItemCode = '',
  onValueChange,
  onProductSelect,
  onCustomLineSelect,
  allowCustomLine = false,
  placeholder = 'Product name',
  className,
  editFieldId,
}) => {
  const sectionLabel = String(section ?? '').trim();
  const resolvedCategoryType = String(categoryType || categoryId || '').trim();
  const resolvedCategoryGroup = String(categoryGroup || '').trim();

  const loadOptions = useCallback(
    async ({ search } = {}) => {
      const filters = buildProductMasterFilters({
        categoryType: resolvedCategoryType,
        categoryGroup: resolvedCategoryGroup,
        productGroup: sectionLabel,
      });

      const { rows } = await listProducts({
        keyword: search || undefined,
        limitStart: 0,
        limitPageLength: 200,
        filters,
      });

      return (rows ?? [])
        .map(mapProductToBoqMasterRow)
        .filter(Boolean)
        .map((row) => applyBoqMasterProductToForm(row));
    },
    [resolvedCategoryGroup, resolvedCategoryType, sectionLabel],
  );

  const selectedValue = useMemo(() => {
    const code = String(selectedItemCode ?? '').trim();
    if (code) return code;
    return String(value ?? '').trim();
  }, [selectedItemCode, value]);

  return (
    <div
      className={cn('min-w-0 flex-1', className)}
      {...(editFieldId ? { [BOQ_TEMPLATE_EDIT_FIELD_ATTR]: editFieldId } : {})}
    >
      <ProductFormSearchableSelect
        value={selectedValue}
        onValueChange={(nextValue, option) => {
          if (option?.isCustomLine) {
            onValueChange?.(option.product ?? '');
            onCustomLineSelect?.(option);
            return;
          }
          if (option) {
            onValueChange?.(option.product ?? '');
            onProductSelect?.(option);
            return;
          }
          onValueChange?.(String(nextValue ?? ''));
        }}
        loadOptions={loadOptions}
        getOptionValue={(opt) =>
          opt?.isCustomLine ? opt.product : opt?.itemCode || opt?.id || opt?.product || ''
        }
        getOptionLabel={(opt) => opt?.product || String(opt?.itemCode ?? '')}
        placeholder={placeholder}
        searchPlaceholder='Search products...'
        emptyMessage='No products available'
        noResultsMessage='No products found'
        allowCreate={allowCustomLine}
        createNewLabel='Add as custom line'
        createLabel={(query) => `Use "${query}" as custom line`}
        onCreateOption={async (query) => buildCustomLineOption(query)}
        contentClassName='w-[320px]'
        renderTriggerValue={({ placeholder: fallback }) => (
          <span className='block min-w-0 max-w-full truncate'>{value || fallback}</span>
        )}
      />
    </div>
  );
};

export default BoqTemplateProductNameDropdown;
