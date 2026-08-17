import { RiInformationLine } from 'react-icons/ri';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

export default function CustomFieldInfoHint({
  description,
  className,
  iconClassName,
  side = 'top',
}) {
  const text = String(description ?? '').trim();

  if (!text) {
    return null;
  }

  return (
    <Tooltip.Root delayDuration={200}>
      <Tooltip.Trigger asChild>
        <button
          type='button'
          aria-label='Field information'
          className={cn(
            'inline-flex shrink-0 items-center justify-center text-icon-soft-400 transition-colors hover:text-icon-sub-500',
            className,
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <RiInformationLine size={14} className={iconClassName} />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content side={side} size='xsmall' className='max-w-xs whitespace-normal'>
        {text}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}
