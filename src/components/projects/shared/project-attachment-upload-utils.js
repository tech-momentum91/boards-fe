import { THREE_D_UPLOAD_MODES } from '@/components/projects/three-d/project-three-d-attachment-helpers';
import {
  appendProjectTaskFilesToFormData,
  buildProjectTaskUploadFilesFormData,
} from '@/components/projects/tasks/project-task-helpers';
import { createProjectTaskNewVersion, updateProjectTask } from '@/redux/projectSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';

import { formatAttachmentNameForCard } from '@/components/projects/shared/project-attachment-display-utils';

export const MAX_PROJECT_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024;

export function normalizeUploadFilesForApi(files = []) {
  return (files ?? [])
    .map((file) => (file instanceof File ? { file } : file))
    .filter((entry) => entry?.file instanceof File);
}

export function buildProjectTaskNewVersionFormData(taskId, files = []) {
  const formData = new FormData();
  formData.append('task_id', String(taskId ?? '').trim());
  appendProjectTaskFilesToFormData(formData, files);
  return formData;
}

export function mapFilesToAttachmentRows(files = [], maxSize = MAX_PROJECT_ATTACHMENT_FILE_SIZE) {
  const validFiles = [];
  const invalidFiles = [];

  [...(files ?? [])].forEach((file) => {
    if (!(file instanceof File)) return;
    if (file.size > maxSize) {
      invalidFiles.push(file.name);
      return;
    }

    const { fileName, fileNameFull } = formatAttachmentNameForCard(file.name);

    validFiles.push({
      id: `${Date.now()}-${Math.random()}`,
      file,
      name: fileName,
      fileName,
      fileNameFull,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
      createdAt: new Date(),
    });
  });

  return {
    validFiles,
    invalidFiles,
    errorMessage:
      invalidFiles.length > 0
        ? `The following file(s) exceed the 10 MB limit: ${invalidFiles.join(', ')}`
        : '',
  };
}

export async function uploadProjectTaskAttachments({
  dispatch,
  taskId,
  files,
  mode = THREE_D_UPLOAD_MODES.FILE,
  supportsNewVersion = false,
}) {
  const uploadFiles = normalizeUploadFilesForApi(files);
  if (!taskId || uploadFiles.length === 0) return null;

  if (supportsNewVersion && mode === THREE_D_UPLOAD_MODES.NEW_VERSION) {
    const result = await dispatch(
      createProjectTaskNewVersion(buildProjectTaskNewVersionFormData(taskId, uploadFiles)),
    ).unwrap();
    showSuccessToast(result?.message ?? 'New version created successfully');
    return result;
  }

  await dispatch(
    updateProjectTask(buildProjectTaskUploadFilesFormData(taskId, uploadFiles)),
  ).unwrap();
  showSuccessToast('File uploaded successfully');
  return null;
}

export function createProjectTaskAttachmentUploadHandler({
  dispatch,
  supportsNewVersion = false,
  onAfterUpload,
  setIsUploading,
}) {
  return async (taskId, mode, files) => {
    const uploadFiles = normalizeUploadFilesForApi(files);
    if (!taskId || uploadFiles.length === 0) return;

    setIsUploading?.(true);
    try {
      const result = await uploadProjectTaskAttachments({
        dispatch,
        taskId,
        files: uploadFiles,
        mode,
        supportsNewVersion,
      });
      await onAfterUpload?.({ taskId, mode, result });
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    } finally {
      setIsUploading?.(false);
    }
  };
}
