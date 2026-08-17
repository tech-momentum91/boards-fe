import React, { useRef, useState } from 'react';
import { RiArrowUpLine, RiUpload2Line } from 'react-icons/ri';

import {
  uploadProjectLayoutImage,
  uploadProjectLayoutNewVersion,
  resolveUploadedProjectLayoutId,
} from '@/api/projectLayout';
import * as Button from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';

const ACCEPT_ATTR = '.png,.jpg,.jpeg,.webp';

export function layoutHasUploadedImage(layout) {
  return Boolean(String(layout?.layout_image ?? '').trim());
}

export default function ProjectLayoutUploadVersionButton({
  layoutId,
  onUploaded,
  className,
  label,
  variant = 'neutral',
  mode = 'stroke',
  size = 'medium',
  icon,
  isFirstUpload = false,
}) {
  const inputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const Icon = icon ?? (isFirstUpload ? RiUpload2Line : RiArrowUpLine);
  const buttonLabel = label ?? (isFirstUpload ? 'Upload Layout' : 'Upload New Version');

  const handleSelectFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !layoutId) return;

    setIsUploading(true);
    try {
      const uploadFn = isFirstUpload ? uploadProjectLayoutImage : uploadProjectLayoutNewVersion;
      const result = await uploadFn(layoutId, file);
      const refreshedLayoutId = resolveUploadedProjectLayoutId(result, layoutId);
      showSuccessToast(result?.message ?? 'Layout image uploaded successfully');
      await onUploaded?.(refreshedLayoutId, result);
    } catch (error) {
      showErrorToast(extractErrorMessage(error, 'Failed to upload layout image'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type='file'
        accept={ACCEPT_ATTR}
        className='hidden'
        onChange={handleSelectFile}
      />
      <Button.Root
        type='button'
        variant={variant}
        mode={mode}
        size={size}
        className={cn('gap-2', className)}
        disabled={!layoutId || isUploading}
        onClick={() => inputRef.current?.click()}
      >
        <Button.Icon as={Icon} className='size-4' />
        {isUploading ? 'Uploading…' : buttonLabel}
      </Button.Root>
    </>
  );
}
