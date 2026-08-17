import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowLeftLine,
  RiCheckLine,
  RiSearchLine,
} from 'react-icons/ri';

import {
  createProductFormOption,
  searchProductFormOptions,
  PRODUCT_FORM_FIELDS,
  getProductFormOptionValue,
  getProductFormOptionLabel,
} from '@/api/productFormOptions';
import * as Input from '@/components/ui/input';
import * as LinkButton from '@/components/ui/link-button';
import * as Popover from '@/components/ui/popover';
import * as Tag from '@/components/ui/tag';
import { selectVariants } from '@/components/ui/select';
import { useDebounce } from '@/hooks/use-debounce';
import { showErrorToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';

function getCreateInputPlaceholder(createNewLabel) {
  if (!createNewLabel || createNewLabel === 'Create new') {
    return 'Enter new value';
  }
  return createNewLabel.replace(/^create new/i, 'Enter new');
}

const SEARCH_DEBOUNCE_MS = 300;

function filterStaticOptions(options, query, getOptionLabel) {
  const normalizedQuery = String(query ?? '')
    .trim()
    .toLowerCase();
  if (!normalizedQuery) return options;
  return options.filter((opt) =>
    String(getOptionLabel(opt)).toLowerCase().includes(normalizedQuery),
  );
}

const CONTENT_CLASS =
  'relative z-[600] max-h-[300px] w-(--radix-popover-trigger-width) min-w-0 overflow-hidden rounded-2xl bg-bg-white-0 p-0 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200';

/**
 * Server-searchable multi-select for product form fields (e.g. vendors).
 */
export default function ProductFormMultiSearchableSelect({
  field,
  value = [],
  onValueChange,
  categoryGroup,
  categoryType,
  productGroup,
  assetType,
  hasError,
  disabled,
  placeholder = 'Select',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options available',
  noResultsMessage = 'No options found',
  getOptionValue: getOptionValueProp,
  getOptionLabel: getOptionLabelProp,
  renderOptionLabel,
  allowCreate = false,
  createNewLabel = 'Create new',
  createInputPlaceholder = getCreateInputPlaceholder(createNewLabel),
  chooseExistingLabel = 'Choose from existing',
  createLabel = (query) => `Add new "${query}"`,
  onCreateOption,
  staticOptions,
}) {
  const [open, setOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [draftValue, setDraftValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [labelByValue, setLabelByValue] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef(null);
  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);
  const useStaticOptions = Array.isArray(staticOptions);
  const getOptionValueRef = useRef(getOptionValueProp);
  const getOptionLabelRef = useRef(getOptionLabelProp);

  getOptionValueRef.current =
    getOptionValueProp ?? ((opt) => getProductFormOptionValue(field, opt));
  getOptionLabelRef.current =
    getOptionLabelProp ?? ((opt) => getProductFormOptionLabel(field, opt));

  const getOptionValue = useCallback((opt) => getOptionValueRef.current(opt), []);
  const getOptionLabel = useCallback((opt) => getOptionLabelRef.current(opt), []);

  const rememberLabels = useCallback((opts) => {
    if (!Array.isArray(opts) || opts.length === 0) return;
    setLabelByValue((prev) => {
      const merged = { ...prev };
      for (const opt of opts) {
        const key = String(getOptionValueRef.current(opt) ?? '').trim();
        if (key) merged[key] = getOptionLabelRef.current(opt);
      }
      return merged;
    });
  }, []);

  const labelFor = (item) => labelByValue[item] ?? item;

  const selectedValues = useMemo(
    () =>
      (Array.isArray(value) ? value : []).map((item) => String(item ?? '').trim()).filter(Boolean),
    [value],
  );

  const { triggerRoot, triggerArrow } = selectVariants({
    size: 'medium',
    hasError,
  });

  useEffect(() => {
    if (!open) return undefined;

    if (useStaticOptions) {
      setOptions(filterStaticOptions(staticOptions, debouncedSearch, getOptionLabel));
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);

    searchProductFormOptions({
      field,
      search: debouncedSearch,
      categoryGroup,
      categoryType,
      productGroup,
      assetType,
    })
      .then((result) => {
        if (cancelled) return;
        const nextOptions = Array.isArray(result) ? result : [];
        setOptions(nextOptions);
        rememberLabels(nextOptions);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    open,
    debouncedSearch,
    field,
    categoryGroup,
    categoryType,
    productGroup,
    useStaticOptions,
    staticOptions,
    getOptionLabel,
    assetType,
    rememberLabels,
  ]);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      if (!useStaticOptions) {
        setOptions([]);
      }
    }
  }, [open, useStaticOptions]);

  useEffect(() => {
    if (!open) return undefined;
    const idFrame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(idFrame);
  }, [open]);

  const isDebouncing = searchQuery.trim() !== debouncedSearch.trim();
  const createQuery = debouncedSearch.trim();
  const hasExactCreateMatch = useMemo(() => {
    if (!createQuery) return true;
    return (
      options.some(
        (opt) => String(getOptionLabel(opt)).toLowerCase() === createQuery.toLowerCase(),
      ) || selectedValues.some((item) => item.toLowerCase() === createQuery.toLowerCase())
    );
  }, [createQuery, getOptionLabel, options, selectedValues]);
  const showCreateOption = allowCreate && createQuery && !hasExactCreateMatch && !isDebouncing;

  const listEmptyMessage = (() => {
    if (isLoading || isDebouncing) return 'Loading...';
    return debouncedSearch.trim() ? noResultsMessage : emptyMessage;
  })();

  const toggleValue = (nextValue) => {
    const key = String(nextValue ?? '').trim();
    if (!key) return;
    const exists = selectedValues.includes(key);
    const next = exists ? selectedValues.filter((item) => item !== key) : [...selectedValues, key];
    onValueChange?.(next);
  };

  const removeValue = (itemValue) => {
    onValueChange?.(selectedValues.filter((item) => item !== itemValue));
  };

  const handleCreate = async (query) => {
    const nextValue = String(query ?? '').trim();
    if (!nextValue || isCreating) return;

    try {
      setIsCreating(true);
      let createdOption = null;

      if (onCreateOption) {
        createdOption = await onCreateOption(nextValue);
      } else if (allowCreate && field) {
        createdOption = await createProductFormOption({
          field,
          name: nextValue,
          categoryGroup,
          categoryType,
          productGroup,
        });
      }

      const resolvedValue = createdOption ? getOptionValue(createdOption) : nextValue;
      if (createdOption) rememberLabels([createdOption]);
      if (!selectedValues.includes(resolvedValue)) {
        onValueChange?.([...selectedValues, resolvedValue]);
      }
      setSearchQuery('');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to create option.' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEnterCreateMode = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDraftValue('');
    setIsCreateMode(true);
    setOpen(false);
    setSearchQuery('');
  };

  const handlePersistentCreateClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const query = searchQuery.trim() || debouncedSearch.trim();
    if (query) {
      void handleCreate(query);
      return;
    }
    handleEnterCreateMode(event);
  };

  const activeCreateQuery = searchQuery.trim() || debouncedSearch.trim();
  const persistentCreateLabel = activeCreateQuery ? createLabel(activeCreateQuery) : createNewLabel;

  const persistentCreateRow =
    allowCreate && !showCreateOption ? (
      <button
        key='__create_new__'
        type='button'
        role='option'
        disabled={isCreating}
        className={cn(
          'flex w-full cursor-pointer select-none items-center gap-2 rounded-lg p-2 text-left text-paragraph-sm text-primary-base',
          'transition duration-200 ease-out hover:bg-bg-weak-50 focus-visible:bg-bg-weak-50 focus-visible:outline-0',
          isCreating && 'pointer-events-none opacity-60',
        )}
        onClick={handlePersistentCreateClick}
      >
        <RiAddLine className='size-4 shrink-0' aria-hidden />
        <span className='min-w-0 truncate'>{persistentCreateLabel}</span>
      </button>
    ) : null;

  const createOptionRow = showCreateOption ? (
    <button
      key='__create_query__'
      type='button'
      role='option'
      disabled={isCreating}
      className={cn(
        'flex w-full cursor-pointer select-none items-center gap-2 rounded-lg p-2 text-left text-paragraph-sm text-primary-base',
        'transition duration-200 ease-out hover:bg-bg-weak-50 focus-visible:bg-bg-weak-50 focus-visible:outline-0',
        isCreating && 'pointer-events-none opacity-60',
      )}
      onClick={() => void handleCreate(createQuery)}
    >
      <RiAddLine className='size-4 shrink-0' aria-hidden />
      <span className='min-w-0 truncate'>{createLabel(createQuery)}</span>
    </button>
  ) : null;

  const commitDraft = async () => {
    const next = String(draftValue ?? '').trim();
    if (!next) {
      setIsCreateMode(false);
      return;
    }
    await handleCreate(next);
    setDraftValue('');
    setIsCreateMode(false);
  };

  if (isCreateMode) {
    return (
      <div className='flex w-full flex-col gap-1.5'>
        <Input.Root size='medium' hasError={hasError}>
          <Input.Wrapper>
            <Input.Input
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void commitDraft();
                }
              }}
              onBlur={() => void commitDraft()}
              placeholder={createInputPlaceholder}
              disabled={disabled}
              autoFocus
            />
          </Input.Wrapper>
        </Input.Root>
        <LinkButton.Root
          type='button'
          variant='primary'
          size='small'
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setDraftValue('');
            setIsCreateMode(false);
          }}
          className='w-full justify-start'
        >
          <RiArrowLeftLine /> {chooseExistingLabel}
        </LinkButton.Root>
      </div>
    );
  }

  return (
    <div className='w-full'>
      <Popover.Root modal={false} open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type='button'
            disabled={disabled}
            data-state={open ? 'open' : 'closed'}
            data-placeholder={selectedValues.length > 0 ? undefined : ''}
            className={cn(triggerRoot(), 'h-auto min-h-10 w-full py-1.5 pr-2')}
          >
            <span className='flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-left'>
              {selectedValues.length > 0 ? (
                selectedValues.map((item) => (
                  <Tag.Root key={item} variant='stroke' className='max-w-full'>
                    <span className='truncate text-label-xs text-text-sub-600'>
                      {labelFor(item)}
                    </span>
                    <Tag.DismissButton
                      type='button'
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        removeValue(item);
                      }}
                      aria-label={`Remove ${labelFor(item)}`}
                    />
                  </Tag.Root>
                ))
              ) : (
                <span className='block min-w-0 truncate text-paragraph-sm text-text-soft-400'>
                  {placeholder}
                </span>
              )}
            </span>
            <RiArrowDownSLine className={triggerArrow()} aria-hidden />
          </button>
        </Popover.Trigger>
        <Popover.Content
          align='start'
          sideOffset={8}
          collisionPadding={16}
          showArrow={false}
          unstyled
          className={CONTENT_CLASS}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className='flex flex-col'>
            <div className='border-b border-stroke-soft-200 p-2'>
              <Input.Root size='small'>
                <Input.Wrapper>
                  <Input.Icon as={RiSearchLine} />
                  <Input.Input
                    ref={searchInputRef}
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
            <div
              className='flex max-h-[236px] flex-col gap-1 overflow-y-auto p-2'
              onWheel={(e) => e.stopPropagation()}
            >
              {allowCreate ? (
                <>
                  {persistentCreateRow}
                  {createOptionRow}
                </>
              ) : null}
              {options.length > 0 ? (
                options.map((opt) => {
                  const optVal = String(getOptionValue(opt));
                  const isSelected = selectedValues.includes(optVal);
                  return (
                    <button
                      key={optVal}
                      type='button'
                      role='option'
                      aria-selected={isSelected}
                      className={cn(
                        'group relative flex w-full cursor-pointer select-none items-start gap-2 rounded-lg p-2 pr-9 text-left text-paragraph-sm text-text-strong-950',
                        'transition duration-200 ease-out hover:bg-bg-weak-50 focus-visible:bg-bg-weak-50 focus-visible:outline-0',
                      )}
                      onClick={() => toggleValue(optVal)}
                    >
                      <span className='flex min-w-0 flex-1 items-start gap-2'>
                        <span className='w-full min-w-0'>
                          {renderOptionLabel ? renderOptionLabel(opt) : getOptionLabel(opt)}
                        </span>
                      </span>
                      {isSelected ? (
                        <RiCheckLine className='pointer-events-none absolute right-2 top-1/2 size-5 shrink-0 -translate-y-1/2 text-text-soft-400' />
                      ) : null}
                    </button>
                  );
                })
              ) : !allowCreate ? (
                <div className='px-4 py-8 text-center text-paragraph-sm text-text-soft-400'>
                  {listEmptyMessage}
                </div>
              ) : null}
            </div>
          </div>
        </Popover.Content>
      </Popover.Root>
      {selectedValues.length > 0 ? (
        <div className='mt-1.5 flex flex-wrap gap-1.5 sm:hidden'>
          {selectedValues.map((item) => (
            <Tag.Root key={`mobile-${item}`} variant='stroke'>
              <span className='text-label-xs text-text-sub-600'>{labelFor(item)}</span>
              <Tag.DismissButton
                type='button'
                onClick={() => removeValue(item)}
                aria-label={`Remove ${labelFor(item)}`}
              />
            </Tag.Root>
          ))}
        </div>
      ) : null}
    </div>
  );
}
