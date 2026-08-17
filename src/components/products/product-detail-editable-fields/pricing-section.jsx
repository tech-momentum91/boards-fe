import React, { useCallback, useMemo } from 'react';

import { PRODUCT_FORM_FIELDS } from '@/api/productFormOptions';
import { PackageDetailFieldGrid } from '@/components/products/product-package/product-package-detail-fields';
import ProductFormSearchableSelect from '@/components/products/product-form-searchable-select';
import {
  formatProductPrice,
  getPriceRangeDraftValues,
} from '@/components/products/products-price-utils';
import {
  formatStockProductPrice,
  getStockPriceDraftValue,
} from '@/components/products/product-detail-stock';
import {
  formatJobRate,
  hasJobComponentRates,
  isJobProductType,
  normalizeJobRateFields,
  syncJobPurchasePrices,
} from '@/components/products/products-job-pricing';
import * as Checkbox from '@/components/ui/checkbox';
import * as Label from '@/components/ui/label';
import {
  getPricingValidationError,
  getStockPricingValidationError,
} from '@/schemas/product-schema';
import { showErrorToast } from '@/utils/error-utils';
import {
  EditJobPriceInput,
  EditPriceRangeInput,
  EditSinglePriceInput,
  EditTextareaInput,
  EditTextInput,
  formatDetailMoq,
  formatDetailUom,
  formatGstRate,
  normalizeGstDraft,
  ProductDetailEditField,
  ReadOnlyDisplayField,
  ReadOnlyPriceField,
  useEditingField,
  useProductFieldSave,
} from '@/components/products/product-detail-editable-fields/shared';

