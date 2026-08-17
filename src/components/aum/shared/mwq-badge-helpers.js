export const MWQ_PREVENTIVE_CONDITION_OPTIONS = ['Good', 'Need Repair', 'Fair', 'Damaged'];

export const MWQ_PREVENTIVE_STATUS_OPTIONS = ['Pending', 'Checked', 'Overdue'];

export const MWQ_PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];

export function getMwqConditionBadgeStyle(condition) {
  switch (condition) {
    case 'Good':
      return { color: 'green', variant: 'lighter' };
    case 'Fair':
      return { color: 'orange', variant: 'lighter' };
    case 'Need Repair':
      return { color: 'red', variant: 'light' };
    case 'Damaged':
      return { color: 'red', variant: 'light' };
    case 'Needs Retirement':
      return { color: 'orange', variant: 'light' };
    case 'Retired':
      return { color: 'gray', variant: 'light' };
    default:
      return { color: 'gray', variant: 'lighter' };
  }
}

export function getMwqPreventiveStatusBadgeColor(status) {
  switch (status) {
    case 'Checked':
      return 'green';
    case 'Pending':
      return 'blue';
    case 'Overdue':
      return 'red';
    default:
      return 'gray';
  }
}

export function getMwqPriorityBadgeStyle(priority) {
  switch (priority) {
    case 'High':
      return { color: 'pink', variant: 'light' };
    case 'Medium':
      return { color: 'orange', variant: 'light' };
    case 'Low':
      return { color: 'green', variant: 'light' };
    default:
      return { color: 'gray', variant: 'lighter' };
  }
}
