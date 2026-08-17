import React, { useMemo } from 'react';
import { StatusDropdown } from '@/components/ui/status-dropdown';
import {
  TICKET_STATUS_META,
  filterStatusOptionsForUser,
  getStatusMetaForOption,
} from '@/components/ticket-management/constants';

/**
 * Ticket Management status dropdown. Applies:
 * - Status Configuration `color` on each option when present; `TICKET_STATUS_META` fills
 *   percentage (sector icon) and color only when the option has no configured color.
 * - filterStatusOptionsForUser (e.g. Facility Manager does not see "Closed")
 */
const TicketStatusDropdown = ({
  value,
  onValueChange,
  statusOptions = [],
  disabled = false,
  placeholder = 'Select status',
  variant = 'inline',
  size = 'medium',
  hasError = false,
  isFacilityManager = false,
  indicator = 'auto',
  fallbackSelectedColor,
  ...rest
}) => {
  const filteredOptions = useMemo(
    () => filterStatusOptionsForUser(statusOptions, isFacilityManager),
    [statusOptions, isFacilityManager],
  );

  const getOptionMeta = useMemo(
    () => (option) => getStatusMetaForOption(option, TICKET_STATUS_META),
    [],
  );
  return (
    <StatusDropdown.Root
      value={value}
      onValueChange={onValueChange}
      statusOptions={filteredOptions}
      getOptionMeta={getOptionMeta}
      disabled={disabled}
      hasError={hasError}
      size={size}
      placeholder={placeholder}
      variant={variant}
      indicator={indicator}
      fallbackSelectedColor={fallbackSelectedColor}
      {...rest}
    >
      <StatusDropdown.Trigger />
      <StatusDropdown.Content />
    </StatusDropdown.Root>
  );
};

TicketStatusDropdown.displayName = 'TicketStatusDropdown';

export default TicketStatusDropdown;
