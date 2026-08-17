import React, { useRef, useState } from 'react';
import {
  RiCheckLine,
  RiDownloadLine,
  RiFileUploadLine,
  RiInformationLine,
  RiUploadCloud2Line,
} from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';

const CreateProductBulkUploadModal = ({
  open,
  onOpenChange,
  onConfirmUpload,
  onDownloadSample,
  isUploading = false,
  isDownloadingSample = false,
}) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);

  const resetState = () => {
    setSelectedFile(null);
    setImportErrors([]);
    setIsDragActive(false);
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) resetState();
    onOpenChange(nextOpen);
  };

  const handlePickFile = (fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    setSelectedFile(file);
    setImportErrors([]);
  };

  const handleUpload = async () => {
    if (!selectedFile || !onConfirmUpload) return;
    const result = await onConfirmUpload(selectedFile);
    if (!result) return;

    const errors = Array.isArray(result.errors) ? result.errors : [];
    if (errors.length === 0) {
      handleOpenChange(false);
      return;
    }

    setImportErrors(errors);
  };

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content className='max-w-[1200px]' showClose={true}>
        <Modal.Header
          icon={RiFileUploadLine}
          title='Bulk Upload Products'
          description='Download a fresh sample before uploading.'
        />

        <Modal.Body className='space-y-4 px-8 pb-6 pt-5'>
          <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-3'>
            <div className='min-w-0 flex-1 space-y-0.5'>
              <p className='text-label-md font-medium text-text-main-900'>
                Use this sample template only
              </p>
              <p className='text-paragraph-sm text-text-sub-600'>
                Please download a new sample template before bulk uploading. Categories may change
                over time.
              </p>
            </div>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              className='gap-2'
              onClick={() => onDownloadSample?.()}
              disabled={isDownloadingSample}
            >
              <Button.Icon as={RiDownloadLine} className='!mx-0' />
              <span>{isDownloadingSample ? 'Downloading…' : 'Download Template'}</span>
            </Button.Root>
          </div>

          <div
            className={`rounded-xl border border-dashed px-6 py-10 transition ${
              isDragActive
                ? 'border-primary-base bg-primary-lighter/20'
                : 'border-stroke-soft-200 bg-bg-weak-50'
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragActive(false);
              handlePickFile(event.dataTransfer.files);
            }}
          >
            <div className='flex flex-col items-center gap-3 text-center'>
              <div className='flex size-12 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 text-text-sub-600'>
                <RiUploadCloud2Line className='size-6' />
              </div>
              <div className='space-y-1'>
                <p className='label-small text-text-main-900'>
                  Choose a file or drag & drop it here.
                </p>
                <p className='text-paragraph-xs text-text-soft-400'>XLSX format, up to 10 MB.</p>
              </div>
              {selectedFile ? (
                <p className='inline-flex items-center gap-1 text-paragraph-sm text-text-sub-600'>
                  <RiCheckLine className='size-4 text-success-base' />
                  {selectedFile.name}
                </p>
              ) : null}
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                onClick={() => fileInputRef.current?.click()}
              >
                Browse File
              </Button.Root>
              <input
                ref={fileInputRef}
                type='file'
                accept='.xlsx,.xlsm'
                className='hidden'
                onChange={(event) => handlePickFile(event.target.files)}
              />
            </div>
          </div>

          {importErrors.length > 0 ? (
            <div className='space-y-2 rounded-lg border border-error-light bg-error-lighter px-3 py-2 text-paragraph-sm text-error-dark'>
              <div className='inline-flex items-center gap-2 font-medium'>
                <RiInformationLine className='size-4' />
                {`${importErrors.length} row(s) failed to import.`}
              </div>
              <ul className='max-h-40 list-disc space-y-1 overflow-y-auto pl-5'>
                {importErrors.map((error) => (
                  <li key={`err-${error.row}-${error.product}`}>
                    Row {error.row}
                    {error.product ? ` (${error.product})` : ''}: {(error.errors || []).join('; ')}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Modal.Body>

        <Modal.Footer className='px-8 py-4'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            onClick={() => handleOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button.Root>
          <Button.Root type='button' disabled={!selectedFile || isUploading} onClick={handleUpload}>
            {isUploading ? 'Uploading…' : 'Upload & Import'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default CreateProductBulkUploadModal;
