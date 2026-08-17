import * as React from 'react';
import { format } from 'date-fns';
import { RiCalendarLine, RiCloseLine } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import * as Button from '@/components/ui/button';
import * as LinkButton from '@/components/ui/link-button';
import * as Popover from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

export function DateRangePicker({
  value,
  onChange,
  className,
  placeholder = 'DD/MM/YY - DD/MM/YY',
  formatStr = 'dd/MM/yy',
  size = 'small',
  align = 'end',
  /** Optional content rendered above the calendar (e.g. field toggle). */
  header = null,
  /**
   * When this key changes while the popover is open, reseed draft from `value`
   * (e.g. Created At ↔ Last Modified toggle) so close does not commit a stale range.
   */
  draftResetKey,
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const draftRef = React.useRef(value);

  const hasActiveRange = Boolean(value?.from || value?.to);
  const hasDraftRange = Boolean(draft?.from || draft?.to);
  const displaySource = open ? draft : value;

  const displayText = React.useMemo(() => {
    if (!displaySource?.from && !displaySource?.to) return placeholder;
    if (displaySource.from && !displaySource.to)
      return `${format(displaySource.from, formatStr)} - ${placeholder.split(' - ')[1]}`;
    if (displaySource.from && displaySource.to)
      return `${format(displaySource.from, formatStr)} - ${format(displaySource.to, formatStr)}`;
    return placeholder;
  }, [displaySource, placeholder, formatStr]);

  React.useEffect(() => {
    if (!open || draftResetKey === undefined) return;
    const next = value ?? null;
    draftRef.current = next;
    setDraft(next);
  }, [draftResetKey, value, open]);

  const handleClear = React.useCallback(
    (event) => {
      event?.stopPropagation?.();
      event?.preventDefault?.();
      draftRef.current = null;
      setDraft(null);
      onChange?.(null);
      setOpen(false);
    },
    [onChange],
  );

  const handleOpenChange = (nextOpen) => {
    if (nextOpen) {
      const initial = value ?? null;
      draftRef.current = initial;
      setDraft(initial);
    } else {
      onChange?.(draftRef.current ?? null);
    }
    setOpen(nextOpen);
  };

  return (
    <div className={cn('inline-flex shrink-0', className)}>
      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger asChild>
          <Button.Root
            variant={hasActiveRange ? 'primary' : 'neutral'}
            mode={hasActiveRange ? 'lighter' : 'stroke'}
            size={size === 'medium' ? 'medium' : 'small'}
            className={cn(
              'w-auto justify-start text-left font-normal gap-2',
              size === 'medium'
                ? 'h-10 min-h-10 min-w-[140px] max-w-[200px] rounded-10 px-3 ring-1 ring-inset ring-stroke-soft-200 shadow-regular-xs'
                : 'min-w-[200px] h-10 px-3 py-2',
              !displaySource?.from && !displaySource?.to && 'text-text-soft-400',
              hasActiveRange && 'ring-primary-base',
            )}
          >
            <Button.Icon as={RiCalendarLine} className='size-4 shrink-0' />
            <span className='paragraph-small min-w-0 flex-1 truncate'>{displayText}</span>
            {hasActiveRange && !open ? (
              <RiCloseLine
                size={16}
                className='shrink-0 text-primary-dark bg-primary-light rounded-sm hover:bg-primary-light/80 transition-colors'
                title='Clear date range'
                onClick={handleClear}
              />
            ) : null}
          </Button.Root>
        </Popover.Trigger>
        <Popover.Content className='w-auto p-0' align={align}>
          {header ? (
            <div className='border-b border-stroke-soft-200 px-3 py-2'>{header}</div>
          ) : null}
          <Calendar
            initialFocus
            mode='range'
            defaultMonth={draft?.from ?? value?.from}
            selected={draft ?? undefined}
            onSelect={(range) => {
              draftRef.current = range;
              setDraft(range);
            }}
            numberOfMonths={1}
          />
          {(hasDraftRange || hasActiveRange) && (
            <div className='flex items-center justify-end border-t border-stroke-soft-200 px-3 py-2'>
              <LinkButton.Root variant='primary' size='small' onClick={handleClear}>
                Clear
              </LinkButton.Root>
            </div>
          )}
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
