import React, { useRef } from 'react';

import * as Label from '@/components/ui/label';
import * as Tag from '@/components/ui/tag';
import { cn } from '@/utils/cn';

/**
 * Figma inline tags field — chips + text input inside one bordered container.
 */
export default function ProductsInlineTagsField({
  label,
  required = false,
  tags = [],
  inputValue,
  onInputChange,
  onInputKeyDown,
  onRemoveTag,
  placeholder = 'Type here',
  className,
  inputRef: externalInputRef,
}) {
  const inputRef = useRef(null);
  const mergedInputRef = externalInputRef || inputRef;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label ? (
        <Label.Root>
          {label}
          {required ? <Label.Asterisk /> : null}
        </Label.Root>
      ) : null}
      <div
        className='flex min-h-9 cursor-text flex-wrap items-center gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 py-1.5 pl-1.5 pr-2 shadow-regular-xs'
        onClick={() => mergedInputRef.current?.focus()}
        role='presentation'
      >
        {tags.map((item) => (
          <Tag.Root
            key={item}
            variant='stroke'
            className='h-6 shrink-0 gap-0.5 rounded-md bg-bg-white-0 px-2 py-[3px] ring-stroke-soft-200'
          >
            <span className='text-label-xs font-medium text-text-sub-600'>{item}</span>
            <Tag.DismissButton onClick={() => onRemoveTag(item)} aria-label={`Remove ${item}`} />
          </Tag.Root>
        ))}
        <input
          ref={mergedInputRef}
          type='text'
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder={tags.length === 0 ? placeholder : placeholder}
          className='min-w-[80px] flex-1 border-0 bg-transparent py-0.5 text-paragraph-sm text-text-strong-950 placeholder:text-text-soft-400 focus:outline-none'
        />
      </div>
    </div>
  );
}
