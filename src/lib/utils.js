import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import moment from 'moment';
import _ from 'lodash';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const getInitials = (name) => {
  // null check
  if (!name) return '';
  // check if name is string
  if (typeof name !== 'string') return '';
  // if name is a single word, return the first letter
  if (name.split(' ').length === 1) return name[0];
  // if name is a multi-word, return the first letter of each word
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');
};

import { resolveApiOrigin } from '@/api/api-origin';
const DEFAULT_API_ORIGIN = import.meta.env?.VITE_API_URL ?? '';

/**
 * Builds a browser-usable URL for Frappe file paths (e.g. `/files/...`).
 * @param {string} [path] - Relative path or already-absolute URL
 * @param {string} [apiOrigin] - API origin; defaults to {@link resolveApiOrigin}
 * @returns {string}
 */
export function resolveFileUrl(path, apiOrigin) {
  if (!path) return '';
  if (typeof path === 'string' && path.startsWith('http')) return path;
  const base = String(apiOrigin ?? resolveApiOrigin()).replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Resolves Frappe `/files/...` paths; leaves blob/data and absolute URLs unchanged. */
export function toAbsoluteAttachmentUrl(url, apiOrigin = resolveApiOrigin()) {
  if (!url || typeof url !== 'string') return url || '';
  const trimmed = url.trim();
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:') || trimmed.startsWith('//')) {
    return trimmed;
  }
  // resolveFileUrl already returns http(s) URLs unchanged
  return resolveFileUrl(trimmed, apiOrigin);
}

export const getFileExtension = (fileName) => {
  if (!fileName) return '';
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.at(-1).toUpperCase() : '';
};

export const isImageFile = (file) => {
  if (!file) return false;
  if (file.type?.startsWith('image/')) return true;
  if (file.name) {
    const extension = getFileExtension(file.name).toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension);
  }
  return false;
};

export const isVideoFile = (file) => {
  if (!file) return false;
  if (file.type?.startsWith('video/')) return true;
  const name = file.name || file.fileName;
  if (name) {
    const extension = getFileExtension(name).toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mov', 'm4v', 'avi', 'mkv'].includes(extension);
  }
  return false;
};

export const isPdfFile = (file) => {
  if (!file) return false;
  if (file.type === 'application/pdf') return true;
  const name = file.name || file.fileName;
  if (name) return getFileExtension(name).toLowerCase() === 'pdf';
  return false;
};

/** @param {string} [url] */
export const isPdfFileUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return /\.pdf(\?|#|$)/i.test(url.split('#')[0]);
};

const OFFICE_DOCUMENT_EXTENSIONS = new Set(['ppt', 'pptx', 'doc', 'docx']);

export const isOfficeDocumentFile = (file) => {
  if (!file) return false;
  const name = file.name || file.fileName;
  if (!name) return false;
  return OFFICE_DOCUMENT_EXTENSIONS.has(getFileExtension(name).toLowerCase());
};

