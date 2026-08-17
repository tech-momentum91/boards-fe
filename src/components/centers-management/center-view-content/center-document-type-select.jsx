import React, { useEffect, useMemo, useState } from 'react';
import { RiArrowDownSLine, RiCheckLine, RiLoader4Line, RiSearchLine } from 'react-icons/ri';

import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';

const DEFAULT_CATEGORY = 'Other';

const normalizeDocumentTypes = (types = []) => {
  return types.map((type) => {
    const id = type.name ?? type.value;
    const label = type.label || type.name || 'Unnamed';
    const category = type.document_category || type.doc_category || DEFAULT_CATEGORY;
    return {
      id,
      label,
      category,
      raw: type,
    };
  });
};

// Single-select dropdown that mirrors the layout of `CenterAccessDropdown`
// (collapsible category groups with grouped items underneath) but without
// checkboxes — selecting any row immediately commits the new value and
// closes the popover.
const CenterDocumentTypeSelect = ({
  documentTypes = [],
  value,
  onChange,
  isLoading = false,
  hasError = false,
  disabled = false,
  placeholder = 'Select document type',
  className = '',
  emptyMessage = 'No document types found',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState({});

  const normalized = useMemo(() => normalizeDocumentTypes(documentTypes), [documentTypes]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return normalized;
    const term = searchTerm.toLowerCase();
    return normalized.filter(
      (option) =>
        option.label.toLowerCase().includes(term) || option.category.toLowerCase().includes(term),
    );
  }, [normalized, searchTerm]);

  const grouped = useMemo(() => {
    const buckets = filtered.reduce((accumulator, option) => {
      if (!accumulator[option.category]) accumulator[option.category] = [];
      accumulator[option.category].push(option);
      return accumulator;
    }, {});

    // Sort categories alphabetically; sort items inside each bucket too.
    const sortedEntries = Object.entries(buckets)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([category, items]) => [
        category,
        [...items].sort((a, b) => a.label.localeCompare(b.label)),
      ]);

    return sortedEntries;
  }, [filtered]);

  // Reset search whenever the popover closes so subsequent opens start fresh.
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const selectedOption = useMemo(
    () => normalized.find((option) => option.id === value),
    [normalized, value],
  );

  const handleSelect = (optionId) => {
    if (optionId === value) {
      setIsOpen(false);
      return;
    }
    onChange?.(optionId);
    setIsOpen(false);
  };

  const handleOpenChange = (open) => {
    if (disabled) return;
    setIsOpen(open);
  };

  const triggerLabel = selectedOption?.label || (value ?? '');

  return (
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type='button'
          disabled={disabled}
          data-state={isOpen ? 'open' : 'closed'}
          data-placeholder={triggerLabel ? undefined : ''}
          className={cn(
            'group/trigger relative w-full min-w-0 cursor-pointer shrink-0',
            'h-10 min-h-10 gap-2 rounded-10 pl-3 pr-2.5',
            'flex items-center text-left',
            'bg-bg-white-0 shadow-regular-xs outline-none ring-1 ring-inset ring-stroke-soft-200',
            'text-paragraph-sm text-text-strong-950',
            'transition duration-200 ease-out',
            'hover:bg-bg-weak-50 hover:ring-transparent',
            'focus:shadow-button-important-focus focus:outline-none focus:ring-primary-base',
            'disabled:pointer-events-none disabled:bg-bg-weak-50 disabled:text-text-disabled-300 disabled:shadow-none disabled:ring-transparent',
            'data-[state=open]:!shadow-button-important-focus data-[state=open]:ring-primary-base',
            hasError &&
              'ring-error-base focus:shadow-button-error-focus focus:ring-error-base data-[state=open]:ring-error-base',
            className,
          )}
        >
          <span className={cn('flex-1 truncate', !triggerLabel && 'text-text-soft-400 opacity-70')}>
            {triggerLabel || placeholder}
          </span>
          {isLoading ? (
            <RiLoader4Line className='ml-auto size-5 shrink-0 animate-spin text-text-soft-400' />
          ) : (
            <RiArrowDownSLine
              className={cn(
                'ml-auto size-5 shrink-0 text-text-soft-400 transition-transform duration-200 ease-out',
                isOpen && 'rotate-180 text-text-strong-950',
              )}
            />
          )}
        </button>
      </Popover.Trigger>

      <Popover.Content
        align='start'
        sideOffset={6}
        showArrow={false}
        className='flex w-(--radix-popper-anchor-width) min-w-[260px] flex-col gap-3 p-3'
      >
        <Input.Root size='small'>
          <Input.Wrapper>
            <Input.Icon>
              <RiSearchLine />
            </Input.Icon>
            <Input.Input
              placeholder='Search document types...'
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </Input.Wrapper>
        </Input.Root>

        <div className='flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1'>
          {isLoading ? (
            <div className='flex items-center justify-center gap-2 py-6 text-paragraph-sm text-text-sub-600'>
              <RiLoader4Line className='size-4 animate-spin' />
              Loading document types...
            </div>
          ) : grouped.length === 0 ? (
            <div className='py-6 text-center text-paragraph-sm text-text-sub-600'>
              {searchTerm ? 'No document types match your search' : emptyMessage}
            </div>
          ) : (
            grouped.map(([category, items]) => {
              const isCollapsed = collapsedCategories[category];
              return (
                <div key={category} className='flex flex-col gap-1'>
                  <button
                    type='button'
                    className='flex items-center gap-2 rounded-lg px-2 py-2 text-left outline-none transition hover:bg-bg-weak-50 focus-visible:ring-2 focus-visible:ring-primary-base'
                    onClick={() =>
                      setCollapsedCategories((previous) => ({
                        ...previous,
                        [category]: !previous[category],
                      }))
                    }
                  >
                    <span className='flex-1 text-[11px] font-medium uppercase tracking-[0.08em] text-text-soft-400'>
                      {category}
                    </span>
                    <RiArrowDownSLine
                      className={cn(
                        'size-4 shrink-0 text-text-soft-400 transition-transform',
                        isCollapsed ? '-rotate-90' : 'rotate-0',
                      )}
                    />
                  </button>

                  {!isCollapsed &&
                    items.map((option) => {
                      const isSelected = option.id === value;
                      return (
                        <button
                          key={option.id}
                          type='button'
                          onClick={() => handleSelect(option.id)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-2 py-2 pl-6 text-left outline-none transition hover:bg-bg-weak-50 focus-visible:ring-2 focus-visible:ring-primary-base',
                            isSelected && 'bg-bg-weak-100',
                          )}
                        >
                          <span
                            className={cn(
                              'flex-1 truncate text-paragraph-sm',
                              isSelected
                                ? 'font-medium text-text-strong-950'
                                : 'text-text-strong-950',
                            )}
                          >
                            {option.label}
                          </span>
                          {isSelected && (
                            <RiCheckLine className='size-4 shrink-0 text-primary-base' />
                          )}
                        </button>
                      );
                    })}
                </div>
              );
            })
          )}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};

CenterDocumentTypeSelect.displayName = 'CenterDocumentTypeSelect';

export default CenterDocumentTypeSelect;
