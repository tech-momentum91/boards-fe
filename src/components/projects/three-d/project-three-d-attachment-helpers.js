import { formatDisplayDateTime } from '@/utils/date-utils';
import { formatFileSize } from '@/utils/file-utils';

export const THREE_D_UPLOAD_MODES = {
  FILE: 'file',
  NEW_VERSION: 'new_version',
  EXISTING_VERSION: 'existing_version',
};

export const THREE_D_UPLOAD_MENU_OPTIONS = [
  { id: THREE_D_UPLOAD_MODES.FILE, label: 'Upload File' },
  { id: THREE_D_UPLOAD_MODES.NEW_VERSION, label: 'Upload New Version' },
];

const GALLERY_PAGE_SIZE = 6;

export function getThreeDGalleryPageSize() {
  return GALLERY_PAGE_SIZE;
}

function normalizeVersionLabel(version) {
  const raw = String(version ?? 'V1').trim();
  if (!raw) return 'V1';
  return raw.toUpperCase().startsWith('V') ? raw.toUpperCase() : `V${raw}`;
}

function versionSortValue(version) {
  return Number.parseInt(String(version ?? '').replaceAll(/\D/g, ''), 10) || 1;
}

export function createMockThreeDAttachment({
  taskId,
  taskTitle = '',
  version = 'V1',
  uploadMode = THREE_D_UPLOAD_MODES.FILE,
  file,
  index = 0,
}) {
  const fileName = file?.name ?? `Image-${index + 1}.jpg`;
  const now = new Date();

  return {
    id: `${taskId}-${Date.now()}-${index}`,
    taskId,
    taskTitle,
    version: normalizeVersionLabel(version),
    uploadMode,
    name: fileName,
    size: file?.size ? formatFileSize(file.size) : '120 KB',
    uploadedAt: formatDisplayDateTime(now) || '12th Nov 25, 8:40 AM',
    previewUrl: file && file.type?.startsWith('image/') ? URL.createObjectURL(file) : '',
  };
}

export function mergeThreeDAttachments(apiAttachments = [], localAttachments = []) {
  const seen = new Set();
  const merged = [];

  [...apiAttachments, ...localAttachments].forEach((attachment) => {
    const key = attachment.id ?? `${attachment.name}-${attachment.uploadedAt}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(attachment);
  });

  return merged;
}

export function getThreeDAttachmentsForTask(taskId, attachmentsByTaskId = {}, apiAttachments = []) {
  const localAttachments = attachmentsByTaskId[taskId] ?? [];
  return mergeThreeDAttachments(apiAttachments, localAttachments);
}

export function groupThreeDAttachmentsByVersion(attachments = []) {
  const grouped = attachments.reduce((accumulator, attachment) => {
    const version = normalizeVersionLabel(attachment.version);
    if (!accumulator[version]) accumulator[version] = [];
    accumulator[version].push(attachment);
    return accumulator;
  }, {});

  return Object.keys(grouped)
    .sort((left, right) => versionSortValue(left) - versionSortValue(right))
    .map((version) => ({
      version,
      attachments: grouped[version],
    }));
}

export function getLatestThreeDVersion(attachments = [], fallback = 'V1') {
  if (attachments.length === 0) return normalizeVersionLabel(fallback);

  return attachments.reduce((latest, attachment) => {
    const version = normalizeVersionLabel(attachment.version ?? fallback);
    return versionSortValue(version) > versionSortValue(latest) ? version : latest;
  }, normalizeVersionLabel(fallback));
}

export function buildThreeDGalleryTasks(rows = [], attachmentsByTaskId = {}) {
  return rows
    .map((row) => {
      const attachments = getThreeDAttachmentsForTask(row.id, attachmentsByTaskId, row.attachments);
      if (attachments.length === 0) return null;

      const versionGroups = groupThreeDAttachmentsByVersion(attachments);
      const latestVersion =
        versionGroups[versionGroups.length - 1]?.version ?? normalizeVersionLabel(row.version);
      const latestVersionAttachments = versionGroups[versionGroups.length - 1]?.attachments ?? [];
      const coverAttachment = latestVersionAttachments[0] ?? attachments[0];

      return {
        taskId: row.id,
        title: row.title ?? '',
        floor: row.floor ?? '',
        area: row.area ?? '',
        latestVersion,
        attachments,
        versionGroups,
        coverAttachment,
        latestVersionAttachmentCount: latestVersionAttachments.length,
      };
    })
    .filter(Boolean);
}

export function paginateThreeDGalleryTasks(tasks = [], page = 1, pageSize = GALLERY_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(tasks.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: tasks.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    totalItems: tasks.length,
  };
}

export function resolveNextVersionForUpload(mode, currentVersion = 'V1', attachments = []) {
  const normalized = normalizeVersionLabel(currentVersion);
  const versionNumber = versionSortValue(normalized);

  if (mode === THREE_D_UPLOAD_MODES.NEW_VERSION) {
    const maxVersion = attachments.reduce((max, attachment) => {
      const value = versionSortValue(attachment.version);
      return Math.max(max, value);
    }, versionNumber);
    return `V${maxVersion + 1}`;
  }

  if (mode === THREE_D_UPLOAD_MODES.EXISTING_VERSION) {
    return normalized;
  }

  return normalized;
}
