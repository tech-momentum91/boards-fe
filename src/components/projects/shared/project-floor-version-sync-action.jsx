import React, { useMemo, useState } from 'react';
import { RiAlertLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Popover from '@/components/ui/popover';
import * as Select from '@/components/ui/select';
import * as Tag from '@/components/ui/tag';

function getFloorVersionWarningMessage(warningReason) {
  if (warningReason === 'floor_version_updated') {
    return 'The floor layout has been locked at a newer version.';
  }
  if (warningReason === 'area_updated') {
    return 'A layout area was updated. Review the latest floor layout.';
  }
  return 'The floor layout has been updated. Please review and sync.';
}

function getSyncActionLabel(warningReason) {
  if (warningReason === 'floor_version_updated') {
    return 'No updates needed';
  }
  if (warningReason === 'area_updated') {
    return 'No updates needed';
  }
  return 'No updates needed';
}

function pickDefaultFloorVersion(floorVersionOptions = []) {
  if (!Array.isArray(floorVersionOptions) || floorVersionOptions.length === 0) return '';
  const latest = floorVersionOptions.find((option) => option?.is_latest);
  if (latest?.value != null) return String(latest.value);
  const last = floorVersionOptions[floorVersionOptions.length - 1];
  return last?.value != null ? String(last.value) : '';
}

function StopPropagation({ children, className }) {
  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      className={className}
    >
      {children}
    </div>
  );
}

export default function ProjectFloorVersionSyncAction({
  showWarning = false,
  canAcknowledge = false,
  floorVersionOptions = [],
  warningReason = '',
  onAcknowledge,
  isAcknowledging = false,
  className,
}) {
  const defaultVersion = useMemo(
    () => pickDefaultFloorVersion(floorVersionOptions),
    [floorVersionOptions],
  );
  const [selectedVersion, setSelectedVersion] = useState(defaultVersion);
  const [open, setOpen] = useState(false);

  if (!showWarning && !canAcknowledge) return null;

  const message = getFloorVersionWarningMessage(warningReason);
  const syncLabel = getSyncActionLabel(warningReason);
  const hasOptions = floorVersionOptions.length > 0;
  const syncVersion = selectedVersion || defaultVersion;

  const handleAcknowledge = async () => {
    await onAcknowledge?.(syncVersion ? Number(syncVersion) : undefined);
    setOpen(false);
  };

  return (
    <StopPropagation className={className}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type='button'
            aria-label='Floor version sync required'
            className='inline-flex size-6 shrink-0 items-center justify-center rounded-md text-error-base transition hover:bg-error-lighter/50'
          >
            <RiAlertLine className='size-4' />
          </button>
        </Popover.Trigger>
        <Popover.Content align='start' className='w-[min(100vw-2rem,280px)] p-4' showArrow>
          <div className='space-y-3'>
            <p className='text-paragraph-xs text-text-sub-600'>{message}</p>
            {hasOptions && floorVersionOptions.length > 1 ? (
              <Select.Root
                size='xsmall'
                value={syncVersion || undefined}
                onValueChange={setSelectedVersion}
              >
                <Select.Trigger className='h-8 w-full'>
                  <Select.Value placeholder='Floor version' />
                </Select.Trigger>
                <Select.Content>
                  {floorVersionOptions.map((option) => (
                    <Select.Item key={String(option.value)} value={String(option.value)}>
                      {option.label ?? `V${option.value}`}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            ) : null}
            {canAcknowledge ? (
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='xsmall'
                className='h-7 w-full justify-center'
                disabled={isAcknowledging}
                onClick={handleAcknowledge}
              >
                {isAcknowledging ? 'Saving…' : syncLabel}
              </Button.Root>
            ) : (
              <Tag.Root variant='stroke' className='w-full justify-center text-paragraph-xs'>
                No action required
              </Tag.Root>
            )}
          </div>
        </Popover.Content>
      </Popover.Root>
    </StopPropagation>
  );
}
