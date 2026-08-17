import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { deleteProduct, getProduct } from '@/api/products';
import ProductDetailView from '@/components/products/product-detail-view';
import { PRODUCTS_TAB_IDS } from '@/components/products/constants';
import * as Drawer from '@/components/ui/drawer';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

export default function ProductDetailDrawer({
  open,
  onOpenChange,
  productId,
  onProductIdChange,
  onOpenPackageDetail,
  navigationItems = [],
  listRefreshKey = 0,
  onListRefresh,
  viewMode,
  autoSuggestMetaFields = false,
  metaSuggestDescription = '',
  onAutoSuggestMetaFieldsConsumed,
}) {
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!open || !productId) {
      setProduct(null);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);

    getProduct(productId)
      .then((productData) => {
        if (cancelled) return;
        if (!productData) {
          setProduct(null);
          showErrorToast('Product not found.');
          return;
        }

        if (productData.devxProductType === PRODUCTS_TAB_IDS.PRODUCT_PACKAGE) {
          onOpenPackageDetail?.(productData.id);
          onOpenChange(false);
          return;
        }

        setProduct(productData);
      })
      .catch((error) => {
        if (!cancelled) {
          setProduct(null);
          showErrorToast(error, { defaultMessage: 'Failed to load product.' });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, productId, onOpenChange, onOpenPackageDetail]);

  const currentItemIndex = useMemo(() => {
    if (!productId || navigationItems.length === 0) return -1;
    const byRowId = navigationItems.findIndex((item) => item.id === productId);
    if (byRowId >= 0) return byRowId;
    return navigationItems.findIndex((item) => (item.detailId || item.id) === productId);
  }, [navigationItems, productId]);

  const handlePrev = useCallback(() => {
    if (currentItemIndex > 0) {
      const prevItem = navigationItems[currentItemIndex - 1];
      onProductIdChange?.(prevItem.detailId || prevItem.id);
    }
  }, [currentItemIndex, navigationItems, onProductIdChange]);

  const handleNext = useCallback(() => {
    if (currentItemIndex >= 0 && currentItemIndex < navigationItems.length - 1) {
      const nextItem = navigationItems[currentItemIndex + 1];
      onProductIdChange?.(nextItem.detailId || nextItem.id);
    }
  }, [currentItemIndex, navigationItems, onProductIdChange]);

  const handleProductUpdated = useCallback(
    (updatedProduct, listPatch) => {
      setProduct(updatedProduct);
      onListRefresh?.(listPatch);
    },
    [onListRefresh],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!product?.id) return;

    setIsDeleting(true);
    try {
      await deleteProduct(product.id);
      showSuccessToast('Product deleted successfully');
      setIsDeleteOpen(false);
      onListRefresh?.();
      onOpenChange(false);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to delete product.' });
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

  // Opening a variant id loads the template; keep the variant so detail can land on Variations.
  const focusVariationId = useMemo(() => {
    if (!productId || !product?.variations?.length) return null;
    return product.variations.some((variation) => variation.id === productId) ? productId : null;
  }, [product, productId]);

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange}>
      <Drawer.Content className='flex h-full max-h-dvh w-[min(calc(100vw-48px),1200px)] !max-w-[1200px] flex-col overflow-hidden bg-bg-white-0 shadow-regular-md'>
        <Drawer.Body className='min-h-0 flex-1 overflow-hidden p-0'>
          {isLoading || !product ? (
            <div className='flex h-full min-h-[320px] items-center justify-center'>
              <p className='text-paragraph-md text-text-sub-500'>
                {open && productId ? 'Loading product…' : ''}
              </p>
            </div>
          ) : (
            <ProductDetailView
              product={product}
              viewMode={viewMode}
              focusVariationId={focusVariationId}
              currentItemIndex={currentItemIndex}
              totalItems={navigationItems.length}
              onPrev={handlePrev}
              onNext={handleNext}
              onClose={() => handleOpenChange(false)}
              onDelete={handleDeleteConfirm}
              isDeleteOpen={isDeleteOpen}
              onDeleteOpenChange={setIsDeleteOpen}
              isDeleting={isDeleting}
              onOpenProduct={onProductIdChange}
              onProductUpdated={handleProductUpdated}
              autoSuggestMetaFields={autoSuggestMetaFields}
              metaSuggestDescription={metaSuggestDescription}
              onAutoSuggestMetaFieldsConsumed={onAutoSuggestMetaFieldsConsumed}
            />
          )}
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
}
