import React from 'react';
import { RiStickyNoteLine } from 'react-icons/ri';
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor';
import ErrorText from '@/components/ui/error-text';
import { cn } from '@/utils/cn';

export default function ProjectDrawerDescriptionEditor({
  value = '',
  onChange,
  disabled = false,
  error,
  editorKey = 0,
  className,
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className='flex items-center gap-2 text-text-sub-500'>
        <RiStickyNoteLine className='size-5 shrink-0 text-text-soft-400' />
        <span className='text-paragraph-sm text-text-soft-400'>Add description</span>
      </div>
      <div
        className={cn(
          'w-full overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <SimpleEditor
          key={editorKey}
          embed
          value={value ?? ''}
          onChange={onChange}
          hasError={Boolean(error)}
          className='h-[200px]'
        />
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
