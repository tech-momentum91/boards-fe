// Shared utilities for task view drawers

import { isAllCentersTruth } from '@/components/event-management/basic-details';
import { getFileExtension } from '@/utils/file-utils';
import {
  formatAttachmentNameForCard,
  resolveAttachmentDisplayName,
} from '@/components/projects/shared/project-attachment-display-utils';

/** Allow only digits 0–9 (empty allowed). Use for duration / next-update days fields. */
export function sanitizeUnsignedIntegerInput(raw) {
  if (raw == null || raw === '') return '';
  return String(raw).replaceAll(/\D/g, '');
}

export const FALLBACK_PRIORITY_OPTIONS = [
  { label: 'Low', value: 'Low', color: 'green' },
  { label: 'Medium', value: 'Medium', color: 'yellow' },
  { label: 'High', value: 'High', color: 'red' },
  { label: 'Critical', value: 'Critical', color: 'red' },
];

// Get priority color mapping
export const getPriorityColor = (priority) => {
  if (!priority) return 'gray';
  const normalized = String(priority).toLowerCase();
  return (
    {
      low: 'green',
      medium: 'purple',
      high: 'orange',
      critical: 'red',
      urgent: 'red',
    }[normalized] || 'gray'
  );
};

// Get status color mapping
export const getStatusColor = (status) => {
  if (!status) return 'gray';
  const normalized = String(status).toLowerCase();
  return (
    {
      active: 'green',
      inactive: 'gray',
      // Common CRM task statuses (used by Partner / Event Tasks)
      open: 'sky',
      working: 'blue',
      'pending review': 'orange',
      pending: 'orange',
      ongoing: 'blue',
      overdue: 'red',
      template: 'purple',
      completed: 'green',
      cancelled: 'red',
      'in progress': 'teal',
      done: 'green',
    }[normalized] || 'gray'
  );
};

export const IMAGE_EXTENSIONS = new Set(['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG', 'BMP']);
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB in bytes

// export const getAttachmentExtension = (fileName) => {
//   if (!fileName || typeof fileName !== 'string') return '';
//   const segments = fileName.split('.');
//   if (segments.length < 2) return '';
//   return segments.at(-1).toUpperCase();
// };

export const normalizeTaskAttachments = (task) => {
  if (!task) {
    return [];
  }

  // Try multiple possible attachment field names
  const attachmentsSource =
    task.attachment ||
    task._attachment ||
    task.attachment_info ||
    task.files ||
    task.file_attachments ||
    task.custom_attachment ||
    task.attachments ||
    [];

  if (!Array.isArray(attachmentsSource)) {
    // If it's not an array, try to convert it
    if (attachmentsSource && typeof attachmentsSource === 'object') {
      return [];
    }
    return [];
  }

  if (attachmentsSource.length === 0) {
    return [];
  }

  const normalized = attachmentsSource
    .map((attachment, index) => {
      // Extract file URL - the attachment field contains the full URL
      const fileUrl =
        attachment?.attachment ||
        attachment?.file_url ||
        attachment?.url ||
        attachment?.file ||
        attachment?.fileUrl ||
        attachment?.file_path ||
        attachment?.attachment?.file_url ||
        attachment?.attachment?.url ||
        attachment?.attachment?.file ||
        '';

      const resolvedName = resolveAttachmentDisplayName(attachment, index);
      const { fileName, fileNameFull } = formatAttachmentNameForCard(resolvedName);

      if (!fileUrl && !fileNameFull) {
        return null;
      }

      const extension = getFileExtension(fileNameFull || fileName);
      const size =
        attachment?.file_size ||
        attachment?.size ||
        attachment?.file_size_bytes ||
        attachment?.content_length ||
        attachment?.bytes ||
        0;
      const createdAt =
        attachment?.creation ||
        attachment?.created_at ||
        attachment?.modified ||
        attachment?.timestamp ||
        attachment?.uploaded_at ||
        new Date().toISOString();

      const normalized = {
        id:
          attachment?.name || attachment?.id || attachment?.file_name || `${fileNameFull}-${index}`,
        fileName,
        fileNameFull,
        fileUrl,
        size,
        createdAt,
        extension,
        isImage: IMAGE_EXTENSIONS.has(extension),
        childRowId: attachment?.name, // Preserve the name field as child_row_id for API calls
      };

      return normalized;
    })
    .filter(Boolean);

  return normalized;
};

// Note: Date formatting is now handled by date-fns via formatDisplayDateTime from @/utils/date-utils

// Helper to get field value with fallback
export const getFieldValue = (task, localChanges, fieldName) => {
  if (localChanges[fieldName] !== undefined && localChanges[fieldName] !== null) {
    return localChanges[fieldName];
  }

  if (task?.[fieldName] !== undefined && task?.[fieldName] !== null && task?.[fieldName] !== '') {
    return task[fieldName];
  }

  return '';
};

/**
 * Stable key for grouped-by-center lists (React `key`, expand state maps).
 * `get_task_list_view` with `group: 1` may return `center` as id string or `{ center_id, center_name }`.
 */
