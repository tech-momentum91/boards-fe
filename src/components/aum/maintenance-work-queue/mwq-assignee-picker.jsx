import React, { memo, useMemo } from 'react';

import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';

function toFixedOptions(assignees = []) {
  return assignees.map((assignee) => ({
    label: assignee.name || assignee.email,
    value: assignee.email,
    email: assignee.email,
    name: assignee.name || assignee.email,
    full_name: assignee.name || assignee.email,
    user_role: assignee.user_role || assignee.userRole || '',
  }));
}

function normalizeAssigneeId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.email || value.value || value.name || '';
}

function resolveNextPrimary(currentPrimary, values) {
  const emails = (Array.isArray(values) ? values : [values])
    .map(normalizeAssigneeId)
    .filter(Boolean);
  if (emails.length === 0) return '';
  if (emails.length === 1) return emails[0];

  const added = emails.filter((email) => email !== currentPrimary);
  return added[added.length - 1] || emails[emails.length - 1];
}

const MwqAssigneePicker = memo(
  ({
    assignees = [],
    primaryAssigneeEmail = '',
    onChange,
    disabled = false,
    size = 'medium',
    variant = 'borderless',
    maxVisibleAvatars = 3,
  }) => {
    const fixedOptions = useMemo(() => toFixedOptions(assignees), [assignees]);
    const value = primaryAssigneeEmail ? [primaryAssigneeEmail] : [];

    const handleAssigneeCommit = (values) => {
      const nextEmail = resolveNextPrimary(primaryAssigneeEmail, values);
      if (nextEmail && nextEmail !== primaryAssigneeEmail) {
        onChange?.(nextEmail);
      }
    };

    return (
      <div
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <AssigneeMultiSelect
          value={value}
          onBlur={handleAssigneeCommit}
          disabled={disabled}
          placeholder='Select'
          size={size}
          variant={variant}
          maxVisibleAvatars={maxVisibleAvatars}
          fixedAssigneeOptions={fixedOptions}
        />
      </div>
    );
  },
);

MwqAssigneePicker.displayName = 'MwqAssigneePicker';

export default MwqAssigneePicker;
