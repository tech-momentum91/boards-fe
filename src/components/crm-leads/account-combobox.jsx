'use client';

import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import * as Popover from '@radix-ui/react-popover';
import { RiArrowDownSLine, RiCheckLine, RiSearchLine } from 'react-icons/ri';
import * as Input from '@/components/ui/input';
import { cn } from '@/utils/cn';
import { selectVariants } from '@/components/ui/select';
import { searchCrmAccountOptions } from '@/api/crmAccounts';
import { useDebounce } from '@/hooks/use-debounce';

const ITEM_HEIGHT = 40;
const MAX_NON_VIRTUAL = 100;
const SCROLL_HEIGHT = 260;
const CLEAR_VALUE = '__account_clear__';

/** Searchable CRM Account picker (branch names from get_crm_account_list). */
export const AccountCombobox = React.forwardRef(
  (
    {
      value,
      onChange,
      /** Shown when `value` is set but not yet in loaded options (e.g. list row display name). */
      displayLabel = '',
      placeholder = 'Select',
      disabled = false,
      className,
      inlineTrigger = false,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [options, setOptions] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [fetchError, setFetchError] = React.useState(null);
    const scrollRef = React.useRef(null);
    const searchInputRef = React.useRef(null);
    const [isContentMounted, setIsContentMounted] = React.useState(false);

    const debouncedSearch = useDebounce(searchQuery, 300);

    const accountValue =
      value && String(value).trim() && String(value) !== '-' ? String(value).trim() : '';

    React.useEffect(() => {
      if (!open) return undefined;
      let cancelled = false;
      setIsLoading(true);
      setFetchError(null);
      searchCrmAccountOptions({ keyword: debouncedSearch })
        .then((list) => {
          if (!cancelled) setOptions(Array.isArray(list) ? list : []);
        })
        .catch(() => {
          if (!cancelled) {
            setOptions([]);
            setFetchError('Failed to load accounts');
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [open, debouncedSearch]);

    const listOptions = React.useMemo(() => {
      const clearItem = { value: CLEAR_VALUE, label: '—' };
      const base = [clearItem, ...options];
      if (
        accountValue &&
        !base.some((o) => String(o.value) === accountValue) &&
        displayLabel &&
        displayLabel !== '-'
      ) {
        return [clearItem, { value: accountValue, label: displayLabel }, ...options];
      }
      return base;
    }, [options, accountValue, displayLabel]);

    const filteredOptions = React.useMemo(() => {
      if (!searchQuery.trim()) return listOptions;
      const q = searchQuery.toLowerCase();
      return listOptions.filter((opt) => {
        if (opt.value === CLEAR_VALUE) return true;
        return (
          opt.label?.toLowerCase().includes(q) ||
          String(opt.value || '')
            .toLowerCase()
            .includes(q)
        );
      });
    }, [listOptions, searchQuery]);

    const shouldVirtualize = filteredOptions.length > MAX_NON_VIRTUAL;

    const virtualizer = useVirtualizer({
      count: filteredOptions.length,
      getScrollElement: () => scrollRef.current,
      estimateSize: () => ITEM_HEIGHT,
      overscan: 8,
      enabled: shouldVirtualize && open && isContentMounted,
    });

    React.useEffect(() => {
      if (open) {
        const t = setTimeout(() => setIsContentMounted(true), 50);
        return () => clearTimeout(t);
      }
      setIsContentMounted(false);
      setSearchQuery('');
      return undefined;
    }, [open]);

    React.useEffect(() => {
      if (open && shouldVirtualize && isContentMounted) {
        const t = setTimeout(() => virtualizer.measure(), 100);
        return () => clearTimeout(t);
      }
      return undefined;
    }, [open, shouldVirtualize, isContentMounted, virtualizer]);

    React.useEffect(() => {
      if (open && searchInputRef.current) {
        const t = setTimeout(() => searchInputRef.current?.focus(), 50);
        return () => clearTimeout(t);
      }
      return undefined;
    }, [open]);

    const selectedLabel = React.useMemo(() => {
      if (!accountValue) return '';
      const match = listOptions.find((o) => String(o.value) === accountValue);
      return match?.label ?? displayLabel ?? accountValue;
    }, [accountValue, listOptions, displayLabel]);

    const handleSelect = React.useCallback(
      (opt) => {
        if (opt.value === CLEAR_VALUE) {
          onChange?.('');
        } else {
          onChange?.(opt.value);
        }
        setOpen(false);
      },
      [onChange],
    );

    const virtualItems = shouldVirtualize && isContentMounted ? virtualizer.getVirtualItems() : [];
    const { triggerRoot, triggerArrow } = selectVariants({ size: 'medium', variant: 'default' });
    const showVirtualized = shouldVirtualize && virtualItems.length > 0;

    const emptyMessage = fetchError
      ? fetchError
      : isLoading
        ? 'Loading accounts...'
        : searchQuery.trim()
          ? 'No accounts found'
          : 'Type to search for an account';

    return (
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            ref={ref}
            type='button'
            disabled={disabled}
            className={cn(
              !inlineTrigger && triggerRoot({ class: 'text-left' }),
              disabled && 'cursor-not-allowed',
              inlineTrigger &&
                'inline-block min-w-0 truncate text-left paragraph-small text-text-sub-600 hover:text-text-strong-950 cursor-pointer bg-transparent border-0 shadow-none p-0 min-h-0 rounded-none',
              inlineTrigger && !selectedLabel && 'text-text-soft-400',
              className,
            )}
          >
            <span
              className={cn(
                !inlineTrigger && 'block truncate',
                !selectedLabel && !inlineTrigger && 'text-text-soft-400',
              )}
            >
              {selectedLabel || placeholder}
            </span>
            {!inlineTrigger && (
              <RiArrowDownSLine className={cn(triggerArrow(), 'shrink-0', open && 'rotate-180')} />
            )}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align='start'
            sideOffset={8}
            onOpenAutoFocus={(e) => e.preventDefault()}
            className={cn(
              'z-50 min-w-[280px] w-(--radix-popover-trigger-width) overflow-hidden rounded-2xl',
              'bg-bg-white-0 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200',
              'data-[state=open]:animate-in data-[state=open]:fade-in-0',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            )}
          >
            <div className='p-2 border-b border-stroke-soft-200'>
              <Input.Root size='small'>
                <Input.Wrapper>
                  <Input.Icon as={RiSearchLine} />
                  <Input.Input
                    ref={searchInputRef}
                    placeholder='Search account...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>

            {filteredOptions.length === 0 ? (
              <div className='px-4 py-6 text-center text-paragraph-sm text-text-soft-400'>
                {emptyMessage}
              </div>
            ) : showVirtualized ? (
              <div
                ref={scrollRef}
                className='overflow-y-auto p-1'
                style={{ height: SCROLL_HEIGHT }}
              >
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {virtualItems.map((virtualRow) => {
                    const opt = filteredOptions[virtualRow.index];
                    const isSelected =
                      opt.value === CLEAR_VALUE ? !accountValue : accountValue === opt.value;
                    return (
                      <div
                        key={opt.value}
                        data-index={virtualRow.index}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <button
                          type='button'
                          className={cn(
                            'flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left',
                            'text-paragraph-sm text-text-strong-950',
                            'hover:bg-bg-weak-50 active:bg-bg-weak-100 transition-colors',
                            isSelected && 'bg-bg-weak-50',
                          )}
                          onClick={() => handleSelect(opt)}
                        >
                          <span className='flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis'>
                            {opt.label}
                          </span>
                          {isSelected && (
                            <RiCheckLine className='size-5 shrink-0 text-text-sub-500' />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className='overflow-y-auto p-1' style={{ maxHeight: SCROLL_HEIGHT }}>
                {filteredOptions.map((opt) => {
                  const isSelected =
                    opt.value === CLEAR_VALUE ? !accountValue : accountValue === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type='button'
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left',
                        'text-paragraph-sm text-text-strong-950',
                        'hover:bg-bg-weak-50 active:bg-bg-weak-100 transition-colors',
                        isSelected && 'bg-bg-weak-50',
                      )}
                      onClick={() => handleSelect(opt)}
                    >
                      <span className='flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis'>
                        {opt.label}
                      </span>
                      {isSelected && <RiCheckLine className='size-5 shrink-0 text-text-sub-500' />}
                    </button>
                  );
                })}
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  },
);

AccountCombobox.displayName = 'AccountCombobox';
