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
  const [now] = useState(() => new Date());
  const presets = useMemo(() => getInboxSnoozePresets(now), [now]);

  const handlePreset = (at: Date) => {
    onSelect(formatSnoozeForApi(at));
    onOpenChange(false);
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    const at = snoozeDateToDateTime(date);
    if (!at) return;
    // If 8 AM today already passed, bump to tomorrow 8 AM when picking today.
    const effective = at > new Date() ? at : snoozeDateToDateTime(new Date(date.getTime() + 86400000));
    if (!effective || effective <= new Date()) return;
    onSelect(formatSnoozeForApi(effective));
    onOpenChange(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Content
        side='bottom'
        align='end'
        showArrow={false}
        className='w-[320px] overflow-hidden rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-0 shadow-regular-md'
      >
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
            <span className='text-sm font-medium text-text-main-900'>
              {format(now, 'MMM yyyy')}
            </span>
          </div>
          <Calendar mode='single' onSelect={handleCalendarSelect} initialFocus />
          <p className='px-1 pb-1 text-[11px] text-text-soft-400'>
            Picked dates snooze until 8:00 AM.
          </p>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
