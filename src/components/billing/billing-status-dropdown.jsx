import React, { useMemo } from 'react';
import { StatusDropdown } from '@/components/ui/status-dropdown';
import { cn } from '@/utils/cn';

const getOptionMeta = (option) => {
  const colorName = option?.color;
  const name = colorName && typeof colorName === 'string' ? colorName.toLowerCase() : 'gray';
  return {
    color: name,
    percentage: 100,
  };
};

const BillingStatusDropdown = ({
  value,
  onValueChange,
  statusOptions = [],
  disabled = false,
  placeholder = 'Select status',
  variant = 'inline',
  size = 'xsmall',
  hasError = false,
  indicator = 'progress',
  className,
  showArrow = true,
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
      showArrow={showArrow}
      matchTriggerWidth={false}
      {...rest}
    >
      <StatusDropdown.Trigger
        className={cn('data-placeholder:w-full data-placeholder:h-8', className)}
      />
      <StatusDropdown.Content />
    </StatusDropdown.Root>
  );
};

BillingStatusDropdown.displayName = 'BillingStatusDropdown';

export default BillingStatusDropdown;
