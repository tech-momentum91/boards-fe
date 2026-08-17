import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiArrowLeftLine } from 'react-icons/ri';

import { selectOptionsIncludingValue } from '@/components/stocks/stocks-helper';
import StocksFormSearchableSelect from '@/components/stocks/shared/stocks-form-searchable-select';
import * as Input from '@/components/ui/input';
import * as LinkButton from '@/components/ui/link-button';

const ProductMasterUnitSelect = ({
  value,
  onValueChange,
  options = [],
  disabled = false,
  hasError = false,
  variant = 'borderless',
  size = 'xsmall',
  triggerClassName = 'w-full',
  commitOnChange = true,
  isLoading = false,
  error = null,
  onOpen,
}) => {
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [draftValue, setDraftValue] = useState(value ?? '');

  const effectiveOptions = useMemo(
    () => selectOptionsIncludingValue(value, options),
    [value, options],
  );
  const errorMessage =
    typeof error === 'string'
      ? error
      : error?.message || error?.error || error?.exception || error?.statusText || '';

  useEffect(() => {
    if (!isCreateMode) {
      setDraftValue(value ?? '');
    }
  }, [isCreateMode, value]);

  const handleCreateClick = useCallback(() => {
    setDraftValue(value ?? '');
    setIsCreateMode(true);
  }, [value]);

  const commitDraft = useCallback(() => {
    if (commitOnChange) return;
    onValueChange(String(draftValue ?? '').trim());
  }, [commitOnChange, draftValue, onValueChange]);

  const handleDraftChange = useCallback(
    (event) => {
      const nextValue = event.target.value;
      setDraftValue(nextValue);
      if (commitOnChange) {
        onValueChange(nextValue);
      }
    },
    [commitOnChange, onValueChange],
  );

  if (isCreateMode) {
    return (
      <div className='flex w-full flex-col gap-1.5'>
        <Input.Root variant={variant} size={size} hasError={hasError}>
          <Input.Wrapper>
            <Input.Input
              value={draftValue}
              onChange={handleDraftChange}
              onBlur={commitDraft}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitDraft();
                  setIsCreateMode(false);
                }
              }}
              placeholder='Enter new unit'
              disabled={disabled}
              autoFocus
            />
          </Input.Wrapper>
        </Input.Root>
        <LinkButton.Root
          type='button'
          variant='primary'
          size='small'
          onClick={() => setIsCreateMode(false)}
          className='w-full justify-start'
        >
          <RiArrowLeftLine /> Choose from existing units
        </LinkButton.Root>
      </div>
    );
  }

  return (
    <div className='flex w-full flex-col gap-1.5'>
      <StocksFormSearchableSelect
        value={value ?? ''}
        onValueChange={onValueChange}
        options={isLoading || errorMessage ? [] : effectiveOptions}
        placeholder='Select'
        emptyMessage={errorMessage || (isLoading ? 'Loading units...' : 'No units found')}
        variant={variant}
        size={size}
        hasError={hasError}
        disabled={disabled || isLoading}
        triggerClassName={triggerClassName}
        showArrow={variant !== 'borderless'}
        onOpenChange={(open) => {
          if (open) onOpen?.();
        }}
      />
      <LinkButton.Root
        type='button'
        variant='primary'
        size='small'
        onClick={handleCreateClick}
        className='w-full justify-start text-green-600'
      >
        Create new unit
      </LinkButton.Root>
    </div>
  );
};

export default ProductMasterUnitSelect;
