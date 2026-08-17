import React from 'react';
import * as Select from '@/components/ui/select';
import { getStatusFieldKey } from '@/constants/status-field-key';
import { cn } from '@/utils/cn';

export default function OtherModuleSourcePanel({
  sourceModuleId,
  onSourceModuleChange,
  sourceModuleOptions = [],
  sourceField,
  onSourceFieldChange,
  sourceFieldOptions = [],
  className,
}) {
  return (
    <div className={cn('flex flex-col gap-4 min-w-0', className)}>
      <div>
        <p className='label-xs uppercase tracking-wide text-text-sub-600'>Other module</p>
        <p className='text-paragraph-xs text-text-sub-600 mt-1'>
          Import statuses from another module. Selecting a module applies its statuses immediately.
        </p>
      </div>

      <div className='flex flex-col gap-2'>
        <label className='label-xs text-text-sub-600'>Select module</label>
        <Select.Root value={sourceModuleId} onValueChange={onSourceModuleChange}>
          <Select.Trigger>
            <Select.Value placeholder='Select module' />
          </Select.Trigger>
          <Select.Content className='z-[100]' position='popper' sideOffset={6}>
            {sourceModuleOptions.map((candidate) => (
              <Select.Item key={candidate.id} value={candidate.id}>
                {candidate.label ?? candidate.title ?? candidate.id}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>

      {sourceFieldOptions.length > 1 ? (
        <div className='flex flex-col gap-2'>
          <label className='label-xs text-text-sub-600'>Source column</label>
          <Select.Root
            value={sourceField}
            onValueChange={onSourceFieldChange}
            disabled={!sourceModuleId}
          >
            <Select.Trigger>
              <Select.Value placeholder='Select column' />
            </Select.Trigger>
            <Select.Content className='z-[100]' position='popper' sideOffset={6}>
              {sourceFieldOptions.map((fieldSpec) => {
                const fieldKey = fieldSpec.configKey || getStatusFieldKey(fieldSpec);
                return (
                  <Select.Item key={fieldKey} value={fieldKey}>
                    {fieldSpec.label || fieldSpec.field}
                  </Select.Item>
                );
              })}
            </Select.Content>
          </Select.Root>
        </div>
      ) : null}
    </div>
  );
}
