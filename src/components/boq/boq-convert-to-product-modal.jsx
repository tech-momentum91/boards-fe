import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiBox3Line } from 'react-icons/ri';

import { PRODUCT_FORM_FIELDS } from '@/api/productFormOptions';
import {
  convertBoqLineToProduct,
  mapBoqLineToConvertProductFormValues,
} from '@/components/boq/boq-convert-to-product-service';
import ProductCategoryCascade from '@/components/products/product-category-cascade';
import ProductFormSearchableSelect from '@/components/products/product-form-searchable-select';
import { EMPTY_PRODUCT_CATEGORY } from '@/components/products/product-category-utils';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Modal from '@/components/ui/modal';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const defaultFormState = () => ({
  productName: '',
  unitOfMeasure: '',
  minPurchasePrice: '',
  maxPurchasePrice: '',
  minSellingPrice: '',
  maxSellingPrice: '',
  hsnCode: '',
});

export default function BoqConvertToProductModal({
  open,
  onOpenChange,
  lineItem = null,
  lineItems = [],
  boqContext = {},
  onConverted,
}) {
  const [formState, setFormState] = useState(defaultFormState);
  const [categoryValues, setCategoryValues] = useState(EMPTY_PRODUCT_CATEGORY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);

  const queue = useMemo(() => {
    const items = Array.isArray(lineItems) && lineItems.length > 0 ? lineItems : [];
    if (items.length > 0) return items;
    return lineItem ? [lineItem] : [];
  }, [lineItem, lineItems]);

  const activeLine = queue[queueIndex] ?? null;
  const remainingCount = Math.max(queue.length - queueIndex - 1, 0);

  useEffect(() => {
    if (!open || !activeLine) return;
    const mapped = mapBoqLineToConvertProductFormValues(activeLine);
    setFormState({
      productName: mapped.productName,
      unitOfMeasure: mapped.unitOfMeasure,
      minPurchasePrice: mapped.minPurchasePrice,
      maxPurchasePrice: mapped.maxPurchasePrice,
      minSellingPrice: mapped.minSellingPrice,
      maxSellingPrice: mapped.maxSellingPrice,
      hsnCode: mapped.hsnCode,
    });
    setCategoryValues({
      categoryGroup: mapped.categoryGroup,
      categoryType: mapped.categoryType,
      productGroup: mapped.productGroup,
      productType: mapped.productType,
      hsnCode: mapped.hsnCode,
    });
  }, [activeLine, open]);

  const resetAndClose = useCallback(() => {
    setFormState(defaultFormState());
    setCategoryValues(EMPTY_PRODUCT_CATEGORY);
    setQueueIndex(0);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleSubmit = useCallback(async () => {
    if (!activeLine) return;

    const productName = formState.productName.trim();
    const unitOfMeasure = formState.unitOfMeasure.trim();
    const hsnCode = formState.hsnCode.trim();

    if (!productName) {
      showErrorToast(null, { defaultMessage: 'Product name is required.' });
      return;
    }
    if (!categoryValues.productType) {
      showErrorToast(null, { defaultMessage: 'Product category is required.' });
      return;
    }
    if (!unitOfMeasure) {
      showErrorToast(null, { defaultMessage: 'Unit of measure is required.' });
      return;
    }
    if (!hsnCode) {
      showErrorToast(null, { defaultMessage: 'HSN code is required.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await convertBoqLineToProduct({
        lineItem: activeLine,
        formValues: {
          ...formState,
          productName,
          unitOfMeasure,
          hsnCode,
          categoryGroup: categoryValues.categoryGroup,
          categoryType: categoryValues.categoryType,
          productGroup: categoryValues.productGroup,
          productType: categoryValues.productType,
          brand: activeLine.brand ?? '',
          description: activeLine.description ?? '',
        },
        boqContext,
      });

      await onConverted?.(result.lineItem, result);

      if (queueIndex < queue.length - 1) {
        setQueueIndex((previous) => previous + 1);
        showSuccessToast(
          remainingCount > 0
            ? `Product created. ${remainingCount} more item(s) to convert.`
            : 'Product created successfully.',
        );
        return;
      }

      showSuccessToast('Product created and line item linked successfully.');
      resetAndClose();
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to convert line item to product.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    activeLine,
    boqContext,
    categoryValues,
    formState,
    onConverted,
    queue.length,
    queueIndex,
    remainingCount,
    resetAndClose,
  ]);

  if (!activeLine) return null;

  return (
    <Modal.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) onOpenChange?.(nextOpen);
        else resetAndClose();
      }}
    >
      <Modal.Content className='max-w-[520px]'>
        <Modal.Header
          icon={RiBox3Line}
          title='Convert to Product'
          description={
            queue.length > 1
              ? `Create a product master entry for this line (${queueIndex + 1} of ${queue.length}).`
              : 'Create a product master entry and link it to this BOQ line.'
          }
        />

        <Modal.Body className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1.5'>
            <Label.Root htmlFor='convert-product-name'>
              Product name <Label.Asterisk />
            </Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input
                  id='convert-product-name'
                  value={formState.productName}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      productName: event.target.value,
                    }))
                  }
                  placeholder='Product name'
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <ProductCategoryCascade values={categoryValues} onChange={setCategoryValues} />

          <div className='grid grid-cols-2 gap-4'>
            <div className='flex flex-col gap-1.5'>
              <Label.Root htmlFor='convert-uom'>
                UOM <Label.Asterisk />
              </Label.Root>
              <ProductFormSearchableSelect
                field={PRODUCT_FORM_FIELDS.UOM}
                value={formState.unitOfMeasure}
                onValueChange={(nextValue) =>
                  setFormState((previous) => ({ ...previous, unitOfMeasure: nextValue }))
                }
                categoryGroup={categoryValues.categoryGroup}
                categoryType={categoryValues.categoryType}
                productGroup={categoryValues.productGroup}
                placeholder='Select UOM'
              />
            </div>

            <div className='flex flex-col gap-1.5'>
              <Label.Root htmlFor='convert-hsn'>
                HSN code <Label.Asterisk />
              </Label.Root>
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input
                    id='convert-hsn'
                    value={formState.hsnCode}
                    onChange={(event) =>
                      setFormState((previous) => ({ ...previous, hsnCode: event.target.value }))
                    }
                    placeholder='HSN code'
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='flex flex-col gap-1.5'>
              <Label.Root htmlFor='convert-purchase-price'>Purchase price</Label.Root>
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input
                    id='convert-purchase-price'
                    value={formState.minPurchasePrice}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setFormState((previous) => ({
                        ...previous,
                        minPurchasePrice: nextValue,
                        maxPurchasePrice: nextValue,
                      }));
                    }}
                    placeholder='Purchase price'
                    inputMode='decimal'
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>

            <div className='flex flex-col gap-1.5'>
              <Label.Root htmlFor='convert-selling-price'>Selling price</Label.Root>
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input
                    id='convert-selling-price'
                    value={formState.minSellingPrice}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setFormState((previous) => ({
                        ...previous,
                        minSellingPrice: nextValue,
                        maxSellingPrice: nextValue,
                      }));
                    }}
                    placeholder='Selling price'
                    inputMode='decimal'
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            onClick={resetAndClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button.Root>
          <Button.Root type='button' onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create product'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
