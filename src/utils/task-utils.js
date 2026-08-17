export { getFileExtension, getPreviewUrl, isImageFile, isVideoFile } from '@/lib/utils';

/**
 * Task-related utility functions
 */

/** Whether scoped tag fetch has enough context to run. */
export const shouldFetchScopedTaskTags = ({
  doctype,
  taskType,
  customRefDoctype,
  customRefDocname,
}) => {
  if (!doctype || !taskType) return false;
  if (doctype === 'Task' && customRefDoctype && !customRefDocname) return false;
  return true;
};

/**
 * Get priority badge color variant
 */
export const getPriorityVariant = (priority) => {
  const priorityMap = {
    LOW: 'green',
    MEDIUM: 'yellow',
    HIGH: 'red',
  };
  return priorityMap[priority] || 'gray';
};

/**
 * Get status badge color variant
 */
export const getStatusVariant = (status) => {
  if (!status) return 'gray';
  const normalized = String(status).trim().toLowerCase();
  const byNormalized = {
    active: 'green',
    inactive: 'gray',
    open: 'blue',
    working: 'purple',
    'pending review': 'yellow',
    overdue: 'red',
    template: 'gray',
    completed: 'green',
    cancelled: 'gray',
  };
  if (byNormalized[normalized]) return byNormalized[normalized];
  const statusMap = {
    ACTIVE: 'green',
    INACTIVE: 'gray',
    Active: 'green',
    Inactive: 'gray',
  };
  return statusMap[status] || 'gray';
};

/**
 * Map frequency values to API format
 */
export const mapFrequencyToAPI = (frequency) => {
  const frequencyMap = {
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    'half-yearly': 'Half-Yearly',
    yearly: 'Yearly',
  };
  return frequencyMap[frequency] || frequency;
};

/**
 * Map frequency values from API format
 */
export const mapFrequencyFromAPI = (frequency) => {
  const frequencyMap = {
    Weekly: 'weekly',
    Monthly: 'monthly',
    Quarterly: 'quarterly',
    'Half-Yearly': 'half-yearly',
    Yearly: 'yearly',
  };
  return frequencyMap[frequency] || frequency;
};

/**
 * Parse assignees to array format
 */
export const parseAssignees = (assignees) => {
  if (!assignees) return [];

  const assigneesArray = Array.isArray(assignees) ? assignees : [assignees];

  // Flatten and split comma-separated emails
  return assigneesArray.filter(Boolean).flatMap((item) => {
    // If item is a string and contains commas, split it
    if (typeof item === 'string' && item.includes(',')) {
      return item
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean);
    }
    return item;
  });
};

/**
 * Parse tags to array format
 */
export const parseTags = (tags) => {
  if (!tags) return [];
  return Array.isArray(tags) ? tags : tags ? [tags] : [];
};

/**
 * Validate task form
 */
