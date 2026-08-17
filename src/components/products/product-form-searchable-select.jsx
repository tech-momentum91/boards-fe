import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowLeftLine,
  RiCheckLine,
  RiSearchLine,
} from 'react-icons/ri';

import { createProductFormOption, searchProductFormOptions } from '@/api/productFormOptions';
import * as Input from '@/components/ui/input';
import * as LinkButton from '@/components/ui/link-button';
import * as Popover from '@/components/ui/popover';
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
  'relative z-[600] max-h-[300px] w-[min(100vw-24px,340px)] min-w-[max(var(--radix-popover-trigger-width),240px)] overflow-hidden rounded-2xl bg-bg-white-0 p-0 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200';

const TRIGGER_VALUE_WRAP_CLASS =
  'min-w-0 flex-1 overflow-hidden text-left [&>span]:block [&>span]:min-w-0 [&>span]:max-w-full [&>span]:truncate';

/**
 * Server-searchable product form dropdown (brand, vendor, category levels).
 * Uses the same debounce pattern as Knowledge Center / AccountCombobox:
 * local search state → useDebounce → useEffect fetch.
 */
export default function ProductFormSearchableSelect({
  field,
  value,
  onValueChange,
  categoryGroup,
  categoryType,
  productGroup,
  assetType,
  excludeOpex,
  hasError,
  disabled,
  placeholder = 'Select',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options available',
  noResultsMessage = 'No options found',
  getOptionValue = (opt) => opt?.value ?? opt,
  getOptionLabel = (opt) => opt?.label ?? String(opt?.value ?? opt ?? ''),
  renderOptionLabel,
  renderTriggerValue,
  onOptionsLoaded,
  isOptionDisabled,
  allowCreate = false,
  createNewLabel = 'Create new',
  createInputPlaceholder = getCreateInputPlaceholder(createNewLabel),
  chooseExistingLabel = 'Choose from existing',
  createLabel = (query) => `Add new "${query}"`,
  onCreateOption,
  staticOptions,
  loadOptions,
  contentClassName,
  size = 'medium',
  variant,
  triggerClassName,
}) {
  const [open, setOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [draftValue, setDraftValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef(null);
  const triggerRef = useRef(null);
  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);
  const useStaticOptions = Array.isArray(staticOptions) && typeof loadOptions !== 'function';

  const { triggerRoot, triggerArrow } = selectVariants({
    size,
    variant,
    hasError,
  });

  const onOptionsLoadedRef = useRef(onOptionsLoaded);
  onOptionsLoadedRef.current = onOptionsLoaded;
  const loadOptionsRef = useRef(loadOptions);
  loadOptionsRef.current = loadOptions;
  const getOptionLabelRef = useRef(getOptionLabel);
  getOptionLabelRef.current = getOptionLabel;
  const getOptionValueRef = useRef(getOptionValue);
  getOptionValueRef.current = getOptionValue;

  useEffect(() => {
    if (!open) return undefined;

    if (useStaticOptions) {
      const nextOptions = filterStaticOptions(
        staticOptions,
        debouncedSearch,
        getOptionLabelRef.current,
      );
      setOptions(nextOptions);
      onOptionsLoadedRef.current?.(nextOptions);
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);

    const loader =
      typeof loadOptionsRef.current === 'function'
        ? loadOptionsRef.current({ search: debouncedSearch })
        : searchProductFormOptions({
            field,
            search: debouncedSearch,
            categoryGroup,
            categoryType,
            productGroup,
            assetType,
            excludeOpex,
          });

    Promise.resolve(loader)
      .then((result) => {
        if (cancelled) return;
        const nextOptions = Array.isArray(result) ? result : [];
        setOptions(nextOptions);
        onOptionsLoadedRef.current?.(nextOptions);
      })
      .catch(() => {
        if (!cancelled) {
          setOptions([]);
          onOptionsLoadedRef.current?.([]);
        }
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
    assetType,
    excludeOpex,
    useStaticOptions,
    staticOptions,
  ]);

  useEffect(() => {
    if (!isCreateMode) {
      setDraftValue(value ?? '');
    }
  }, [isCreateMode, value]);

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

  const selectedOption = useMemo(() => {
    const key = String(value ?? '').trim();
    if (!key) return undefined;
    const pool = useStaticOptions ? staticOptions : options;
    return pool.find((opt) => String(getOptionValueRef.current(opt)) === key);
  }, [options, staticOptions, useStaticOptions, value]);

  const currentValueKey = String(value ?? '').trim();
  const isDebouncing = searchQuery.trim() !== debouncedSearch.trim();
  const createQuery = debouncedSearch.trim();
  const hasExactCreateMatch = useMemo(() => {
    if (!createQuery) return true;
    return options.some(
      (opt) => String(getOptionLabelRef.current(opt)).toLowerCase() === createQuery.toLowerCase(),
    );
  }, [createQuery, options]);
  const showCreateOption = allowCreate && createQuery && !hasExactCreateMatch && !isDebouncing;

  const isTriggerEvent = (event) => {
    const target = event?.target;
    if (!(target instanceof Element)) return false;
    const trigger = triggerRef.current;
    if (trigger && (trigger === target || trigger.contains(target))) return true;
    return Boolean(target.closest('[data-radix-popover-trigger]'));
  };

  const preventTriggerDismiss = (event) => {
    if (isTriggerEvent(event)) event.preventDefault();
  };

  const listEmptyMessage = (() => {
    if (isLoading || isDebouncing) return 'Loading...';
    return debouncedSearch.trim() ? noResultsMessage : emptyMessage;
  })();

  const handlePick = (opt) => {
    if (typeof isOptionDisabled === 'function' && isOptionDisabled(opt)) return;
    onValueChange?.(getOptionValueRef.current(opt), opt);
    setOpen(false);
    setSearchQuery('');
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

      if (createdOption) {
        onValueChange?.(getOptionValueRef.current(createdOption), createdOption);
      } else {
        onValueChange?.(nextValue);
      }
      setOpen(false);
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
                  const next = String(draftValue ?? '').trim();
                  if (next) {
                    void handleCreate(next);
                    setIsCreateMode(false);
                  }
                }
              }}
              placeholder={createInputPlaceholder}
              disabled={disabled || isCreating}
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
            ref={triggerRef}
            type='button'
            disabled={disabled}
            data-state={open ? 'open' : 'closed'}
            data-placeholder={value ? undefined : ''}
            className={cn(triggerRoot({ class: triggerClassName }), 'w-full pr-2')}
          >
            <span className={TRIGGER_VALUE_WRAP_CLASS}>
              {renderTriggerValue ? (
                renderTriggerValue({ selectedOption, placeholder, value })
              ) : (
                <span className='block min-w-0 max-w-full truncate'>
                  {(selectedOption && getOptionLabelRef.current(selectedOption)) ||
                    value ||
                    placeholder}
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
          className={cn(CONTENT_CLASS, contentClassName)}
          data-prevent-edit-save
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={preventTriggerDismiss}
          onInteractOutside={preventTriggerDismiss}
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
              {options.length > 0 || (allowCreate && showCreateOption) ? (
                <>
                  {options.map((opt) => {
                    const optVal = String(getOptionValueRef.current(opt));
                    const isSelected = currentValueKey !== '' && optVal === currentValueKey;
                    const isDisabled =
                      typeof isOptionDisabled === 'function'
                        ? Boolean(isOptionDisabled(opt))
                        : false;
                    return (
                      <button
                        key={optVal}
                        type='button'
                        role='option'
                        aria-selected={isSelected}
                        aria-disabled={isDisabled}
                        disabled={isDisabled}
                        className={cn(
                          'group relative flex w-full select-none items-start gap-2 rounded-lg p-2 pr-9 text-left text-paragraph-sm',
                          'transition duration-200 ease-out focus-visible:outline-0',
                          isDisabled
                            ? 'cursor-not-allowed text-text-soft-400'
                            : 'cursor-pointer text-text-strong-950 hover:bg-bg-weak-50 focus-visible:bg-bg-weak-50',
                        )}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handlePick(opt)}
                      >
                        <span className='flex min-w-0 flex-1 items-start gap-2'>
                          <span className='w-full min-w-0 break-words whitespace-normal leading-snug'>
                            {renderOptionLabel
                              ? renderOptionLabel(opt)
                              : getOptionLabelRef.current(opt)}
                          </span>
                        </span>
                        {isSelected ? (
                          <RiCheckLine className='pointer-events-none absolute right-2 top-2.5 size-5 shrink-0 text-text-soft-400' />
                        ) : null}
                      </button>
                    );
                  })}
                </>
              ) : !allowCreate ? (
                <div className='px-4 py-8 text-center text-paragraph-sm text-text-soft-400'>
                  {listEmptyMessage}
                </div>
              ) : null}
            </div>
          </div>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
