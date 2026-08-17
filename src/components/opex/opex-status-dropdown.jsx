import React, { useMemo } from 'react';
import { StatusDropdown } from '@/components/ui/status-dropdown';

/**
 * OPEX status dropdown for OPEX module.
 * Uses generic StatusDropdown with OPEX-specific configuration:
 * - Dot indicator
 * - Full badge variant
 * - XSmall size
 * - Passes color names (not hex) so the badge trigger updates correctly.
 *
 * Used for multiple status types:
 * - Bill Uploaded (BILL_UPLOADED_OPTIONS)
 * - Zone Head Check / Purchase Check (APPROVAL_OPTIONS)
 * - ZOHO Uploaded (ZOHO_OPTIONS)
 */

const getOptionMeta = (option) => {
  const raw = option?.color;
  if (raw != null && String(raw).trim() !== '') {
    const color = String(raw).trim();
    if (color.startsWith('#') || color.startsWith('var(')) {
      return { color, percentage: 100 };
    }
    return { color: color.toLowerCase(), percentage: 100 };
  }
  return { color: 'gray', percentage: 100 };
};

const OpexStatusDropdown = ({
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
      {...rest}
    >
      <StatusDropdown.Trigger className={className} />
      <StatusDropdown.Content />
    </StatusDropdown.Root>
  );
};

OpexStatusDropdown.displayName = 'OpexStatusDropdown';

export default OpexStatusDropdown;
