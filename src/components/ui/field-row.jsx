import React from 'react';
import * as Label from '@/components/ui/label';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import * as Button from '@/components/ui/button';
import { RiPencilLine, RiStackLine } from 'react-icons/ri';
import CustomFieldInfoHint from '@/pages/boards/views/list/components/CustomFieldInfoHint';

const FieldRow = ({
  icon: Icon,
  label,
  required,
  description,
  children,
  truncate = false,
  alignTop = false,
  editable = false,
  layout = false,
  className = '',
}) => {
  const labelContent = (
    <Label.Root
      className={cn(
        'flex items-center gap-px label-small text-text-main-900',
        truncate && 'min-w-0 truncate',
      )}
    >
      <span className={truncate ? 'truncate' : undefined}>{label}</span>
      {required && <span className='shrink-0 text-neutral-400'>*</span>}
      {description ? <CustomFieldInfoHint description={description} className='ml-1' /> : null}
    </Label.Root>
  );

  return (
    <div className='grid grid-cols-[180px_1fr] items-start gap-1.5 bg-[rgba(246,248,250,0.40)]'>
      <div className={cn('flex w-[180px] items-center gap-2 h-10 pl-3', truncate && 'min-w-0')}>
        {Icon && <Icon className='size-5 shrink-0 text-neutral-500' />}
        {truncate && label ? (
          <Tooltip.Root delayDuration={200}>
            <Tooltip.Trigger asChild>
              <Label.Root
                className={cn(
                  'flex items-center gap-px label-small text-text-main-900 min-w-0 truncate cursor-default',
                )}
              >
                <span className='truncate'>{label}</span>
                {required && <span className='shrink-0 text-neutral-400'>*</span>}
                {description ? (
                  <CustomFieldInfoHint description={description} className='ml-1' />
                ) : null}
              </Label.Root>
            </Tooltip.Trigger>
            <Tooltip.Content side='top' size='xsmall'>
              {label}
              {required && ' *'}
            </Tooltip.Content>
          </Tooltip.Root>
        ) : (
          labelContent
        )}
      </div>
      <div
        className={cn(
          'min-h-10 flex-1 min-w-0 pl-1.5 pr-1 pb-1 pt-1 border-l border-stroke-soft-200 relative group/field bg-white',
          alignTop ? 'pt-1' : 'flex flex-col items-start justify-center',
        )}
      >
        {children}
        {editable && (
          <div className='absolute top-1/2 -translate-y-1/2 right-0 opacity-0 group-hover/field:opacity-100 group-focus-within/field:opacity-0! transition-opacity duration-200 z-10 pointer-events-none'>
            <Button.Root
              variant='neutral'
              mode='lighter'
              size='xsmall'
              className='pointer-events-none'
            >
              <RiPencilLine className='size-4' />
            </Button.Root>
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldRow;
