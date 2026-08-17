import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiDeleteBinLine,
  RiImageLine,
  RiMoneyDollarCircleLine,
  RiPantoneFill,
  RiPencilLine,
  RiPlayLine,
  RiUploadLine,
} from 'react-icons/ri';

import {
  addProductVariations,
  deleteProduct,
  getProduct,
  syncProductAfterVariationUpdate,
  updateProductVariation,
} from '@/api/products';
import { getVariationMediaItems } from '@/components/products/variation-media';
import { ProductDetailPropertyCard } from '@/components/products/product-detail-property-card';
import {
  VariationFormFields,
  VariationsListContent,
} from '@/components/products/products-pricing-variations';
import { formatVariationPrice } from '@/components/products/products-price-utils';
import {
  formatJobRate,
  isJobProductType,
  syncJobPurchasePrices,
} from '@/components/products/products-job-pricing';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import { getVariationSavePricingError } from '@/schemas/product-schema';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { validateProductMediaFiles } from '@/components/products/product-upload-utils';
import { cn } from '@/utils/cn';

function mapVariationMedia(variation) {
  if (variation.media?.length) return variation.media;
  return getVariationMediaItems(variation);
}

function mapVariationToEditable(variation) {
  const files = [];

  if (variation.imageUrl) {
    files.push({
      id: `${variation.id}-main`,
      fileName: 'Image',
      fileUrl: variation.imageUrl,
    });
  }

  (variation.galleryImages ?? []).forEach((item, index) => {
    const url = typeof item === 'string' ? item : item?.url;
    if (!url || url === variation.imageUrl) return;
    files.push({
      id: `${variation.id}-gallery-${index}`,
      fileName: `Image ${index + 1}`,
      fileUrl: url,
      isVideo: typeof item === 'object' ? Boolean(item?.isVideo) : false,
    });
  });

  return {
    id: variation.id,
    optionKey: variation.attributeValue || variation.name || '',
    name: variation.name || variation.attributeValue || '',
    description: variation.description || '',
    minPurchasePrice: variation.minPurchasePrice ?? '',
    maxPurchasePrice: variation.maxPurchasePrice ?? '',
    materialBasicRate: variation.materialBasicRate ?? '',
    labourBaseRate: variation.labourBaseRate ?? '',
    minSellingPrice: variation.minSellingPrice ?? '',
    maxSellingPrice: variation.maxSellingPrice ?? '',
    files,
  };
}

function mapFilesFromFileList(fileList) {
  return [...(fileList || [])].map((file) => ({
    id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    fileName: file.name,
    fileUrl:
      file.type.startsWith('image/') || file.type.startsWith('video/')
        ? URL.createObjectURL(file)
        : '',
    file,
    size: file.size,
    isVideo: file.type.startsWith('video/'),
  }));
}

function VariationMediaThumbnail({ item }) {
  return (
    <div className='relative shrink-0 pt-1.5'>
      <div className='flex size-[76px] items-center justify-center overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-weak-100 shadow-regular-xs'>
        {item.type === 'video' ? (
          <RiPlayLine className='size-5 text-text-soft-400' />
        ) : item.url ? (
          <img src={item.url} alt='' className='size-full object-cover' />
        ) : (
          <RiImageLine className='size-5 text-text-soft-400' />
        )}
      </div>
    </div>
  );
}

function getVariationDisplayDescription(variation, title) {
  const description = variation.description?.trim() || '';
  const normalizedTitle = String(title ?? '')
    .trim()
    .toLowerCase();
  if (!description || description.toLowerCase() === normalizedTitle) {
    return '';
  }
  return description;
}

