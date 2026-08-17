// Priority color mapping
export const PRIORITY_COLORS = {
  high: 'orange',
  medium: 'purple',
  low: 'green',
  critical: 'red',
  urgent: 'red',
};

// Status color mapping
export const STATUS_COLORS = {
  pending: 'yellow',
  ongoing: 'blue',
  completed: 'green',
  active: 'green',
  inactive: 'gray',
};

// Task Priority Options
export const TASK_PRIORITY_OPTIONS = [
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

// Task Status Options (for Settings/Profile tasks - different from client detail tasks)
export const TASK_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active', color: 'green', percentage: 100 },
  { value: 'Inactive', label: 'Inactive', color: 'gray', percentage: 100 },
];

// Frequency options for recurring tasks (Client Engagement)
export const TASK_RECURRING_FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half-yearly', label: 'Half-Yearly' },
  { value: 'yearly', label: 'Yearly' },
];

// Recurrence period options (matching client-task-create-drawer pattern)
export const RECURRING_FREQUENCY_OPTIONS = [
  { value: 'One Time', label: 'One Time' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Yearly', label: 'Yearly' },
];

// Re-export global month options for backward compatibility
export { MONTH_OPTIONS } from '@/constants/constants';

// Utility functions for task colors
export const getPriorityColor = (priority) => {
  if (!priority) return 'gray';
  const normalized = String(priority).toLowerCase();
  return PRIORITY_COLORS[normalized] || 'gray';
};

export const getStatusColor = (status) => {
  if (!status) return 'gray';
  const normalized = String(status).trim().toLowerCase();
  // Partner record–scoped CRM tasks (detail view / table)
  if (normalized === 'open') return 'blue';
  if (normalized === 'working') return 'purple';
  if (normalized === 'pending review') return 'yellow';
  if (normalized === 'overdue') return 'red';
  if (normalized === 'template') return 'gray';
  if (normalized === 'completed') return 'green';
  if (normalized === 'cancelled') return 'gray';
  // Map common status values
  if (normalized === 'in progress') return 'blue';
  if (normalized === 'pending') return 'yellow';
  if (normalized === 'closed') return 'green';
  if (normalized === 'active') return 'green';
  if (normalized === 'inactive') return 'gray';
  return STATUS_COLORS[normalized] || 'gray';
};
