import { getAssigneeDisplayName } from '@/utils/task-utils';

const EXPORT_COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
];

function sanitizeFileName(name) {
  const sanitized = String(name ?? '')
    .trim()
    .replaceAll(/["%*/:<>?\\|]/g, '-')
    .replaceAll(/\s+/g, ' ')
    .slice(0, 120);

  return sanitized || 'tasks';
}

function escapeCsvCell(value) {
  const text = String(value ?? '');

  if (/[\n\r",]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function formatDueDateForExport(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatAssigneeForExport(task) {
  if (Array.isArray(task.assigneeDetails) && task.assigneeDetails.length > 0) {
    return task.assigneeDetails
      .map((entry) => getAssigneeDisplayName(entry))
      .filter(Boolean)
      .join(', ');
  }

  if (Array.isArray(task.assignees) && task.assignees.length > 0) {
    return task.assignees.join(', ');
  }

  return task.assignee || '';
}

function getExportCellValue(task, key) {
  switch (key) {
    case 'title':
      return task.title || '';
    case 'assignee':
      return formatAssigneeForExport(task);
    case 'dueDate':
      return formatDueDateForExport(task.dueDate);
    case 'status':
      return task.status || '';
    case 'priority':
      return task.priority || '';
    default:
      return '';
  }
}

function buildTasksCsv(tasks = []) {
  const headerRow = EXPORT_COLUMNS.map((column) => escapeCsvCell(column.label)).join(',');
  const dataRows = tasks.map((task) =>
    EXPORT_COLUMNS.map((column) => escapeCsvCell(getExportCellValue(task, column.key))).join(','),
  );

  return [headerRow, ...dataRows].join('\n');
}

export function downloadListTasksSheet(tasks = [], listName = 'tasks') {
  const exportableTasks = tasks.filter((task) => !task.isArchived);
  const csv = buildTasksCsv(exportableTasks);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const fileName = `${sanitizeFileName(listName)}.csv`;

  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { fileName, count: exportableTasks.length };
}
