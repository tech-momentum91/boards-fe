import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RiPencilLine } from 'react-icons/ri';

import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Textarea from '@/components/ui/textarea';
import { Datepicker } from '@/components/ui/datepicker';
import { StatusColorPill } from '@/components/ui/status-color-pill';
import { parseToDate } from '@/utils/date-utils';
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor';
import {
  getEventStatusBadgeColor,
  EVENT_INLINE_EDIT_PENCIL_ICON_CLASSNAME,
} from '@/components/event-management/constant';

export const toDisplayValue = (v) => {
  if (v === 0) return '0';
  if (v == null) return '';
  return String(v);
};

export const InlineEditableText = ({ value = '', onSave }) => {
  const [draftValue, setDraftValue] = useState(toDisplayValue(value));

  useEffect(() => {
    setDraftValue(toDisplayValue(value));
  }, [value]);

  return (
    <Input.Root variant='borderless' size='xsmall' className='group w-full max-w-full'>
      <Input.Wrapper className='relative gap-1.5 px-1.5 pr-7'>
        <Input.Input
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          onBlur={(e) => onSave?.(e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          placeholder='--'
          className='text-label-sm text-text-main-900'
        />
        <RiPencilLine className={EVENT_INLINE_EDIT_PENCIL_ICON_CLASSNAME} />
      </Input.Wrapper>
    </Input.Root>
  );
};

export const InlineEditableSelect = ({
  value = '',
  options = [],
  onSave,
  /** When true, show status-style badge in the trigger (any option values). */
  showStatusBadge = false,
}) => {
  const normalizedValue = String(value || '').trim();

  const matchedOptionByValue = options.find(
    (opt) =>
      String(opt?.value || '')
        .trim()
        .toLowerCase() === normalizedValue.toLowerCase(),
  );
  const matchedOptionByLabel = options.find(
    (opt) =>
      String(opt?.label || '')
        .trim()
        .toLowerCase() === normalizedValue.toLowerCase(),
  );
  const resolvedOption = matchedOptionByValue || matchedOptionByLabel;
  const selectValue = resolvedOption?.value || '';

  const isStatusSelect =
    showStatusBadge ||
    (options === undefined
      ? false
      : options?.some?.((o) => {
          const v = String(o?.value || '').toLowerCase();
          return (
            v === 'exploration' ||
            v === 'proposed to ho' ||
            v === 'approved by ho' ||
            v === 'planned' ||
            v === 'executed' ||
            v === 'rejected by ho' ||
            v === 'draft' ||
            v === 'open for registration' ||
            v === 'registration closed' ||
            v === 'ongoing' ||
            v === 'completed' ||
            v === 'cancelled'
          );
        }));

  return (
    <SearchableSelect
      variant='borderless'
      value={selectValue}
      onValueChange={(next) => onSave?.(next)}
      size='xsmall'
      options={options}
      placeholder='Select'
      triggerClassName='group relative w-full !min-h-9 gap-1.5 !rounded-md !px-1.5 !pr-7 text-left'
      renderTrigger={({ selectedLabel }) => {
        const displayLabel = selectedLabel || resolvedOption?.label || '--';
        return (
          <>
            {isStatusSelect ? (
              <StatusColorPill
                value={displayLabel}
                color={resolvedOption?.color}
                className='max-w-[min(100%,180px)]'
              />
            ) : (
              <span className='text-label-sm text-text-main-900'>{displayLabel}</span>
            )}
            <RiPencilLine className={EVENT_INLINE_EDIT_PENCIL_ICON_CLASSNAME} />
          </>
        );
      }}
    />
  );
};

export const InlineEditableDate = ({ value = '', onSave }) => {
  return (
    <div className='group relative w-full max-w-full'>
      <Datepicker
        // variant='neutral'
        mode='stroke'
        value={parseToDate(value) || undefined}
        variant='borderless'
        onChange={(date) => onSave?.(date ?? '')}
        placeholder='--'
        size='xsmall'
        className='!h-8 min-h-9 w-full max-w-full justify-start !rounded-md !px-1.5 !pr-7 text-left text-label-sm font-normal focus-visible:!ring-primary-base'
      />
      <RiPencilLine className={EVENT_INLINE_EDIT_PENCIL_ICON_CLASSNAME} />
    </div>
  );
};

export const InlineEditableTextarea = ({ value = '', onSave }) => {
  const [draftValue, setDraftValue] = useState(toDisplayValue(value));

  useEffect(() => {
    setDraftValue(toDisplayValue(value));
  }, [value]);

  return (
    <div className='group relative w-full max-w-full'>
      <Textarea.Root
        value={draftValue}
        onChange={(e) => setDraftValue(e.target.value)}
        onBlur={() => onSave?.(draftValue.trim())}
        placeholder='--'
        simple
        className='field-sizing-content min-h-[4.5rem] w-full rounded-md px-1.5 py-1.5 pr-7 text-paragraph-sm text-text-main-900'
      />
      <RiPencilLine className='pointer-events-none absolute right-1.5 top-3 size-4 text-text-soft-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100' />
    </div>
  );
};

/** Rich-text event description/details; commits HTML on blur when focus leaves the editor shell (matches textarea inline-edit UX). */
export const InlineEditableRichEditor = ({ value = '', onSave, disabled = false }) => {
  const [draftHtml, setDraftHtml] = useState(() => (typeof value === 'string' ? value : ''));
  const [editorKey, setEditorKey] = useState(0);
  const draftRef = useRef(draftHtml);
  const prevSyncedValueRef = useRef(null);

  useEffect(() => {
    draftRef.current = draftHtml;
  }, [draftHtml]);

  useEffect(() => {
    const next = typeof value === 'string' ? value : '';
    if (prevSyncedValueRef.current === next) return;
    prevSyncedValueRef.current = next;
    setDraftHtml(next);
    draftRef.current = next;
    setEditorKey((k) => k + 1);
  }, [value]);

  const handleBlurCapture = useCallback(
    (e) => {
      if (disabled) return;
      const related = e.relatedTarget;
      if (related instanceof Node && e.currentTarget.contains(related)) return;
      const next = draftRef.current;
      const current = typeof value === 'string' ? value : '';
      if (next === current) return;
      onSave?.(next);
    },
    [disabled, onSave, value],
  );

  return (
    <div className='group relative w-full max-w-full' onBlurCapture={handleBlurCapture}>
      <div
        className={
          disabled
            ? 'pointer-events-none w-full overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0 opacity-60'
            : 'w-full overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0'
        }
      >
        <SimpleEditor
          key={editorKey}
          embed
          value={draftHtml}
          onChange={(html) => {
            setDraftHtml(html);
            draftRef.current = html;
          }}
        />
      </div>
    </div>
  );
};
