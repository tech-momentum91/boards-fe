import React from 'react';
import { RiInformationFill } from 'react-icons/ri';
import * as Popover from '@/components/ui/popover';
import { PROJECT_DETAIL_COLLECTIONS_STATS } from '@/components/projects/constants';
import { cn } from '@/utils/cn';

function StatInfoPopover({ entries }) {
  if (!entries?.length) return null;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type='button'
          className='inline-flex text-text-soft-400 transition hover:text-text-sub-500'
          aria-label='View breakdown'
        >
          <RiInformationFill className='size-4' />
        </button>
      </Popover.Trigger>
      <Popover.Content side='top' align='start' className='min-w-[180px] p-3'>
        <div className='flex flex-col gap-2'>
          {entries.map(([label, value]) => (
            <div key={label} className='flex items-center justify-between gap-4'>
              <span className='text-paragraph-sm text-text-sub-500'>{label}</span>
              <span className='text-label-sm text-text-main-900'>{value}</span>
            </div>
          ))}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

function CollectionStatCard({ label, value, valueClassName, info }) {
  return (
    <div className='flex min-h-[84px] flex-col justify-center gap-1 rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-3 shadow-[0px_1px_2px_rgba(82,88,102,0.06)]'>
      <div className='flex items-center gap-1.5'>
        <span className={cn('text-title-h6', valueClassName)}>{value}</span>
        {info ? <StatInfoPopover entries={info} /> : null}
      </div>
      <span className='text-subheading-xs text-text-soft-400'>{label}</span>
    </div>
  );
}

export default function ProjectCollectionsStats({ stats }) {
  const resolved = stats && typeof stats === 'object' ? stats : PROJECT_DETAIL_COLLECTIONS_STATS;
  const statKeys = Object.keys(resolved);

  return (
    <div className='grid grid-cols-2 gap-3 bg-bg-weak-100 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8'>
      {statKeys.map((key) => (
        <CollectionStatCard key={key} {...resolved[key]} />
      ))}
    </div>
  );
}
