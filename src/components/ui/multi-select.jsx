import * as React from 'react';
import { RiArrowDownSLine, RiCheckLine, RiSearchLine } from 'react-icons/ri';
import { useVirtualizer } from '@tanstack/react-virtual';
import * as Dropdown from '@/components/ui/dropdown';
import * as Tag from '@/components/ui/tag';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { selectVariants } from '@/components/ui/select';

/** Order-independent compare for multiselect values (stringify for stable matching). */
function multiselectSelectionsEqual(next, prev) {
  const norm = (arr) =>
    [...(Array.isArray(arr) ? arr : [])]
      .map((v) => String(v))
      .filter((s) => s.length > 0)
      .sort();
  const a = norm(next);
  const b = norm(prev);
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

const MultiSelect = React.forwardRef(
  (
    {
      options = [],
      value = [],
      onValueChange,
      onBlur,
      placeholder = 'Select',
      disabled = false,
      /** Disabled but keeps selected labels readable (e.g. owner-only lock on event detail). */
      readableWhenDisabled = false,
      size = 'medium',
      variant = 'default',
      hasError = false,
      className,
      maxDisplayItems = 3,
      /** Tooltip heading for hidden selections, e.g. "Additional clients". */
      overflowTooltipLabel = 'Additional items',
      enableVirtualization = true,
      virtualizationThreshold = 50,
      enableSearch = true,
      searchPlaceholder = 'Search...',
      emptyMessage = 'No options available',
      noResultsMessage = 'No options found',
      /** Called when the in-panel search query changes (for server-side search). */
      onSearchQueryChange,
      /** When true, selection is committed only when dropdown closes (onBlur); use with onBlur for save-on-close behavior. */
      commitOnBlur = false,
      /** Custom row content (defaults to `option.label`). */
      renderOptionLabel,
      /** When true, selected options appear at the top of the dropdown list. */
      sortSelectedFirst = false,
      /** Trigger display: `tags` (default) or `count` (shows "N items" instead of names). */
      displayMode = 'tags',
      /** Singular label for count display, e.g. "Client" → "1 Client", "3 Clients". */
      countLabel = 'Selected',
      ...rest
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [visibleCount, setVisibleCount] = React.useState(maxDisplayItems);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [localValues, setLocalValues] = React.useState(() =>
      Array.isArray(value) ? value : value ? [value] : [],
    );
    const containerRef = React.useRef(null);
    const tagsRef = React.useRef([]);
    const scrollRef = React.useRef(null);
    const searchInputRef = React.useRef(null);

    const valueFromProperty = Array.isArray(value) ? value : value ? [value] : [];
    const selectedValues = commitOnBlur && open ? localValues : valueFromProperty;

    const { triggerRoot, triggerArrow } = selectVariants({ size, variant, hasError });

    // Filter options based on search query
    const filteredOptions = React.useMemo(() => {
      if (!searchQuery.trim()) return options;
      const query = searchQuery.toLowerCase();
      return options.filter((opt) => opt.label.toLowerCase().includes(query));
    }, [options, searchQuery]);

    const listOptions = React.useMemo(() => {
      if (!sortSelectedFirst) return filteredOptions;

      const selected = [];
      const unselected = [];

      filteredOptions.forEach((opt) => {
        if (selectedValues.includes(opt.value)) selected.push(opt);
        else unselected.push(opt);
      });

      return [...selected, ...unselected];
    }, [filteredOptions, sortSelectedFirst, selectedValues]);

    const shouldVirtualize = enableVirtualization && listOptions.length > virtualizationThreshold;

    const selectedOptions = React.useMemo(() => {
      return options.filter((opt) => selectedValues.includes(opt.value));
    }, [options, selectedValues]);

    // Setup virtualizer
    const virtualizer = useVirtualizer({
      count: listOptions.length,
      getScrollElement: () => scrollRef.current,
      estimateSize: () => 40,
      overscan: 5,
      enabled: shouldVirtualize && open,
    });

    // Force virtualizer to recalculate when dropdown opens
    React.useEffect(() => {
      if (open && shouldVirtualize) {
        const timer = setTimeout(() => {
          virtualizer.measure();
        }, 0);
        return () => clearTimeout(timer);
      }
    }, [open, shouldVirtualize, virtualizer]);

    // Reset search query when dropdown closes; sync local state when opening (commitOnBlur)
    React.useEffect(() => {
      if (!open) {
        setSearchQuery('');
        return;
      }
      if (commitOnBlur) {
        setLocalValues(valueFromProperty);
      }
    }, [open, commitOnBlur, valueFromProperty]);

    React.useEffect(() => {
      onSearchQueryChange?.(searchQuery);
    }, [onSearchQueryChange, searchQuery]);

    React.useEffect(() => {
      if (selectedOptions.length === 0) {
        setVisibleCount(0);
        return;
      }

      const calculateVisibleCount = () => {
        const container = containerRef.current;
        if (!container) {
          setVisibleCount(Math.min(selectedOptions.length, maxDisplayItems));
          return;
        }

        const arrowWidth = 32;
        const gap = 6;
        const counterBaseWidth = 30;
        const padding = 32;

        const containerWidth = container.offsetWidth;
        if (containerWidth === 0) {
          setVisibleCount(Math.min(selectedOptions.length, maxDisplayItems));
          return;
        }

        const availableWidth = containerWidth - arrowWidth - padding;

        let totalWidth = 0;
        let count = 0;

        for (let i = 0; i < selectedOptions.length; i++) {
          const tagElement = tagsRef.current[i];
          const tagWidth =
            tagElement?.offsetWidth || Math.min(selectedOptions[i].label.length * 8 + 24, 200);

          const remainingCount = selectedOptions.length - (i + 1);
          const counterWidth = remainingCount > 0 ? counterBaseWidth : 0;
          const neededWidth = totalWidth + tagWidth + (count > 0 ? gap : 0) + counterWidth;

          if (neededWidth <= availableWidth) {
            totalWidth += tagWidth + (count > 0 ? gap : 0);
            count = i + 1;
          } else {
            break;
          }
        }

        setVisibleCount(Math.max(1, count));
      };

      const timeoutId = setTimeout(calculateVisibleCount, 0);

      const resizeObserver = new ResizeObserver(() => {
        calculateVisibleCount();
      });

      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        clearTimeout(timeoutId);
        resizeObserver.disconnect();
      };
    }, [selectedOptions, maxDisplayItems]);

    const handleToggle = React.useCallback(
      (optionValue) => {
        if (disabled) return;

        const isSelected = selectedValues.includes(optionValue);
        const newValue = isSelected
          ? selectedValues.filter((v) => v !== optionValue)
          : [...selectedValues, optionValue];

        if (commitOnBlur && open) {
          setLocalValues(newValue);
        } else {
          onValueChange?.(newValue);
        }
      },
      [selectedValues, onValueChange, disabled, commitOnBlur, open],
    );

    const handleOpenChange = React.useCallback(
      (isOpen) => {
        if (!isOpen) {
          if (commitOnBlur) {
            const final = localValues;
            if (!multiselectSelectionsEqual(final, valueFromProperty)) {
              onBlur?.(final);
              onValueChange?.(final);
            }
          } else if (onBlur) {
            onBlur(valueFromProperty);
          }
        }
        setOpen(isOpen);
      },
      [commitOnBlur, localValues, onBlur, onValueChange, valueFromProperty],
    );

    const items = shouldVirtualize && open ? virtualizer.getVirtualItems() : [];
    const overflowOptions = selectedOptions.slice(visibleCount);
    const overflowCount = overflowOptions.length;
    const countDisplayLabel =
      selectedOptions.length === 1 ? `1 ${countLabel}` : `${selectedOptions.length} ${countLabel}s`;

    return (
      <Tooltip.Provider delayDuration={300}>
        <Dropdown.Root open={open} onOpenChange={handleOpenChange}>
          <Dropdown.Trigger asChild>
            <button
              ref={ref}
              type='button'
              disabled={disabled}
              className={cn(
                triggerRoot({ class: className }),
                'relative',
                disabled && 'cursor-not-allowed',
                disabled &&
                  readableWhenDisabled &&
                  'disabled:opacity-100 disabled:bg-bg-white-0 disabled:text-text-main-900 disabled:shadow-none disabled:ring-stroke-soft-200',
              )}
              {...rest}
            >
              <div ref={containerRef} className='flex items-center w-full pr-8'>
                {selectedOptions.length === 0 ? (
                  <span className='flex-1 text-left text-text-soft-400 truncate'>
                    {placeholder}
                  </span>
                ) : displayMode === 'count' ? (
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span className='flex-1 truncate text-left text-label-sm text-text-strong-950'>
                        {countDisplayLabel}
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
                      <div className='flex flex-col gap-1'>
                        {selectedOptions.map((opt) => (
                          <span key={opt.value}>{opt.label}</span>
                        ))}
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                ) : (
                  <div className='flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden'>
                    {selectedOptions.slice(0, visibleCount).map((opt, index) => (
                      <Tag.Root
                        key={opt.value}
                        ref={(el) => {
                          if (el) {
                            tagsRef.current[index] = el;
                          } else {
                            delete tagsRef.current[index];
                          }
                        }}
                        variant='gray'
                        disabled={disabled && !readableWhenDisabled}
                        className={cn(
                          'shrink-0 max-w-full',
                          disabled && readableWhenDisabled && 'text-text-sub-700',
                        )}
                      >
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <span className='truncate block'>{opt.label}</span>
                          </Tooltip.Trigger>
                          <Tooltip.Content
                            size='small'
                            variant='light'
                            side='top'
                            className='max-w-xs'
                          >
                            {opt.label}
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tag.Root>
                    ))}
                    {overflowCount > 0 ? (
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <span
                            className='text-paragraph-xs text-text-soft-400 shrink-0 whitespace-nowrap cursor-default'
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            +{overflowCount}
                          </span>
                        </Tooltip.Trigger>
                        <Tooltip.Content
                          size='small'
                          variant='light'
                          side='top'
                          className='max-w-xs'
                        >
                          <div className='flex flex-col gap-1'>
                            <span className='mb-1 text-paragraph-sm font-medium text-text-strong-950'>
                              {overflowTooltipLabel} ({overflowCount})
                            </span>
                            {overflowOptions.map((opt) => (
                              <div key={opt.value} className='text-paragraph-sm text-text-sub-600'>
                                {opt.label}
                              </div>
                            ))}
                          </div>
                        </Tooltip.Content>
                      </Tooltip.Root>
                    ) : null}
                  </div>
                )}
              </div>
              <RiArrowDownSLine
                className={cn(
                  triggerArrow(),
                  'absolute right-3 top-1/2 -translate-y-1/2 shrink-0',
                  open && 'rotate-180',
                )}
              />
            </button>
          </Dropdown.Trigger>
          <Dropdown.Content
            className={cn(
              'min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[max(var(--radix-dropdown-menu-trigger-width),320px)]',
              'p-0 gap-0',
            )}
            align='start'
            onOpenAutoFocus={(e) => {
              // Prevent default focus behavior
              e.preventDefault();
              // Focus search input if enabled
              if (enableSearch && searchInputRef.current) {
                searchInputRef.current.focus();
              }
            }}
          >
            {enableSearch && (
              <div className='p-2 border-b border-stroke-soft-200'>
                <Input.Root size='small'>
                  <Input.Wrapper>
                    <Input.Icon as={RiSearchLine} />
                    <Input.Input
                      ref={searchInputRef}
                      placeholder={searchPlaceholder}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        // Prevent dropdown from closing on Enter
                        if (e.key === 'Enter') {
                          e.preventDefault();
                        }
                        // Stop propagation to prevent Radix from handling
                        e.stopPropagation();
                      }}
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>
            )}

            {listOptions.length === 0 ? (
              <div className='px-4 py-8 text-center text-paragraph-sm text-text-soft-400'>
                {searchQuery.trim() ? noResultsMessage : emptyMessage}
              </div>
            ) : shouldVirtualize ? (
              <div ref={scrollRef} className='max-h-[300px] overflow-y-auto p-1'>
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {items.length > 0 &&
                    items.map((virtualItem) => {
                      const option = listOptions[virtualItem.index];
                      const isSelected = selectedValues.includes(option.value);

                      return (
                        <div
                          key={virtualItem.key}
                          data-index={virtualItem.index}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualItem.size}px`,
                            transform: `translateY(${virtualItem.start}px)`,
                          }}
                        >
                          <div
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer h-full',
                              'text-paragraph-sm text-text-strong-950',
                              'hover:bg-surface-base-100 active:bg-surface-base-200',
                              'transition-colors',
                              isSelected && 'bg-surface-base-50',
                            )}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggle(option.value);
                            }}
                            role='option'
                            aria-selected={isSelected}
                          >
                            {renderOptionLabel ? (
                              <span className='flex min-w-0 flex-1'>
                                {renderOptionLabel(option)}
                              </span>
                            ) : (
                              <span className='flex-1 truncate'>{option.label}</span>
                            )}
                            {isSelected && (
                              <RiCheckLine className='size-4 text-text-main-900 shrink-0' />
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className='max-h-[300px] overflow-y-auto p-1'>
                {listOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <Dropdown.Item
                      key={option.value}
                      onSelect={(e) => {
                        e.preventDefault();
                        handleToggle(option.value);
                      }}
                      {...(isSelected ? { 'data-highlighted': 'true' } : {})}
                      className='flex items-center gap-2 cursor-pointer'
                    >
                      {renderOptionLabel ? (
                        <span className='flex min-w-0 flex-1'>{renderOptionLabel(option)}</span>
                      ) : (
                        <span className='flex-1 text-paragraph-sm text-text-strong-950'>
                          {option.label}
                        </span>
                      )}
                      {isSelected && <RiCheckLine className='size-4 text-text-main-900 shrink-0' />}
                    </Dropdown.Item>
                  );
                })}
              </div>
            )}
          </Dropdown.Content>
        </Dropdown.Root>
      </Tooltip.Provider>
    );
  },
);

MultiSelect.displayName = 'MultiSelect';

export { MultiSelect };
