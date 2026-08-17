import React, { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  RiAddLine,
  RiBox3Line,
  RiCloseLine,
  RiDeleteBinLine,
  RiInformationLine,
  RiPriceTag3Line,
  RiStarFill,
  RiStickyNoteLine,
  RiUploadCloud2Line,
} from 'react-icons/ri';

import { STOCKS_ADD_PRODUCT_TYPE_OPTIONS } from '@/components/stocks/constants';
import ProductMasterUnitSelect from '@/components/stocks/product-master/components/product-master-unit-select';
import StocksFormSearchableSelect from '@/components/stocks/shared/stocks-form-searchable-select';
import StocksGroupedCategorySelect from '@/components/stocks/shared/stocks-grouped-category-select';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';
import ErrorText from '@/components/ui/error-text';
import FieldRow from '@/components/ui/field-row';
import * as Input from '@/components/ui/input';
import * as LinkButton from '@/components/ui/link-button';
import * as Tag from '@/components/ui/tag';
import * as Tooltip from '@/components/ui/tooltip';
import { defaultStockAddProductValues, stockAddProductSchema } from '@/schemas/stock-schema';
import { formatFileSize } from '@/utils/file-utils';
import { showErrorToast } from '@/utils/error-utils';

const MAX_IMAGE_FILES = 10;
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

