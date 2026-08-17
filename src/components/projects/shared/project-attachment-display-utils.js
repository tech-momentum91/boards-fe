import {
  ATTACHMENT_IMAGE_EXTENSIONS,
  ATTACHMENT_VIDEO_EXTENSIONS,
  getFileExtension,
  getPreviewUrl,
  isImageFile,
  isVideoFile,
  toAbsoluteAttachmentUrl,
} from '@/lib/utils';

const DEFAULT_ATTACHMENT_NAME_MAX_LENGTH = 42;

/** Extract the file name from an attachment path or URL (`attachment` / `file_url`). */
export function extractFileNameFromAttachmentPath(path) {
  if (!path || typeof path !== 'string') return '';

  const withoutQuery = path.split('?')[0].split('#')[0];

  if (/^https?:\/\//i.test(withoutQuery)) {
    try {
      const segment = new URL(withoutQuery).pathname.split('/').findLast(Boolean) || '';
      return decodeURIComponent(segment);
    } catch {
      // Fall through to path parsing.
    }
  }

  const segment = withoutQuery.split('/').findLast(Boolean) || withoutQuery;
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Resolve a human-readable attachment label from the API `attachment` field first. */
export function resolveAttachmentDisplayName(attachment, index = 0) {
  const attachmentPath =
    attachment?.attachment ||
    attachment?.file_url ||
    attachment?.fileUrl ||
    attachment?.url ||
    attachment?.file_path ||
    '';

  const fromAttachmentField = extractFileNameFromAttachmentPath(attachmentPath);
  if (fromAttachmentField) return fromAttachmentField;

  return (
    attachment?.file_name || attachment?.filename || attachment?.title || `attachment-${index + 1}`
  );
}

/** Trim long attachment names while keeping the full value available for tooltips. */
export function truncateAttachmentDisplayName(
  name,
  maxLength = DEFAULT_ATTACHMENT_NAME_MAX_LENGTH,
) {
  const value = String(name ?? '').trim();
  if (!value || value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(maxLength - 1, 1))}…`;
}

export function formatAttachmentNameForCard(name, maxLength = DEFAULT_ATTACHMENT_NAME_MAX_LENGTH) {
  const fullName = String(name ?? '').trim();
  return {
    fileName: truncateAttachmentDisplayName(fullName, maxLength),
    fileNameFull: fullName || 'Untitled',
  };
}

/** Project-only attachment normalizer for AttachmentList / attachment cards. */
export function normalizeProjectAttachmentForList(attachment, index = 0) {
  if (attachment?.file && attachment.file instanceof File) {
    const rawName = attachment.name || attachment.fileName || attachment.file.name || 'Untitled';
    const { fileName, fileNameFull } = formatAttachmentNameForCard(rawName);
    const extension = getFileExtension(fileNameFull);
    const previewUrl = getPreviewUrl(attachment);

    return {
      id: attachment.id || `${fileNameFull}-${index}`,
      fileName,
      fileNameFull,
      fileUrl: previewUrl,
      size: attachment.size ?? attachment.file.size ?? 0,
      createdAt: attachment.uploadedAt || attachment.createdAt || attachment.lastModified,
      extension: extension ? extension.toUpperCase() : 'FILE',
      isImage: isImageFile(attachment.file) || isImageFile(attachment),
      isVideo: isVideoFile(attachment.file) || isVideoFile(attachment),
      file: attachment.file,
      childRowId: attachment.childRowId,
    };
  }

  if (attachment?.fileNameFull != null && (attachment?.fileUrl || attachment?.previewUrl)) {
    const rawFileUrl = attachment.previewUrl || attachment.fileUrl;
    const fileUrl = toAbsoluteAttachmentUrl(rawFileUrl);
    const extension = (
      attachment.extension ||
      getFileExtension(attachment.fileNameFull) ||
      getFileExtension(String(rawFileUrl ?? '').split('?')[0])
    ).toUpperCase();
    const numericSize =
      attachment?.file_size ?? (typeof attachment?.size === 'number' ? attachment.size : 0);

    return {
      id: attachment.id || `${attachment.fileNameFull}-${index}`,
      fileName: attachment.fileName,
      fileNameFull: attachment.fileNameFull,
      fileUrl,
      size: numericSize,
      createdAt: attachment.createdAt || attachment.created_at || attachment.creation,
      extension,
      isImage:
        attachment.isImage === true ||
        ATTACHMENT_IMAGE_EXTENSIONS.has(extension) ||
        isImageFile({ name: attachment.fileNameFull }) ||
        isImageFile({ name: rawFileUrl }),
      isVideo:
        attachment.isVideo === true ||
        ATTACHMENT_VIDEO_EXTENSIONS.has(extension) ||
        isVideoFile({ name: attachment.fileNameFull, type: attachment.mime_type }),
      childRowId: attachment.childRowId,
    };
  }

  const resolvedName = resolveAttachmentDisplayName(attachment, index);
  const { fileName, fileNameFull } = formatAttachmentNameForCard(
    attachment?.fileName || attachment?.file_name || attachment?.filename || resolvedName,
  );

  const rawFileUrl =
    attachment?.attachment ||
    attachment?.previewUrl ||
    attachment?.fileUrl ||
    attachment?.file_url ||
    attachment?.url ||
    attachment?.file;
  const fileUrl = toAbsoluteAttachmentUrl(rawFileUrl);
  const fileNameExt = getFileExtension(fileNameFull);
  const urlExt = getFileExtension(String(rawFileUrl ?? '').split('?')[0]);
  const extension = (fileNameExt || urlExt).toUpperCase();
  const numericSize =
    attachment?.file_size ??
    attachment?.file_size_bytes ??
    (typeof attachment?.size === 'number' ? attachment.size : 0);

  return {
    id: attachment?.id || attachment?.name || `${fileNameFull}-${index}`,
    fileName,
    fileNameFull,
    fileUrl,
    size: numericSize,
    createdAt: attachment?.createdAt || attachment?.created_at || attachment?.creation,
    extension,
    isImage:
      ATTACHMENT_IMAGE_EXTENSIONS.has(extension) ||
      attachment?.isImage === true ||
      isImageFile({ name: fileNameFull }) ||
      isImageFile({ name: rawFileUrl }),
    isVideo:
      ATTACHMENT_VIDEO_EXTENSIONS.has(extension) ||
      attachment?.isVideo === true ||
      isVideoFile({ name: fileNameFull, type: attachment?.mime_type }),
    childRowId: attachment?.childRowId,
  };
}
