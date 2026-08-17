import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowDownSLine, RiCheckLine, RiSearchLine } from 'react-icons/ri';

import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import { selectVariants } from '@/components/ui/select';
import { cn } from '@/utils/cn';

/** Matches `Select.Content` surface tokens from `select.jsx`. */
const CONTENT_CLASS =
  'relative z-50 w-[280px] min-w-[280px] max-w-[min(100vw-24px,400px)] max-h-[300px] cursor-pointer overflow-hidden rounded-2xl bg-bg-white-0 p-0 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200';

/** Mirrors Select.Trigger inner wrapper so long labels truncate when that wrapper omits select.jsx wrapper */
const TRIGGER_VALUE_WRAP_CLASS =
  'min-w-0 flex-1 overflow-hidden text-left [&>span]:block [&>span]:min-w-0 [&>span]:max-w-full [&>span]:truncate';

function normalizeMultiValue(value) {
  if (!Array.isArray(value)) return value ? [String(value)] : [];
  return value.map((v) => String(v)).filter((s) => s.length > 0);
}

/**
 * Popover with in-panel search. Filters options by label; keeps the current
 * selection visible when it would otherwise be filtered out.
 *
 * @param {string} [valueSentinel] — Radix value when the logical value is empty (e.g. `__none__`); selecting it calls `onValueChange('')`.
 * @param {boolean} [multiple] — When true, `value` is a string array and the popover stays open while toggling options.
 */