const CreateProductDrawer = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  categoryGroups = [],
  categoryGroupsLoading = false,
  categoryGroupsError = null,
  unitOptions = [],
  unitOptionsLoading = false,
  unitOptionsError = null,
  onUnitOptionsOpen,
  supplierOptions = [],
  suppliersLoading = false,
  suppliersError = null,
}) => {
  const imageInputRef = useRef(null);
  const [fileDragActive, setFileDragActive] = useState(false);
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [defaultSupplier, setDefaultSupplier] = useState('');
  const [showSupplierSelect, setShowSupplierSelect] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isValid, isSubmitting: isFormSubmitting },
  } = useForm({
    resolver: zodResolver(stockAddProductSchema),
    defaultValues: defaultStockAddProductValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const handleDrawerOpenChange = (nextOpen) => {
    if (!nextOpen) {
      reset(defaultStockAddProductValues);
      setFileDragActive(false);
      setSelectedSuppliers([]);
      setDefaultSupplier('');
      setShowSupplierSelect(false);
    }
    onOpenChange(nextOpen);
  };

  const handleImagePick = (fileList) => {
    const picked = fileList ? [...fileList] : [];
    if (picked.length === 0) return;
    const oversized = picked.filter((f) => f.size > MAX_IMAGE_BYTES);
    if (oversized.length > 0) {
      showErrorToast(
        new Error(
          `Each image must be at most 50 MB. Too large: ${oversized.map((f) => f.name).join(', ')}`,
        ),
        { defaultMessage: 'Image file is too large.' },
      );
      return;
    }
    const current = getValues('imageFiles') || [];
    const next = [...current, ...picked].slice(0, MAX_IMAGE_FILES);
    setValue('imageFiles', next, { shouldDirty: true, shouldValidate: true });
  };

  const handleRemoveImageAt = (index) => {
    const current = getValues('imageFiles') || [];
    setValue(
      'imageFiles',
      current.filter((_, i) => i !== index),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const handleAddProduct = async (formValues) => {
    const files = Array.isArray(formValues.imageFiles) ? formValues.imageFiles : [];
    const defaultVendor = selectedSuppliers.includes(defaultSupplier)
      ? defaultSupplier
      : selectedSuppliers[0] || '';
    const payload = {
      item_name: formValues.item_name.trim(),
      item_group: formValues.item_group,
      stock_uom: formValues.stock_uom,
      brand: formValues.brand.trim(),
      disabled: formValues.disabled ?? 0,
      custom_type: formValues.custom_type,
      custom_oem: (formValues.custom_oem || '').trim(),
      description: (formValues.description || '').trim(),
      market_price: formValues.market_price,
      purchase_price: formValues.purchase_price,
      suppliers: selectedSuppliers.map((supplier) => ({
        supplier,
        custom_default: supplier === defaultVendor ? 1 : 0,
      })),
    };
    if (files.length > 0) {
      payload.imageFiles = files;
    }

    await onSubmit(payload);

    handleDrawerOpenChange(false);
  };

  const handleSupplierSelect = (supplier) => {
    setSelectedSuppliers((previous) => {
      if (previous.includes(supplier)) return previous;
      setDefaultSupplier((current) => current || supplier);
      return [...previous, supplier];
    });
    setShowSupplierSelect(false);
  };

  const handleRemoveSupplier = (supplier) => {
    setSelectedSuppliers((previous) => {
      const next = previous.filter((item) => item !== supplier);
      setDefaultSupplier((current) => (current === supplier ? next[0] || '' : current));
      return next;
    });
  };

  const selectedSupplierOptions = supplierOptions.filter((option) =>
    selectedSuppliers.includes(option.value),
  );
  const availableSupplierOptions = supplierOptions.filter(
    (option) => !selectedSuppliers.includes(option.value),
  );
  const supplierErrorMessage =
    typeof suppliersError === 'string'
      ? suppliersError
      : suppliersError?.message ||
        suppliersError?.error ||
        suppliersError?.exception ||
        suppliersError?.statusText ||
        '';

  const imageFiles = watch('imageFiles') || [];
  const fileInfoLabel =
    imageFiles.length > 0
      ? `${imageFiles.length} file(s) selected (max ${MAX_IMAGE_FILES}, 50 MB each).`
      : 'JPEG, PNG formats, up to 50 MB each, up to 10 images.';

  const submitDisabled = !isValid || isSubmitting || isFormSubmitting;

  return (
    <Drawer.Root open={open} onOpenChange={handleDrawerOpenChange}>
      <Drawer.Content className='max-w-[520px]'>
        <Drawer.Header
          className='sticky top-0 z-10 border-b border-stroke-soft-200 bg-bg-white-0 px-6 py-4'
          showCloseButton={false}
        >
          <div className='flex w-full items-start justify-between gap-4'>
            <div className='flex items-start gap-3'>
              <div className='mt-0.5 flex size-7 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 text-text-sub-600'>
                <RiBox3Line className='size-4' />
              </div>
              <div className='flex flex-col gap-1'>
                <Drawer.Title className='label-medium text-text-strong-950'>
                  Add New Product
                </Drawer.Title>
                <p className='paragraph-small text-text-sub-600'>
                  Enter below details to add new product.
                </p>
              </div>
            </div>

            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='xsmall'
              onClick={() => handleDrawerOpenChange(false)}
            >
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
          </div>
        </Drawer.Header>

        <form onSubmit={handleSubmit(handleAddProduct)} className='flex h-full flex-col'>
          <Drawer.Body className='flex-1 overflow-y-auto py-4'>
            <div className='flex flex-col gap-4 px-4'>
              <div>
                <Input.Root hasError={Boolean(errors.item_name)}>
                  <Input.Wrapper>
                    <Input.Input
                      {...register('item_name')}
                      placeholder='Enter product title'
                      aria-label='Product title'
                    />
                  </Input.Wrapper>
                </Input.Root>
                {errors.item_name?.message ? (
                  <ErrorText>{errors.item_name.message}</ErrorText>
                ) : null}
              </div>

              <section className='flex flex-col bg- gap-2'>
                <div className='text-label-sm text-text-main-900'>Basic Information</div>
                <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
                  <div className='divide-y divide-stroke-soft-200'>
                    <FieldRow icon={RiPriceTag3Line} label='Brand Name' required>
                      <Input.Root
                        variant='borderless'
                        size='xsmall'
                        hasError={Boolean(errors.brand)}
                      >
                        <Input.Wrapper>
                          <Input.Input {...register('brand')} placeholder='Enter brand name' />
                        </Input.Wrapper>
                      </Input.Root>
                      {errors.brand?.message ? <ErrorText>{errors.brand.message}</ErrorText> : null}
                    </FieldRow>

                    <FieldRow icon={RiPriceTag3Line} label='OEM / Company'>
                      <Input.Root variant='borderless' size='xsmall'>
                        <Input.Wrapper>
                          <Input.Input
                            {...register('custom_oem')}
                            placeholder='Enter OEM / Company name'
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    </FieldRow>

                    <FieldRow icon={RiPriceTag3Line} label='Market Price' required>
                      <Input.Root
                        variant='borderless'
                        size='xsmall'
                        hasError={Boolean(errors.market_price)}
                      >
                        <Input.Wrapper>
                          <Input.Input
                            type='number'
                            min='0'
                            step='0.01'
                            {...register('market_price')}
                            placeholder='Enter market price'
                          />
                          <Input.Affix>₹</Input.Affix>
                        </Input.Wrapper>
                      </Input.Root>
                      {errors.market_price?.message ? (
                        <ErrorText>{errors.market_price.message}</ErrorText>
                      ) : null}
                    </FieldRow>

                    <FieldRow icon={RiPriceTag3Line} label='Purchase Price' required>
                      <Input.Root
                        variant='borderless'
                        size='xsmall'
                        hasError={Boolean(errors.purchase_price)}
                      >
                        <Input.Wrapper>
                          <Input.Input
                            type='number'
                            min='0'
                            step='0.01'
                            {...register('purchase_price')}
                            placeholder='Enter purchase price'
                          />
                          <Input.Affix>₹</Input.Affix>
                        </Input.Wrapper>
                      </Input.Root>
                      {errors.purchase_price?.message ? (
                        <ErrorText>{errors.purchase_price.message}</ErrorText>
                      ) : null}
                    </FieldRow>

                    <FieldRow icon={RiPriceTag3Line} label='Category' required>
                      <Controller
                        name='item_group'
                        control={control}
                        render={({ field }) => (
                          <StocksGroupedCategorySelect
                            value={field.value}
                            onValueChange={field.onChange}
                            groups={categoryGroups}
                            variant='borderless'
                            size='xsmall'
                            hasError={Boolean(errors.item_group)}
                            isLoading={categoryGroupsLoading}
                            errorMessage={
                              typeof categoryGroupsError === 'string' ? categoryGroupsError : ''
                            }
                          />
                        )}
                      />
                      {errors.item_group?.message ? (
                        <ErrorText>{errors.item_group.message}</ErrorText>
                      ) : null}
                    </FieldRow>

                    <FieldRow icon={RiPriceTag3Line} label='Unit' required>
                      <Controller
                        name='stock_uom'
                        control={control}
                        render={({ field }) => (
                          <ProductMasterUnitSelect
                            value={field.value}
                            onValueChange={field.onChange}
                            options={unitOptions}
                            isLoading={unitOptionsLoading}
                            error={unitOptionsError}
                            onOpen={onUnitOptionsOpen}
                            hasError={Boolean(errors.stock_uom)}
                          />
                        )}
                      />
                      {errors.stock_uom?.message ? (
                        <ErrorText>{errors.stock_uom.message}</ErrorText>
                      ) : null}
                    </FieldRow>

                    <FieldRow icon={RiPriceTag3Line} label='Type' required>
                      <Controller
                        name='custom_type'
                        control={control}
                        render={({ field }) => (
                          <StocksFormSearchableSelect
                            value={field.value}
                            onValueChange={field.onChange}
                            options={STOCKS_ADD_PRODUCT_TYPE_OPTIONS}
                            variant='borderless'
                            size='xsmall'
                            hasError={Boolean(errors.custom_type)}
                            triggerClassName='w-full'
                            showArrow={false}
                          />
                        )}
                      />
                      {errors.custom_type?.message ? (
                        <ErrorText>{errors.custom_type.message}</ErrorText>
                      ) : null}
                    </FieldRow>
                  </div>
                </div>
              </section>

              <section className='flex flex-col gap-2'>
                <div className='flex items-center gap-1.5 text-label-sm text-text-main-900'>
                  Vendors
                  <Tooltip.Root delayDuration={200}>
                    <Tooltip.Trigger asChild>
                      <button
                        type='button'
                        className='inline-flex text-text-sub-500 hover:text-text-main-900'
                        aria-label='Default vendor help'
                      >
                        <RiInformationLine className='size-4' />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Content side='top' size='xsmall'>
                      Click a selected vendor to make it default.
                    </Tooltip.Content>
                  </Tooltip.Root>
                </div>
                <div className='flex flex-col gap-3 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-3'>
                  {supplierErrorMessage ? (
                    <p className='text-paragraph-xs text-error-base'>{supplierErrorMessage}</p>
                  ) : null}

                  {suppliersLoading && supplierOptions.length === 0 ? (
                    <p className='text-paragraph-xs text-text-soft-400'>Loading vendors...</p>
                  ) : null}

                  {!suppliersLoading && !supplierErrorMessage && supplierOptions.length === 0 ? (
                    <p className='text-paragraph-xs text-text-soft-400'>No vendors available.</p>
                  ) : null}

                  {selectedSupplierOptions.length > 0 ? (
                    <div className='flex flex-wrap gap-2'>
                      {selectedSupplierOptions.map((supplier) => {
                        const isDefault = supplier.value === defaultSupplier;
                        const vendorTag = (
                          <Tag.Root
                            key={supplier.value}
                            onClick={() => setDefaultSupplier(supplier.value)}
                            title={isDefault ? 'Default vendor' : 'Set as default vendor'}
                            className={`cursor-pointer paragraph-xsmall ${
                              isDefault
                                ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] hover:bg-[var(--color-primary-lighter)] hover:text-[var(--color-primary-darker)]'
                                : ''
                            }`}
                            variant='stroke'
                          >
                            {isDefault ? (
                              <Tag.Icon
                                as={RiStarFill}
                                className='text-[var(--color-primary-darker)]'
                              />
                            ) : null}
                            {supplier.label}
                            <Tag.DismissButton
                              onClick={(event) => {
                                event.stopPropagation();
                                handleRemoveSupplier(supplier.value);
                              }}
                            />
                          </Tag.Root>
                        );

                        if (!isDefault) return vendorTag;

                        return (
                          <Tooltip.Root key={supplier.value} delayDuration={200}>
                            <Tooltip.Trigger asChild>{vendorTag}</Tooltip.Trigger>
                            <Tooltip.Content side='top' size='xsmall'>
                              Default vendor
                            </Tooltip.Content>
                          </Tooltip.Root>
                        );
                      })}
                    </div>
                  ) : null}

                  {showSupplierSelect ? (
                    <div className='grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2'>
                      <StocksFormSearchableSelect
                        value=''
                        onValueChange={handleSupplierSelect}
                        options={
                          suppliersLoading || supplierErrorMessage ? [] : availableSupplierOptions
                        }
                        placeholder='Select vendor'
                        emptyMessage={
                          supplierErrorMessage ||
                          (supplierOptions.length > 0 && availableSupplierOptions.length === 0
                            ? 'All vendors selected'
                            : suppliersLoading
                              ? 'Loading vendors...'
                              : 'No vendors available')
                        }
                        size='small'
                        disabled={
                          suppliersLoading ||
                          Boolean(supplierErrorMessage) ||
                          (supplierOptions.length > 0 && availableSupplierOptions.length === 0)
                        }
                      />
                      <Button.Root
                        type='button'
                        variant='neutral'
                        mode='stroke'
                        size='small'
                        onClick={() => setShowSupplierSelect(false)}
                        aria-label='Cancel vendor selection'
                      >
                        <Button.Icon as={RiCloseLine} />
                      </Button.Root>
                    </div>
                  ) : (
                    <LinkButton.Root
                      type='button'
                      variant='primary'
                      size='small'
                      onClick={() => setShowSupplierSelect(true)}
                      className='w-full justify-start'
                      disabled={
                        suppliersLoading ||
                        Boolean(supplierErrorMessage) ||
                        (supplierOptions.length > 0 && availableSupplierOptions.length === 0)
                      }
                    >
                      <LinkButton.Icon as={RiAddLine} />
                      Add Vendor
                    </LinkButton.Root>
                  )}
                </div>
              </section>

              <section className='flex flex-col gap-2'>
                <div className='text-label-sm text-text-main-900'>Product images</div>
                <div
                  className={`rounded-xl border border-dashed px-4 py-3 transition ${
                    fileDragActive
                      ? 'border-primary-base bg-bg-weak-50'
                      : 'border-stroke-soft-200 bg-bg-white-0'
                  }`}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setFileDragActive(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setFileDragActive(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setFileDragActive(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setFileDragActive(false);
                    handleImagePick(event.dataTransfer.files);
                  }}
                >
                  <div className='flex items-center justify-between gap-3'>
                    <div className='flex items-center gap-3'>
                      <RiUploadCloud2Line className='size-5 text-text-sub-600' />
                      <div className='min-w-0'>
                        <div className='label-small text-text-main-900'>
                          Choose files or drag &amp; drop here.
                        </div>
                        <div className='text-paragraph-xs text-text-soft-400'>{fileInfoLabel}</div>
                      </div>
                    </div>

                    <Button.Root
                      type='button'
                      variant='neutral'
                      mode='stroke'
                      size='xsmall'
                      onClick={() => imageInputRef.current?.click()}
                    >
                      Browse files
                    </Button.Root>
                    <input
                      ref={imageInputRef}
                      type='file'
                      accept='image/*'
                      multiple
                      className='hidden'
                      onChange={(event) => {
                        handleImagePick(event.target.files);
                        event.target.value = '';
                      }}
                    />
                  </div>
                </div>
                {errors.imageFiles?.message ? (
                  <ErrorText>{errors.imageFiles.message}</ErrorText>
                ) : null}
                {imageFiles.length > 0 ? (
                  <ul className='flex flex-col gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-3 py-2'>
                    {imageFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        className='flex items-center justify-between gap-2 text-paragraph-xs text-text-main-900'
                      >
                        <span className='min-w-0 truncate'>
                          {file.name} ({formatFileSize(file.size)})
                        </span>
                        <Button.Root
                          type='button'
                          variant='neutral'
                          mode='ghost'
                          size='xsmall'
                          className='shrink-0'
                          aria-label={`Remove ${file.name}`}
                          onClick={() => handleRemoveImageAt(index)}
                        >
                          <Button.Icon as={RiDeleteBinLine} />
                        </Button.Root>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              <section className='flex flex-col gap-2'>
                <div className='flex items-center gap-2 text-label-sm text-text-main-900'>
                  <RiStickyNoteLine className='size-4 text-text-sub-600' />
                  Notes
                </div>
                <Input.Root>
                  <Input.Wrapper>
                    <Input.Input
                      as='textarea'
                      rows={4}
                      className='resize-none py-2'
                      {...register('description')}
                      placeholder='Type here...'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </section>
            </div>
          </Drawer.Body>

          <Drawer.Footer className='sticky bottom-0 z-10 border-t border-stroke-soft-200 bg-bg-white-0'>
            <div className='flex items-center justify-end gap-2 px-6 py-4'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                onClick={() => handleDrawerOpenChange(false)}
              >
                Cancel
              </Button.Root>
              <Button.Root type='submit' disabled={submitDisabled}>
                {isSubmitting || isFormSubmitting ? 'Adding...' : 'Add'}
              </Button.Root>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CreateProductDrawer;
