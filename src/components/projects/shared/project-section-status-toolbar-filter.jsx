import React from 'react';
import { MultiSelect } from '@/components/ui/multi-select';
import { PROJECT_DETAIL_LAYOUT_STATUS_OPTIONS } from '@/components/projects/constants';
import { cn } from '@/utils/cn';

/**
 * Dedicated toolbar multi-select for section statuses (Graphics / 3D).
 * Drives `selectedFilters.status` — any selection also triggers list flatten.
 */
export default function ProjectSectionStatusToolbarFilter({
  value = [],
  onValueChange,
  options = PROJECT_DETAIL_LAYOUT_STATUS_OPTIONS,
  placeholder = 'Status',
  size = 'xsmall',
  className,
  disabled = false,
}) {
  return (
    <MultiSelect
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      size={size}
      disabled={disabled}
      enableSearch={false}
      maxDisplayItems={1}
      overflowTooltipLabel='Additional statuses'
      className={cn('min-w-[120px] max-w-[160px] shrink-0', className)}
    />
  );
}
