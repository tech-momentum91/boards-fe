import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowDownSLine, RiSearchLine } from 'react-icons/ri';

import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import {
  getKnowledgeCenterCityOptionForValue,
  KNOWLEDGE_CENTER_CITY_MIN_SEARCH_LEN,
  searchKnowledgeCenterCityOptions,
} from '@/utils/knowledge-center-city-options';

/**
 * City picker using Radix Popover + plain list (no Select items). Avoids focus/DOM issues from SearchableSelect + huge dynamic lists.
 */
export function KnowledgeCenterCityPopover({
  value,
  onValueChange,
  disabled,
  placeholder = 'Select city',
  contentClassName,
  triggerClassName,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);

  const selectedLabel = useMemo(() => {
    const opt = getKnowledgeCenterCityOptionForValue(value);
    return opt?.label ?? '';
  }, [value]);

  const rows = useMemo(() => searchKnowledgeCenterCityOptions(query, value), [query, value]);

  useEffect(() => {
    if (!open) return undefined;
    const id = window.requestAnimationFrame(() => {
      searchRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  const handlePick = (optValue) => {
    onValueChange?.(optValue);
    setOpen(false);
    setQuery('');
  };

  const qTrim = query.trim();
  const showMinHint = qTrim.length > 0 && qTrim.length < KNOWLEDGE_CENTER_CITY_MIN_SEARCH_LEN;

  let listBody = null;
  if (showMinHint) {
    listBody = (
      <p className='px-2 py-6 text-center text-paragraph-sm text-text-soft-400'>
        Type at least {KNOWLEDGE_CENTER_CITY_MIN_SEARCH_LEN} characters to search cities.
      </p>
    );
  } else if (rows.length > 0) {
    listBody = rows.map((opt) => (
      <button
        key={opt.value}
        type='button'
        className={cn(
          'w-full rounded-lg p-2 text-left text-paragraph-sm text-text-strong-950',
          'hover:bg-bg-weak-50 focus-visible:bg-bg-weak-50 focus-visible:outline-none',
        )}
        onClick={() => handlePick(opt.value)}
      >
        {opt.label}
      </button>
    ));
  } else {
    const emptyMsg =
      qTrim.length >= KNOWLEDGE_CENTER_CITY_MIN_SEARCH_LEN
        ? 'No cities match your search.'
        : 'Type at least 2 letters to search cities.';
    listBody = (
      <p className='px-2 py-6 text-center text-paragraph-sm text-text-soft-400'>{emptyMsg}</p>
    );
  }

  return (
    <Popover.Root
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <Popover.Trigger asChild>
        <button
          type='button'
          disabled={disabled}
          data-state={open ? 'open' : 'closed'}
          className={cn(
            'relative flex h-8 min-h-8 w-full cursor-pointer items-center justify-between gap-1.5 rounded-lg bg-transparent pl-2 pr-1.5 text-left text-paragraph-sm text-text-strong-950 outline-none ring-1 ring-transparent transition',
            'hover:bg-bg-weak-50 focus-visible:outline-none focus-visible:ring-primary-base',
            'data-[state=open]:bg-bg-weak-50',
            'disabled:pointer-events-none disabled:text-text-disabled-300',
            triggerClassName,
          )}
        >
          <span
            className={cn(
              'min-w-0 flex-1 truncate',
              selectedLabel ? '' : 'text-text-soft-400 opacity-70',
            )}
          >
            {selectedLabel || placeholder}
          </span>
          <RiArrowDownSLine
            className={cn('size-5 shrink-0 text-text-soft-400', open ? 'text-text-strong-950' : '')}
          />
        </button>
      </Popover.Trigger>
      <Popover.Content
        align='start'
        sideOffset={8}
        collisionPadding={16}
        showArrow={false}
        className={cn(
          'z-[600] min-w-[280px] max-w-[min(100vw-24px,400px)] rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-0 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200',
          contentClassName,
        )}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <div className='flex flex-col'>
          <div className='border-b border-stroke-soft-200 p-2'>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  ref={searchRef}
                  placeholder='Search cities…'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div
            className='flex max-h-[236px] flex-col gap-1 overflow-y-auto p-2'
            onWheel={(e) => e.stopPropagation()}
          >
            {listBody}
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
