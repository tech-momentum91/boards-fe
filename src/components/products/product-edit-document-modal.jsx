import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiCloseLine, RiErrorWarningFill, RiFileLine, RiUploadLine } from 'react-icons/ri';

import { listProductDocumentTypes } from '@/api/productFormOptions';
import { updateProductDocumentGroup } from '@/api/products';
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
import { editProductDocumentSchema } from '@/schemas/product-schema';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';

function SelectedFileRow({ label, fileName, onRemove, removeLabel }) {
  return (
    <li className='flex items-center justify-between gap-2 rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-3 py-2'>
      <div className='min-w-0'>
        <span className='text-paragraph-xs text-text-soft-400'>{label}</span>
        <p className='truncate text-paragraph-sm text-text-sub-600'>
          {truncateFileName(fileName, 40)}
        </p>
      </div>
      <CompactButton.Root
        type='button'
        variant='ghost'
        size='medium'
        onClick={onRemove}
        aria-label={removeLabel}
        className='shrink-0 rounded-md p-0.5'
      >
        <CompactButton.Icon as={RiCloseLine} className='size-4' />
      </CompactButton.Root>
    </li>
  );
}

export default function ProductEditDocumentModal({
  open,
  onOpenChange,
  productId,
  documentGroup,
  existingDocuments = [],
  onSuccess,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [newFiles, setNewFiles] = useState([]);
  const [removedDocuments, setRemovedDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [isLoadingDocumentTypes, setIsLoadingDocumentTypes] = useState(false);
  const [otherSelected, setOtherSelected] = useState(false);
  const fileInputRef = useRef(null);

  const groupDocuments = documentGroup?.documents ?? [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    clearErrors,
  } = useForm({
    resolver: zodResolver(editProductDocumentSchema),
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

  const visibleExistingDocuments = useMemo(
    () =>
      groupDocuments.filter(
        (document) =>
          !removedDocuments.some(
            (removed) =>
              (removed.url && removed.url === document.url) ||
              (removed.name === document.name && removed.documentType === document.documentType),
          ),
      ),
    [groupDocuments, removedDocuments],
  );

  const clearNewFiles = () => {
    setNewFiles([]);
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
    if (!open || !documentGroup) return;

    const docType = String(documentGroup.documentType || '').trim();
    const otherType = String(documentGroup.otherType || '').trim();
    const isOtherType = docType.toLowerCase() === 'other';

    reset({
      documentType: docType,
      otherDocumentType: isOtherType ? otherType : '',
      file: null,
    });
    setOtherSelected(isOtherType);
    setRemovedDocuments([]);
    clearNewFiles();
  }, [open, documentGroup, reset]);

  useEffect(() => {
    if (!open) {
      reset();
      setOtherSelected(false);
      setRemovedDocuments([]);
      clearNewFiles();
    }
  }, [open, reset]);

  const handleFileChange = (event) => {
    const files = [...(event.target.files || [])];
    if (files.length === 0) return;

    setNewFiles((current) => [...current, ...files]);
    setValue('file', files);
    clearErrors('file');
  };

  const handleRemoveNewFile = (index) => {
    setNewFiles((current) => {
      const next = current.filter((_, fileIndex) => fileIndex !== index);
      setValue('file', next.length > 0 ? next : null);
      if (next.length === 0 && fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return next;
    });
  };

  const handleRemoveExisting = (document) => {
    setRemovedDocuments((current) => [...current, document]);
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const onSubmit = async (data) => {
    if (!productId || !documentGroup || groupDocuments.length === 0) {
      showErrorToast('Product not found.');
      return;
    }

    if (visibleExistingDocuments.length === 0 && newFiles.length === 0) {
      showErrorToast('Add at least one file or keep an existing file in this group.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateProductDocumentGroup(productId, {
        groupDocuments,
        documentType: data.documentType,
        otherType: data.otherDocumentType?.trim(),
        removeDocuments: removedDocuments,
        newFiles,
        existingDocuments,
      });

      showSuccessToast('Documents updated successfully.');
      onSuccess?.(result.product);
      onOpenChange(false);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to update documents.' });
    } finally {
      setIsLoading(false);
    }
  };

  const hasFileRows = visibleExistingDocuments.length > 0 || newFiles.length > 0;

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header
          icon={RiFileLine}
          title='Edit Product Documents'
          description={
            documentGroup?.label
              ? `Update files and type for ${documentGroup.label}.`
              : 'Update the document details below.'
          }
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
              <Label.Root>File Upload</Label.Root>
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
                    {newFiles.length > 0
                      ? `${newFiles.length} new file${newFiles.length > 1 ? 's' : ''} selected`
                      : 'Choose files or drag & drop'}
                  </FileUpload.Button>
                  <span className='text-paragraph-xs text-text-sub-600'>{fileUploadHint}</span>
                </div>
              </FileUpload.Root>
              {hasFileRows ? (
                <ul className='flex flex-col gap-1.5'>
                  {visibleExistingDocuments.map((document) => (
                    <SelectedFileRow
                      key={document.url || document.name}
                      label='Current file'
                      fileName={document.name}
                      onRemove={() => handleRemoveExisting(document)}
                      removeLabel={`Remove ${document.name}`}
                    />
                  ))}
                  {newFiles.map((file, index) => (
                    <SelectedFileRow
                      key={`${file.name}-${index}`}
                      label='New file'
                      fileName={file.name}
                      onRemove={() => handleRemoveNewFile(index)}
                      removeLabel={`Remove ${file.name}`}
                    />
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
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
