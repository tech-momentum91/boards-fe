// Utility functions related to files (size formatting, etc.)

export { getFileExtension } from '@/lib/utils';

/**
 * Formats a file size in bytes to a human-readable string.
 * Example: 1024 -> "1 KB"
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes === 0) return '0 Bytes';

  const kiloByte = 1024;
  const sizeUnits = ['Bytes', 'KB', 'MB', 'GB'];
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(kiloByte));

  return `${Number.parseFloat((bytes / Math.pow(kiloByte, unitIndex)).toFixed(0))} ${
    sizeUnits[unitIndex]
  }`;
};
