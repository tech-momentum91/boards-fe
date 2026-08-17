import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowDownSLine, RiCheckLine, RiLayout6Line, RiSearchLine } from 'react-icons/ri';
import * as CompactButton from '@/components/ui/compact-button';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import { selectVariants } from '@/components/ui/select';
import { cn } from '@/utils/cn';

const CONTENT_CLASS =
  'relative z-50 min-w-[280px] max-h-[300px] max-w-[min(100vw-24px,400px)] w-full cursor-pointer overflow-hidden rounded-2xl bg-bg-white-0 p-0 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200';

const TRIGGER_VALUE_WRAP_CLASS =
  'min-w-0 flex-1 overflow-hidden text-left [&>span]:block [&>span]:min-w-0 [&>span]:max-w-full [&>span]:truncate';

/**
 * Area select with a layout button on each option. Selecting layout opens the floor preview panel.
 */
export default function ProjectAreaSelect({
  id,
  value,
  onValueChange,
  options = [],
  onShowLayout,
  placeholder = 'Select',
  searchPlaceholder = 'Search...',
  disabled = false,
  hasError = false,
  size = 'xsmall',
  variant = 'borderless',
  showArrow = false,
  contentClassName,
  triggerClassName,
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  const { triggerRoot, triggerArrow } = selectVariants({
    size,
    variant,
    hasError,
  });

  const trimmedQuery = searchQuery.trim().toLowerCase();

  const list = useMemo(() => {
    const filtered = trimmedQuery
      ? options.filter(
          (option) =>
            String(option.label || '')
              .toLowerCase()
              .includes(trimmedQuery) ||
            String(option.value || '')
              .toLowerCase()
              .includes(trimmedQuery),
        )
      : options;

    const selected = options.find((option) => String(option.value) === String(value ?? ''));
    if (!selected || filtered.some((option) => String(option.value) === String(selected.value))) {
      return filtered;
    }
    return [selected, ...filtered];
  }, [options, trimmedQuery, value]);

  const selectedOption = useMemo(
    () => options.find((option) => String(option.value) === String(value ?? '').trim()),
    [options, value],
  );

  const handlePick = (nextValue) => {
    onValueChange?.(nextValue);
    setOpen(false);
    setSearchQuery('');
  };

  const handleShowLayout = (event, option) => {
    event.preventDefault();
    event.stopPropagation();
    onValueChange?.(option.value);
    onShowLayout?.(option);
    setOpen(false);
    setSearchQuery('');
  };

  useEffect(() => {
    if (!open) return undefined;
    const idFrame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(idFrame);
  }, [open]);

  return (
    <Popover.Root
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearchQuery('');
      }}
    >
      <Popover.Trigger asChild>
        <button
          type='button'
          id={id}
          disabled={disabled}
          data-state={open ? 'open' : 'closed'}
          data-placeholder={selectedOption ? undefined : ''}
          className={cn(triggerRoot({ class: triggerClassName }), !showArrow && 'pr-2')}
        >
          <span className={TRIGGER_VALUE_WRAP_CLASS}>
            <span className='block min-w-0 max-w-full truncate'>
              {selectedOption?.label || placeholder}
            </span>
          </span>
          {showArrow ? <RiArrowDownSLine className={triggerArrow()} aria-hidden /> : null}
        </button>
      </Popover.Trigger>
      <Popover.Content
        align='start'
        sideOffset={8}
        collisionPadding={16}
        showArrow={false}
        className={cn(CONTENT_CLASS, contentClassName)}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className='flex flex-col'>
          <div className='flex items-center gap-2 border-b border-stroke-soft-200 p-2'>
            <Input.Root size='small' className='min-w-0 flex-1'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  ref={searchInputRef}
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                />
              </Input.Wrapper>
            </Input.Root>
            {selectedOption ? (
              <CompactButton.Root
                type='button'
                variant='stroke'
                size='large'
                aria-label={`Show layout for ${selectedOption.label}`}
                onClick={(event) => handleShowLayout(event, selectedOption)}
              >
                <CompactButton.Icon as={RiLayout6Line} />
              </CompactButton.Root>
            ) : null}
          </div>

          <div
            className='flex max-h-[236px] flex-col gap-1 overflow-y-auto p-2'
            onWheel={(event) => event.stopPropagation()}
          >
            {list.length > 0 ? (
              list.map((option) => {
                const isSelected = String(option.value) === String(value ?? '');
                return (
                  <div
                    key={option.value}
                    className={cn(
                      'group flex w-full items-center gap-2 rounded-lg p-2 text-left text-paragraph-sm text-text-strong-950 transition duration-200 ease-out hover:bg-bg-weak-50',
                      isSelected && 'bg-bg-weak-50',
                    )}
                  >
                    <button
                      type='button'
                      className='flex min-w-0 flex-1 items-center gap-2 text-left'
                      onClick={() => handlePick(option.value)}
                    >
                      {isSelected ? (
                        <RiCheckLine className='size-4 shrink-0 text-text-soft-400' />
                      ) : (
                        <span className='size-4 shrink-0' aria-hidden />
                      )}
                      <span className='min-w-0 flex-1 truncate'>{option.label}</span>
                      {option.badge ? (
                        <span className='shrink-0 text-label-xs text-text-soft-400'>
                          {option.badge}
                        </span>
                      ) : null}
                    </button>

                    <CompactButton.Root
                      type='button'
                      variant='stroke'
                      size='medium'
                      aria-label={`Show layout for ${option.label}`}
                      className='shrink-0 opacity-0 transition-opacity group-hover:opacity-100'
                      onClick={(event) => handleShowLayout(event, option)}
                    >
                      <CompactButton.Icon as={RiLayout6Line} />
                    </CompactButton.Root>
                  </div>
                );
              })
            ) : (
              <div className='px-4 py-8 text-center text-paragraph-sm text-text-soft-400'>
                No areas found
              </div>
            )}
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