function ReadOnlyVariationAccordionItem({
  variation,
  isOpen,
  onToggle,
  onDeleteRequest,
  onProductUpdated,
  productId,
  parentProduct,
}) {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState(null);
  const title = variation.name || variation.attributeValue || 'Variation';
  const description = getVariationDisplayDescription(variation, title);
  const isJob = isJobProductType(parentProduct.devxProductType);
  const purchasePrice = formatVariationPrice(variation, parentProduct, true);
  const sellingPrice = formatVariationPrice(variation, parentProduct, false);
  const materialRate = formatJobRate(variation.materialBasicRate);
  const labourRate = formatJobRate(variation.labourBaseRate);
  const totalRate = formatJobRate(variation.minPurchasePrice || variation.maxPurchasePrice);
  const media = mapVariationMedia(variation);
  const requirePrices = !parentProduct.applyPriceToAllVariations;

  useEffect(() => {
    setIsEditing(false);
    setDraft(null);
  }, [variation.id]);

  const handleUploadFiles = async (fileList) => {
    if (!fileList?.length) return;

    const { validFiles, errorMessage } = validateProductMediaFiles(fileList);
    if (errorMessage) {
      showErrorToast(errorMessage);
    }
    if (validFiles.length === 0) return;

    setIsUploading(true);
    try {
      const editable = mapVariationToEditable(variation);
      const updateResult = await updateProductVariation(
        variation.id,
        {
          ...editable,
          files: [...editable.files, ...mapFilesFromFileList(validFiles)],
        },
        parentProduct,
      );
      const nextProduct = await syncProductAfterVariationUpdate(
        productId,
        variation.id,
        updateResult,
        parentProduct,
      );
      if (nextProduct) {
        const imageUrl = updateResult?.product?.imageUrl;
        onProductUpdated?.(
          nextProduct,
          imageUrl ? { templateId: productId, variantId: variation.id, imageUrl } : undefined,
        );
      }
      showSuccessToast('Photos & video uploaded');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to upload photos & video.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartEdit = (event) => {
    event.stopPropagation();
    if (!isOpen) {
      onToggle();
    }
    setDraft(mapVariationToEditable(variation));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraft(null);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!draft) return;

    const pricingError = getVariationSavePricingError(
      draft,
      parentProduct.applyPriceToAllVariations,
      parentProduct.devxProductType,
    );
    if (pricingError) {
      showErrorToast(pricingError);
      return;
    }

    setIsSaving(true);
    try {
      const updateResult = await updateProductVariation(variation.id, draft, parentProduct);
      const nextProduct = await syncProductAfterVariationUpdate(
        productId,
        variation.id,
        updateResult,
        parentProduct,
      );
      if (nextProduct) {
        const imageUrl = updateResult?.product?.imageUrl;
        onProductUpdated?.(
          nextProduct,
          imageUrl ? { templateId: productId, variantId: variation.id, imageUrl } : undefined,
        );
      }
      showSuccessToast('Variation updated');
      setIsEditing(false);
      setDraft(null);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to update variation.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDraftAddFiles = (variationId, fileList) => {
    const newFiles = mapFilesFromFileList(fileList);
    setDraft((current) =>
      current ? { ...current, files: [...(current.files || []), ...newFiles] } : current,
    );
  };

  const handleDraftRemoveFile = (variationId, fileId) => {
    setDraft((current) => {
      if (!current) return current;
      const removedFile = current.files?.find((file) => file.id === fileId);
      if (removedFile?.fileUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(removedFile.fileUrl);
      }
      return { ...current, files: (current.files || []).filter((file) => file.id !== fileId) };
    });
  };

  return (
    <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-weak-100'>
      <div className='flex items-center justify-between bg-bg-weak-100 py-2 pl-5 pr-3'>
        <button
          type='button'
          onClick={onToggle}
          className='min-w-0 flex-1 truncate text-left text-label-sm font-medium text-text-main-900'
        >
          {title}
        </button>
        <div className='flex shrink-0 items-center gap-1.5'>
          {!isEditing ? (
            <CompactButton.Root
              type='button'
              variant='ghost'
              size='medium'
              onClick={handleStartEdit}
              aria-label={`Edit ${title}`}
              className='p-0.5 text-text-soft-400'
            >
              <CompactButton.Icon as={RiPencilLine} />
            </CompactButton.Root>
          ) : null}
          <CompactButton.Root
            type='button'
            variant='ghost'
            size='medium'
            onClick={(event) => {
              event.stopPropagation();
              onDeleteRequest?.(variation);
            }}
            aria-label={`Delete ${title}`}
            className='p-0.5 text-text-soft-400'
          >
            <CompactButton.Icon as={RiDeleteBinLine} />
          </CompactButton.Root>
          <CompactButton.Root
            type='button'
            variant='ghost'
            size='medium'
            onClick={onToggle}
            aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
            aria-expanded={isOpen}
            className='p-0.5 text-text-soft-400'
          >
            <CompactButton.Icon
              as={RiArrowDownSLine}
              className={cn('transition-transform duration-200', isOpen && 'rotate-180')}
            />
          </CompactButton.Root>
        </div>
      </div>

      {isOpen ? (
        <div className='rounded-t-[10px] border border-stroke-soft-200 bg-bg-white-0 px-5 py-5'>
          {isEditing && draft ? (
            <div className='flex flex-col gap-4'>
              <VariationFormFields
                variant={draft}
                requirePrices={requirePrices}
                pricingMode={isJob ? 'job' : 'product'}
                onUpdate={(patch) => setDraft((current) => ({ ...current, ...patch }))}
                onAddFiles={handleDraftAddFiles}
                onRemoveFile={handleDraftRemoveFile}
              />
              <div className='flex items-center justify-end gap-2'>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  disabled={isSaving}
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button.Root>
                <Button.Root
                  type='button'
                  variant='primary'
                  mode='filled'
                  size='xsmall'
                  disabled={isSaving}
                  onClick={handleSaveEdit}
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </Button.Root>
              </div>
            </div>
          ) : (
            <div className='flex flex-col gap-4'>
              {description ? (
                <p className='text-label-sm font-medium text-text-sub-500'>{description}</p>
              ) : null}

              <div className='flex flex-wrap gap-2.5'>
                {isJob ? (
                  <>
                    <ProductDetailPropertyCard
                      value={materialRate}
                      label='Material Basic Rate'
                      icon={RiMoneyDollarCircleLine}
                    />
                    <ProductDetailPropertyCard
                      value={labourRate}
                      label='Labour Base Rate'
                      icon={RiMoneyDollarCircleLine}
                    />
                    <ProductDetailPropertyCard
                      value={totalRate}
                      label='Total Rate'
                      icon={RiMoneyDollarCircleLine}
                    />
                    <ProductDetailPropertyCard
                      value={sellingPrice}
                      label='Selling Price'
                      icon={RiMoneyDollarCircleLine}
                    />
                  </>
                ) : (
                  <>
                    <ProductDetailPropertyCard
                      value={purchasePrice}
                      label='Purchase Price'
                      icon={RiMoneyDollarCircleLine}
                    />
                    <ProductDetailPropertyCard
                      value={sellingPrice}
                      label='Selling Price'
                      icon={RiMoneyDollarCircleLine}
                    />
                  </>
                )}
              </div>

              <div className='flex flex-col gap-1'>
                <div className='flex items-center justify-between gap-3'>
                  <span className='text-label-sm font-medium text-text-main-900'>
                    Photos & Video
                  </span>
                  <Button.Root
                    type='button'
                    variant='neutral'
                    mode='stroke'
                    size='xsmall'
                    disabled={isUploading}
                    className='min-w-[76px] gap-1 pl-2.5 pr-3 text-text-sub-500 shadow-regular-xs'
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Button.Icon as={RiUploadLine} />
                    {isUploading ? 'Uploading…' : 'Upload'}
                  </Button.Root>
                </div>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*,video/*'
                  multiple
                  className='hidden'
                  onChange={(event) => {
                    handleUploadFiles(event.target.files);
                    event.target.value = '';
                  }}
                />
                <div className='flex flex-wrap gap-1.5 pt-1'>
                  {media.length > 0 ? (
                    media.map((item) => <VariationMediaThumbnail key={item.id} item={item} />)
                  ) : (
                    <p className='text-paragraph-sm text-text-soft-400'>
                      No photos or videos added.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function createEmptyVariation(isJob = false) {
  const base = {
    id: `var-manual-${Date.now()}`,
    optionKey: '',
    name: '',
    description: '',
    minPurchasePrice: '',
    maxPurchasePrice: '',
    materialBasicRate: '',
    labourBaseRate: '',
    minSellingPrice: '',
    maxSellingPrice: '',
    files: [],
  };
  return isJob ? syncJobPurchasePrices(base) : base;
}

function defaultExpandedVariationId(variations = [], focusVariationId = null) {
  if (focusVariationId && variations.some((item) => item.id === focusVariationId)) {
    return focusVariationId;
  }
  return variations[1]?.id ?? variations[0]?.id ?? null;
}

export default function ProductDetailVariationsSection({
  productId,
  variations = [],
  parentProduct = {},
  productDescription = '',
  focusVariationId = null,
  onProductUpdated,
}) {
  const isJob = isJobProductType(parentProduct.devxProductType);
  const [expandedExistingId, setExpandedExistingId] = useState(() =>
    defaultExpandedVariationId(variations, focusVariationId),
  );
  const [draftVariations, setDraftVariations] = useState([]);
  const [savingIds, setSavingIds] = useState(() => new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const draftSectionRef = useRef(null);
  const pendingDraftScrollRef = useRef(false);

  useEffect(() => {
    setDraftVariations([]);
    setExpandedExistingId(defaultExpandedVariationId(variations, focusVariationId));
  }, [focusVariationId, productId]);

  useEffect(() => {
    if (variations.length === 0) {
      setExpandedExistingId(null);
      return;
    }
    if (!expandedExistingId || !variations.some((item) => item.id === expandedExistingId)) {
      setExpandedExistingId(defaultExpandedVariationId(variations, focusVariationId));
    }
  }, [expandedExistingId, focusVariationId, variations]);

  useEffect(() => {
    if (!pendingDraftScrollRef.current || draftVariations.length === 0) return;

    pendingDraftScrollRef.current = false;
    const frame = requestAnimationFrame(() => {
      draftSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => cancelAnimationFrame(frame);
  }, [draftVariations]);

  const setSaving = useCallback((variationId, isSaving) => {
    setSavingIds((current) => {
      const next = new Set(current);
      if (isSaving) next.add(variationId);
      else next.delete(variationId);
      return next;
    });
  }, []);

  const persistDraftVariation = useCallback(
    async (variation) => {
      const trimmedName = variation.name?.trim();
      if (!trimmedName) {
        showErrorToast('Variation name is required.');
        return;
      }

      const pricingError = getVariationSavePricingError(
        variation,
        parentProduct.applyPriceToAllVariations,
        parentProduct.devxProductType,
      );
      if (pricingError) {
        showErrorToast(pricingError);
        return;
      }

      setSaving(variation.id, true);
      try {
        const result = await addProductVariations(productId, [variation], parentProduct);
        const refreshed = await getProduct(productId);
        onProductUpdated?.(refreshed ?? result.product);
        setDraftVariations((prev) => prev.filter((item) => item.id !== variation.id));
        showSuccessToast('Variation saved');
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to save variation.' });
      } finally {
        setSaving(variation.id, false);
      }
    },
    [onProductUpdated, parentProduct, productId, setSaving],
  );

  const handleSaveDraft = useCallback(
    (variationId) => {
      const variation = draftVariations.find((item) => item.id === variationId);
      if (variation) {
        persistDraftVariation(variation);
      }
    },
    [draftVariations, persistDraftVariation],
  );

  const updateDraftVariation = useCallback((variationId, patch) => {
    setDraftVariations((prev) =>
      prev.map((item) => (item.id === variationId ? { ...item, ...patch } : item)),
    );
  }, []);

  const handleAddDraftFiles = useCallback((variationId, fileList) => {
    const newFiles = mapFilesFromFileList(fileList);
    setDraftVariations((prev) =>
      prev.map((item) =>
        item.id === variationId ? { ...item, files: [...(item.files || []), ...newFiles] } : item,
      ),
    );
  }, []);

  const handleRemoveDraftFile = useCallback((variationId, fileId) => {
    setDraftVariations((prev) =>
      prev.map((item) => {
        if (item.id !== variationId) return item;
        const removedFile = item.files.find((file) => file.id === fileId);
        if (removedFile?.fileUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(removedFile.fileUrl);
        }
        return { ...item, files: item.files.filter((file) => file.id !== fileId) };
      }),
    );
  }, []);

  const handleAddManualVariation = useCallback(() => {
    pendingDraftScrollRef.current = true;
    setDraftVariations((prev) => [...prev, createEmptyVariation(isJob)]);
  }, [isJob]);

  const handleRemoveDraftVariation = useCallback((variant) => {
    setDraftVariations((prev) => {
      const removed = prev.find((item) => item.id === variant.id);
      removed?.files?.forEach((file) => {
        if (file.fileUrl?.startsWith('blob:')) URL.revokeObjectURL(file.fileUrl);
      });
      return prev.filter((item) => item.id !== variant.id);
    });
  }, []);

  const handleDeleteRequest = useCallback((variation) => {
    setDeleteTarget(variation);
    setIsDeleteOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget?.id) return;

    setIsDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      showSuccessToast('Variation deleted successfully');
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      const refreshed = await getProduct(productId);
      if (refreshed) onProductUpdated?.(refreshed);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to delete variation.' });
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, onProductUpdated, productId]);

  const handleToggleExisting = useCallback((variantId) => {
    setExpandedExistingId((current) => (current === variantId ? null : variantId));
  }, []);

  if (variations.length === 0 && draftVariations.length === 0) {
    return (
      <section className='flex flex-col gap-4 p-6'>
        <div className='flex items-center justify-between gap-4'>
          <div className='flex items-center gap-2'>
            <RiPantoneFill className='size-5 shrink-0 text-text-sub-500' aria-hidden />
            <h2 className='text-label-sm font-semibold text-text-main-900'>Variations</h2>
          </div>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='xsmall'
            className='min-w-[76px] gap-1 bg-bg-white-0 pl-2.5 pr-3 text-text-sub-500 shadow-regular-xs'
            onClick={handleAddManualVariation}
          >
            <Button.Icon as={RiAddLine} />
            Add More Variation
          </Button.Root>
        </div>
        <p className='text-paragraph-sm text-text-soft-400'>
          No variations added for this product.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className='flex flex-col gap-4 p-6'>
        <div className='flex items-center justify-between gap-4'>
          <div className='flex items-center gap-2'>
            <RiPantoneFill className='size-5 shrink-0 text-text-sub-500' aria-hidden />
            <h2 className='text-label-sm font-semibold text-text-main-900'>Variations</h2>
            {savingIds.size > 0 ? (
              <span className='text-paragraph-xs text-text-soft-400'>Saving…</span>
            ) : null}
          </div>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='xsmall'
            className='min-w-[76px] gap-1 bg-bg-white-0 pl-2.5 pr-3 text-text-sub-500 shadow-regular-xs'
            onClick={handleAddManualVariation}
          >
            <Button.Icon as={RiAddLine} />
            Add More Variation
          </Button.Root>
        </div>

        <div className='flex flex-col gap-3'>
          {variations.map((variation) => (
            <ReadOnlyVariationAccordionItem
              key={variation.id}
              variation={variation}
              isOpen={expandedExistingId === variation.id}
              onToggle={() => handleToggleExisting(variation.id)}
              onDeleteRequest={handleDeleteRequest}
              onProductUpdated={onProductUpdated}
              productId={productId}
              parentProduct={parentProduct}
            />
          ))}
        </div>

        {draftVariations.length > 0 ? (
          <div
            ref={draftSectionRef}
            className='flex scroll-mt-6 flex-col gap-3 border-t border-stroke-soft-200 pt-4'
          >
            <VariationsListContent
              alwaysAccordion
              variations={draftVariations}
              onUpdate={updateDraftVariation}
              onRemove={handleRemoveDraftVariation}
              onAddFiles={handleAddDraftFiles}
              onRemoveFile={handleRemoveDraftFile}
              onSave={handleSaveDraft}
              getIsSaving={(variationId) => savingIds.has(variationId)}
              requirePrices={!parentProduct.applyPriceToAllVariations}
              pricingMode={isJob ? 'job' : 'product'}
            />
          </div>
        ) : null}
      </section>

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        title='Delete Variation?'
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name || deleteTarget.attributeValue || 'this variation'}"? This action cannot be undone.`
            : 'Are you sure you want to delete this variation? This action cannot be undone.'
        }
        confirmLabel='Delete'
        loadingLabel='Deleting...'
      />
    </>
  );
}
