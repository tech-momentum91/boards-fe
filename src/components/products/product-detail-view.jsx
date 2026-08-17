import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiDeleteBinLine,
  RiFileList3Fill,
  RiInformationFill,
  RiMoneyDollarCircleFill,
  RiTaskFill,
  RiUploadLine,
  RiCloseLine,
} from 'react-icons/ri';

import { PRODUCTS_TAB_IDS } from '@/components/products/constants';
import {
  getSpecificationSectionTitle,
  isJobProductType,
} from '@/components/products/products-job-pricing';
import {
  addProductImages,
  collectMainProductImageUrls,
  getProduct,
  removeProductBrochure,
  removeProductImage,
  removeVariationImage,
} from '@/api/products';
import { metaFieldKey, suggestProductMetaFields } from '@/api/productMetaFields';
import { isStockProductDetailView } from '@/components/products/product-detail-stock';
import ProductDetailDocumentsSection from '@/components/products/product-detail-documents-section';
import { ProductDetailBasicEditableSection } from '@/components/products/product-detail-editable-fields/basic-section';
import { ProductDetailMetaFieldsSection } from '@/components/products/product-detail-editable-fields/meta-fields-section';
import { ProductDetailPricingEditableSection } from '@/components/products/product-detail-editable-fields/pricing-section';
import { ProductDetailSpecificationEditableSection } from '@/components/products/product-detail-editable-fields/specification-section';
import ProductDetailHeroPanel from '@/components/products/product-detail-hero-panel';
import ProductDetailImageGallery, {
  buildProductGalleryItems,
  findFirstGalleryIndexForVariation,
} from '@/components/products/product-detail-image-gallery';
import ProductDetailVariationsSection from '@/components/products/product-detail-variations-section';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { validateProductMediaFiles } from '@/components/products/product-upload-utils';
import { cn } from '@/utils/cn';

const DETAIL_TABS = [
  { id: 'basic', label: 'Basic Details' },
  { id: 'variations', label: 'Variations' },
  { id: 'documents', label: 'Documents' },
];

