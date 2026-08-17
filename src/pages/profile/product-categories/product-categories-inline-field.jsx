import React, { useEffect, useRef, useState } from 'react';

import { PRODUCT_FORM_FIELDS } from '@/api/productFormOptions';
import ProductFormSearchableSelect from '@/components/products/product-form-searchable-select';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import { valueInSelectOptions } from '@/components/stocks/stocks-helper';
import { cn } from '@/utils/cn';

/**
 * Pull field left by wrapper padding so typed text aligns with saved rows,
 * while keeping inner px-2 so focus ring does not hug the characters.
 */
const DRAFT_FIELD_ALIGN_CLASS = '-ml-2 w-[calc(100%+0.5rem)]';

/** Page-local styles — avoids gray hover/focus halo on borderless fields in this table only. */
const DRAFT_INPUT_ROOT_CLASS = cn(
  DRAFT_FIELD_ALIGN_CLASS,
  'shadow-none! hover:shadow-none',
  'before:ring-transparent hover:before:ring-transparent',
  'has-[input:focus]:!shadow-none has-[input:focus]:before:ring-primary-base',
);

const DRAFT_INPUT_WRAPPER_CLASS = cn(
  'px-2',
  'hover:!bg-transparent has-[input:focus]:!bg-transparent',
);

const DRAFT_SELECT_TRIGGER_CLASS = cn(
  DRAFT_FIELD_ALIGN_CLASS,
  'shadow-none! ring-transparent',
  '!pl-2 !pr-1.5',
  'hover:!bg-transparent hover:ring-transparent',
  'focus:!shadow-none focus:ring-primary-base',
  'data-[state=open]:!shadow-none data-[state=open]:ring-primary-base',
);

export function CategoryDraftTextInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  isName = false,
}) {
  const [localValue, setLocalValue] = useState(() => value ?? '');
  const isFocusedRef = useRef(false);
  const lastExternalValueRef = useRef(value ?? '');

  useEffect(() => {
    const next = value ?? '';
    if (isFocusedRef.current || next === lastExternalValueRef.current) return;
    lastExternalValueRef.current = next;
    setLocalValue(next);
  }, [value]);

  const handleChange = (event) => {
    setLocalValue(event.target.value);
  };

  const flushChange = (nextValue) => {
    if (nextValue === lastExternalValueRef.current) return;
    lastExternalValueRef.current = nextValue;
    onChange({ target: { value: nextValue } });
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    flushChange(localValue);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      flushChange(localValue);
      onKeyDown?.(event, localValue);
      return;
    }
    onKeyDown?.(event);
  };

  return (
    <Input.Root variant='borderless' size='xsmall' className={DRAFT_INPUT_ROOT_CLASS}>
      <Input.Wrapper className={DRAFT_INPUT_WRAPPER_CLASS}>
        <Input.Input
          value={localValue}
          onChange={handleChange}
          onFocus={() => {
            isFocusedRef.current = true;
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          className={
            isName ? 'label-small text-text-main-900' : 'paragraph-small text-text-sub-500'
          }
        />
      </Input.Wrapper>
    </Input.Root>
  );
}

export function CategoryDraftSelect({ value, onValueChange, options, placeholder = 'Select' }) {
  return (
    <Select.Root
      value={valueInSelectOptions(value, options)}
      onValueChange={onValueChange}
      variant='borderless'
      size='xsmall'
    >
      <Select.Trigger className={DRAFT_SELECT_TRIGGER_CLASS}>
        <Select.Value placeholder={placeholder} />
      </Select.Trigger>
      <Select.Content>
        {options.map((option) => (
          <Select.Item key={String(option.value)} value={option.value}>
            {option.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

export function CategoryHsnSelect({ value, onValueChange, disabled = false }) {
  return (
    <ProductFormSearchableSelect
      field={PRODUCT_FORM_FIELDS.HSN_CODE}
      value={value || ''}
      onValueChange={onValueChange}
      disabled={disabled}
      placeholder='Select HSN'
      searchPlaceholder='Search HSN code'
      noResultsMessage='No HSN codes found'
      getOptionValue={(opt) => opt.value}
      getOptionLabel={(opt) => opt.label}
      renderTriggerValue={({ placeholder }) => (
        <span className='block min-w-0 max-w-full truncate text-paragraph-sm text-text-sub-500'>
          {value || placeholder}
        </span>
      )}
    />
  );
}
