import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RiAddLine, RiPriceTag3Line } from 'react-icons/ri';

import { PRODUCT_FORM_FIELDS } from '@/api/productFormOptions';
import {
  PackageDetailField,
  PackageDetailFieldGrid,
} from '@/components/products/product-package/product-package-detail-fields';
import ProductFormSearchableSelect from '@/components/products/product-form-searchable-select';
import ProductFormMultiSearchableSelect from '@/components/products/product-form-multi-searchable-select';
import ProductsInlineTagsField from '@/components/products/products-inline-tags-field';
import { STOCKS_ADD_PRODUCT_TYPE_OPTIONS } from '@/components/stocks/constants';
import * as Badge from '@/components/ui/badge';
import * as Select from '@/components/ui/select';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import {
  activateEditField,
  EditTextInput,
  ProductDetailEditField,
  useEditingField,
  useProductFieldSave,
} from '@/components/products/product-detail-editable-fields/shared';

export function ProductDetailBasicEditableSection({
  product,
  onProductUpdated,
  isStockView = false,
}) {
  const { saveFields, savingKey } = useProductFieldSave(product.id, onProductUpdated);
  const { editingField, startEdit, endEdit } = useEditingField(product.id);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef(null);

  const vendors = product.vendors ?? [];

  const saveVendors = useCallback(
    async (nextVendors) => {
      const normalized = (Array.isArray(nextVendors) ? nextVendors : [])
        .map((vendor) => String(vendor || '').trim())
        .filter(Boolean);
      const current = vendors.map((vendor) => String(vendor || '').trim()).filter(Boolean);
      if (
        normalized.length === current.length &&
        normalized.every((vendor, index) => vendor === current[index])
      ) {
        return true;
      }
      return saveFields('vendors', { vendors: normalized }, { successMessage: 'Vendors updated' });
    },
    [saveFields, vendors],
  );

  useEffect(() => {
    if (editingField === 'tags') {
      tagInputRef.current?.focus();
    }
  }, [editingField]);

  const saveBrand = useCallback(
    async (brand) => {
      const trimmed = (brand ?? '').trim();
      const current = (product.brand || '').trim();
      if (trimmed === current) return true;
      return saveFields('brand', { brand: trimmed });
    },
    [product.brand, saveFields],
  );

  const saveMake = useCallback(
    async (make) => {
      const trimmed = make?.trim();
      const current = (product.make || '').trim();
      if (trimmed === current) return true;
      return saveFields('make', { make: trimmed });
    },
    [product.make, saveFields],
  );

  const saveCustomType = useCallback(
    async (customType) => {
      const trimmed = String(customType ?? '').trim();
      const current = String(product.customType || '').trim();
      if (trimmed === current) return true;
      return saveFields(
        'customType',
        { custom_type: trimmed, customType: trimmed },
        { successMessage: 'Type updated' },
      );
    },
    [product.customType, saveFields],
  );

  const saveHsnCode = useCallback(
    async (hsnCode) => {
      const trimmed = (hsnCode ?? '').trim();
      const current = (product.hsnCode || '').trim();
      if (trimmed === current) return true;
      return saveFields('hsnCode', { hsnCode: trimmed }, { successMessage: 'HSN code updated' });
    },
    [product.hsnCode, saveFields],
  );

  const tags = product.tags ?? [];

  const handleVendorsSave = async (nextVendors) => {
    await saveVendors(nextVendors);
    endEdit();
  };

  const saveWebsite = useCallback(
    async (website) => {
      const trimmed = website?.trim();
      if (trimmed === (product.website || '').trim()) return true;
      return saveFields('website', { product_website_link: trimmed });
    },
    [product.website, saveFields],
  );

  const saveTags = useCallback(
    async (nextTags) => {
      const normalized = nextTags.map((tag) => tag.trim()).filter(Boolean);
      const current = tags.map((tag) => tag.trim()).filter(Boolean);
      if (
        normalized.length === current.length &&
        normalized.every((tag, index) => tag === current[index])
      ) {
        return true;
      }
      return saveFields('tags', { tags: normalized }, { successMessage: 'Tags updated' });
    },
    [saveFields, tags],
  );

  const handleTagInputKeyDown = useCallback(
    async (event) => {
      if (event.key === 'Enter' && tagInput.trim()) {
        event.preventDefault();
        const newTag = tagInput.trim();
        if (!tags.includes(newTag)) {
          await saveTags([...tags, newTag]);
        }
        setTagInput('');
      }
    },
    [saveTags, tagInput, tags],
  );

  const handleRemoveTag = useCallback(
    async (tag) => {
      await saveTags(tags.filter((item) => item !== tag));
    },
    [saveTags, tags],
  );

  const handleBrandSave = async (brand) => {
    await saveBrand(brand);
    endEdit();
  };

  const handleMakeSave = async (make) => {
    await saveMake(make);
    endEdit();
  };

  const handleCustomTypeSave = async (customType) => {
    const saved = await saveCustomType(customType);
    if (saved) endEdit();
  };

  const handleHsnCodeSave = async (hsnCode) => {
    await saveHsnCode(hsnCode);
    endEdit();
  };

  return (
    <>
      <PackageDetailFieldGrid columns={4}>
        <ProductDetailEditField
          label='Brand'
          fieldKey='brand'
          editingField={editingField}
          onStartEdit={startEdit}
          display={product.brand || '--'}
        >
          <ProductFormSearchableSelect
            field={PRODUCT_FORM_FIELDS.BRAND}
            value={product.brand || ''}
            onValueChange={handleBrandSave}
            categoryGroup={product.categoryGroup}
            categoryType={product.categoryType || product.category}
            productGroup={product.productGroup}
            allowCreate
            disabled={savingKey === 'brand'}
            placeholder='Select'
            renderTriggerValue={({ placeholder }) => (
              <span className='block min-w-0 max-w-full truncate'>
                {product.brand || placeholder}
              </span>
            )}
          />
        </ProductDetailEditField>

        {!isStockView ? (
          <ProductDetailEditField
            label='Make'
            fieldKey='make'
            editingField={editingField}
            onStartEdit={startEdit}
            display={product.make || '--'}
          >
            <EditTextInput
              value={product.make || ''}
              placeholder='Enter make'
              onSave={handleMakeSave}
              onEndEdit={endEdit}
            />
          </ProductDetailEditField>
        ) : (
          <ProductDetailEditField
            label='Type'
            fieldKey='customType'
            editingField={editingField}
            onStartEdit={startEdit}
            display={product.customType || '--'}
          >
            <Select.Root
              value={product.customType || undefined}
              onValueChange={handleCustomTypeSave}
              disabled={savingKey === 'customType'}
            >
              <Select.Trigger>
                <Select.Value placeholder='Select type' />
              </Select.Trigger>
              <Select.Content>
                {STOCKS_ADD_PRODUCT_TYPE_OPTIONS.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </ProductDetailEditField>
        )}

        <PackageDetailField label='Category Group' value={product.categoryGroup} />
        <PackageDetailField label='Category' value={product.category || product.categoryType} />
        <PackageDetailField label='Product Group' value={product.productGroup} />
        <PackageDetailField label='Product Category' value={product.productType} />

        <ProductDetailEditField
          label='HSN Code'
          fieldKey='hsnCode'
          editingField={editingField}
          onStartEdit={startEdit}
          display={product.hsnLabel || product.hsnCode || '--'}
        >
          <ProductFormSearchableSelect
            field={PRODUCT_FORM_FIELDS.HSN_CODE}
            value={product.hsnCode || ''}
            onValueChange={handleHsnCodeSave}
            disabled={savingKey === 'hsnCode'}
            placeholder='Select HSN code'
            searchPlaceholder='Search HSN code or description'
            noResultsMessage='No HSN codes found'
            getOptionValue={(opt) => opt.value}
            getOptionLabel={(opt) => opt.label}
            renderTriggerValue={({ selectedOption, placeholder, value }) => (
              <span className='block min-w-0 max-w-full truncate'>
                {(selectedOption && selectedOption.label) || value || placeholder}
              </span>
            )}
          />
        </ProductDetailEditField>

        <ProductDetailEditField
          label='Vendor'
          fieldKey='vendor'
          editingField={editingField}
          onStartEdit={startEdit}
          display={
            vendors.length > 0 ? (
              <div className='flex flex-wrap gap-1.5'>
                {vendors.map((vendor) => (
                  <Badge.Root key={vendor} size='small' variant='stroke' color='gray'>
                    {vendor}
                  </Badge.Root>
                ))}
              </div>
            ) : (
              '--'
            )
          }
        >
          <ProductFormMultiSearchableSelect
            field={PRODUCT_FORM_FIELDS.VENDOR}
            value={vendors}
            onValueChange={handleVendorsSave}
            categoryGroup={product.categoryGroup}
            categoryType={product.categoryType || product.category}
            productGroup={product.productGroup}
            disabled={savingKey === 'vendors'}
            allowCreate
          />
        </ProductDetailEditField>

        {!isStockView ? (
          <ProductDetailEditField
            label='Website Link'
            fieldKey='website'
            editingField={editingField}
            onStartEdit={startEdit}
            display={
              product.website ? (
                <a
                  href={product.website}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='truncate text-primary-base underline decoration-solid underline-offset-2'
                >
                  {product.website}
                </a>
              ) : (
                '--'
              )
            }
          >
            <EditTextInput
              value={product.website || ''}
              placeholder='https://www.example.com'
              onSave={saveWebsite}
              onEndEdit={endEdit}
            />
          </ProductDetailEditField>
        ) : null}
      </PackageDetailFieldGrid>

      {!isStockView ? (
        <div className='flex flex-col gap-3'>
          <div className='flex items-center gap-2'>
            <RiPriceTag3Line className='size-5 shrink-0 text-text-sub-500' aria-hidden />
            <span className='text-label-md font-medium text-text-sub-500'>Tags</span>
          </div>

          {editingField === 'tags' ? (
            <ProductsInlineTagsField
              tags={tags}
              inputValue={tagInput}
              onInputChange={setTagInput}
              onInputKeyDown={handleTagInputKeyDown}
              onRemoveTag={handleRemoveTag}
              placeholder='Type here'
              inputRef={tagInputRef}
              className={savingKey === 'tags' ? 'pointer-events-none opacity-60' : undefined}
            />
          ) : (
            <EditableFieldWrapper editable className='cursor-pointer'>
              <div {...activateEditField(() => startEdit('tags'))}>
                {tags.length > 0 ? (
                  <div className='flex flex-wrap gap-2'>
                    {tags.map((tag) => (
                      <Badge.Root key={tag} size='small' variant='stroke' color='gray'>
                        {tag}
                      </Badge.Root>
                    ))}
                  </div>
                ) : (
                  <span className='text-label-sm font-medium text-text-main-900'>--</span>
                )}
              </div>
            </EditableFieldWrapper>
          )}

          {editingField !== 'tags' ? (
            <button
              type='button'
              onClick={() => startEdit('tags')}
              className='inline-flex w-fit items-center gap-1 text-label-xs font-medium text-primary-base underline'
            >
              <RiAddLine className='size-4 shrink-0' aria-hidden />
              Add New Tag
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
