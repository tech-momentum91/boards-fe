import React, { useMemo } from 'react';

import {
  getMwqPreventiveStatusMetaForOption,
  getMwqTaskStatusMetaForOption,
  getMwqTaskStatusDropdownOptionsForRow,
  MWQ_PREVENTIVE_STATUS_DROPDOWN_OPTIONS,
} from '@/components/aum/shared/aum-status-dropdown-constants';
import { StatusDropdown } from '@/components/ui/status-dropdown';

/**
 * AUM status dropdown (Preventive Checks + Maintenance Task).
 * Uses the same StatusDropdown UI as Ticket Management with AUM-specific options.
 */
const AumStatusDropdown = ({
  mode = 'preventive',
  value,
  onValueChange,
  statusOptions,
  row = null,
  disabled = false,
  placeholder = 'Select status',
  variant = 'inline',
  size = 'small',
  hasError = false,
  indicator = 'auto',
  className,
  ...rest
}) => {
  const resolvedOptions = useMemo(() => {
    if (statusOptions?.length) return statusOptions;
    if (mode === 'task') {
      return getMwqTaskStatusDropdownOptionsForRow(row);
    }
    return MWQ_PREVENTIVE_STATUS_DROPDOWN_OPTIONS;
  }, [mode, row, statusOptions]);

  const getOptionMeta = useMemo(
    () => (mode === 'task' ? getMwqTaskStatusMetaForOption : getMwqPreventiveStatusMetaForOption),
    [mode],
  );

  if (disabled || resolvedOptions.length === 0) {
    const selected = resolvedOptions.find((option) => (option.value ?? option) === value);
    const label = selected?.label ?? value;
    if (!label) return null;

    return (
      <StatusDropdown.Root
        value={value}
        statusOptions={resolvedOptions}
        getOptionMeta={getOptionMeta}
        disabled
        size={size}
        variant={variant}
        indicator={indicator}
        className={className}
        {...rest}
      >
        <StatusDropdown.Trigger />
      </StatusDropdown.Root>
    );
  }

  return (
    <StatusDropdown.Root
      value={value}
      onValueChange={onValueChange}
      statusOptions={resolvedOptions}
      getOptionMeta={getOptionMeta}
      disabled={disabled}
      hasError={hasError}
      size={size}
      placeholder={placeholder}
      variant={variant}
      indicator={indicator}
      className={className}
      {...rest}
    >
      <StatusDropdown.Trigger />
      <StatusDropdown.Content />
    </StatusDropdown.Root>
  );
};

AumStatusDropdown.displayName = 'AumStatusDropdown';

export default AumStatusDropdown;
