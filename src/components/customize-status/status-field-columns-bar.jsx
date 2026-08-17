import React from 'react';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { getStatusFieldKey } from '@/constants/status-field-key';

function getFieldColumnLabel(fieldSpec) {
  return fieldSpec.label || fieldSpec.field || '';
}

export default function StatusFieldColumnsBar({
  fields = [],
  activeFieldKey,
  onActiveFieldChange,
}) {
  const resolvedActiveFieldKey = activeFieldKey || getStatusFieldKey(fields[0]);

  if (fields.length <= 1) {
    return null;
  }

  return (
    <TabMenuHorizontal.Root
      value={resolvedActiveFieldKey}
      onValueChange={onActiveFieldChange}
      className='w-full'
    >
      <TabMenuHorizontal.List
        wrapperClassName='w-full'
        className='px-0 border-t-0 border-b border-stroke-soft-200'
      >
        {fields.map((fieldSpec) => (
          <TabMenuHorizontal.Trigger
            key={getStatusFieldKey(fieldSpec)}
            value={getStatusFieldKey(fieldSpec)}
          >
            {getFieldColumnLabel(fieldSpec)}
          </TabMenuHorizontal.Trigger>
        ))}
      </TabMenuHorizontal.List>
    </TabMenuHorizontal.Root>
  );
}