export function resolveCenterGroupKey(center) {
  if (center == null || center === '') return '';
  if (typeof center === 'string' || typeof center === 'number') {
    const s = String(center).trim();
    return s && s !== '[object Object]' ? s : '';
  }
  if (typeof center === 'object') {
    const id = String(
      center.center_id ?? center.custom_center ?? center.id ?? center.code ?? '',
    ).trim();
    if (id) return id;
    const nested = center.center;
    if (nested != null && nested !== center) {
      const nestedKey = resolveCenterGroupKey(nested);
      if (nestedKey) return nestedKey;
    }
    const name = String(
      center.center_name ?? center.centre_name ?? center.name ?? center.label ?? '',
    ).trim();
    if (name) return name;
  }
  return '';
}

/** Display label for a grouped-by-center section header. */
export function resolveCenterGroupLabel(center, labelById) {
  if (typeof center === 'object' && center != null) {
    const name = String(
      center.center_name ?? center.centre_name ?? center.name ?? center.label ?? '',
    ).trim();
    if (name) return name;
  }
  const key = resolveCenterGroupKey(center);
  if (key && labelById?.get?.(key)) return labelById.get(key);
  if (typeof center === 'string' && center.trim()) return center.trim();
  return key || 'Center';
}

/** Format one center entry from API (`center` object, link id string, etc.). */
function formatCenterEntry(entry) {
  if (entry == null || entry === '') return '';
  if (typeof entry === 'string' || typeof entry === 'number') {
    const s = String(entry).trim();
    return s && s !== '-' ? s : '';
  }
  if (typeof entry === 'object') {
    const name = String(entry.center_name ?? entry.centre_name ?? entry.label ?? '').trim();
    if (name) return name;
    // Prefer `center` over `name` — Task Master child rows use `name` as the row id.
    const id = String(
      entry.center_id ?? entry.center ?? entry.id ?? entry.code ?? entry.name ?? '',
    ).trim();
    if (id && id !== '[object Object]') return id;
  }
  return '';
}

/**
 * Build display strings for center(s) on a task (list + detail drawers).
 * `get_task_list_view` returns `custom_center` (id) and `center` ({ center_id, center_name });
 * prefer the object so tables/drawers show the name, not the id.
 */
export function normalizeCenterDisplayList(task) {
  if (!task || typeof task !== 'object') return [];
  if (Array.isArray(task.centers_display) && task.centers_display.length > 0) {
    return task.centers_display.map((s) => String(s).trim()).filter(Boolean);
  }

  if (task.center != null && task.center !== '') {
    if (Array.isArray(task.center)) {
      return task.center.map(formatCenterEntry).filter(Boolean);
    }
    const formatted = formatCenterEntry(task.center);
    if (formatted) return [formatted];
  }

  const raw = task.custom_center ?? task.centers ?? task.centre_name ?? task.center_name;
  if (raw == null || raw === '') return [];

  if (Array.isArray(raw)) {
    return raw.map(formatCenterEntry).filter(Boolean);
  }

  if (typeof raw === 'object') {
    const formatted = formatCenterEntry(raw);
    return formatted ? [formatted] : [];
  }

  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s || s === '-') return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        return normalizeCenterDisplayList({ ...task, centers: parsed, centers_display: undefined });
      }
      if (parsed && typeof parsed === 'object') {
        const formatted = formatCenterEntry(parsed);
        return formatted ? [formatted] : [];
      }
    } catch {
      /* plain string */
    }
    return s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }

  return [];
}

export function collectCenterIdsFromTask(task) {
  const ids = [];
  const seen = new Set();
  const pushId = (v) => {
    if (v == null || v === '') return;
    const s = String(v).trim();
    if (!s || s === '[object Object]' || seen.has(s)) return;
    seen.add(s);
    ids.push(s);
  };
  const walk = (v) => {
    if (v == null || v === '') return;
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
    if (typeof v === 'object') {
      pushId(v.center_id ?? v.center ?? v.centre ?? v.value ?? v.custom_center);
      return;
    }
    const s = String(v).trim();
    if (!s) return;
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed) || (parsed && typeof parsed === 'object')) {
        walk(parsed);
        return;
      }
    } catch {
      /* plain string */
    }
    s.split(',').forEach((x) => pushId(x));
  };

  walk(task?.custom_center);
  walk(task?.center);
  walk(task?.centre);
  walk(task?.centers);
  return ids;
}

/** `{ value, label }[]` from event table `Map(id → label)`. */
export function centerOptionsFromLabelMap(labelById) {
  if (!(labelById instanceof Map)) return [];
  return [...labelById.entries()].map(([value, label]) => ({
    value: String(value).trim(),
    label: String(label ?? value).trim(),
  }));
}

/** Event Tasks: resolve center id(s) to labels using event-linked center options. */
export function resolveEventCenterDisplayLabels(task, eventCenterOptions = []) {
  if (!task || typeof task !== 'object') return [];
  if (isAllCentersTruth(task.all_centers)) return ['All Centers'];

  const labelById = new Map(
    (Array.isArray(eventCenterOptions) ? eventCenterOptions : [])
      .map((o) => [String(o?.value ?? '').trim(), String(o?.label ?? o?.value ?? '').trim()])
      .filter(([id]) => id),
  );

  const mapEntry = (entry) => {
    const key = String(entry).trim();
    return labelById.get(key) || entry;
  };

  const fromDisplay = normalizeCenterDisplayList(task);
  if (fromDisplay.length > 0) {
    return fromDisplay.map(mapEntry).filter(Boolean);
  }

  const ids = collectCenterIdsFromTask(task);
  if (ids.length === 0) return [];
  return ids.map((id) => labelById.get(id) || id);
}
