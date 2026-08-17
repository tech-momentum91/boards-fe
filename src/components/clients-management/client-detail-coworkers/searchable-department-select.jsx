import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as Input from '@/components/ui/input';
import { cn } from '@/utils/cn';
import { filterDepartmentOptionsBySearch } from '@/utils/coworker-departments';

const LIST_CLASS =
  'absolute left-0 right-0 top-full z-50 mt-1 max-h-[220px] overflow-y-auto rounded-2xl bg-bg-white-0 p-1 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200';

/**
 * Combobox-style department field — always editable; suggestions appear only when text matches options.
 *
 * @param {{
 *   value: string,
 *   onValueChange: (value: string) => void,
 *   options: Array<{ value: string, label: string }>,
 *   placeholder?: string,
 *   disabled?: boolean,
 *   hasError?: boolean,
 *   size?: 'small' | 'xsmall' | 'medium',
 *   triggerClassName?: string,
 *   showAllWhenEmpty?: boolean,
 *   emptyValue?: string,
 * }} props
 */
export default function SearchableDepartmentSelect({
  value,
  onValueChange,
  options = [],
  placeholder = 'Select department',
  disabled = false,
  hasError = false,
  size = 'small',
  triggerClassName = 'w-full',
  showAllWhenEmpty = false,
  emptyValue,
}) {
  const inputRef = useRef(null);
  const skipBlurCommitRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const isEmptySentinel = emptyValue != null && value === emptyValue;

  const displayLabel = useMemo(() => {
    if (isEmptySentinel || !value) return '';
    const match = options.find((opt) => opt.value === value);
    return match?.label ?? value;
  }, [isEmptySentinel, options, value]);

  const filteredOptions = useMemo(
    () => filterDepartmentOptionsBySearch(options, query, { showAllWhenEmpty }),
    [options, query, showAllWhenEmpty],
  );

  const showSuggestions = isOpen && filteredOptions.length > 0;

  useEffect(() => {
    if (!isOpen) setQuery(displayLabel);
  }, [displayLabel, isOpen]);

  const commitValue = useCallback(
    (nextRaw) => {
      const trimmed = String(nextRaw ?? '').trim();
      if (!trimmed && emptyValue != null) {
        onValueChange(emptyValue);
        return;
      }
      onValueChange(trimmed);
    },
    [emptyValue, onValueChange],
  );

  const handleFocus = () => {
    if (disabled) return;
    setIsOpen(true);
    setQuery(displayLabel);
  };

  const handleChange = (event) => {
    const next = event.target.value;
    setQuery(next);
    setIsOpen(true);
    commitValue(next);
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
    window.setTimeout(() => {
      setIsOpen(false);
      if (skipBlurCommitRef.current) {
        skipBlurCommitRef.current = false;
        return;
      }
      commitValue(query);
    }, 150);
  };

  return (
    <div className={cn('relative', triggerClassName)}>
      <Input.Root size={size} hasError={hasError}>
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

      {showSuggestions ? (
        <ul className={LIST_CLASS} role='listbox'>
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
      ) : null}
    </div>
  );
}
