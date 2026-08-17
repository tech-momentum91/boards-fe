import React, { useRef } from 'react';
import { RiCloseLine, RiFilePdf2Line, RiUploadLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { toAbsoluteAttachmentUrl } from '@/lib/utils';

function formatFileSizeLabel(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function openLinkedBill(file) {
  const url = toAbsoluteAttachmentUrl(file?.url || file?.file_url || '');
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function BillAndInvoiceLinkedBillCell({ file, onUpload, onRemove, locked = false }) {
  const inputRef = useRef(null);
  const canOpen = Boolean(file?.url || file?.file_url);

  if (file?.name) {
    return (
      <div className='flex w-[158px] items-center rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 py-1.5'>
        <button
          type='button'
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1.5 text-left',
            canOpen ? 'cursor-pointer hover:opacity-80' : 'cursor-default',
          )}
          aria-label={canOpen ? `Open ${file.name}` : file.name}
          disabled={!canOpen}
          onClick={(event) => {
            event.stopPropagation();
            if (canOpen) openLinkedBill(file);
          }}
        >
          <span className='relative flex size-5 shrink-0 items-center justify-center'>
            <RiFilePdf2Line className='size-5 text-text-sub-500' />
            <span className='absolute bottom-0 left-0 rounded bg-[#df1c41] px-[1.5px] py-px text-[5.5px] font-semibold uppercase leading-[6px] tracking-[0.11px] text-white'>
              PDF
            </span>
          </span>
          <div className='flex min-w-0 items-center gap-1'>
            <span
              className={cn(
                'truncate text-paragraph-sm font-medium text-text-main-900',
                canOpen && 'underline-offset-2 hover:underline',
              )}
            >
              {file.name}
            </span>
            {file.sizeLabel ? (
              <span className='shrink-0 text-paragraph-xs text-text-sub-500'>{file.sizeLabel}</span>
            ) : null}
          </div>
        </button>
        {onRemove && !locked ? (
          <button
            type='button'
            className='ml-1 flex size-5 shrink-0 items-center justify-center text-text-soft-400 transition-colors hover:text-text-sub-500'
            aria-label={`Remove ${file.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
          >
            <RiCloseLine className='size-5' />
          </button>
        ) : null}
      </div>
    );
  }

  if (locked) {
    return <span className='text-paragraph-sm text-text-soft-400'>—</span>;
  }

  return (
    <>
      <input
        ref={inputRef}
        type='file'
        accept='.pdf,.png,.jpg,.jpeg'
        className='hidden'
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (!selected) return;
          onUpload?.({
            name: selected.name,
            sizeLabel: formatFileSizeLabel(selected.size),
            file: selected,
          });
          event.target.value = '';
        }}
      />
      <Button.Root
        type='button'
        variant='neutral'
        mode='stroke'
        size='xsmall'
        className={cn('h-8 w-[90px] gap-0.5 px-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]')}
        onClick={() => inputRef.current?.click()}
      >
        <Button.Icon as={RiUploadLine} />
        <span className='px-1 text-label-sm'>Upload</span>
      </Button.Root>
    </>
  );
}
