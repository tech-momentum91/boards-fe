import { extractErrorMessage } from '@/utils/error-utils';

/** Match Frappe default max file size (10 MB). */
export const MAX_PRODUCT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const PRODUCT_MEDIA_SIZE_ERROR = 'Please upload image or video below 10 MB.';

export const PRODUCT_FILE_SIZE_ERROR = 'Please upload file below 10 MB.';

const FILE_SIZE_ERROR_PATTERNS = [
  /exceeds?\s+(?:the\s+)?(?:maximum|max|allowed)/i,
  /file\s+size/i,
  /too\s+large/i,
  /payload\s+too\s+large/i,
  /request\s+entity\s+too\s+large/i,
  /size\s+exceeds/i,
  /\b10\s*mb\b/i,
];

export function isProductFileSizeError(message) {
  if (!message || typeof message !== 'string') return false;
  return FILE_SIZE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function getProductFileSizeError(file, fallback = PRODUCT_FILE_SIZE_ERROR) {
  if (!(file instanceof File)) return null;
  if (file.size <= MAX_PRODUCT_FILE_SIZE_BYTES) return null;

  const isMedia = file.type.startsWith('image/') || file.type.startsWith('video/');
  return isMedia ? PRODUCT_MEDIA_SIZE_ERROR : fallback;
}

export function partitionFilesByMaxSize(fileList, maxSizeBytes = MAX_PRODUCT_FILE_SIZE_BYTES) {
  const files = [...(fileList || [])];
  const valid = [];
  const oversize = [];

  for (const file of files) {
    if (file.size > maxSizeBytes) {
      oversize.push(file);
    } else {
      valid.push(file);
    }
  }

  return { valid, oversize };
}

export function getOversizeFilesErrorMessage(oversizeFiles, { media = false } = {}) {
  if (oversizeFiles.length === 0) return null;

  const baseMessage = media ? PRODUCT_MEDIA_SIZE_ERROR : PRODUCT_FILE_SIZE_ERROR;
  const names = oversizeFiles.map((file) => file.name).filter(Boolean);

  if (names.length === 0) {
    return baseMessage;
  }

  if (names.length === 1) {
    return `${baseMessage} (${names[0]})`;
  }

  return `${baseMessage} (${names.join(', ')})`;
}

export function validateProductMediaFiles(fileList) {
  const { valid, oversize } = partitionFilesByMaxSize(fileList);

  return {
    validFiles: valid,
    oversizeFiles: oversize,
    errorMessage: getOversizeFilesErrorMessage(oversize, { media: true }),
  };
}

export function validateProductFiles(fileList) {
  const { valid, oversize } = partitionFilesByMaxSize(fileList);

  return {
    validFiles: valid,
    oversizeFiles: oversize,
    errorMessage: getOversizeFilesErrorMessage(oversize, { media: false }),
  };
}

export function normalizeProductUploadError(
  error,
  fallback = 'File upload failed. Please try again.',
) {
  if (error?.response?.status === 413) {
    return PRODUCT_MEDIA_SIZE_ERROR;
  }

  const message = extractErrorMessage(error, '');
  if (!message) {
    return fallback;
  }

  if (isProductFileSizeError(message)) {
    return PRODUCT_MEDIA_SIZE_ERROR;
  }

  return message;
}
