/**
 * BoardAttachmentUploader
 *
 * Drag-and-drop zone + file-picker button.
 *
 * Client-side validation (size ≤ 50 MB, blocked extensions) is performed
 * before handing files to the parent's `onFilesSelected` callback.
 * Validation errors are surfaced inline below the zone — they do NOT affect
 * files that passed validation.
 *
 * Props:
 *   onFilesSelected  (validFiles: File[]) => void
 *   disabled         boolean
 *   multiple         boolean  (default true)
 *   className        string
 */

import React, { useId, useRef, useState } from 'react';
import { RiUploadCloud2Line } from 'react-icons/ri';

import { cn } from '@/utils/cn';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.css',
  '.scss',
  '.less',
  '.html',
  '.htm',
  '.xhtml',
  '.svg',
  '.xml',
  '.xsl',
  '.sh',
  '.ps1',
  '.msi',
  '.vbs',
  '.jar',
  '.app',
  '.deb',
  '.rpm',
  '.dmg',
  '.scr',
  '.pif',
  '.com',
  '.lnk',
]);

function getExtension(filename) {
  const idx = (filename ?? '').lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx).toLowerCase();
}

function validateFiles(files) {
  const valid = [];
  const invalid = [];

  for (const file of files) {
    const ext = getExtension(file.name);

    if (BLOCKED_EXTENSIONS.has(ext)) {
      invalid.push({ name: file.name, reason: `File type '${ext}' is not allowed` });
      continue;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      invalid.push({ name: file.name, reason: 'Exceeds the 50 MB size limit' });
      continue;
    }

    valid.push(file);
  }

  return { valid, invalid };
}

export default function BoardAttachmentUploader({
  onFilesSelected,
  disabled = false,
  multiple = true,
  className,
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  const handleFiles = (rawFiles) => {
    if (disabled || !rawFiles?.length) return;

    const fileArray = [...rawFiles];
    const { valid, invalid } = validateFiles(fileArray);

    setValidationErrors(invalid);

    if (valid.length > 0) {
      onFilesSelected?.(valid);
    }
  };

  const onInputChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const onDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Drop zone — drag events on the whole box; only the button opens the picker */}
      <div
        aria-label='File drop zone'
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'flex items-center justify-between gap-4 rounded-xl border border-dashed px-4 py-3 transition-colors duration-150',
          isDragging
            ? 'border-primary-base bg-primary-50'
            : 'border-stroke-soft-200 bg-transparent',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        {/* Left: icon + text */}
        <div className='flex items-center gap-3'>
          <RiUploadCloud2Line
            className={cn(
              'size-8 shrink-0',
              isDragging ? 'text-primary-base' : 'text-icon-sub-500',
            )}
            aria-hidden
          />
          <div>
            <p className='text-paragraph-sm font-medium text-text-main-900'>
              {isDragging ? 'Drop files here' : 'Choose a file or drag & drop.'}
            </p>
            <p className='text-paragraph-xs text-text-sub-500'>
              Allowed file types, up to 50 MB per file.
            </p>
          </div>
        </div>

        {/* Right: Browse File button */}
        <button
          type='button'
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className='shrink-0 rounded-lg border border-stroke-soft-200 bg-white px-3 py-1.5 text-paragraph-sm text-text-sub-600 transition-colors hover:border-stroke-sub-300 hover:bg-bg-weak-100 disabled:opacity-50'
        >
          Browse File
        </button>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type='file'
        multiple={multiple}
        disabled={disabled}
        onChange={onInputChange}
        className='sr-only'
        aria-hidden
        tabIndex={-1}
      />

      {validationErrors.length > 0 ? (
        <ul className='flex flex-col gap-1'>
          {validationErrors.map((err, i) => (
            <li
              key={`${err.name}-${i}`}
              className='flex items-start gap-1 text-paragraph-xs text-error-base'
            >
              <span className='shrink-0'>⚠</span>
              <span>
                <strong>{err.name}</strong>: {err.reason}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
