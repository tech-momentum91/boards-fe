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

import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
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

interface ValidationError {
  name: string;
  reason: string;
}

interface BoardAttachmentUploaderProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  multiple?: boolean;
  className?: string;
}

function getExtension(filename: string) {
  const idx = (filename ?? '').lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx).toLowerCase();
}

function validateFiles(files: Iterable<File>): { valid: File[]; invalid: ValidationError[] } {
  const valid: File[] = [];
  const invalid: ValidationError[] = [];

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
}: BoardAttachmentUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const handleFiles = (rawFiles: FileList | null) => {
    if (disabled || !rawFiles?.length) return;

    const fileArray = [...rawFiles];
    const { valid, invalid } = validateFiles(fileArray);

    setValidationErrors(invalid);

    if (valid.length > 0) {
      onFilesSelected?.(valid);
    }
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    event.target.value = '';
  };

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragging(false);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  const openFilePicker = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Drop zone — whole area is clickable; Browse is an explicit affordance */}
      <div
        role='button'
        tabIndex={disabled ? -1 : 0}
        aria-label='File drop zone. Click or press Enter to browse files.'
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openFilePicker();
          }
        }}
        className={cn(
          'flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-dashed px-4 py-3 transition-colors duration-150',
          isDragging
            ? 'border-primary-base bg-primary-50'
            : 'border-stroke-soft-200 bg-transparent',
          disabled && 'pointer-events-none cursor-not-allowed opacity-50',
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
          onClick={(event) => {
            event.stopPropagation();
            openFilePicker();
          }}
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