export const validateTaskForm = (formData) => {
  const errors = {};

  // Validate title
  if (!formData.taskTitle?.trim()) {
    errors.titleError = 'Task title is required';
  }

  // Validate assignee
  if (!formData.assignedTo || formData.assignedTo.length === 0) {
    errors.assigneeError = 'At least one assignee is required';
  }

  // Validate duration
  if (!formData.duration || formData.duration.trim() === '') {
    errors.durationError = 'Duration is required';
  } else if (Number.isNaN(Number(formData.duration)) || Number(formData.duration) <= 0) {
    errors.durationError = 'Duration must be a positive number';
  }

  // Validate priority
  if (!formData.priority || formData.priority.trim() === '') {
    errors.priorityError = 'Priority is required';
  }

  // Validate status
  if (!formData.status || formData.status.trim() === '') {
    errors.statusError = 'Status is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Human-readable assignee label (prefers real name over email / id).
 */
export const getAssigneeDisplayName = (assigneeItem) => {
  if (assigneeItem == null || assigneeItem === '') return '';
  if (typeof assigneeItem === 'string') return String(assigneeItem).trim();
  const display = (
    assigneeItem.full_name ||
    assigneeItem.name ||
    assigneeItem.label ||
    assigneeItem.client_name ||
    assigneeItem.customer_name ||
    assigneeItem.email ||
    assigneeItem.user ||
    assigneeItem.value ||
    assigneeItem.assignee ||
    ''
  )
    .toString()
    .trim();
  return display || 'User';
};

/**
 * Single letter for badges: first character of the first word of the display name.
 * When only an email is available, uses the first letter of the local part.
 */
export const getAssigneeFirstNameInitial = (assigneeItem) => {
  const display = getAssigneeDisplayName(assigneeItem);
  const firstToken = String(display).trim().split(/\s+/)[0] || '';
  if (!firstToken) return '?';
  const ch = [...firstToken][0];
  if (!ch || !/[\p{L}\p{N}]/u.test(ch)) return '?';
  return ch.toUpperCase();
};

/**
 * Normalize a task assignee row into a string id or a rich object for AssigneeMultiSelect.
 */
export const normalizeTaskAssigneeEntry = (raw) => {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string') {
    const t = raw.trim();
    return t || null;
  }
  const value = (raw.assignee || raw.user || raw.email || raw.value || raw.name || '')
    .toString()
    .trim();
  const label = getAssigneeDisplayName(raw);
  const image = raw.user_image || raw.image || raw.avatar || null;
  if (value) {
    return {
      value,
      label: label || value,
      email: raw.email || raw.user,
      full_name: raw.full_name,
      name: raw.name,
      user_image: image,
      image,
    };
  }
  const fallback = label?.trim();
  return fallback || null;
};

/**
 * Badge letter for tables/avatars; prefers name over email. Second argument is unused (legacy callers).
 */
export const getAssigneeInitials = (assigneeItem, _getInitials) => {
  return getAssigneeFirstNameInitial(assigneeItem);
};

/** Stable join of assignee ids for comparing previous vs next selection. */
export const joinAssigneeIds = (arr) =>
  [...(Array.isArray(arr) ? arr : [])]
    .map((v) => (typeof v === 'string' ? v : v?.value || v?.email || v?.user || ''))
    .filter(Boolean)
    .sort()
    .join(',');

/**
 * Max file size constant (50 MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Normalize assignees to extract only email strings
 * Converts assignee objects to email strings, prioritizing user property
 * @param {string|Array|Object} assignees - Assignees to normalize
 * @returns {Array<string>} Array of normalized email strings
 */
export const normalizeAssignees = (assignees) => {
  let normalizedAssignees = [];
  if (Array.isArray(assignees)) {
    normalizedAssignees = assignees
      .map((a) => {
        if (typeof a === 'string') return a;
        // Extract email from assignee object (prioritize user property which contains email)
        return a.user || a.email || a.value || a.name || '';
      })
      .filter(Boolean);
  } else if (assignees) {
    const assigneeValue =
      typeof assignees === 'string'
        ? assignees
        : assignees.user || assignees.email || assignees.value || assignees.name || '';
    if (assigneeValue) {
      normalizedAssignees = [assigneeValue];
    }
  }
  return normalizedAssignees;
};

/** Build API filters payload for Task Master list (Settings > Client Task Master). */
export const buildTaskMasterListFilters = (
  appliedFilters = {},
  { includeRecurring = false } = {},
) => {
  const filters = {};
  if (appliedFilters.status?.length > 0) filters.status = appliedFilters.status;
  if (appliedFilters.priority?.length > 0) filters.priority = appliedFilters.priority;
  if (appliedFilters.tags?.length > 0) filters.tags = appliedFilters.tags;
  if (includeRecurring && appliedFilters.recurring?.length > 0) {
    filters.recurrence_period = appliedFilters.recurring;
  }
  return filters;
};

/** Derive tag filter options from task rows plus selected/staged tags. */
export const buildTaskMasterTagOptions = (
  tasks = [],
  appliedTags = [],
  stagedTags = [],
  fetchedTags = [],
) => {
  const tagMap = new Map();

  const addTag = (rawTag) => {
    const value =
      typeof rawTag === 'string'
        ? rawTag
        : rawTag?.value || rawTag?.name || rawTag?.label || rawTag?.tag || '';
    const normalized = String(value || '').trim();
    if (!normalized) return;
    if (!tagMap.has(normalized)) {
      tagMap.set(normalized, { value: normalized, label: normalized });
    }
  };

  (fetchedTags || []).forEach(addTag);

  for (const task of tasks || []) {
    const taskTags = task?.tags;
    if (Array.isArray(taskTags)) {
      taskTags.forEach(addTag);
    } else if (typeof taskTags === 'string') {
      taskTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach(addTag);
    }
  }

  (appliedTags || []).forEach(addTag);
  (stagedTags || []).forEach(addTag);

  return [...tagMap.values()].sort((a, b) => a.label.localeCompare(b.label));
};

export const countTaskMasterAppliedFilters = (appliedFilters = {}) =>
  (appliedFilters.status?.length || 0) +
  (appliedFilters.priority?.length || 0) +
  (appliedFilters.tags?.length || 0) +
  (appliedFilters.recurring?.length || 0);
