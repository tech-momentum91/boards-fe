import React, { useMemo } from 'react';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiFileCopyLine,
} from 'react-icons/ri';

import ProductPackageDetailHeroPanel from '@/components/products/product-package/product-package-detail-hero-panel';
import ProductPackageDetailItemsTable from '@/components/products/product-package/product-package-detail-items-table';
import { buildPackageCategoryFilters } from '@/components/products/product-package/product-package-utils';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';

export default function ProductPackageDetailView({
  product,
  currentItemIndex,
  totalItems,
  onPrev,
  onNext,
  onClose,
  onDuplicate,
  isDuplicating = false,
  onDelete,
  isDeleteOpen,
  onDeleteOpenChange,
  isDeleting,
  onSaveBundleItems,
  isSavingBundleItems = false,
  onProductUpdated,
}) {
  const bundleProducts = product.products ?? [];
  const categoryFilters = useMemo(() => buildPackageCategoryFilters(product), [product]);

  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden bg-bg-white-0'>
      <header className='flex shrink-0 items-center border-b border-stroke-soft-200 bg-bg-white-0 px-6 py-3'>
        <ButtonGroup.Root size='xsmall' className='shrink-0 rounded-lg shadow-regular-xs'>
          <ButtonGroup.Item onClick={onPrev} disabled={currentItemIndex <= 0}>
            <ButtonGroup.Icon as={RiArrowLeftSLine} />
          </ButtonGroup.Item>
          <ButtonGroup.Item onClick={onNext} disabled={currentItemIndex >= totalItems - 1}>
            <ButtonGroup.Icon as={RiArrowRightSLine} />
          </ButtonGroup.Item>
        </ButtonGroup.Root>

        <div className='ml-auto flex items-center gap-3'>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='xsmall'
            className='gap-2 pl-2.5 pr-3 text-text-sub-500 shadow-regular-xs'
            onClick={onDuplicate}
            disabled={isDuplicating}
          >
            <Button.Icon as={RiFileCopyLine} />
            {isDuplicating ? 'Duplicating...' : 'Duplicate'}
          </Button.Root>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='xsmall'
            className='gap-2 pl-2.5 pr-3 text-text-sub-500 shadow-regular-xs'
            onClick={() => onDeleteOpenChange(true)}
          >
            <Button.Icon as={RiDeleteBinLine} />
            Delete
          </Button.Root>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='xsmall'
            className='p-1.5 shadow-regular-xs'
            onClick={onClose}
            aria-label='Close'
          >
            <Button.Icon as={RiCloseLine} />
          </Button.Root>
        </div>
      </header>

      <div className='min-h-0 flex-1 overflow-y-auto'>
        <div className='px-6 pt-5'>
          <ProductPackageDetailHeroPanel product={product} onProductUpdated={onProductUpdated} />
        </div>

        <ProductPackageDetailItemsTable
          products={bundleProducts}
          categoryFilters={categoryFilters}
          onSaveBundleItems={onSaveBundleItems}
          isSavingBundleItems={isSavingBundleItems}
        />
      </div>

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onOpenChange={onDeleteOpenChange}
        onConfirm={onDelete}
        isLoading={isDeleting}
        title='Delete Product Package?'
        description={`Are you sure you want to delete "${product.name}"? This action cannot be undone.`}
        confirmLabel='Delete'
        loadingLabel='Deleting...'
      />
    </div>
  );
}
