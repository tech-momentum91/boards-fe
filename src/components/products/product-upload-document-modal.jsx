import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiCloseLine, RiErrorWarningFill, RiFileLine, RiUploadLine } from 'react-icons/ri';

import { listProductDocumentTypes } from '@/api/productFormOptions';
import { addProductDocuments } from '@/api/products';
import {
  getAcceptForDocumentType,
  getFileUploadHint,
  truncateFileName,
} from '@/components/products/product-document-file-utils';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import * as FileUpload from '@/components/ui/file-upload';
import * as Hint from '@/components/ui/hint';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Modal from '@/components/ui/modal';
import * as Select from '@/components/ui/select';
import { addProductDocumentSchema } from '@/schemas/product-schema';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { validateProductFiles } from '@/components/products/product-upload-utils';
import { cn } from '@/utils/cn';

export default function ProductUploadDocumentModal({
  open,
  onOpenChange,
  productId,
  existingDocuments = [],
  onSuccess,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [isLoadingDocumentTypes, setIsLoadingDocumentTypes] = useState(false);
  const [otherSelected, setOtherSelected] = useState(false);
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(addProductDocumentSchema),
    defaultValues: {
      documentType: '',
      otherDocumentType: '',
      file: null,
    },
  });

  const selectedDocumentType = watch('documentType');

  const selectedDocumentTypeLabel = useMemo(() => {
    const match = documentTypes.find(
      (type) => type.value === selectedDocumentType || type.label === selectedDocumentType,
    );
    return match?.label || selectedDocumentType;
  }, [documentTypes, selectedDocumentType]);

  const fileAccept = useMemo(
    () => getAcceptForDocumentType(selectedDocumentTypeLabel),
    [selectedDocumentTypeLabel],
  );

  const fileUploadHint = useMemo(
    () => getFileUploadHint(selectedDocumentTypeLabel, true),
    [selectedDocumentTypeLabel],
  );

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
    setValue('file', null);
    clearErrors('file');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    setIsLoadingDocumentTypes(true);

    listProductDocumentTypes()
      .then((options) => {
        if (!cancelled) {
          setDocumentTypes(options);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDocumentTypes([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingDocumentTypes(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      reset();
      clearSelectedFiles();
      setOtherSelected(false);
    }
  }, [open, reset]);

  const handleFileChange = (event) => {
    const files = [...(event.target.files || [])];
    if (files.length === 0) return;

    const { validFiles, errorMessage } = validateProductFiles(files);
    if (errorMessage) {
      showErrorToast(errorMessage);
      setError('file', { message: errorMessage });
    } else {
      clearErrors('file');
    }

    if (validFiles.length === 0) {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFiles((current) => [...current, ...validFiles]);
    setValue('file', validFiles);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((current) => {
      const next = current.filter((_, fileIndex) => fileIndex !== index);
      setValue('file', next.length > 0 ? next : null);
      if (next.length === 0 && fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return next;
    });
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const onSubmit = async (data) => {
    if (selectedFiles.length === 0) {
      setError('file', { message: 'At least one file is required' });
      return;
    }

    if (!productId) {
      showErrorToast('Product not found.');
      return;
    }

    setIsLoading(true);
    try {
      const latestProduct = await addProductDocuments(productId, {
        documentType: data.documentType,
        otherType: data.otherDocumentType?.trim(),
        files: selectedFiles,
        existingDocuments,
      });

      showSuccessToast(
        selectedFiles.length > 1
          ? 'Documents uploaded successfully.'
          : 'Document uploaded successfully.',
      );
      onSuccess?.(latestProduct);
      onOpenChange(false);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to upload document.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header
          icon={RiFileLine}
          title='Add Product Document'
          description='Enter below document details.'
        />
        <Modal.Body>
          <form onSubmit={handleSubmit(onSubmit)} className='flex w-full flex-col gap-4'>
            <div className='flex w-full flex-col gap-2'>
              <Label.Root>
                Document Type
                <Label.Asterisk />
              </Label.Root>
              <Select.Root
                value={selectedDocumentType}
                onValueChange={(value) => {
                  setValue('documentType', value);
                  clearSelectedFiles();
                  if (value === 'Other') {
                    setOtherSelected(true);
                    clearErrors('otherDocumentType');
                  } else {
                    setValue('otherDocumentType', '');
                    clearErrors('otherDocumentType');
                    setOtherSelected(false);
                  }
                }}
                hasError={Boolean(errors.documentType)}
                disabled={isLoading}
              >
                <Select.Trigger className='w-full'>
                  <Select.Value placeholder='Select document type' />
                </Select.Trigger>
                <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                  {isLoadingDocumentTypes ? (
                    <div className='p-2 text-center text-paragraph-sm text-text-sub-600'>
                      Loading document types...
                    </div>
                  ) : documentTypes.length > 0 ? (
                    documentTypes.map((type) => (
                      <Select.Item key={type.id || type.value} value={type.value}>
                        {type.label}
                      </Select.Item>
                    ))
                  ) : (
                    <div className='p-2 text-center text-paragraph-sm text-text-sub-600'>
                      No document types found
                    </div>
                  )}
                </Select.Content>
              </Select.Root>
              {errors.documentType ? (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.documentType.message}
                </Hint.Root>
              ) : null}
            </div>

            {otherSelected ? (
              <div className='flex w-full flex-col gap-2'>
                <Label.Root>
                  Other Type
                  <Label.Asterisk />
                </Label.Root>
                <Input.Root
                  size='medium'
                  className='w-full'
                  hasError={Boolean(errors.otherDocumentType)}
                >
                  <Input.Wrapper>
                    <Input.Input
                      type='text'
                      placeholder='Enter other document type'
                      {...register('otherDocumentType')}
                      disabled={isLoading}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {errors.otherDocumentType ? (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.otherDocumentType.message}
                  </Hint.Root>
                ) : null}
              </div>
            ) : null}

            <div className='flex w-full flex-col gap-2'>
              <Label.Root>
                File Upload
                <Label.Asterisk />
              </Label.Root>
              <input
                type='file'
                ref={fileInputRef}
                accept={fileAccept}
                multiple
                className='hidden'
                onChange={handleFileChange}
                disabled={isLoading || !selectedDocumentType}
              />
              <FileUpload.Root
                onClick={selectedDocumentType ? handleFileUploadClick : undefined}
                className={cn(
                  errors.file && 'border-error-base',
                  !selectedDocumentType && 'pointer-events-none opacity-60',
                )}
                aria-disabled={!selectedDocumentType}
              >
                <FileUpload.Icon as={RiUploadLine} />
                <div className='flex flex-col items-center gap-2'>
                  <FileUpload.Button>
                    {selectedFiles.length > 0
                      ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected`
                      : 'Choose files or drag & drop'}
                  </FileUpload.Button>
                  <span className='text-paragraph-xs text-text-sub-600'>{fileUploadHint}</span>
                </div>
              </FileUpload.Root>
              {errors.file ? (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.file.message}
                </Hint.Root>
              ) : null}
              {selectedFiles.length > 0 && !errors.file ? (
                <ul className='flex flex-col gap-1.5'>
                  {selectedFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className='flex items-center justify-between gap-2 rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-3 py-2'
                    >
                      <span className='min-w-0 truncate text-paragraph-sm text-text-sub-600'>
                        {truncateFileName(file.name, 40)}
                      </span>
                      <CompactButton.Root
                        type='button'
                        variant='ghost'
                        size='medium'
                        onClick={() => handleRemoveFile(index)}
                        aria-label={`Remove ${file.name}`}
                        className='shrink-0 rounded-md p-0.5'
                      >
                        <CompactButton.Icon as={RiCloseLine} className='size-4' />
                      </CompactButton.Root>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            onClick={handleCancel}
            className='w-full'
            disabled={isLoading}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            onClick={handleSubmit(onSubmit)}
            className='w-full'
            disabled={isLoading}
          >
            {isLoading ? (
              <span className='flex items-center justify-center gap-2'>
                <span className='h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white' />
                Uploading...
              </span>
            ) : (
              'Add Document'
            )}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
