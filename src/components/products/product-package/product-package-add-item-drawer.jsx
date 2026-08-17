import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  RiBox3Line,
  RiCloseLine,
  RiMicrosoftLine,
  RiMoneyDollarCircleLine,
  RiStickyNoteLine,
  RiTaskLine,
} from 'react-icons/ri';

import { listProducts } from '@/api/products';
import ProductCategoryCascade from '@/components/products/product-category-cascade';
import ProductPackageItemsPickerTable from '@/components/products/product-package/product-package-items-picker-table';
import { sumSelectedProductPrices } from '@/components/products/products-price-utils';
import { buildProductsListApiFilters } from '@/components/products/products-filters';
import { PriceRangeField } from '@/components/products/products-pricing-variations';
import { EMPTY_PRODUCT_CATEGORY } from '@/components/products/product-category-utils';
import { PRODUCTS_TAB_IDS } from '@/components/products/constants';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Textarea from '@/components/ui/textarea';
import ErrorText from '@/components/ui/error-text';
import {
  defaultProductPackageAddItemValues,
  productPackageAddItemSchema,
} from '@/schemas/product-schema';
import { showErrorToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';

function FormSectionHeading({ icon: Icon, children }) {
  return (
    <div className='flex items-center gap-1.5'>
      {Icon ? <Icon className='size-5 shrink-0 text-text-soft-400' aria-hidden /> : null}
      <h3 className='label-medium text-text-sub-500'>{children}</h3>
    </div>
  );
}

function InlineSectionTitle({ icon: Icon, children }) {
  return (
    <div className='flex items-center gap-1.5'>
      {Icon ? <Icon className='size-5 shrink-0 text-text-soft-400' aria-hidden /> : null}
      <span className='text-label-md text-text-sub-500'>{children}</span>
    </div>
  );
}

function TextField({ label, required, value, onChange, placeholder, className, suffix, error }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Label.Root>
        {label}
        {required ? <Label.Asterisk /> : null}
      </Label.Root>
      <Input.Root size='medium' hasError={Boolean(error)}>
        <Input.Wrapper>
          <Input.Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
          />
          {suffix ? <Input.InlineAffix>{suffix}</Input.InlineAffix> : null}
        </Input.Wrapper>
      </Input.Root>
      {error ? <ErrorText>{error}</ErrorText> : null}
    </div>
  );
}

