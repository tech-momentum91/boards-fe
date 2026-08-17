/** Department options for client sub-space assignment (placeholder until API list). */
export const CLIENT_ASSIGN_DEPARTMENTS = [
  'HR',
  'Sales',
  'Operations',
  'Finance',
  'Marketing',
  'Engineering',
  'IT',
  'Support',
  'Admin',
  'Legal',
];

export const CLIENT_ASSIGN_DEPARTMENT_OPTIONS = CLIENT_ASSIGN_DEPARTMENTS.map((department) => ({
  value: department,
  label: department,
}));