export function ProductDetailPricingEditableSection({
  product,
  onProductUpdated,
  applyPriceToAllVariations = false,
  onApplyPriceToAllVariationsChange,
  isStockView = false,
}) {
  const { saveFields, savingKey } = useProductFieldSave(product.id, onProductUpdated);
  const { editingField, startEdit, endEdit } = useEditingField(product.id);
  const hasVariations = Boolean(product.hasVariations || product.variations?.length);
  const isJob = isJobProductType(product.devxProductType);
  const canEditTemplatePrices = !hasVariations || applyPriceToAllVariations;
  const priceDraft = useMemo(() => getPriceRangeDraftValues(product), [product]);
  const stockPriceDraft = useMemo(() => getStockPriceDraftValue(product), [product]);
  const stockPriceDisplay = useMemo(() => formatStockProductPrice(product), [product]);

  const saveMoq = useCallback(
    async (moq) => {
      const trimmed = moq?.trim();
      const current =
        product.minOrderQty != null && product.minOrderQty !== ''
          ? String(product.minOrderQty).trim()
          : product.moq == null || product.moq === ''
            ? ''
            : String(product.moq).trim();
      if (trimmed === current) return true;
      return saveFields('moq', { moq: trimmed });
    },
    [product.minOrderQty, product.moq, saveFields],
  );

  const savePricingNotes = useCallback(
    async (notes) => {
      const trimmed = notes?.trim();
      const current = (product.pricingNotes || '').trim();
      if (trimmed === current) return true;
      return saveFields('pricingNotes', { pricingNotes: trimmed });
    },
    [product.pricingNotes, saveFields],
  );

  const saveUom = useCallback(
    async (uom) => {
      const trimmed = (uom ?? '').trim();
      const current = (product.uom || '').trim();
      if (trimmed === current) return true;
      return saveFields(
        'uom',
        { stock_uom: trimmed, unitOfMeasure: trimmed },
        { successMessage: 'UOM updated' },
      );
    },
    [product.uom, saveFields],
  );

  const saveGstRate = useCallback(
    async (value) => {
      const trimmed = normalizeGstDraft(value);
      const current = normalizeGstDraft(product.gstRate);
      if (trimmed === current) return true;
      return saveFields(
        'gstRate',
        { gst_rate: trimmed, gstRate: trimmed },
        { successMessage: 'GST rate updated' },
      );
    },
    [product.gstRate, saveFields],
  );

  const savePrices = useCallback(
    async (priceValues) => {
      if (hasVariations && !applyPriceToAllVariations) {
        showErrorToast(
          'Enable "Apply this price to all variations" or edit prices on the Variations tab.',
        );
        return false;
      }

      const synced = isJob ? syncJobPurchasePrices(priceValues) : priceValues;
      const jobRates = normalizeJobRateFields(synced);
      const stockPrice = String(synced.maxPurchasePrice ?? synced.minPurchasePrice ?? '').trim();
      const pricingError = isStockView
        ? getStockPricingValidationError({
            minPurchasePrice: stockPrice,
            maxPurchasePrice: stockPrice,
          })
        : getPricingValidationError({
            devxProductType: product.devxProductType,
            applyPriceToAllVariations,
            hasVariations,
            minPurchasePrice: synced.minPurchasePrice,
            maxPurchasePrice: synced.maxPurchasePrice,
            materialBasicRate: jobRates.materialBasicRate,
            labourBaseRate: jobRates.labourBaseRate,
            minSellingPrice: synced.minSellingPrice,
            maxSellingPrice: synced.maxSellingPrice,
            variations: [],
          });

      if (pricingError) {
        showErrorToast(pricingError);
        return false;
      }

      // Stock: only Min/Max Purchase (same value). Do not alter selling lists.
      const pricePayload = isStockView
        ? {
            min_purchase_price: stockPrice,
            max_purchase_price: stockPrice,
          }
        : {
            min_purchase_price: String(synced.minPurchasePrice ?? '').trim(),
            max_purchase_price: String(synced.maxPurchasePrice ?? '').trim(),
            material_basic_rate: String(jobRates.materialBasicRate ?? '').trim(),
            materialBasicRate: String(jobRates.materialBasicRate ?? '').trim(),
            labour_base_rate: String(jobRates.labourBaseRate ?? '').trim(),
            labourBaseRate: String(jobRates.labourBaseRate ?? '').trim(),
            min_selling_price: String(synced.minSellingPrice ?? '').trim(),
            max_selling_price: String(synced.maxSellingPrice ?? '').trim(),
            sync_prices_to_variations: applyPriceToAllVariations && hasVariations,
          };

      return saveFields('prices', pricePayload, { successMessage: 'Pricing updated' });
    },
    [
      applyPriceToAllVariations,
      hasVariations,
      isJob,
      isStockView,
      product.devxProductType,
      saveFields,
    ],
  );

  const handleApplyPriceToggle = useCallback(
    (checked) => {
      onApplyPriceToAllVariationsChange?.(checked);

      if (checked) {
        const pricingError = getPricingValidationError({
          devxProductType: product.devxProductType,
          applyPriceToAllVariations: true,
          hasVariations,
          minPurchasePrice: priceDraft.minPurchasePrice,
          maxPurchasePrice: priceDraft.maxPurchasePrice,
          materialBasicRate: product.materialBasicRate,
          labourBaseRate: product.labourBaseRate,
          minSellingPrice: priceDraft.minSellingPrice,
          maxSellingPrice: priceDraft.maxSellingPrice,
          variations: [],
        });
        if (pricingError) {
          showErrorToast(`${pricingError} Edit prices below.`);
          startEdit('prices');
        }
      }
    },
    [
      hasVariations,
      onApplyPriceToAllVariationsChange,
      priceDraft,
      product.devxProductType,
      product.labourBaseRate,
      product.materialBasicRate,
      startEdit,
    ],
  );

  const moqDisplay = formatDetailMoq(product);
  const uomDisplay = formatDetailUom(product);
  const purchasePriceDisplay = isStockView ? stockPriceDisplay : formatProductPrice(product, true);
  const sellingPriceDisplay = formatProductPrice(product, false);
  const jobRates = normalizeJobRateFields(product);
  const materialRateDisplay = formatJobRate(jobRates.materialBasicRate);
  const labourRateDisplay = formatJobRate(jobRates.labourBaseRate);
  const totalRateDisplay = formatJobRate(product.minPurchasePrice || product.maxPurchasePrice);
  const hasJobComponents = hasJobComponentRates(
    jobRates.materialBasicRate,
    jobRates.labourBaseRate,
  );
  const gstDisplay = formatGstRate(product.gstRate);
  const startPriceEdit = canEditTemplatePrices ? () => startEdit('prices') : undefined;

  const handleUomSave = async (uom) => {
    await saveUom(uom);
    endEdit();
  };

  const handleGstSave = async (value) => {
    await saveGstRate(value);
    endEdit();
  };

  return (
    <>
      {editingField === 'prices' ? (
        <div className='w-full'>
          {isJob ? (
            <EditJobPriceInput
              materialBasicRate={product.materialBasicRate}
              labourBaseRate={product.labourBaseRate}
              minPurchasePrice={product.minPurchasePrice}
              maxPurchasePrice={product.maxPurchasePrice}
              minSellingPrice={product.minSellingPrice}
              maxSellingPrice={product.maxSellingPrice}
              requirePrices={canEditTemplatePrices}
              onSave={savePrices}
              onEndEdit={endEdit}
            />
          ) : isStockView ? (
            <EditSinglePriceInput
              price={stockPriceDraft}
              requirePrice
              onSave={savePrices}
              onEndEdit={endEdit}
            />
          ) : (
            <EditPriceRangeInput
              minPurchasePrice={priceDraft.minPurchasePrice}
              maxPurchasePrice={priceDraft.maxPurchasePrice}
              minSellingPrice={priceDraft.minSellingPrice}
              maxSellingPrice={priceDraft.maxSellingPrice}
              requirePrices={canEditTemplatePrices}
              onSave={savePrices}
              onEndEdit={endEdit}
            />
          )}
        </div>
      ) : isJob ? (
        <div className='flex w-full flex-col gap-5'>
          <div className='grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            <ReadOnlyPriceField
              label='Material Base Rate'
              value={materialRateDisplay}
              onEdit={startPriceEdit}
              editable={canEditTemplatePrices}
            />
            <ReadOnlyPriceField
              label='Labour Base Rate'
              value={labourRateDisplay}
              onEdit={startPriceEdit}
              editable={canEditTemplatePrices}
            />
            {hasJobComponents ? (
              <ReadOnlyDisplayField label='Total Rate' value={totalRateDisplay} />
            ) : (
              <ReadOnlyPriceField
                label='Total Rate'
                value={totalRateDisplay}
                onEdit={startPriceEdit}
                editable={canEditTemplatePrices}
              />
            )}
            <ReadOnlyPriceField
              label='Selling Price'
              value={sellingPriceDisplay}
              onEdit={startPriceEdit}
              editable={canEditTemplatePrices}
            />
          </div>
          <div className='grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            <ProductDetailEditField
              label='GST Rate'
              fieldKey='gstRate'
              editingField={editingField}
              onStartEdit={startEdit}
              display={gstDisplay}
            >
              <EditTextInput
                value={normalizeGstDraft(product.gstRate)}
                placeholder='Enter rate'
                onSave={handleGstSave}
                onEndEdit={endEdit}
              />
            </ProductDetailEditField>
            <ProductDetailEditField
              label='MOQ'
              fieldKey='moq'
              editingField={editingField}
              onStartEdit={startEdit}
              display={moqDisplay}
            >
              <EditTextInput
                value={moqDisplay === '--' ? '' : moqDisplay}
                placeholder='Enter MOQ'
                onSave={saveMoq}
                onEndEdit={endEdit}
              />
            </ProductDetailEditField>
            <ProductDetailEditField
              label='UOM'
              fieldKey='uom'
              editingField={editingField}
              onStartEdit={startEdit}
              display={uomDisplay}
            >
              <ProductFormSearchableSelect
                field={PRODUCT_FORM_FIELDS.UOM}
                value={product.uom || ''}
                onValueChange={handleUomSave}
                allowCreate
                disabled={savingKey === 'uom'}
                placeholder='Select UOM'
                renderTriggerValue={({ placeholder }) => (
                  <span className='block min-w-0 max-w-full truncate'>
                    {product.uom || placeholder}
                  </span>
                )}
              />
            </ProductDetailEditField>
            <div>
              <ProductDetailEditField
                label='Pricing Notes'
                fieldKey='pricingNotes'
                editingField={editingField}
                onStartEdit={startEdit}
                display={
                  product.pricingNotes ? (
                    <p className='whitespace-pre-wrap text-label-sm font-medium leading-5 text-text-main-900'>
                      {product.pricingNotes}
                    </p>
                  ) : (
                    '--'
                  )
                }
              >
                <EditTextareaInput
                  value={product.pricingNotes || ''}
                  placeholder='Add pricing notes'
                  onSave={savePricingNotes}
                  onEndEdit={endEdit}
                />
              </ProductDetailEditField>
            </div>
          </div>
        </div>
      ) : isStockView ? (
        <PackageDetailFieldGrid columns={2}>
          <ReadOnlyPriceField
            label='Price'
            value={purchasePriceDisplay}
            onEdit={startPriceEdit}
            editable={canEditTemplatePrices}
          />
          <ProductDetailEditField
            label='UOM'
            fieldKey='uom'
            editingField={editingField}
            onStartEdit={startEdit}
            display={uomDisplay}
          >
            <ProductFormSearchableSelect
              field={PRODUCT_FORM_FIELDS.UOM}
              value={product.uom || ''}
              onValueChange={handleUomSave}
              allowCreate
              disabled={savingKey === 'uom'}
              placeholder='Select UOM'
              renderTriggerValue={({ placeholder }) => (
                <span className='block min-w-0 max-w-full truncate'>
                  {product.uom || placeholder}
                </span>
              )}
            />
          </ProductDetailEditField>
        </PackageDetailFieldGrid>
      ) : (
        <PackageDetailFieldGrid columns={5}>
          <ReadOnlyPriceField
            label='Purchase Price'
            value={purchasePriceDisplay}
            onEdit={startPriceEdit}
            editable={canEditTemplatePrices}
          />
          <ReadOnlyPriceField
            label='Selling Price'
            value={sellingPriceDisplay}
            onEdit={startPriceEdit}
            editable={canEditTemplatePrices}
          />
          <ProductDetailEditField
            label='GST Rate'
            fieldKey='gstRate'
            editingField={editingField}
            onStartEdit={startEdit}
            display={gstDisplay}
          >
            <EditTextInput
              value={normalizeGstDraft(product.gstRate)}
              placeholder='Enter rate'
              onSave={handleGstSave}
              onEndEdit={endEdit}
            />
          </ProductDetailEditField>
          <ProductDetailEditField
            label='MOQ'
            fieldKey='moq'
            editingField={editingField}
            onStartEdit={startEdit}
            display={moqDisplay}
          >
            <EditTextInput
              value={moqDisplay === '--' ? '' : moqDisplay}
              placeholder='Enter MOQ'
              onSave={saveMoq}
              onEndEdit={endEdit}
            />
          </ProductDetailEditField>
          <ProductDetailEditField
            label='UOM'
            fieldKey='uom'
            editingField={editingField}
            onStartEdit={startEdit}
            display={uomDisplay}
          >
            <ProductFormSearchableSelect
              field={PRODUCT_FORM_FIELDS.UOM}
              value={product.uom || ''}
              onValueChange={handleUomSave}
              allowCreate
              disabled={savingKey === 'uom'}
              placeholder='Select UOM'
              renderTriggerValue={({ placeholder }) => (
                <span className='block min-w-0 max-w-full truncate'>
                  {product.uom || placeholder}
                </span>
              )}
            />
          </ProductDetailEditField>
        </PackageDetailFieldGrid>
      )}

      {!isJob && !isStockView ? (
        <ProductDetailEditField
          label='Pricing Notes'
          fieldKey='pricingNotes'
          editingField={editingField}
          onStartEdit={startEdit}
          className='col-span-full'
          display={
            product.pricingNotes ? (
              <p className='whitespace-pre-wrap text-label-sm font-medium leading-5 text-text-main-900'>
                {product.pricingNotes}
              </p>
            ) : (
              '--'
            )
          }
        >
          <EditTextareaInput
            value={product.pricingNotes || ''}
            placeholder='Add pricing notes'
            onSave={savePricingNotes}
            onEndEdit={endEdit}
          />
        </ProductDetailEditField>
      ) : null}

      {hasVariations ? (
        <div className='col-span-full flex items-center gap-2'>
          <Checkbox.Root
            id='detail-apply-price-to-all'
            checked={applyPriceToAllVariations}
            onCheckedChange={(checked) => handleApplyPriceToggle(checked === true)}
          />
          <Label.Root
            htmlFor='detail-apply-price-to-all'
            className='text-paragraph-sm text-text-main-900 cursor-pointer'
          >
            Apply this price to all variations
          </Label.Root>
        </div>
      ) : null}
    </>
  );
}