export default function ProductPackageAddItemDrawer({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}) {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [categoryValues, setCategoryValues] = useState(EMPTY_PRODUCT_CATEGORY);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [packageItemsSearch, setPackageItemsSearch] = useState('');
  const [availableProducts, setAvailableProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [packageItemsError, setPackageItemsError] = useState('');

  const hasCategorySelected = Boolean(categoryValues.categoryGroup);

  const scrollContainerRef = useRef(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productPackageAddItemSchema),
    defaultValues: defaultProductPackageAddItemValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const watchedDescription = watch('description');

  useEffect(() => {
    setValue('categoryGroup', categoryValues.categoryGroup, { shouldValidate: false });
    setValue('categoryType', categoryValues.categoryType, { shouldValidate: false });
    setValue('productGroup', categoryValues.productGroup, { shouldValidate: false });
    setValue('productType', categoryValues.productType, { shouldValidate: false });
  }, [categoryValues, setValue]);

  useEffect(() => {
    if (!open || !hasCategorySelected) {
      setAvailableProducts([]);
      return undefined;
    }

    let isMounted = true;
    setIsLoadingProducts(true);

    const filters = buildProductsListApiFilters(
      {
        categoryGroup: categoryValues.categoryGroup ? [categoryValues.categoryGroup] : [],
        categoryType: categoryValues.categoryType ? [categoryValues.categoryType] : [],
        productGroup: categoryValues.productGroup ? [categoryValues.productGroup] : [],
        productType: categoryValues.productType ? [categoryValues.productType] : [],
      },
      PRODUCTS_TAB_IDS.PRODUCT,
    );

    listProducts({
      devxProductType: PRODUCTS_TAB_IDS.PRODUCT,
      limitPageLength: 200,
      excludeTemplates: true,
      filters,
    })
      .then(({ rows }) => {
        if (isMounted) setAvailableProducts(rows);
      })
      .catch((error) => {
        if (isMounted) {
          setAvailableProducts([]);
          showErrorToast(error, { defaultMessage: 'Failed to load products for package.' });
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingProducts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [categoryValues, hasCategorySelected, open]);

  useEffect(() => {
    setSelectedProductIds((previous) =>
      previous.filter((id) => availableProducts.some((product) => product.id === id)),
    );
  }, [availableProducts]);

  useEffect(() => {
    const selectedProducts = availableProducts.filter((product) =>
      selectedProductIds.includes(product.id),
    );
    const purchaseTotals = sumSelectedProductPrices(selectedProducts, 'purchase');
    const sellingTotals = sumSelectedProductPrices(selectedProducts, 'selling');

    setValue('minPurchasePrice', purchaseTotals.min, { shouldValidate: false });
    setValue('maxPurchasePrice', purchaseTotals.max, { shouldValidate: false });
    setValue('minSellingPrice', sellingTotals.min, { shouldValidate: false });
    setValue('maxSellingPrice', sellingTotals.max, { shouldValidate: false });
  }, [availableProducts, selectedProductIds, setValue]);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      if (!nextOpen) {
        reset(defaultProductPackageAddItemValues);
        setIsDescriptionOpen(false);
        setCategoryValues(EMPTY_PRODUCT_CATEGORY);
        setSelectedProductIds([]);
        setPackageItemsSearch('');
        setPackageItemsError('');
        setAvailableProducts([]);
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
      }
      onOpenChange?.(nextOpen);
    },
    [onOpenChange, reset],
  );

  const onSubmitForm = useCallback(
    async (values) => {
      if (selectedProductIds.length === 0) {
        setPackageItemsError('Select at least one product for the package');
        return;
      }

      const selectedProducts = availableProducts.filter((product) =>
        selectedProductIds.includes(product.id),
      );

      setPackageItemsError('');
      try {
        await onSubmit?.({
          ...values,
          category: categoryValues,
          packageProducts: selectedProducts,
        });
        handleOpenChange(false);
      } catch {
        // Parent handles toast; keep drawer open on failure.
      }
    },
    [availableProducts, categoryValues, handleOpenChange, onSubmit, selectedProductIds],
  );

  const packageItemsContent = useMemo(() => {
    if (!hasCategorySelected) {
      return (
        <p className='text-label-sm text-text-soft-400'>
          Select product category to add item into package.
        </p>
      );
    }

    if (isLoadingProducts) {
      return <p className='text-label-sm text-text-soft-400'>Loading products...</p>;
    }

    if (availableProducts.length === 0) {
      return (
        <p className='text-label-sm text-text-soft-400'>No products found for this category.</p>
      );
    }

    return (
      <ProductPackageItemsPickerTable
        products={availableProducts}
        selectedProductIds={selectedProductIds}
        onSelectionChange={setSelectedProductIds}
        searchValue={packageItemsSearch}
      />
    );
  }, [
    availableProducts,
    hasCategorySelected,
    isLoadingProducts,
    packageItemsSearch,
    selectedProductIds,
  ]);

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange}>
      <Drawer.Content className='flex h-full max-h-dvh max-w-[800px] flex-col overflow-hidden bg-bg-weak-100'>
        <Drawer.Header
          className='sticky top-0 z-10 shrink-0 border-b border-stroke-soft-200 bg-bg-white-0 px-8 py-5'
          showCloseButton={false}
        >
          <div className='flex w-full items-start gap-4'>
            <div className='flex size-11 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 p-2.5 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
              <RiMicrosoftLine className='size-6 text-text-sub-500' aria-hidden />
            </div>
            <div className='flex min-w-0 flex-1 flex-col gap-1 pr-8'>
              <Drawer.Title className='text-label-lg text-text-main-900'>
                Create Product Package
              </Drawer.Title>
              <p className='paragraph-small text-text-sub-500'>
                Enter below details to create new product package.
              </p>
            </div>
            <Drawer.Close asChild>
              <Button.Root
                type='button'
                variant='neutral'
                mode='ghost'
                size='xsmall'
                className='absolute right-4 top-4'
                aria-label='Close create product package drawer'
              >
                <Button.Icon as={RiCloseLine} />
              </Button.Root>
            </Drawer.Close>
          </div>
        </Drawer.Header>

        <form
          onSubmit={handleSubmit(onSubmitForm)}
          className='flex min-h-0 flex-1 flex-col overflow-hidden'
        >
          <Drawer.Body className='min-h-0 flex-1 overflow-hidden p-0'>
            <div
              ref={scrollContainerRef}
              className='h-full min-h-0 min-w-0 overflow-y-auto bg-bg-white-0 px-8 pb-8 pt-5'
            >
              <div className='flex min-w-0 flex-col gap-5'>
                <section className='flex flex-col gap-4'>
                  <div className='flex flex-col gap-1'>
                    <Controller
                      name='productName'
                      control={control}
                      render={({ field }) => (
                        <Input.Root size='medium' hasError={Boolean(errors.productName)}>
                          <Input.Wrapper className='px-4 py-3'>
                            <Input.Input
                              value={field.value}
                              onChange={(event) => field.onChange(event.target.value)}
                              placeholder='Enter product package name'
                              className='text-[24px] font-medium leading-8 tracking-[-0.36px] placeholder:text-text-soft-400'
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      )}
                    />
                    {errors.productName ? (
                      <ErrorText>{errors.productName.message}</ErrorText>
                    ) : null}
                  </div>

                  <div className='flex flex-col gap-2'>
                    {isDescriptionOpen || String(watchedDescription || '').trim() ? (
                      <div className='flex flex-col gap-1.5'>
                        <Label.Root className='text-label-sm text-text-sub-500'>
                          Description
                        </Label.Root>
                        <Controller
                          name='description'
                          control={control}
                          render={({ field }) => (
                            <Textarea.Root
                              size='medium'
                              value={field.value || ''}
                              onChange={(event) => field.onChange(event.target.value)}
                              placeholder='Type here...'
                              rows={4}
                            />
                          )}
                        />
                      </div>
                    ) : (
                      <button
                        type='button'
                        onClick={() => setIsDescriptionOpen(true)}
                        className='flex w-full cursor-pointer items-center gap-1.5 rounded-lg border border-transparent py-1.5 pl-2 pr-1.5 text-left hover:border-stroke-sub-300'
                      >
                        <RiStickyNoteLine className='size-5 text-text-soft-400' />
                        <span className='text-paragraph-md text-text-soft-400'>
                          Add description
                        </span>
                      </button>
                    )}
                  </div>

                  <ProductCategoryCascade
                    values={categoryValues}
                    onChange={setCategoryValues}
                    error={errors.productType?.message}
                  />
                </section>

                <section className='flex min-w-0 flex-col gap-4 border-t border-stroke-soft-200 pt-5'>
                  <div className='flex min-w-0 items-center justify-between gap-4'>
                    <InlineSectionTitle icon={RiBox3Line}>Package Items</InlineSectionTitle>
                    {hasCategorySelected ? (
                      <Input.Root size='medium' className='w-full max-w-[276px]'>
                        <Input.Wrapper>
                          <Input.Input
                            value={packageItemsSearch}
                            onChange={(event) => setPackageItemsSearch(event.target.value)}
                            placeholder='Search products'
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    ) : null}
                  </div>

                  {packageItemsContent}
                  {packageItemsError ? <ErrorText>{packageItemsError}</ErrorText> : null}
                </section>

                <section className='flex flex-col gap-4 border-t border-stroke-soft-200 pt-5'>
                  <InlineSectionTitle icon={RiTaskLine}>Package Specification</InlineSectionTitle>
                  <Controller
                    name='specificationNotes'
                    control={control}
                    render={({ field }) => (
                      <Textarea.Root
                        size='medium'
                        value={field.value || ''}
                        onChange={(event) => field.onChange(event.target.value)}
                        placeholder='Type here....'
                        rows={5}
                      />
                    )}
                  />
                </section>

                <section className='flex flex-col gap-4 border-t border-stroke-soft-200 pt-8'>
                  <FormSectionHeading icon={RiMoneyDollarCircleLine}>Pricing</FormSectionHeading>

                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <Controller
                      name='minPurchasePrice'
                      control={control}
                      render={({ field: minField }) => (
                        <Controller
                          name='maxPurchasePrice'
                          control={control}
                          render={({ field: maxField }) => (
                            <PriceRangeField
                              label='Purchase Price'
                              minValue={minField.value}
                              maxValue={maxField.value}
                              onMinChange={minField.onChange}
                              onMaxChange={maxField.onChange}
                            />
                          )}
                        />
                      )}
                    />
                    <Controller
                      name='minSellingPrice'
                      control={control}
                      render={({ field: minField }) => (
                        <Controller
                          name='maxSellingPrice'
                          control={control}
                          render={({ field: maxField }) => (
                            <PriceRangeField
                              label='Selling Price'
                              minValue={minField.value}
                              maxValue={maxField.value}
                              onMinChange={minField.onChange}
                              onMaxChange={maxField.onChange}
                            />
                          )}
                        />
                      )}
                    />
                  </div>

                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <Controller
                      name='gstRate'
                      control={control}
                      render={({ field }) => (
                        <TextField
                          label='GST Rate'
                          value={field.value}
                          onChange={field.onChange}
                          placeholder='Enter rate'
                          suffix='%'
                        />
                      )}
                    />
                    <Controller
                      name='moq'
                      control={control}
                      render={({ field }) => (
                        <TextField
                          label='MOQ'
                          value={field.value}
                          onChange={field.onChange}
                          placeholder='Enter moq'
                        />
                      )}
                    />
                  </div>

                  <div className='flex flex-col gap-1'>
                    <Label.Root>Pricing Notes</Label.Root>
                    <Controller
                      name='pricingNotes'
                      control={control}
                      render={({ field }) => (
                        <Textarea.Root
                          size='medium'
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.value)}
                          placeholder='Type here....'
                          rows={4}
                        />
                      )}
                    />
                  </div>
                </section>
              </div>
            </div>
          </Drawer.Body>

          <Drawer.Footer className='sticky bottom-0 z-10 shrink-0 border-t border-stroke-soft-200 bg-bg-white-0 px-8 py-6'>
            <div className='flex justify-end gap-3'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='medium'
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button.Root>
              <Button.Root
                type='submit'
                variant='primary'
                mode='filled'
                size='medium'
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add'}
              </Button.Root>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
}
