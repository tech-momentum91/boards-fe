import React from 'react';
import { RiImageLine } from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import { getStatusMetaForOption } from '@/components/ticket-management/constants';
import { useTaskStatusScope } from '@/components/projects/shared/task-status-scope-context';
import { cn } from '@/utils/cn';

const BADGE_COLOR_BY_META = {
  blue: 'blue',
  orange: 'orange',
  purple: 'purple',
  green: 'green',
  gray: 'gray',
  red: 'red',
  sky: 'sky',
};

function VersionRibbon({ version }) {
  if (!version) return null;

  return (
    <div className='absolute left-0 top-[15px] z-10 flex items-center drop-shadow-[0_4px_2px_rgba(0,0,0,0.25)]'>
      <Badge.Root
        size='small'
        variant='filled'
        color='green'
        className='rounded-none pl-2 pr-1.5 uppercase'
      >
        {version}
      </Badge.Root>
      <span
        aria-hidden
        className='h-5 w-[5px] bg-primary-base'
        style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}
      />
    </div>
  );
}

function StatusRibbon({ status, statusOptions = [], statusMetaMap = {} }) {
  if (!status) return null;

  const option = statusOptions.find((entry) => (entry.value ?? entry.label) === status) ?? {
    value: status,
    label: status,
  };
  const meta = getStatusMetaForOption(option, statusMetaMap);
  const badgeColor = BADGE_COLOR_BY_META[meta.color] ?? 'gray';

  return (
    <div className='absolute right-0 top-[10px] z-10 drop-shadow-[0_4px_2px_rgba(0,0,0,0.25)]'>
      <Badge.Root
        size='small'
        variant='filled'
        color={badgeColor}
        className='max-w-[140px] truncate rounded-md px-1.5 uppercase'
      >
        {option.label ?? status}
      </Badge.Root>
    </div>
  );
}

function AttachmentDots({ count, activeIndex = 0, maxDots = 5 }) {
  if (count <= 1) return null;

  const visibleCount = Math.min(count, maxDots);

  return (
    <div className='absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5'>
      {Array.from({ length: visibleCount }).map((_, index) => (
        <span
          key={index}
          className={cn(
            'size-1.5 rounded-full',
            index === activeIndex ? 'bg-bg-white-0' : 'bg-bg-white-0/40',
          )}
        />
      ))}
    </div>
  );
}

export default function ProjectThreeDGalleryCard({ task, onClick, className }) {
  const { statusOptions, statusMetaMap } = useTaskStatusScope();
  const cover = task?.coverAttachment;
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'relative flex w-full flex-col overflow-hidden rounded-[10px] border border-stroke-soft-200 bg-[rgba(246,248,250,0.4)] text-left shadow-regular-xs',
        onClick && 'cursor-pointer transition hover:border-stroke-sub-300 hover:shadow-regular-sm',
        className,
      )}
    >
      <div className='relative h-[140px] w-full shrink-0 overflow-hidden rounded-t-[6px]'>
        <VersionRibbon version={task.latestVersion} />
        <StatusRibbon
          status={task.status}
          statusOptions={statusOptions}
          statusMetaMap={statusMetaMap}
        />
        {cover?.previewUrl ? (
          <>
            <img src={cover.previewUrl} alt={cover.name} className='h-full w-full object-cover' />
            <div className='pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent from-[82%] to-black/60' />
          </>
        ) : (
          <div className='flex h-full w-full items-center justify-center bg-bg-weak-100'>
            <RiImageLine className='size-6 text-text-soft-400' />
          </div>
        )}
        <AttachmentDots count={task.latestVersionAttachmentCount} />
      </div>

      <div className='flex items-center justify-between gap-2 px-4 py-3'>
        <p className='min-w-0 flex-1 truncate text-label-md text-text-strong-950'>{task.title}</p>
        {task.floor ? (
          <Badge.Root
            size='small'
            variant='light'
            color='gray'
            className='shrink-0 rounded-full px-2'
          >
            {task.floor}
          </Badge.Root>
        ) : null}
      </div>
    </Component>
  );
}
