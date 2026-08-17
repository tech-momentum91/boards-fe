import React, { useMemo } from 'react';
import { StatusDropdown } from '@/components/ui/status-dropdown';
import { TASK_STATUS_OPTIONS } from '@/components/clients-management/constants';

/**
 * Task status dropdown for client onboarding module.
 * Uses generic StatusDropdown with task-specific configuration:
 * - Progress indicator (circular progress ring)
 * - Inline variant
 * - Small size
 * - Maps color names (green, gray) to hex values
 */

const STATUS_COLOR_HEX = {
  green: '#079455',
  gray: '#868C98',
  blue: '#375DFB',
  orange: '#F27B2C',
  purple: '#6E3FF3',
  red: '#E63946',
  yellow: '#F79009',
};

const getOptionMeta = (option) => {
  const colorName = option?.color;
  const hex = colorName && STATUS_COLOR_HEX[colorName.toLowerCase()];
  return {
    color: hex || STATUS_COLOR_HEX.gray,
    percentage: option?.percentage, // Return percentage from option for progress indicators
  };
};

const TaskStatusDropdown = ({
  value,
  onValueChange,
  statusOptions = TASK_STATUS_OPTIONS,
  disabled = false,
  placeholder = 'Select status',
  variant = 'inline',
  size = 'small',
  hasError = false,
  indicator = 'progress', // Force progress indicators to always show
  className,
  ...rest
}) => {
  const meta = useMemo(() => getOptionMeta, []);

  return (
    <StatusDropdown.Root
      value={value}
      onValueChange={onValueChange}
      statusOptions={statusOptions}
      getOptionMeta={meta}
      disabled={disabled}
      hasError={hasError}
      size={size}
      placeholder={placeholder}
      variant={variant}
      indicator={indicator}
      {...rest}
    >
      <StatusDropdown.Trigger className={className} />
      <StatusDropdown.Content />
    </StatusDropdown.Root>
  );
};

TaskStatusDropdown.displayName = 'TaskStatusDropdown';

export default TaskStatusDropdown;