export function SearchableSelect({
  id,
  value,
  onValueChange,
  options = [],
  placeholder = 'Select',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options available',
  noResultsMessage = 'No options found',
  size = 'medium',
  variant,
  hasError,
  disabled,
  matchTriggerWidth = false,
  itemKeyPrefix = '',
  valueSentinel,
  showArrow = false,
  isolateSearchKeyboard = false,
  multiple = false,
  getOptionValue = (opt) => opt?.value ?? opt,
  getOptionLabel = (opt) => opt?.label ?? String(opt?.value ?? opt ?? ''),
  renderOptionLabel,
  renderTrigger,
  contentClassName,
  triggerClassName,
  /** When set, options are hidden until the search query reaches this length (e.g. large city lists). */
  minSearchLength,
  /** Shown when the query is shorter than `minSearchLength`. */
  minSearchMessage,
  /** Called when the popover opens or closes. */
  onOpenChange,
  /** Return false to block opening the popover (e.g. validation). */
  onBeforeOpen,
  /** Called when the in-panel search query changes (for server-side search). */
  onSearchQueryChange,
  /** Optional content rendered below the options list. Receives searchQuery and a close helper. */
  renderFooter,
  /** Optional node rendered beside the in-panel search input (e.g. layout action). */
  searchSuffix,
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [triggerWidth, setTriggerWidth] = useState(null);
  const searchInputRef = useRef(null);
  const triggerRef = useRef(null);
  const trimmedQuery = searchQuery.trim();
  const queryMeetsMin =
    minSearchLength == null || minSearchLength <= 0 || trimmedQuery.length >= minSearchLength;

  const { triggerRoot, triggerArrow } = selectVariants({
    size,
    variant,
    hasError,
  });

  const stopKeys = (e) => {
    e.stopPropagation();
    if (isolateSearchKeyboard && e.nativeEvent?.stopImmediatePropagation) {
      e.nativeEvent.stopImmediatePropagation();
    }
  };

  const selectedValues = useMemo(
    () => (multiple ? normalizeMultiValue(value) : []),
    [multiple, value],
  );

  const isEmpty = multiple
    ? selectedValues.length === 0
    : value === '' || value == null || value === undefined;

  const selectValue = (() => {
    if (multiple) return selectedValues;
    if (isEmpty) {
      return valueSentinel == null ? undefined : valueSentinel;
    }
    return String(value);
  })();

  const list = useMemo(() => {
    const getFilteredOptions = (opts, searchStr) => {
      if (searchStr === '') return opts;

      const res = [];
      let currentHeader = null;
      let headerAdded = false;

      for (const opt of opts) {
        if (opt.isGroupLabel) {
          currentHeader = opt;
          headerAdded = false;
          continue;
        }
        if (opt.isSeparator) {
          continue;
        }

        const label = getOptionLabel(opt);
        const matches = String(label || '')
          .toLowerCase()
          .includes(searchStr);

        if (matches) {
          if (currentHeader && !headerAdded) {
            res.push(currentHeader);
            headerAdded = true;
          }
          res.push(opt);
        }
      }
      return res;
    };

    if (multiple) {
      if (!queryMeetsMin) {
        const selectedOpts = selectedValues
          .map((key) =>
            options.find(
              (opt) =>
                !opt.isGroupLabel &&
                !opt.isSeparator &&
                String(getOptionValue(opt)) === String(key),
            ),
          )
          .filter(Boolean);
        return selectedOpts;
      }

      const q = trimmedQuery.toLowerCase();
      const filtered = getFilteredOptions(options, q);

      const merged = [...filtered];
      selectedValues.forEach((key) => {
        const selectedOpt = options.find(
          (opt) =>
            !opt.isGroupLabel && !opt.isSeparator && String(getOptionValue(opt)) === String(key),
        );
        if (
          selectedOpt &&
          !merged.some(
            (opt) =>
              !opt.isGroupLabel &&
              !opt.isSeparator &&
              String(getOptionValue(opt)) === String(getOptionValue(selectedOpt)),
          )
        ) {
          merged.unshift(selectedOpt);
        }
      });
      return merged;
    }

    if (!queryMeetsMin) {
      if (valueSentinel == null) return [];
      return options.filter(
        (opt) =>
          !opt.isGroupLabel &&
          !opt.isSeparator &&
          String(getOptionValue(opt)) === String(valueSentinel),
      );
    }

    const q = trimmedQuery.toLowerCase();
    const filtered = getFilteredOptions(options, q);

    const selectedKey =
      valueSentinel != null && isEmpty ? valueSentinel : String(value ?? '').trim();

    if (!selectedKey) return filtered;

    const selectedOpt = options.find(
      (opt) =>
        !opt.isGroupLabel &&
        !opt.isSeparator &&
        String(getOptionValue(opt)) === String(selectedKey),
    );
    if (
      !selectedOpt ||
      filtered.some(
        (opt) =>
          !opt.isGroupLabel &&
          !opt.isSeparator &&
          String(getOptionValue(opt)) === String(getOptionValue(selectedOpt)),
      )
    ) {
      return filtered;
    }
    return [selectedOpt, ...filtered];
  }, [
    options,
    trimmedQuery,
    queryMeetsMin,
    value,
    isEmpty,
    valueSentinel,
    getOptionLabel,
    getOptionValue,
    multiple,
    selectedValues,
  ]);

  const listEmptyMessage = (() => {
    if (!queryMeetsMin && minSearchLength != null && minSearchLength > 0) {
      return minSearchMessage ?? `Type at least ${minSearchLength} letters to search`;
    }
    return trimmedQuery ? noResultsMessage : emptyMessage;
  })();

  const selectedOptionResolved = useMemo(() => {
    if (multiple) return undefined;
    const key =
      isEmpty && valueSentinel != null ? String(valueSentinel) : String(value ?? '').trim();
    if (!key) return undefined;
    return options.find(
      (opt) => !opt.isGroupLabel && !opt.isSeparator && String(getOptionValue(opt)) === key,
    );
  }, [getOptionValue, isEmpty, multiple, options, value, valueSentinel]);

  const selectedOptionsResolved = useMemo(() => {
    if (!multiple) return [];
    return selectedValues
      .map((key) =>
        options.find(
          (opt) =>
            !opt.isGroupLabel && !opt.isSeparator && String(getOptionValue(opt)) === String(key),
        ),
      )
      .filter(Boolean);
  }, [getOptionValue, multiple, options, selectedValues]);

  /** Same key logic as Radix `Select` value for item indicator / selection styling. */
  const currentValueKey = useMemo(() => {
    if (multiple) return '';
    if (isEmpty) {
      return valueSentinel === undefined || valueSentinel === null ? '' : String(valueSentinel);
    }
    return String(value ?? '');
  }, [isEmpty, multiple, value, valueSentinel]);

  const handlePick = (raw) => {
    if (multiple) {
      const v = String(raw);
      const next = selectedValues.includes(v)
        ? selectedValues.filter((item) => item !== v)
        : [...selectedValues, v];
      onValueChange?.(next);
      return;
    }
    if (valueSentinel != null && String(raw) === String(valueSentinel)) {
      onValueChange?.('');
    } else {
      onValueChange?.(raw);
    }
    setOpen(false);
    setSearchQuery('');
  };

  useEffect(() => {
    if (!open) {
      setTriggerWidth(null);
      return undefined;
    }

    const measureTrigger = () => {
      if (triggerRef.current) {
        setTriggerWidth(triggerRef.current.offsetWidth);
      }
    };

    measureTrigger();
    window.addEventListener('resize', measureTrigger);
    return () => window.removeEventListener('resize', measureTrigger);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const idFrame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(idFrame);
  }, [open]);

  useEffect(() => {
    onSearchQueryChange?.(searchQuery);
  }, [onSearchQueryChange, searchQuery]);

  const showMinSearchHint =
    !queryMeetsMin && minSearchLength != null && minSearchLength > 0 && list.length === 0;

  const contentWidthStyle =
    matchTriggerWidth && triggerWidth
      ? {
          width: triggerWidth,
          minWidth: triggerWidth,
          maxWidth: triggerWidth,
        }
      : undefined;
  const footerContent = renderFooter
    ? renderFooter({
        searchQuery,
        close: () => {
          setOpen(false);
          setSearchQuery('');
        },
      })
    : null;

  return (
    <Popover.Root
      modal={false}
      open={open}
      onOpenChange={(next) => {
        if (next && onBeforeOpen && onBeforeOpen() === false) return;
        setOpen(next);
        if (!next) setSearchQuery('');
        onOpenChange?.(next);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type='button'
          id={id}
          ref={triggerRef}
          disabled={disabled}
          data-state={open ? 'open' : 'closed'}
          data-placeholder={
            renderTrigger || selectedOptionResolved || selectedOptionsResolved.length > 0
              ? undefined
              : ''
          }
          className={cn(triggerRoot({ class: triggerClassName }), !showArrow && 'pr-2')}
        >
          <span className={TRIGGER_VALUE_WRAP_CLASS}>
            {renderTrigger ? (
              renderTrigger({
                selectedOption: selectedOptionResolved,
                selectedOptions: selectedOptionsResolved,
                selectedLabel: selectedOptionResolved ? getOptionLabel(selectedOptionResolved) : '',
                value: selectValue,
                placeholder,
              })
            ) : (
              <span className='block min-w-0 max-w-full truncate'>
                {multiple
                  ? selectedOptionsResolved.length > 0
                    ? selectedOptionsResolved.map((opt) => getOptionLabel(opt)).join(', ')
                    : placeholder
                  : (selectedOptionResolved && getOptionLabel(selectedOptionResolved)) ||
                    placeholder}
              </span>
            )}
          </span>
          {showArrow ? <RiArrowDownSLine className={triggerArrow()} aria-hidden /> : null}
        </button>
      </Popover.Trigger>
      <Popover.Content
        align='start'
        sideOffset={8}
        collisionPadding={16}
        showArrow={false}
        className={cn(CONTENT_CLASS, matchTriggerWidth && 'w-auto', contentClassName)}
        style={contentWidthStyle}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <div className='flex flex-col'>
          <div className='flex items-center gap-1 border-b border-stroke-soft-200 p-2'>
            <Input.Root size='small' className='min-w-0 flex-1'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  ref={searchInputRef}
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={stopKeys}
                  onKeyPress={isolateSearchKeyboard ? stopKeys : undefined}
                  onKeyUp={isolateSearchKeyboard ? stopKeys : undefined}
                />
              </Input.Wrapper>
            </Input.Root>
            {searchSuffix ? <div className='shrink-0'>{searchSuffix}</div> : null}
          </div>
          <div
            className={cn(
              'flex flex-col gap-1 overflow-y-auto p-2',
              footerContent ? 'max-h-[180px]' : 'max-h-[236px]',
            )}
            onWheel={(e) => e.stopPropagation()}
          >
            {showMinSearchHint ? (
              <div className='px-4 py-6 text-center text-paragraph-sm text-text-soft-400'>
                {listEmptyMessage}
              </div>
            ) : null}
            {list.length > 0 ? (
              list.map((opt, index) => {
                if (opt.isGroupLabel) {
                  return (
                    <div
                      key={`${itemKeyPrefix}group-${opt.label}-${index}`}
                      className={cn(
                        'px-2 py-1.5 text-label-xs font-semibold text-text-soft-400 uppercase tracking-wider',
                        index > 0 && 'mt-1 border-t border-stroke-soft-200/50 pt-2.5',
                      )}
                    >
                      {renderOptionLabel ? renderOptionLabel(opt) : getOptionLabel(opt)}
                    </div>
                  );
                }

                if (opt.isSeparator) {
                  return (
                    <div
                      key={`${itemKeyPrefix}separator-${index}`}
                      className='h-px bg-stroke-soft-200 my-1 mx-2'
                    />
                  );
                }

                const optVal = String(getOptionValue(opt));
                const isSelected = multiple
                  ? selectedValues.includes(optVal)
                  : currentValueKey !== '' && optVal === currentValueKey;
                return (
                  <button
                    key={`${itemKeyPrefix}${optVal}`}
                    type='button'
                    role='option'
                    aria-selected={isSelected}
                    className={cn(
                      'group relative flex w-full cursor-pointer select-none rounded-lg p-2 pr-9 text-left text-paragraph-sm text-text-strong-950',
                      'items-center gap-2 transition duration-200 ease-out',
                      isSelected && 'bg-bg-weak-100',
                      'hover:bg-bg-weak-50 focus-visible:bg-bg-weak-50 focus-visible:outline-0',
                      size === 'xsmall' && 'gap-1.5 pr-[34px]',
                      size === 'large' && 'text-md md:text-2xl',
                    )}
                    onClick={() => handlePick(getOptionValue(opt))}
                  >
                    <span
                      className={cn(
                        'flex min-w-0 flex-1 items-center gap-2',
                        size === 'xsmall' && 'gap-1.5',
                      )}
                    >
                      <span className='line-clamp-1'>
                        {renderOptionLabel ? renderOptionLabel(opt) : getOptionLabel(opt)}
                      </span>
                    </span>
                    {isSelected ? (
                      <RiCheckLine className='pointer-events-none absolute right-2 top-1/2 size-5 shrink-0 -translate-y-1/2 text-text-soft-400' />
                    ) : null}
                  </button>
                );
              })
            ) : showMinSearchHint || footerContent ? null : (
              <div className='px-4 py-8 text-center text-paragraph-sm text-text-soft-400'>
                {listEmptyMessage}
              </div>
            )}
          </div>
          {footerContent ? (
            <div className='border-t border-stroke-soft-200 p-2'>{footerContent}</div>
          ) : null}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
