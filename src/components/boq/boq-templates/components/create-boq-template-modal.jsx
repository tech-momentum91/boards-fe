import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiCloseLine, RiPantoneFill } from 'react-icons/ri';

import { createDefaultBoqTemplateForm } from '@/components/boq/boq-helper';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import ProductFormSearchableSelect from '@/components/products/product-form-searchable-select';
import ProductFormMultiSearchableSelect from '@/components/products/product-form-multi-searchable-select';
import * as Textarea from '@/components/ui/textarea';
import ErrorText from '@/components/ui/error-text';
import { cn } from '@/utils/cn';

const CreateBoqTemplateModal = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  typeOptions = [],
  categoryOptions = [],
  statusOptions = [],
  tagOptions = [],
  onCreateType,
}) => {
  const [form, setForm] = useState(createDefaultBoqTemplateForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) {
      setForm(createDefaultBoqTemplateForm());
      setErrors({});
    }
  }, [open]);

  const mergedTypeOptions = useMemo(() => {
    const known = new Set(typeOptions.map((option) => option.value));
    if (form.templateType && !known.has(form.templateType)) {
      return [...typeOptions, { value: form.templateType, label: form.templateType }];
    }
    return typeOptions;
  }, [form.templateType, typeOptions]);

  const mergedTagOptions = useMemo(() => {
    const known = new Set(tagOptions.map((option) => option.value));
    const extras = (form.tags ?? [])
      .filter((tag) => !known.has(tag))
      .map((tag) => ({ value: tag, label: tag }));
    return [...tagOptions, ...extras];
  }, [form.tags, tagOptions]);

  const updateField = useCallback((field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }, []);

  const validate = useCallback(() => {
    const nextErrors = {};
    if (!form.templateType) {
      nextErrors.templateType = 'Template type is required';
    }
    if (!form.templateCategory) {
      nextErrors.templateCategory = 'Template category is required';
    }
    if (!form.status) {
      nextErrors.status = 'Status is required';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [form.status, form.templateCategory, form.templateType]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    await onSubmit?.(form);
  }, [form, onSubmit, validate]);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      onOpenChange?.(nextOpen);
    },
    [onOpenChange],
  );

  const canSubmit = Boolean(form.templateType && form.templateCategory && form.status);

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content
        className='flex max-h-[min(734px,calc(100dvh-32px))] w-full max-w-[487px] flex-col overflow-hidden p-0'
        showClose={false}
      >
        <div className='flex shrink-0 items-center gap-4 border-b border-stroke-soft-200 px-5 py-4'>
          <span className='flex shrink-0 items-center justify-center rounded-full bg-success-lighter p-2.5'>
            <RiPantoneFill className='size-6 text-success-base' aria-hidden />
          </span>
          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <Modal.Title>Create New Template</Modal.Title>
            <Modal.Description>Quick create by entering basic details</Modal.Description>
          </div>
          <Modal.Close asChild>
            <CompactButton.Root variant='ghost' size='medium' className='shrink-0'>
              <CompactButton.Icon as={RiCloseLine} />
            </CompactButton.Root>
          </Modal.Close>
        </div>

        <Modal.Body className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5'>
          <div className='flex flex-col gap-1'>
            <Label.Root>Template name</Label.Root>
            <Input.Root size='medium'>
              <Input.Wrapper>
                <Input.Input
                  placeholder='Enter template name'
                  value={form.templateName}
                  onChange={(event) => updateField('templateName', event.target.value)}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root>
              Template Type
              <Label.Asterisk />
            </Label.Root>
            <ProductFormSearchableSelect
              staticOptions={mergedTypeOptions}
              value={form.templateType}
              onValueChange={(value) => updateField('templateType', value)}
              placeholder='Select'
              searchPlaceholder='Search or create type'
              allowCreate
              createLabel={(query) => `Add "${query}"`}
              onCreateOption={onCreateType}
              hasError={Boolean(errors.templateType)}
            />
            <ErrorText>{errors.templateType}</ErrorText>
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root>
              Template Category
              <Label.Asterisk />
            </Label.Root>
            <Select.Root
              value={form.templateCategory}
              onValueChange={(value) => updateField('templateCategory', value)}
            >
              <Select.Trigger
                className={cn('w-full', errors.templateCategory && 'ring-error-base')}
              >
                <Select.Value placeholder='Select' />
              </Select.Trigger>
              <Select.Content>
                {categoryOptions.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <ErrorText>{errors.templateCategory}</ErrorText>
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root>Sqft Area</Label.Root>
            <Input.Root size='medium'>
              <Input.Wrapper>
                <Input.Input
                  type='number'
                  min='0'
                  step='any'
                  placeholder='Enter sqft area'
                  value={form.sqftArea}
                  onChange={(event) => updateField('sqftArea', event.target.value)}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root>Description</Label.Root>
            <Textarea.Root
              className='h-[110px] min-h-[110px] w-full'
              placeholder='Type here....'
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              rows={4}
            />
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root>Tags</Label.Root>
            <ProductFormMultiSearchableSelect
              staticOptions={mergedTagOptions}
              value={form.tags}
              onValueChange={(value) => updateField('tags', value)}
              placeholder='Type here'
              searchPlaceholder='Search or create tags'
              allowCreate
              createLabel={(query) => `Add "${query}"`}
            />
          </div>

          <div className='flex flex-col gap-1'>
            <Label.Root>
              Status
              <Label.Asterisk />
            </Label.Root>
            <Select.Root
              value={form.status}
              onValueChange={(value) => updateField('status', value)}
            >
              <Select.Trigger className={cn('w-full', errors.status && 'ring-error-base')}>
                <Select.Value placeholder='Select' />
              </Select.Trigger>
              <Select.Content>
                {statusOptions.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <ErrorText>{errors.status}</ErrorText>
          </div>
        </Modal.Body>

        <Modal.Footer className='flex shrink-0 gap-3 border-t border-stroke-soft-200 px-5 py-4'>
          <Modal.Close asChild>
            <Button.Root
              className='flex-1'
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
            >
              Cancel
            </Button.Root>
          </Modal.Close>
          <Button.Root
            type='button'
            className='flex-1'
            variant='primary'
            mode='filled'
            size='small'
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Creating...' : 'Create template'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default CreateBoqTemplateModal;
