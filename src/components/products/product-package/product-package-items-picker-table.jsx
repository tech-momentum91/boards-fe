import React, { useCallback, useMemo } from 'react';
import { RiExpandUpDownFill } from 'react-icons/ri';

import * as Checkbox from '@/components/ui/checkbox';
import { cn } from '@/utils/cn';

const PICKER_COLUMNS = [
  { id: 'name', label: 'Name', sortable: false, className: 'min-w-[201px]' },
  { id: 'productCode', label: 'Product Code', sortable: false, className: 'min-w-[142px]' },
  { id: 'brand', label: 'Brand', sortable: true, className: 'min-w-[142px]' },
  { id: 'purchasePrice', label: 'Purchase Price', sortable: true, className: 'min-w-[158px]' },
  { id: 'sellingPrice', label: 'Selling Price', sortable: true, className: 'min-w-[158px]' },
];

function PackagePickerNameCell({ product }) {
  return (
    <div className='flex min-w-0 items-center gap-3'>
      {product.imageUrl ? (
        <img src={product.imageUrl} alt='' className='size-8 shrink-0 rounded object-cover' />
      ) : (
        <div className='size-8 shrink-0 rounded bg-bg-weak-100' aria-hidden />
      )}
      <span className='truncate paragraph-small font-medium text-text-main-900'>
        {product.name || '--'}
      </span>
    </div>
  );
}

function ProductPackageItemsPickerTable({
  products = [],
  selectedProductIds = [],
  onSelectionChange,
  searchValue = '',
}) {
  const normalizedSearch = searchValue.trim().toLowerCase();

  const filteredProducts = useMemo(() => {
    if (!normalizedSearch) return products;
    return products.filter((product) => {
      const haystack = [
        product.name,
        product.productCode,
        product.brand,
        product.purchasePrice,
        product.sellingPrice,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, products]);

  const selectedSet = useMemo(() => new Set(selectedProductIds), [selectedProductIds]);

  const allVisibleSelected =
    filteredProducts.length > 0 && filteredProducts.every((product) => selectedSet.has(product.id));

  const someVisibleSelected =
    filteredProducts.some((product) => selectedSet.has(product.id)) && !allVisibleSelected;

  const handleToggleAll = useCallback(
    (checked) => {
      if (!onSelectionChange) return;
      if (checked) {
        const next = new Set(selectedProductIds);
        filteredProducts.forEach((product) => next.add(product.id));
        onSelectionChange([...next]);
        return;
      }
      const visibleIds = new Set(filteredProducts.map((product) => product.id));
      onSelectionChange(selectedProductIds.filter((id) => !visibleIds.has(id)));
    },
    [filteredProducts, onSelectionChange, selectedProductIds],
  );

  const handleToggleOne = useCallback(
    (productId, checked) => {
      if (!onSelectionChange) return;
      if (checked) {
        onSelectionChange([...new Set([...selectedProductIds, productId])]);
        return;
      }
      onSelectionChange(selectedProductIds.filter((id) => id !== productId));
    },
    [onSelectionChange, selectedProductIds],
  );

  if (products.length === 0) {
    return null;
  }

  return (
    <div className='max-h-[300px] overflow-auto rounded-lg border border-stroke-soft-200 bg-bg-white-0'>
      <table className='w-max min-w-full'>
        <thead>
          <tr className='bg-bg-weak-50'>
            {PICKER_COLUMNS.map((column, columnIndex) => (
              <th
                key={column.id}
                className={cn(
                  'px-3 py-2 text-left text-paragraph-sm font-medium text-text-sub-600',
                  column.className,
                )}
              >
                <div className='flex items-center gap-1.5'>
                  {columnIndex === 0 ? (
                    <Checkbox.Root
                      checked={
                        allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false
                      }
                      onCheckedChange={handleToggleAll}
                      aria-label='Select all products'
                    />
                  ) : null}
                  <span className='whitespace-nowrap'>{column.label}</span>
                  {column.sortable ? (
                    <RiExpandUpDownFill className='size-5 shrink-0 text-text-sub-600' aria-hidden />
                  ) : null}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map((product, index) => {
            const isSelected = selectedSet.has(product.id);

            return (
              <tr
                key={product.id}
                className={cn(
                  index < filteredProducts.length - 1 && 'border-b border-stroke-soft-200',
                )}
              >
                <td className={cn('h-10 px-3 py-2', PICKER_COLUMNS[0].className)}>
                  <div className='flex min-w-[201px] items-center gap-3'>
                    <Checkbox.Root
                      checked={isSelected}
                      onCheckedChange={(checked) => handleToggleOne(product.id, checked)}
                      aria-label={`Select ${product.name}`}
                    />
                    <PackagePickerNameCell product={product} />
                  </div>
                </td>
                {PICKER_COLUMNS.slice(1).map((column) => (
                  <td key={column.id} className={cn('h-10 px-3 py-2', column.className)}>
                    <span className='whitespace-nowrap paragraph-small text-text-sub-500'>
                      {product[column.id] || '--'}
                    </span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default React.memo(ProductPackageItemsPickerTable);