/** @param {string} [url] */
export const isOfficeDocumentFileUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const ext = (url.split('.').pop() || '').toLowerCase().split(/[#?]/)[0];
  return OFFICE_DOCUMENT_EXTENSIONS.has(ext);
};

/** @param {string} [extension] */
export const getOfficeDocumentIconColor = (extension) => {
  const ext = (extension || '').toUpperCase();
  if (['PPT', 'PPTX'].includes(ext)) return 'orange';
  if (['DOC', 'DOCX'].includes(ext)) return 'blue';
  return 'purple';
};

/** Preview URL for new uploads (blob) or existing API file rows. */
export const getPreviewUrl = (file) => {
  if (file.isExisting && file.file_url) {
    return toAbsoluteAttachmentUrl(file.file_url);
  }
  if (file.file && file.file instanceof File) {
    return URL.createObjectURL(file.file);
  }
  return null;
};

/**
 * Compares two dates in DD/MM/YYYY format using Moment.js
 * @param {string} startDate - Start date in DD/MM/YYYY format
 * @param {string} endDate - End date in DD/MM/YYYY format
 * @returns {boolean} - True if end date is after start date, false otherwise
 */
export const isEndDateAfterStartDate = (startDate, endDate) => {
  if (!startDate || !endDate) return true; // If either date is missing, validation passes

  const startMoment = moment(startDate, 'DD/MM/YYYY', true);
  const endMoment = moment(endDate, 'DD/MM/YYYY', true);

  // Check if dates are valid
  if (!startMoment.isValid() || !endMoment.isValid()) {
    return false;
  }

  return endMoment.isAfter(startMoment);
};

/**
 * Validates if a date string is in correct DD/MM/YYYY format using Moment.js
 * @param {string} dateString - Date string to validate
 * @returns {boolean} - True if date is valid, false otherwise
 */
export const isValidDateFormat = (dateString) => {
  if (!dateString) return true; // Optional field
  return moment(dateString, 'DD/MM/YYYY', true).isValid();
};

/**
 * Parses a date string in DD/MM/YYYY format to a Moment object
 * @param {string} dateString - Date string in DD/MM/YYYY format
 * @returns {moment.Moment|null} - Parsed Moment object or null if invalid
 */
export const parseDateFromString = (dateString) => {
  if (!dateString) return null;

  const momentDate = moment(dateString, 'DD/MM/YYYY', true);
  return momentDate.isValid() ? momentDate : null;
};

/**
 * Validates course date sequence: startDate <= plannedEndDate <= revisedEndDate
 * @param {string} startDate - Course start date
 * @param {string} plannedEndDate - Planned end date
 * @param {string} revisedEndDate - Revised end date
 * @returns {Object} - Validation result with isValid boolean and errors array
 */
export const validateCourseDateSequence = (startDate, plannedEndDate, revisedEndDate) => {
  const errors = [];

  // Parse dates using Moment.js
  const startMoment = startDate ? moment(startDate, 'DD/MM/YYYY', true) : null;
  const plannedMoment = plannedEndDate ? moment(plannedEndDate, 'DD/MM/YYYY', true) : null;
  const revisedMoment = revisedEndDate ? moment(revisedEndDate, 'DD/MM/YYYY', true) : null;

  // Validate individual date formats
  if (startDate && !startMoment.isValid()) {
    errors.push({ field: 'startDate', message: 'Invalid start date format (DD/MM/YYYY)' });
  }

  if (plannedEndDate && !plannedMoment.isValid()) {
    errors.push({
      field: 'plannedEndDate',
      message: 'Invalid planned end date format (DD/MM/YYYY)',
    });
  }

  if (revisedEndDate && !revisedMoment.isValid()) {
    errors.push({
      field: 'revisedEndDate',
      message: 'Invalid revised end date format (DD/MM/YYYY)',
    });
  }

  // If any date format is invalid, return early
  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Validate date sequence
  if (startMoment && plannedMoment && plannedMoment.isSameOrBefore(startMoment)) {
    errors.push({
      field: 'plannedEndDate',
      message: 'Planned end date must be after start date',
    });
  }

  if (startMoment && revisedMoment && revisedMoment.isSameOrBefore(startMoment)) {
    errors.push({
      field: 'revisedEndDate',
      message: 'Revised end date must be after start date',
    });
  }

  if (plannedMoment && revisedMoment && revisedMoment.isSameOrBefore(plannedMoment)) {
    errors.push({
      field: 'revisedEndDate',
      message: 'Revised end date must be after planned end date',
    });
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Validates BIL (Break In Learning) date sequence
 * @param {string} bilStartDate - BIL start date
 * @param {string} bilEndDate - BIL end date
 * @returns {Object} - Validation result with isValid boolean and errors array
 */
export const validateBILDateSequence = (bilStartDate, bilEndDate) => {
  const errors = [];

  // Parse dates using Moment.js
  const startMoment = bilStartDate ? moment(bilStartDate, 'DD/MM/YYYY', true) : null;
  const endMoment = bilEndDate ? moment(bilEndDate, 'DD/MM/YYYY', true) : null;

  // Validate individual date formats
  if (bilStartDate && !startMoment.isValid()) {
    errors.push({ field: 'bilStartDate', message: 'Invalid BIL start date format (DD/MM/YYYY)' });
  }

  if (bilEndDate && !endMoment.isValid()) {
    errors.push({ field: 'bilEndDate', message: 'Invalid BIL end date format (DD/MM/YYYY)' });
  }

  // If any date format is invalid, return early
  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Validate date sequence
  if (startMoment && endMoment && endMoment.isSameOrBefore(startMoment)) {
    errors.push({
      field: 'bilEndDate',
      message: 'BIL end date must be after BIL start date',
    });
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * The `withPrefix` function in JavaScript adds a specified prefix to a given value.
 * @param prefix - The prefix parameter is a string that will be added in front of the value parameter
 * @param value - The `value` parameter is the string that you want to add a prefix to.
 * when the `withPrefix` function is called.
 * Example: ₹ 2000
 */

export const withPrefix = (prefix, value) => {
  if (value == null) return '';
  if (!prefix) return `${value}`;
  return `${prefix}${value}`;
};

export const capitalizeEachWordFirstLetter = (value) => {
  if (typeof value !== 'string') return value;
  return value
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return '';
      if (word.length <= 3 && word === word.toUpperCase()) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

export const formatAndSortIndustryOptionGroups = (industryGroups) => {
  if (!Array.isArray(industryGroups)) return [];

  const sortedGroups = industryGroups.map((g) => {
    const rawOptions = Array.isArray(g.industry_name) ? g.industry_name : [];
    const processedOptions = rawOptions
      .map((opt) => {
        const val = typeof opt === 'object' ? opt.value : opt;
        const lbl = typeof opt === 'object' ? opt.label : opt;
        return {
          value: val,
          label: capitalizeEachWordFirstLetter(lbl),
        };
      })
      .sort((a, b) => {
        const labelA = String(a.label || '');
        const labelB = String(b.label || '');
        return labelA.localeCompare(labelB, undefined, { numeric: true, sensitivity: 'base' });
      });

    return {
      value: g.value,
      label: capitalizeEachWordFirstLetter(g.label),
      options: processedOptions,
    };
  });

  return sortedGroups.sort((a, b) => {
    const labelA = String(a.label || '');
    const labelB = String(b.label || '');
    return labelA.localeCompare(labelB, undefined, { numeric: true, sensitivity: 'base' });
  });
};

export const ATTACHMENT_IMAGE_EXTENSIONS = new Set([
  'PNG',
  'JPG',
  'JPEG',
  'WEBP',
  'GIF',
  'SVG',
  'BMP',
]);

export const ATTACHMENT_VIDEO_EXTENSIONS = new Set([
  'MP4',
  'WEBM',
  'OGG',
  'MOV',
  'M4V',
  'AVI',
  'MKV',
]);

/** Normalizes local File rows and server attachment shapes for UI components. */
export function normalizeAttachment(attachment, index = 0) {
  if (attachment?.file && attachment.file instanceof File) {
    const fileName = attachment.name || attachment.fileName || attachment.file.name || 'Untitled';
    const extension = getFileExtension(fileName);
    const previewUrl = getPreviewUrl(attachment);

    return {
      id: attachment.id || `${fileName}-${index}`,
      fileName,
      fileUrl: previewUrl,
      size: attachment.size ?? attachment.file.size ?? 0,
      createdAt: attachment.uploadedAt || attachment.createdAt || attachment.lastModified,
      extension: extension ? extension.toUpperCase() : 'FILE',
      isImage: isImageFile(attachment.file) || isImageFile(attachment),
      isVideo: isVideoFile(attachment.file) || isVideoFile(attachment),
      isPdf: isPdfFile(attachment.file) || isPdfFile(attachment),
      isOfficeDocument: isOfficeDocumentFile(attachment.file) || isOfficeDocumentFile(attachment),
      file: attachment.file,
      childRowId: attachment.childRowId,
    };
  }

  const fileName =
    attachment?.fileName ||
    attachment?.file_name ||
    attachment?.filename ||
    attachment?.name ||
    attachment?.file ||
    'Untitled';

  const rawFileUrl =
    attachment?.previewUrl ||
    attachment?.fileUrl ||
    attachment?.file_url ||
    attachment?.url ||
    attachment?.file;
  const fileUrl = toAbsoluteAttachmentUrl(rawFileUrl);
  const fileNameExt = getFileExtension(fileName);
  const urlExt = getFileExtension(String(rawFileUrl ?? '').split('?')[0]);
  const extension = (fileNameExt || urlExt).toUpperCase();
  const numericSize =
    attachment?.file_size ??
    attachment?.file_size_bytes ??
    (typeof attachment?.size === 'number' ? attachment.size : 0);

  return {
    id: attachment?.id || attachment?.name || `${fileName}-${index}`,
    fileName,
    fileUrl,
    size: numericSize,
    createdAt: attachment?.createdAt || attachment?.created_at || attachment?.creation,
    extension,
    isImage:
      ATTACHMENT_IMAGE_EXTENSIONS.has(extension) ||
      attachment?.isImage === true ||
      isImageFile({ name: fileName }) ||
      isImageFile({ name: rawFileUrl }),
    isVideo:
      ATTACHMENT_VIDEO_EXTENSIONS.has(extension) ||
      attachment?.isVideo === true ||
      isVideoFile({ name: fileName, type: attachment?.mime_type }),
    isPdf:
      extension === 'PDF' ||
      attachment?.isPdf === true ||
      isPdfFile({ name: fileName, type: attachment?.mime_type }),
    isOfficeDocument:
      ['PPT', 'PPTX', 'DOC', 'DOCX'].includes(extension) ||
      attachment?.isOfficeDocument === true ||
      isOfficeDocumentFile({ name: fileName, type: attachment?.mime_type }),
    childRowId: attachment?.childRowId,
  };
}

/** Preview carousel items from normalized attachments (see normalizeAttachment). */
export function buildMediaPreviewItems(attachments, previewErrors = {}) {
  return attachments
    .filter(
      (a) =>
        a.fileUrl &&
        !previewErrors[a.id] &&
        (a.isImage || a.isVideo || a.isPdf || a.isOfficeDocument),
    )
    .map((a) => ({
      src: a.fileUrl,
      alt: a.fileName,
      caption: a.fileName,
      format: a.extension,
      type: a.isVideo ? 'video' : a.isPdf ? 'pdf' : a.isOfficeDocument ? 'document' : 'image',
      ...(a.isOfficeDocument ? { externalUrl: toAbsoluteAttachmentUrl(a.fileUrl) } : {}),
    }));
}
