import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { createProduct, createProductPackage } from '@/api/products';
import PageLayout from '@/components/page-layout';
import ProductsAddItemDrawer from '@/components/products/products-add-item-drawer';
import ProductPackageAddItemDrawer from '@/components/products/product-package/product-package-add-item-drawer';
import ProductDetailDrawer from '@/components/products/product-detail-drawer';
import ProductPackageDetailDrawer from '@/components/products/product-package/product-package-detail-drawer';
import ProductsPageHeader from '@/components/products/products-page-header';
import ProductsView from '@/components/products/products-view';
import { PRODUCTS_DEFAULT_ACTIVE_TAB, PRODUCTS_TAB_IDS } from '@/components/products/constants';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

export default function Products() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAddItemDrawerOpen, setIsAddItemDrawerOpen] = useState(false);
  const [isPackageDetailOpen, setIsPackageDetailOpen] = useState(false);
  const [packageDetailId, setPackageDetailId] = useState(null);
  const [packageNavigationItems, setPackageNavigationItems] = useState([]);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const [productDetailId, setProductDetailId] = useState(null);
  const [productNavigationItems, setProductNavigationItems] = useState([]);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [listVariationPatch, setListVariationPatch] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultDevxProductType, setDefaultDevxProductType] = useState(PRODUCTS_DEFAULT_ACTIVE_TAB);
  const [autoSuggestMetaFields, setAutoSuggestMetaFields] = useState(false);
  const [metaSuggestDescription, setMetaSuggestDescription] = useState('');

  const isPackageTab = defaultDevxProductType === PRODUCTS_TAB_IDS.PRODUCT_PACKAGE;

  const handleOpenAddItemDrawer = useCallback((tabId) => {
    setDefaultDevxProductType(tabId || PRODUCTS_DEFAULT_ACTIVE_TAB);
    setIsAddItemDrawerOpen(true);
  }, []);

  const handleOpenPackageDetail = useCallback((packageId, navigationItems = []) => {
    setPackageDetailId(packageId);
    setPackageNavigationItems(navigationItems);
    setIsPackageDetailOpen(true);
  }, []);

  const handleOpenProductDetail = useCallback((productId, navigationItems = []) => {
    setProductDetailId(productId);
    setProductNavigationItems(navigationItems);
    setIsProductDetailOpen(true);
  }, []);

  const handleProductDetailOpenChange = useCallback((open) => {
    setIsProductDetailOpen(open);
    if (!open) {
      setProductDetailId(null);
      setProductNavigationItems([]);
      setAutoSuggestMetaFields(false);
      setMetaSuggestDescription('');
    }
  }, []);

  const handleAutoSuggestMetaFieldsConsumed = useCallback(() => {
    setAutoSuggestMetaFields(false);
    setMetaSuggestDescription('');
  }, []);

  const handlePackageDetailOpenChange = useCallback((open) => {
    setIsPackageDetailOpen(open);
    if (!open) {
      setPackageDetailId(null);
      setPackageNavigationItems([]);
    }
  }, []);

  const handleListRefresh = useCallback((patch) => {
    if (patch?.templateId && patch?.variantId && patch?.imageUrl) {
      setListVariationPatch(patch);
    }
    setListRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const openPackageId = location.state?.openPackageId;
    if (openPackageId) {
      setPackageDetailId(openPackageId);
      setIsPackageDetailOpen(true);
      navigate({ pathname: '/products', search: location.search }, { replace: true, state: null });
      return;
    }

    const openProductId = location.state?.openProductId;
    if (!openProductId) return;
    setProductDetailId(openProductId);
    setIsProductDetailOpen(true);
    navigate({ pathname: '/products', search: location.search }, { replace: true, state: null });
  }, [location.search, location.state, navigate]);

  const handleAddItemSubmit = useCallback(
    async (values) => {
      setIsSubmitting(true);
      try {
        if (defaultDevxProductType === PRODUCTS_TAB_IDS.PRODUCT_PACKAGE) {
          await createProductPackage(values);
          showSuccessToast('Product package created successfully');
        } else {
          const result = await createProduct(values);
          showSuccessToast('Product created successfully');
          const createdId = result?.name || result?.product?.id;
          const descriptionText = String(values?.description || '').trim();
          if (createdId && descriptionText) {
            setProductDetailId(createdId);
            setProductNavigationItems([]);
            setMetaSuggestDescription(descriptionText);
            setAutoSuggestMetaFields(true);
            setIsProductDetailOpen(true);
          }
        }
        setListRefreshKey((current) => current + 1);
      } catch (error) {
        showErrorToast(error, {
          defaultMessage:
            defaultDevxProductType === PRODUCTS_TAB_IDS.PRODUCT_PACKAGE
              ? 'Failed to create product package.'
              : 'Failed to create product.',
        });
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [defaultDevxProductType],
  );

  return (
    <PageLayout
      showDefaultHeader={false}
      borderDivClassName='hidden'
      contentAreaClassName='overflow-hidden'
    >
      <div className='flex min-h-0 flex-1 flex-col'>
        <ProductsPageHeader />
        <ProductsView
          onAddProduct={handleOpenAddItemDrawer}
          onOpenPackageDetail={handleOpenPackageDetail}
          onOpenProductDetail={handleOpenProductDetail}
          listRefreshKey={listRefreshKey}
          listVariationPatch={listVariationPatch}
          onListVariationPatchApplied={() => setListVariationPatch(null)}
        />
        <ProductDetailDrawer
          open={isProductDetailOpen}
          onOpenChange={handleProductDetailOpenChange}
          productId={productDetailId}
          onProductIdChange={setProductDetailId}
          onOpenPackageDetail={handleOpenPackageDetail}
          navigationItems={productNavigationItems}
          listRefreshKey={listRefreshKey}
          onListRefresh={handleListRefresh}
          autoSuggestMetaFields={autoSuggestMetaFields}
          metaSuggestDescription={metaSuggestDescription}
          onAutoSuggestMetaFieldsConsumed={handleAutoSuggestMetaFieldsConsumed}
        />
        <ProductPackageDetailDrawer
          open={isPackageDetailOpen}
          onOpenChange={handlePackageDetailOpenChange}
          packageId={packageDetailId}
          onPackageIdChange={setPackageDetailId}
          navigationItems={packageNavigationItems}
          listRefreshKey={listRefreshKey}
          onListRefresh={handleListRefresh}
        />
        {isPackageTab ? (
          <ProductPackageAddItemDrawer
            open={isAddItemDrawerOpen}
            onOpenChange={setIsAddItemDrawerOpen}
            onSubmit={handleAddItemSubmit}
            isSubmitting={isSubmitting}
          />
        ) : (
          <ProductsAddItemDrawer
            open={isAddItemDrawerOpen}
            onOpenChange={setIsAddItemDrawerOpen}
            onSubmit={handleAddItemSubmit}
            isSubmitting={isSubmitting}
            defaultDevxProductType={defaultDevxProductType}
          />
        )}
      </div>
    </PageLayout>
  );
}
