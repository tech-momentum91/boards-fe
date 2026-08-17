import React, { useEffect, useRef, useState } from 'react';
import { RiPencilLine } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import * as Input from '@/components/ui/input';
import * as Tag from '@/components/ui/tag';

const toDisplayValue = (v) => {
  if (v === 0) return '0';
  if (v == null) return '';
  return String(v);
};

const pillClassName =
  'h-auto w-full min-w-0 max-w-full justify-between gap-2 rounded-full px-3 py-1.5';

const pencilIconClassName =
  'pointer-events-none size-4 shrink-0 text-text-soft-400 opacity-0 transition-opacity duration-200 group-hover/field:opacity-100';

/**
 * Read-only text with hover pencil; click the field to edit, blur or Enter to save.
 */
const InlineEditableText = ({
  value = '',
  onSave,
  placeholder = '—',
  /** When provided, shown in read-only mode instead of value; value is still used for editing. */
  displayValue,
  displayClassName = '',
  inputClassName = '',
  /** When set, read-only label shows at most this many characters + ellipsis; full value on hover. */
  maxDisplayChars,
  /** When true, only digits 0–9 can be entered. */
  numericOnly = false,
  maxLength,
  /** When true, only the pencil icon starts edit; label clicks bubble (e.g. row navigation). */
  editOnIconOnly = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(() => toDisplayValue(value));
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(toDisplayValue(value));
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const rawDisplay = toDisplayValue(value).trim();
  const readLabel = displayValue != null ? String(displayValue) : rawDisplay;
  const isPlaceholder = !rawDisplay;
  const isTruncated =
    maxDisplayChars != null && maxDisplayChars > 0 && readLabel.length > maxDisplayChars;
  const displayText = isPlaceholder
    ? placeholder
    : isTruncated
      ? `${readLabel.slice(0, maxDisplayChars)}…`
      : readLabel;

  const startEditing = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const commit = () => {
    const trimmed = draftValue.trim();
    const previous = toDisplayValue(value).trim();
    setIsEditing(false);
    if (trimmed !== previous) {
      onSave?.(trimmed);
    }
  };

  const cancel = () => {
    setDraftValue(toDisplayValue(value));
    setIsEditing(false);
  };

  const handleDraftChange = (raw) => {
    let next = raw;
    if (numericOnly) {
      next = String(raw ?? '').replaceAll(/\D/g, '');
    }
    if (maxLength != null && maxLength > 0) {
      next = next.slice(0, maxLength);
    }
    setDraftValue(next);
  };

  if (!isEditing) {
    return (
      <div
        role={editOnIconOnly ? undefined : 'button'}
        tabIndex={editOnIconOnly ? undefined : 0}
        className={cn(
          'group/field relative flex w-full min-h-6 min-w-[2.5rem] max-w-full items-center gap-1.5 pr-5',
          !editOnIconOnly && 'cursor-pointer',
        )}
        onClick={editOnIconOnly ? undefined : startEditing}
        onKeyDown={
          editOnIconOnly
            ? undefined
            : (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  startEditing(e);
                }
              }
        }
      >
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            isPlaceholder ? 'text-text-soft-400' : 'text-text-sub-600',
            displayClassName,
          )}
          title={isTruncated ? readLabel : undefined}
        >
          {displayText}
        </span>
        <RiPencilLine
          className={cn(
            pencilIconClassName,
            'absolute right-0 top-1/2 -translate-y-1/2',
            editOnIconOnly && 'pointer-events-auto cursor-pointer',
          )}
          onClick={editOnIconOnly ? startEditing : undefined}
          aria-hidden={!editOnIconOnly}
          aria-label={editOnIconOnly ? 'Edit' : undefined}
        />
      </div>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Tag.Root variant='stroke' className={pillClassName}>
        <Input.Root variant='borderless' size='xsmall' className='min-w-0 flex-1'>
          <Input.Wrapper className='px-0'>
            <Input.Input
              ref={inputRef}
              value={draftValue}
              onChange={(e) => handleDraftChange(e.target.value)}
              inputMode={numericOnly ? 'numeric' : undefined}
              maxLength={maxLength}
              onBlur={commit}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commit();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  cancel();
                }
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder={placeholder}
              className={cn('paragraph-small min-w-[3rem] text-text-sub-600', inputClassName)}
            />
          </Input.Wrapper>
        </Input.Root>
      </Tag.Root>
    </div>
  );
};

export default InlineEditableText;
