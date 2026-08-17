import React, { useMemo } from 'react';

import { StatusDropdown } from '@/components/ui/status-dropdown';
import {
  filterStatusOptionsForUser,
  getStatusMetaForOption,
} from '@/components/ticket-management/constants';
import { SUPPORT_ISSUE_STATUS_META } from '@/components/support/support-feedback-constants';

/**
 * Support feedback issue status dropdown (colors differ from Ticket Management).
 */
const SupportIssueStatusDropdown = ({
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
  ...rest
}) => {
  const filteredOptions = useMemo(
    () => filterStatusOptionsForUser(statusOptions, isFacilityManager),
    [statusOptions, isFacilityManager],
  );

  const getOptionMeta = useMemo(
    () => (option) => getStatusMetaForOption(option, SUPPORT_ISSUE_STATUS_META),
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
      {...rest}
    >
      <StatusDropdown.Trigger />
      <StatusDropdown.Content />
    </StatusDropdown.Root>
  );
};

SupportIssueStatusDropdown.displayName = 'SupportIssueStatusDropdown';

export default SupportIssueStatusDropdown;
