import React, { useMemo, useRef, useState } from 'react';
import { RiSearchLine } from 'react-icons/ri';
import * as PopoverPrimitive from '@radix-ui/react-popover';

import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import * as Input from '@/components/ui/input';
import { cn } from '@/utils/cn';
import { CLIENT_LAYOUT_FILTER_ALL } from '@/utils/client-layout-coworker-filters';

const MAX_SUGGESTIONS = 50;

/**
 * Typeahead search for co-workers in the client layout header.
 *
 * Renders an `Input.Root` and floats a popover of suggestions while focused.
 * Selecting a suggestion calls `onPick(coworkerRef)` which the parent uses to
 * set the coworker filter — same code path as the dropdown selection.
 *
 * @param {{
 *   value: string,
 *   onValueChange: (value: string) => void,
 *   onPick: (coworkerRef: string) => void,
 *   options: Array<{ value: string, label: string }>,
 *   placeholder?: string,
 *   className?: string,
 * }} props
 */
export default function ClientLayoutCoworkerSearchPopover({
  value,
  onValueChange,
  onPick,
  options,
  placeholder = 'Search co-workers',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);

  const filteredOptions = useMemo(() => {
    const term = String(value || '')
      .trim()
      .toLowerCase();
    const realOptions = (options ?? []).filter((o) => o.value !== CLIENT_LAYOUT_FILTER_ALL);
    if (!term) return realOptions.slice(0, MAX_SUGGESTIONS);
    return realOptions
      .filter((o) =>
        String(o.label || '')
          .toLowerCase()
          .includes(term),
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [options, value]);

  const handleChange = (event) => {
    const next = event.target.value;
    onValueChange(next);
    if (!isOpen) setIsOpen(true);
  };

  const handlePick = (option) => {
    onPick(option.value);
    onValueChange(option.label);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Anchor asChild>
        <Input.Root size='small' className={cn('w-[16rem] max-w-full min-w-0 shrink', className)}>
          <Input.Wrapper>
            <Input.Icon>
              <RiSearchLine />
            </Input.Icon>
            <Input.Input
              ref={inputRef}
              placeholder={placeholder}
              value={value}
              onChange={handleChange}
              onFocus={() => setIsOpen(true)}
              aria-label={placeholder}
            />
          </Input.Wrapper>
        </Input.Root>
      </PopoverPrimitive.Anchor>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align='start'
          sideOffset={4}
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn(
            'z-[60] w-[var(--radix-popover-trigger-width)] min-w-[14rem] max-w-[24rem]',
            'overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0 shadow-regular-md',
            'ring-1 ring-inset ring-stroke-soft-200',
          )}
        >
          {filteredOptions.length === 0 ? (
            <p className='px-3 py-2 text-paragraph-xs text-text-soft-400'>No matches</p>
          ) : (
            <ul className='max-h-[16rem] overflow-y-auto py-1' role='listbox'>
              {filteredOptions.map((opt) => (
                <li key={opt.value}>
                  <button
                    type='button'
                    onClick={() => handlePick(opt)}
                    className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-paragraph-sm text-text-strong-950 hover:bg-bg-weak-50'
                    role='option'
                    aria-selected={false}
                  >
                    <CrmAccountAvatar
                      name={opt.name || opt.label}
                      image={opt.image || null}
                      size={24}
                      showNativeTitle={false}
                    />
                    <span className='min-w-0 flex-1 truncate'>{opt.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
