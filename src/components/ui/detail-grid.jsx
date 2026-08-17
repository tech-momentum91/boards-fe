import React from 'react';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';

/**
 * Two-column grid of label/value pairs with optional edit icon.
 * Same pattern as Space detail page: pass items with { label, value, editable }.
 * value can be a string, number, or React node (e.g. Input, Badge, link).
 * When value is null, undefined, or empty string, emptyPlaceholder is shown.
 */
const DetailGrid = ({ items = [], emptyPlaceholder = '–', className }) => {
  const isEmpty = (v) => v == null || (typeof v === 'string' && v.trim() === '');

  return (
    <div className={className ?? 'grid grid-cols-2 gap-x-12 gap-y-4.5'}>
      {items.map((item) => (
        <div key={item.label} className='flex flex-col gap-1'>
          <div className='text-paragraph-sm opacity-72 text-text-sub-500'>{item.label}</div>
          <div className='text-paragraph-sm text-text-strong-950 py-0.5'>
            <EditableFieldWrapper
              editable={item.editable ?? false}
              iconClassName='mr-2'
              onEdit={item.onEdit}
            >
              {(typeof item.value === 'object' && item.value !== null) || !isEmpty(item.value)
                ? item.value
                : emptyPlaceholder}
            </EditableFieldWrapper>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DetailGrid;
