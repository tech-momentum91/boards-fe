import React from 'react';
import * as Radio from '@/components/ui/radio';
import * as Select from '@/components/ui/select';
import { getStatusFieldKey } from '@/constants/status-field-key';
import { STATUS_SOURCE_MODE } from '@/api/dynamic-status';
import { cn } from '@/utils/cn';

export default function StatusSourceSelector({
  sourceMode,
  onSourceModeChange,
  sourceModuleId,
  onSourceModuleChange,
  sourceModuleOptions = [],
  sourceField,
  onSourceFieldChange,
  sourceFieldOptions = [],
  allowImport = true,
  idPrefix = 'status-source',
  className,
}) {
  const showCustomControls = allowImport && sourceMode === STATUS_SOURCE_MODE.CUSTOM;

  React.useEffect(() => {
    if (!allowImport && sourceMode !== STATUS_SOURCE_MODE.DEFAULT) {
      onSourceModeChange?.(STATUS_SOURCE_MODE.DEFAULT);
    }
  }, [allowImport, onSourceModeChange, sourceMode]);

  return (
    <div
      className={cn(
        'bg-bg-weak-50 border-stroke-soft-200 flex flex-col gap-4 p-4 sm:py-6 sm:px-4 min-w-0',
        className,
      )}
    >
      {allowImport ? (
        <Radio.Group
          value={sourceMode}
          onValueChange={onSourceModeChange}
          className='flex flex-row sm:flex-col gap-3'
        >
          <Radio.Label htmlFor={`${idPrefix}-default`} noBg className='gap-2.5 px-0 py-0'>
            <Radio.Item value={STATUS_SOURCE_MODE.DEFAULT} id={`${idPrefix}-default`} />
            <span className='label-small text-text-strong-950'>Default</span>
          </Radio.Label>
          <Radio.Label htmlFor={`${idPrefix}-custom`} noBg className='gap-2.5 px-0 py-0'>
            <Radio.Item value={STATUS_SOURCE_MODE.CUSTOM} id={`${idPrefix}-custom`} />
            <span className='label-small text-text-strong-950'>Custom</span>
          </Radio.Label>
        </Radio.Group>
      ) : (
        <span className='label-small text-text-strong-950'>Default</span>
      )}

      {showCustomControls ? (
        <div className='flex flex-col gap-3 min-w-0'>
          <Select.Root value={sourceModuleId} onValueChange={onSourceModuleChange}>
            <Select.Trigger className='w-full min-w-0'>
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

          {sourceFieldOptions.length > 1 ? (
            <Select.Root
              value={sourceField}
              onValueChange={onSourceFieldChange}
              disabled={!sourceModuleId}
            >
              <Select.Trigger className='w-full min-w-0'>
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
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
