import React from 'react';

import * as SegmentedControl from '@/components/ui/segmented-control';
import { cn } from '@/utils/cn';

/**
 * Label + two-option field using shared AlignUI SegmentedControl.
 */
const ProposalBuilderSegmentedField = ({
  label,
  value,
  options,
  onChange,
  className,
  disabled,
}) => (
  <div className={cn('flex flex-col gap-2', className)}>
    <p className='text-label-sm font-semibold text-text-main-900'>{label}</p>
    <SegmentedControl.Root
      value={value}
      onValueChange={(next) => {
        if (!disabled && next) onChange?.(next);
      }}
      className='w-full'
    >
      <SegmentedControl.List className='w-full'>
        {options.map((option) => (
          <SegmentedControl.Trigger
            key={option.value}
            value={option.value}
            disabled={disabled}
            className='flex-1'
          >
            {option.label}
          </SegmentedControl.Trigger>
        ))}
      </SegmentedControl.List>
    </SegmentedControl.Root>
  </div>
);

export default ProposalBuilderSegmentedField;
