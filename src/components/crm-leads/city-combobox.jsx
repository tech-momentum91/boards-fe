'use client';

import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import * as Popover from '@radix-ui/react-popover';
import { RiArrowDownSLine, RiCheckLine, RiSearchLine } from 'react-icons/ri';
import * as Input from '@/components/ui/input';
import { cn } from '@/utils/cn';
import { selectVariants } from '@/components/ui/select';
import { INDIA_CITY_OPTIONS } from './constants';

const ITEM_HEIGHT = 40;
const MAX_NON_VIRTUAL = 100;
const SCROLL_HEIGHT = 260;

/** Searchable city picker for India cities. Uses virtualization when many results. */
export const CityCombobox = React.forwardRef(
  (
    {
      value,
      onChange,
      placeholder = 'Select',
      disabled = false,
      className,
      /** When true, trigger looks like plain text (no border/arrow); click opens the picker. */
      inlineTrigger = false,
      size = 'medium',
      variant = 'default',
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const scrollRef = React.useRef(null);
    const searchInputRef = React.useRef(null);
    const [isContentMounted, setIsContentMounted] = React.useState(false);

    const filteredOptions = React.useMemo(() => {
      if (!searchQuery.trim()) return INDIA_CITY_OPTIONS;
      const q = searchQuery.toLowerCase();
      return INDIA_CITY_OPTIONS.filter((opt) => opt.label.toLowerCase().includes(q));
    }, [searchQuery]);

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

    const selectedLabel = value
      ? (INDIA_CITY_OPTIONS.find((o) => o.value === value)?.label ?? value)
      : '';

    const handleSelect = React.useCallback(
      (opt) => {
        onChange?.(opt.value);
        setOpen(false);
      },
      [onChange],
    );

    const virtualItems = shouldVirtualize && isContentMounted ? virtualizer.getVirtualItems() : [];
    const { triggerRoot, triggerArrow } = selectVariants({ size, variant });

    const showVirtualized = shouldVirtualize && virtualItems.length > 0;

    const emptyMessage = searchQuery.trim() ? 'No cities found' : 'Type to search for a city';

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
                'block w-full min-w-0 max-w-full truncate text-left paragraph-small text-text-sub-600 hover:text-text-strong-950 cursor-pointer bg-transparent border-0 shadow-none p-0 min-h-0 rounded-none',
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
                    placeholder='Search city...'
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
                    const isSelected = value === opt.value;
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
                {filteredOptions.slice(0, 500).map((opt) => {
                  const isSelected = value === opt.value;
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
                {filteredOptions.length > 500 && (
                  <div className='px-3 py-2 text-paragraph-xs text-text-soft-400'>
                    Type more to narrow results
                  </div>
                )}
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  },
);

CityCombobox.displayName = 'CityCombobox';
