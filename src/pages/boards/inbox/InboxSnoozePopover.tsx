import { useMemo, useState } from 'react';
import {
  RiCalendarLine,
  RiHistoryLine,
  RiRefreshLine,
  RiSunLine,
  RiTimeLine,
} from 'react-icons/ri';
import { format } from 'date-fns';
import * as Popover from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/utils/cn';
import {
  formatSnoozeForApi,
  formatSnoozePresetSide,
  getInboxSnoozePresets,
  snoozeDateToDateTime,
} from './inbox-utils';

const PRESET_ICONS = {
  '20m': RiRefreshLine,
  '2h': RiTimeLine,
  tomorrow: RiSunLine,
  '2d': RiHistoryLine,
  next_week: RiCalendarLine,
};

type InboxSnoozePanelProps = {
  onSelect: (snoozedUntilApi: string) => void;
  className?: string;
};

export function InboxSnoozePanel({ onSelect, className }: InboxSnoozePanelProps) {
  const [now] = useState(() => new Date());
  const presets = useMemo(() => getInboxSnoozePresets(now), [now]);

  const handlePreset = (at: Date) => {
    onSelect(formatSnoozeForApi(at));
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    const at = snoozeDateToDateTime(date);
    if (!at) return;
    const effective =
      at > new Date() ? at : snoozeDateToDateTime(new Date(date.getTime() + 86400000));
    if (!effective || effective <= new Date()) return;
    onSelect(formatSnoozeForApi(effective));
  };

  return (
    <div className={cn('flex flex-col bg-bg-white-0', className)}>
      <div className='flex flex-col gap-0.5 p-2'>
        {presets.map((preset) => {
          const Icon = PRESET_ICONS[preset.id] || RiTimeLine;
          return (
            <button
              key={preset.id}
              type='button'
              onClick={() => handlePreset(preset.at)}
              className='flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-bg-weak-50'
            >
              <span className='flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-weak-100 text-icon-sub-500'>
                <Icon size={16} />
              </span>
              <span className='flex-1 text-sm text-text-main-900'>{preset.label}</span>
              <span className='text-xs text-text-soft-400'>
                {formatSnoozePresetSide(preset.at, now)}
              </span>
            </button>
          );
        })}
      </div>

      <div className='border-t border-stroke-soft-200 p-2'>
        <div className='mb-1 flex items-center justify-between px-1'>
          <span className='text-sm font-medium text-text-main-900'>{format(now, 'MMM yyyy')}</span>
        </div>
        <Calendar mode='single' onSelect={handleCalendarSelect} />
        <p className='px-1 pb-1 text-[11px] text-text-soft-400'>Picked dates snooze until 8:00 AM.</p>
      </div>
    </div>
  );
}

type InboxSnoozePopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (snoozedUntilApi: string) => void;
  children: React.ReactNode;
};

export default function InboxSnoozePopover({
  open,
  onOpenChange,
  onSelect,
  children,
}: InboxSnoozePopoverProps) {
  const handleSelect = (snoozedUntilApi: string) => {
    onSelect(snoozedUntilApi);
    onOpenChange(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Content
        side='bottom'
        align='end'
        collisionPadding={16}
        showArrow={false}
        className='w-[320px] max-h-none overflow-visible rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-0 shadow-regular-md'
      >
        <InboxSnoozePanel onSelect={handleSelect} />
      </Popover.Content>
    </Popover.Root>
  );
}
