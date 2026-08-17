import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  deleteProductPackage,
  duplicateProductPackage,
  getProduct,
  updateProductPackageBundleItems,
} from '@/api/products';
import ProductPackageDetailView from '@/components/products/product-package/product-package-detail-view';
import * as Drawer from '@/components/ui/drawer';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

export default function ProductPackageDetailDrawer({
  open,
  onOpenChange,
  packageId,
  onPackageIdChange,
  navigationItems = [],
  listRefreshKey = 0,
  onListRefresh,
}) {
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isSavingBundleItems, setIsSavingBundleItems] = useState(false);

  useEffect(() => {
    if (!open || !packageId) {
      setProduct(null);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);

    getProduct(packageId)
      .then((productData) => {
        if (cancelled) return;
        if (!productData) {
          setProduct(null);
          showErrorToast('Product package not found.');
          return;
        }
        setProduct(productData);
      })
      .catch((error) => {
        if (!cancelled) {
          setProduct(null);
          showErrorToast(error, { defaultMessage: 'Failed to load product package.' });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, packageId]);

  const currentItemIndex = useMemo(() => {
    if (!packageId || navigationItems.length === 0) return -1;
    return navigationItems.findIndex((item) => item.id === packageId);
  }, [navigationItems, packageId]);

  const handlePrev = useCallback(() => {
    if (currentItemIndex > 0) {
      onPackageIdChange?.(navigationItems[currentItemIndex - 1].id);
    }
  }, [currentItemIndex, navigationItems, onPackageIdChange]);

  const handleNext = useCallback(() => {
    if (currentItemIndex >= 0 && currentItemIndex < navigationItems.length - 1) {
      onPackageIdChange?.(navigationItems[currentItemIndex + 1].id);
    }
  }, [currentItemIndex, navigationItems, onPackageIdChange]);

  const handleSaveBundleItems = useCallback(
    async (bundleItems) => {
      if (!product?.id) return;
      setIsSavingBundleItems(true);
      try {
        const result = await updateProductPackageBundleItems(product.id, bundleItems);
        setProduct(result.product);
        showSuccessToast('Package items updated');
        onListRefresh?.();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update package items.' });
        throw error;
      } finally {
        setIsSavingBundleItems(false);
      }
    },
    [onListRefresh, product?.id],
  );

  const handleDuplicate = useCallback(async () => {
    if (!product?.id) return;

    setIsDuplicating(true);
    try {
      const result = await duplicateProductPackage(product.id);
      showSuccessToast('Product package duplicated');
      onPackageIdChange?.(result.name);
      onListRefresh?.();
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to duplicate product package.' });
    } finally {
      setIsDuplicating(false);
    }
  }, [onListRefresh, onPackageIdChange, product?.id]);

  const handleProductUpdated = useCallback(
    (updatedProduct) => {
      setProduct(updatedProduct);
      onListRefresh?.();
    },
    [onListRefresh],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!product?.id) return;

    setIsDeleting(true);
    try {
      await deleteProductPackage(product.id);
      showSuccessToast('Product package deleted successfully');
      setIsDeleteOpen(false);
      onListRefresh?.();
      onOpenChange(false);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to delete product package.' });
    } finally {
      setIsDeleting(false);
    }
  }, [onListRefresh, onOpenChange, product?.id]);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      onOpenChange(nextOpen);
      if (!nextOpen) {
        setIsDeleteOpen(false);
      }
    },
    [onOpenChange],
  );

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange}>
      <Drawer.Content className='flex h-full max-h-dvh w-[min(calc(100vw-48px),1200px)] !max-w-[1200px] flex-col overflow-hidden bg-bg-white-0 shadow-regular-md'>
        <Drawer.Body className='min-h-0 flex-1 overflow-hidden p-0'>
          {isLoading || !product ? (
            <div className='flex h-full min-h-[320px] items-center justify-center'>
              <p className='text-paragraph-md text-text-sub-500'>
                {open && packageId ? 'Loading product package…' : ''}
              </p>
            </div>
          ) : (
            <ProductPackageDetailView
              product={product}
              currentItemIndex={currentItemIndex}
              totalItems={navigationItems.length}
              onPrev={handlePrev}
              onNext={handleNext}
              onClose={() => handleOpenChange(false)}
              onDuplicate={handleDuplicate}
              isDuplicating={isDuplicating}
              onDelete={handleDeleteConfirm}
              isDeleteOpen={isDeleteOpen}
              onDeleteOpenChange={setIsDeleteOpen}
              isDeleting={isDeleting}
              onSaveBundleItems={handleSaveBundleItems}
              isSavingBundleItems={isSavingBundleItems}
              onProductUpdated={handleProductUpdated}
            />
          )}
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
}
