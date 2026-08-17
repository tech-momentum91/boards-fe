import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import { filterDepartmentOptionsBySearch } from '@/utils/coworker-departments';

const LIST_PANEL_CLASS =
  'max-h-[220px] overflow-y-auto rounded-2xl bg-bg-white-0 p-1 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200';

/**
 * Free-text combobox for common area type — suggestions in a portalled popover above the field.
 *
 * @param {{
 *   value: string,
 *   onValueChange: (value: string) => void,
 *   options: Array<{ value: string, label: string }>,
 *   placeholder?: string,
 *   disabled?: boolean,
 *   hasError?: boolean,
 *   size?: 'small' | 'xsmall' | 'medium',
 *   variant?: string,
 *   triggerClassName?: string,
 *   commitOnBlurOnly?: boolean,
 * }} props
 */
export default function SearchableCommonAreaTypeSelect({
  value,
  onValueChange,
  options = [],
  placeholder = 'Enter or select common area type',
  disabled = false,
  hasError = false,
  size = 'small',
  variant,
  triggerClassName = 'w-full',
  commitOnBlurOnly = false,
}) {
  const inputRef = useRef(null);
  const anchorRef = useRef(null);
  const skipBlurCommitRef = useRef(false);
  const blurTimeoutRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const displayLabel = useMemo(() => {
    if (!value) return '';
    const match = options.find((opt) => opt.value === value);
    return match?.label ?? value;
  }, [options, value]);

  const filteredOptions = useMemo(
    () => filterDepartmentOptionsBySearch(options, query, { showAllWhenEmpty: true }),
    [options, query],
  );

  const syncOpen = useCallback(
    (text) => {
      setIsOpen(
        filterDepartmentOptionsBySearch(options, text, { showAllWhenEmpty: true }).length > 0,
      );
    },
    [options],
  );

  useEffect(() => {
    if (!isOpen) setQuery(displayLabel);
  }, [displayLabel, isOpen]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current != null) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const commitValue = useCallback(
    (nextRaw) => {
      onValueChange(String(nextRaw ?? '').trim());
    },
    [onValueChange],
  );

  const isTriggerEvent = useCallback((event) => {
    const el = anchorRef.current;
    if (!el) return false;
    const { target } = event;
    return el === target || el.contains(target);
  }, []);

  const handleFocus = () => {
    if (disabled) return;
    setQuery(displayLabel);
    syncOpen(displayLabel);
  };

  const handleChange = (event) => {
    const next = event.target.value;
    setQuery(next);
    if (!commitOnBlurOnly) {
      commitValue(next);
    }
    syncOpen(next);
  };

  const handleSelect = (optionValue) => {
    skipBlurCommitRef.current = true;
    const match = options.find((opt) => opt.value === optionValue);
    const label = match?.label ?? optionValue;
    setQuery(label);
    onValueChange(optionValue);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleBlur = () => {
    if (blurTimeoutRef.current != null) {
      window.clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = window.setTimeout(() => {
      blurTimeoutRef.current = null;
      setIsOpen(false);
      if (skipBlurCommitRef.current) {
        skipBlurCommitRef.current = false;
        return;
      }
      commitValue(query);
    }, 150);
  };

  return (
    <Popover.Root
      modal={false}
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) setIsOpen(false);
      }}
    >
      <div className={cn('relative', triggerClassName)}>
        <Popover.Anchor asChild>
          <div ref={anchorRef} className='w-full'>
            <Input.Root size={size} variant={variant} hasError={hasError}>
              <Input.Wrapper>
                <Input.Input
                  ref={inputRef}
                  value={isOpen ? query : displayLabel}
                  onChange={handleChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  placeholder={placeholder}
                  disabled={disabled}
                  autoComplete='off'
                />
              </Input.Wrapper>
            </Input.Root>
          </div>
        </Popover.Anchor>

        <Popover.Content
          side='top'
          align='start'
          sideOffset={4}
          collisionPadding={16}
          showArrow={false}
          unstyled
          className={cn('z-[60] w-(--radix-popover-trigger-width) min-w-[120px]', LIST_PANEL_CLASS)}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => {
            if (isTriggerEvent(event)) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (isTriggerEvent(event)) event.preventDefault();
          }}
        >
          <ul role='listbox'>
            {filteredOptions.map((option) => (
              <li key={option.value} role='presentation'>
                <button
                  type='button'
                  role='option'
                  aria-selected={option.value === value}
                  className={cn(
                    'flex w-full cursor-pointer select-none rounded-lg px-2 py-2 text-left text-paragraph-sm text-text-strong-950',
                    'transition duration-200 ease-out hover:bg-bg-weak-50 focus-visible:bg-bg-weak-50 focus-visible:outline-0',
                    option.value === value && 'bg-bg-weak-50',
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </div>
    </Popover.Root>
  );
}
