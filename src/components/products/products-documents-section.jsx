import React, { useEffect, useRef, useState } from 'react';
import { RiUploadLine } from 'react-icons/ri';

import { listProductDocumentTypes } from '@/api/productFormOptions';
import { DocumentFileCard } from '@/components/products/products-basic-upload-fields';
import { ProductDocumentsPanel } from '@/components/products/product-documents-panel';
import * as Button from '@/components/ui/button';
import { cn } from '@/utils/cn';

function getAcceptForDocumentType(label) {
  if (String(label).toLowerCase().includes('reference image')) {
    return 'image/*';
  }
  return '.pdf,application/pdf';
}

function slugifyDocumentKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replaceAll(/[^\da-z]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}

function mapDocumentTypeOptions(options) {
  return options.map((option) => ({
    key: option.id || option.value,
    label: option.label,
    documentType: option.value,
    accept: getAcceptForDocumentType(option.label),
  }));
}

function triggerFileInput(inputId) {
  document.querySelector(`#${inputId}`)?.click();
}

function DocumentCategoryRow({ category, files = [], onAddFiles, onRemoveFile }) {
  const inputId = `file-input-doc-${slugifyDocumentKey(category.key)}`;
  const inputRef = useRef(null);

  return (
    <div className='flex w-full flex-col gap-3'>
      <div className='flex w-full items-center justify-between gap-3 rounded-xl border border-stroke-soft-200 bg-bg-weak-50/60 py-2 pl-4 pr-3'>
        <span className='text-label-sm font-medium text-text-main-900'>{category.label}</span>
        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='small'
          onClick={() => triggerFileInput(inputId)}
          className='min-w-[76px] shrink-0 gap-0.5 bg-bg-white-0 px-1.5 py-1.5 shadow-regular-xs'
        >
          <Button.Icon as={RiUploadLine} />
          Upload
        </Button.Root>
      </div>

      {files.length > 0 ? (
        <div className='flex flex-col items-start gap-3'>
          {files.map((file) => (
            <DocumentFileCard
              key={file.id}
              file={file}
              onRemove={(fileId) => onRemoveFile(category.key, fileId)}
            />
          ))}
        </div>
      ) : null}

      <input
        ref={inputRef}
        id={inputId}
        type='file'
        accept={category.accept}
        multiple
        className='hidden'
        onChange={(event) => {
          onAddFiles(category.key, event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}

export function DocumentsSection({
  open = true,
  categoryFiles,
  onAddFiles,
  onRemoveFile,
  className,
  simpleMode = false,
}) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const simpleFiles = categoryFiles.documents || [];

  useEffect(() => {
    if (!open || simpleMode) return undefined;

    let cancelled = false;
    setLoading(true);

    listProductDocumentTypes()
      .then((options) => {
        if (!cancelled) {
          setCategories(mapDocumentTypeOptions(options));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCategories([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, simpleMode]);

  if (simpleMode) {
    return (
      <div className={cn(className)}>
        <ProductDocumentsPanel
          files={simpleFiles}
          showFileInput
          fileInputRef={fileInputRef}
          multiple
          onUploadClick={() => fileInputRef.current?.click()}
          onFileInputChange={(event) => {
            onAddFiles('documents', event.target.files);
            event.target.value = '';
          }}
          onRemoveFile={(fileId) => onRemoveFile('documents', fileId)}
          emptyMessage='No documents added yet.'
        />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className='flex flex-col gap-4'>
        <div className='border-t border-stroke-soft-200' aria-hidden />
        <div className='flex items-center gap-1.5'>
          <span className='text-label-md font-medium text-text-sub-500'>Documents</span>
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        {loading ? (
          <p className='text-paragraph-sm text-text-soft-400'>Loading document types...</p>
        ) : null}
        {!loading && categories.length === 0 ? (
          <p className='text-paragraph-sm text-text-soft-400'>No document types available.</p>
        ) : null}
        {categories.map((category) => (
          <DocumentCategoryRow
            key={category.key}
            category={category}
            files={categoryFiles[category.key] || []}
            onAddFiles={onAddFiles}
            onRemoveFile={onRemoveFile}
          />
        ))}
      </div>
    </div>
  );
}