export default function ProductDetailView({
  product,
  viewMode,
  focusVariationId = null,
  currentItemIndex,
  totalItems,
  onPrev,
  onNext,
  onClose,
  onDelete,
  isDeleteOpen,
  onDeleteOpenChange,
  isDeleting,
  onOpenProduct,
  onProductUpdated,
  autoSuggestMetaFields = false,
  metaSuggestDescription = '',
  onAutoSuggestMetaFieldsConsumed,
}) {
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariationId, setSelectedVariationId] = useState(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isRemovingImage, setIsRemovingImage] = useState(false);
  const [isRemovingBrochure, setIsRemovingBrochure] = useState(false);
  const [applyPriceToAllVariations, setApplyPriceToAllVariations] = useState(false);
  const [metaSuggestions, setMetaSuggestions] = useState([]);
  const [isSuggestingMeta, setIsSuggestingMeta] = useState(false);
  const headerImageInputRef = useRef(null);
  const suggestRequestIdRef = useRef(0);

  const isProduct = product?.devxProductType !== PRODUCTS_TAB_IDS.PRODUCT_PACKAGE;
  const isJob = isJobProductType(product?.devxProductType);
  const isStockView = isStockProductDetailView(viewMode);
  const specificationTitle = getSpecificationSectionTitle(product?.devxProductType);
  const galleryItems = useMemo(() => buildProductGalleryItems(product ?? {}), [product]);
  const parentProductWithPricing = useMemo(
    () => (product ? { ...product, applyPriceToAllVariations } : product),
    [applyPriceToAllVariations, product],
  );
  const resolvedFocusVariationId = useMemo(() => {
    if (!focusVariationId || !product?.variations?.length) return null;
    return product.variations.some((variation) => variation.id === focusVariationId)
      ? focusVariationId
      : null;
  }, [focusVariationId, product?.variations]);

  const sections = useMemo(() => {
    if (isStockView) {
      return DETAIL_TABS.filter((tab) => tab.id === 'basic');
    }
    if (isProduct && product?.variations?.length) {
      return DETAIL_TABS;
    }
    return DETAIL_TABS.filter((tab) => tab.id !== 'variations');
  }, [isProduct, isStockView, product?.variations?.length]);

  useEffect(() => {
    const openVariations = Boolean(resolvedFocusVariationId) && !isStockView;
    setActiveTab(openVariations ? 'variations' : 'basic');
    setSelectedVariationId(resolvedFocusVariationId);
    setApplyPriceToAllVariations(Boolean(product?.applyPriceToAllVariations));

    if (resolvedFocusVariationId && product) {
      const items = buildProductGalleryItems(product);
      const index = findFirstGalleryIndexForVariation(items, resolvedFocusVariationId);
      setSelectedImageIndex(index >= 0 ? index : 0);
      return;
    }
    setSelectedImageIndex(0);
    // Reset open target when the template or requested variation changes — not on every product patch.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: product fields beyond id/focus
  }, [isStockView, product?.id, product?.applyPriceToAllVariations, resolvedFocusVariationId]);

  useEffect(() => {
    if (selectedImageIndex >= galleryItems.length) {
      setSelectedImageIndex(Math.max(0, galleryItems.length - 1));
    }
  }, [galleryItems.length, selectedImageIndex]);

  useEffect(() => {
    setMetaSuggestions([]);
    setIsSuggestingMeta(false);
    suggestRequestIdRef.current += 1;
  }, [product?.id]);

  const resolveSuggestionDescription = useCallback(
    (nextProduct, descriptionOverride) => {
      const candidates = [
        descriptionOverride,
        metaSuggestDescription,
        nextProduct?.description,
        nextProduct?.specificationNotes,
        product?.description,
        product?.specificationNotes,
      ];
      for (const value of candidates) {
        const trimmed = String(value ?? '').trim();
        if (trimmed) return trimmed;
      }
      return '';
    },
    [metaSuggestDescription, product?.description, product?.specificationNotes],
  );

  const loadMetaSuggestions = useCallback(
    async (nextProduct, descriptionOverride) => {
      if (!isProduct || isStockView) return;

      const itemCode = nextProduct?.id || product?.id;
      const description = resolveSuggestionDescription(nextProduct, descriptionOverride);

      if (!itemCode || !description) {
        setMetaSuggestions([]);
        return;
      }

      const requestId = suggestRequestIdRef.current + 1;
      suggestRequestIdRef.current = requestId;
      setActiveTab('basic');
      setIsSuggestingMeta(true);

      try {
        const suggested = await suggestProductMetaFields({ itemCode, description });
        if (suggestRequestIdRef.current !== requestId) return;

        const savedKeys = new Set(
          (nextProduct?.metaFields || product?.metaFields || []).map(metaFieldKey),
        );
        const pending = suggested.filter((row) => !savedKeys.has(metaFieldKey(row)));
        setMetaSuggestions(pending);
      } catch (error) {
        if (suggestRequestIdRef.current !== requestId) return;
        setMetaSuggestions([]);
        showErrorToast(error, { defaultMessage: 'Failed to generate meta field suggestions.' });
      } finally {
        if (suggestRequestIdRef.current === requestId) {
          setIsSuggestingMeta(false);
        }
      }
    },
    [isProduct, isStockView, product?.id, product?.metaFields, resolveSuggestionDescription],
  );

  useEffect(() => {
    if (!autoSuggestMetaFields || !product?.id) return;

    const description = resolveSuggestionDescription(product, metaSuggestDescription);
    if (!description) {
      onAutoSuggestMetaFieldsConsumed?.();
      return;
    }

    let cancelled = false;
    loadMetaSuggestions(product, description).finally(() => {
      if (!cancelled) onAutoSuggestMetaFieldsConsumed?.();
    });

    return () => {
      cancelled = true;
    };
    // Only when opened for post-create suggest, not on every product patch.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [autoSuggestMetaFields, product?.id, metaSuggestDescription]);

  const handleDescriptionSaved = useCallback(
    (updatedProduct, nextDescription) => {
      if (!String(nextDescription || '').trim()) {
        setMetaSuggestions([]);
        return;
      }
      loadMetaSuggestions(updatedProduct, nextDescription);
    },
    [loadMetaSuggestions],
  );

  const handleSelectGalleryIndex = (index) => {
    setSelectedImageIndex(index);
    setSelectedVariationId(galleryItems[index]?.variationId ?? null);
  };

  const handleVariationSelect = (variation) => {
    setSelectedVariationId(variation.id);
    const index = findFirstGalleryIndexForVariation(galleryItems, variation.id);
    if (index >= 0) {
      setSelectedImageIndex(index);
    }
  };

  const handleHeaderImageUpload = async (fileList) => {
    if (!product?.id || !fileList?.length) return;

    const { validFiles, errorMessage } = validateProductMediaFiles(fileList);
    if (errorMessage) {
      showErrorToast(errorMessage);
    }
    if (validFiles.length === 0) return;

    setIsUploadingImages(true);
    try {
      const previousMainCount = collectMainProductImageUrls(product).length;
      const result = await addProductImages(product.id, validFiles, product);
      if (result?.product) {
        onProductUpdated?.(result.product);
        const nextGallery = buildProductGalleryItems(result.product);
        const firstNewIndex = nextGallery.findIndex(
          (item, index) => !item.variationId && index >= previousMainCount,
        );
        if (firstNewIndex >= 0) {
          setSelectedImageIndex(firstNewIndex);
          setSelectedVariationId(null);
        }
      }
      showSuccessToast('Product images uploaded');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to upload product images.' });
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleRemoveGalleryImage = async (index) => {
    const item = galleryItems[index];
    if (!item?.url || !product?.id) return;

    setIsRemovingImage(true);
    try {
      if (item.variationId) {
        const variation = product.variations?.find((row) => row.id === item.variationId);
        if (!variation) {
          showErrorToast('Variation not found.');
          return;
        }
        await removeVariationImage(item.variationId, item.url, variation);
        const refreshed = await getProduct(product.id);
        if (refreshed) onProductUpdated?.(refreshed);
      } else {
        const result = await removeProductImage(product.id, item.url, product);
        onProductUpdated?.(result.product);
      }

      setSelectedImageIndex((current) => {
        if (galleryItems.length <= 1) return 0;
        return Math.min(current, galleryItems.length - 2);
      });
      if (item.variationId) {
        setSelectedVariationId(item.variationId);
      } else {
        setSelectedVariationId(null);
      }
      showSuccessToast('Image removed');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to remove image.' });
    } finally {
      setIsRemovingImage(false);
    }
  };

  const handleRemoveBrochure = async () => {
    if (!product?.id || !product.brochure) return;

    setIsRemovingBrochure(true);
    try {
      const result = await removeProductBrochure(product.id, product);
      onProductUpdated?.(result.product);
      showSuccessToast('Brochure removed');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to remove brochure.' });
    } finally {
      setIsRemovingBrochure(false);
    }
  };

  useEffect(() => {
    if (!sections.some((section) => section.id === activeTab)) {
      setActiveTab('basic');
    }
  }, [activeTab, sections]);

  if (!product) return null;

  const documents = isJob
    ? (product.documents ?? [])
    : (product.documents ?? []).filter(
        (document) => String(document.documentType || '').toLowerCase() !== 'brochure',
      );

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
            disabled={isUploadingImages}
            onClick={() => headerImageInputRef.current?.click()}
          >
            <Button.Icon as={RiUploadLine} />
            {isUploadingImages ? 'Uploading…' : 'Upload'}
          </Button.Root>
          <input
            ref={headerImageInputRef}
            type='file'
            accept='image/*,video/*'
            multiple
            className='hidden'
            onChange={(event) => {
              handleHeaderImageUpload(event.target.files);
              event.target.value = '';
            }}
          />
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
        <div className='flex shrink-0 flex-col border-b border-stroke-soft-200 lg:h-[500px] lg:flex-row'>
          <ProductDetailImageGallery
            items={galleryItems}
            selectedIndex={selectedImageIndex}
            onSelectIndex={handleSelectGalleryIndex}
            onRemoveImage={handleRemoveGalleryImage}
            isRemovingImage={isRemovingImage}
            productName={product.name}
          />
          <ProductDetailHeroPanel
            product={product}
            isStockView={isStockView}
            showVariations={isProduct && !isStockView}
            selectedVariationId={selectedVariationId}
            onVariationSelect={handleVariationSelect}
            onBrochureDelete={handleRemoveBrochure}
            isRemovingBrochure={isRemovingBrochure}
            onProductUpdated={onProductUpdated}
            onDescriptionSaved={handleDescriptionSaved}
          />
        </div>

        <TabMenuHorizontal.Root value={activeTab} onValueChange={setActiveTab}>
          <TabMenuHorizontal.List
            wrapperClassName='border-b border-stroke-soft-200 bg-bg-weak-100/60'
            className='h-auto min-h-12 gap-6 border-0 px-6 py-3.5'
          >
            {sections.map((section) => (
              <TabMenuHorizontal.Trigger
                key={section.id}
                value={section.id}
                className='h-auto min-h-5 px-0 py-0 text-label-sm font-medium data-[state=active]:text-text-main-900'
              >
                {section.label}
              </TabMenuHorizontal.Trigger>
            ))}
          </TabMenuHorizontal.List>

          <TabMenuHorizontal.Content
            value='basic'
            className='outline-none data-[state=inactive]:hidden'
          >
            <DetailSection icon={RiInformationFill} title='Basic Details'>
              <ProductDetailBasicEditableSection
                product={product}
                isStockView={isStockView}
                onProductUpdated={onProductUpdated}
              />
            </DetailSection>

            <DetailSection icon={RiMoneyDollarCircleFill} title='Pricing' bordered={false}>
              <ProductDetailPricingEditableSection
                product={product}
                isStockView={isStockView}
                onProductUpdated={onProductUpdated}
                applyPriceToAllVariations={applyPriceToAllVariations}
                onApplyPriceToAllVariationsChange={setApplyPriceToAllVariations}
              />
            </DetailSection>

            {isProduct && !isStockView ? (
              <DetailSection icon={RiFileList3Fill} title='Meta Fields' bordered={false} borderTop>
                <ProductDetailMetaFieldsSection
                  product={product}
                  suggestions={metaSuggestions}
                  isSuggesting={isSuggestingMeta}
                  onSuggestionsChange={setMetaSuggestions}
                  onProductUpdated={onProductUpdated}
                />
              </DetailSection>
            ) : null}

            {isProduct && !isStockView ? (
              <DetailSection
                icon={RiTaskFill}
                title={specificationTitle}
                bordered={false}
                borderTop
              >
                <ProductDetailSpecificationEditableSection
                  product={product}
                  onProductUpdated={onProductUpdated}
                />
              </DetailSection>
            ) : null}
          </TabMenuHorizontal.Content>

          {isProduct && product.variations?.length ? (
            <TabMenuHorizontal.Content
              value='variations'
              className='outline-none data-[state=inactive]:hidden'
            >
              <ProductDetailVariationsSection
                productId={product.id}
                variations={product.variations}
                parentProduct={parentProductWithPricing}
                productDescription={product.description}
                focusVariationId={resolvedFocusVariationId}
                onProductUpdated={onProductUpdated}
              />
            </TabMenuHorizontal.Content>
          ) : null}

          <TabMenuHorizontal.Content
            value='documents'
            className='outline-none data-[state=inactive]:hidden'
          >
            <ProductDetailDocumentsSection
              productId={product.id}
              documents={documents}
              allDocuments={product.documents ?? []}
              onDocumentsUpdated={onProductUpdated}
              simpleMode={isJob}
            />
          </TabMenuHorizontal.Content>
        </TabMenuHorizontal.Root>
      </div>

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onOpenChange={onDeleteOpenChange}
        onConfirm={onDelete}
        isLoading={isDeleting}
        title='Delete Product?'
        description={`Are you sure you want to delete "${product.name}"? This action cannot be undone.`}
        confirmLabel='Delete'
        loadingLabel='Deleting...'
      />
    </div>
  );
}

function DetailSection({ icon: Icon, title, bordered = true, borderTop = false, children }) {
  return (
    <section
      className={cn(
        'flex flex-col gap-4 p-6',
        bordered && 'border-b border-stroke-soft-200',
        borderTop && 'border-t border-stroke-soft-200',
      )}
    >
      <SectionHeading icon={Icon} title={title} />
      <div className='flex flex-col gap-5'>{children}</div>
    </section>
  );
}

function SectionHeading({ icon: Icon, title }) {
  return (
    <div className='flex items-center gap-2'>
      <Icon className='size-5 shrink-0 text-text-sub-500' aria-hidden />
      <h2 className='text-label-sm font-semibold text-text-main-900'>{title}</h2>
    </div>
  );
}
