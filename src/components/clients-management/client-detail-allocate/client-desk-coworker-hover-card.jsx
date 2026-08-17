import React from 'react';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarCheckLine,
  RiRefreshLine,
  RiTimeLine,
} from 'react-icons/ri';

import { CrmAccountAvatar, getInitials } from '@/components/crm-accounts/crm-account-avatar';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import { cn } from '@/utils/cn';
import {
  formatCoworkerWorkModeBadge,
  getAssignedTillDescriptor,
} from '@/utils/client-desk-assignment-utils';

export function getCoworkerDetailsDisplayName(details) {
  if (!details || typeof details !== 'object') return '';
  return (
    [details.first_name, details.last_name].filter(Boolean).join(' ').trim() ||
    details.full_name ||
    details.coworker_name ||
    ''
  );
}

/**
 * Tile container for a row icon in the schedule section.
 */
function ScheduleIconTile({ children }) {
  return (
    <span
      className='mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-stroke-soft-200 bg-bg-white-0 text-text-sub-600'
      aria-hidden
    >
      {children}
    </span>
  );
}

/**
 * Presentational hover card for a desk-assigned co-worker (hot desk layout).
 *
 * Schedule rows render mixed-weight text: grey connector words ("effective",
 * "until", "from", "to", "(half day)") with dark values (dates, times,
 * "every Tuesday") to match the design.
 *
 * @param {{
 *   details: object,
 *   assignment?: object | null,
 *   coworkerRef?: string,
 *   onUpdate?: () => void,
 *   onRemove?: () => void | Promise<void>,
 *   isRemoving?: boolean,
 *   className?: string,
 *   pagination?: {
 *     index: number,
 *     count: number,
 *     onPrev: () => void,
 *     onNext: () => void,
 *   } | null,
 * }} props
 */
export function ClientDeskCoworkerHoverCard({
  details,
  assignment = null,
  coworkerRef = '',
  onUpdate,
  onRemove,
  isRemoving = false,
  className = '',
  pagination = null,
}) {
  const d = details && typeof details === 'object' ? details : {};
  const displayName =
    getCoworkerDetailsDisplayName(d) || String(coworkerRef || '').trim() || 'Co-worker';
  const department = String(d.department || '').trim();
  const designation = String(d.designation || '').trim();
  const subtitle = [department, designation].filter(Boolean).join(' • ');
  const badgeLabel = formatCoworkerWorkModeBadge(d.work_mode);

  const schedule = getAssignedTillDescriptor(assignment);

  return (
    <div
      className={`relative w-[min(320px,calc(100vw-1.5rem))] overflow-visible rounded-xl border border-stroke-soft-200 bg-white shadow-[0px_8px_20px_0px_rgba(0,0,0,0.08)] ${className}`}
      role='tooltip'
    >
      <div className='h-16 rounded-t-xl bg-gradient-to-b from-[#FFDAC2] to-white' aria-hidden />

      <div className='relative px-4 pb-4'>
        <div className='absolute -top-6 left-4'>
          <CrmAccountAvatar
            name={displayName}
            initials={getInitials(displayName)}
            image={d.image || d.user_image || null}
            size={36}
            showNativeTitle={false}
            className='ring-[3px] ring-white'
          />
        </div>

        <div className='pt-5 pb-3'>
          <div className='flex items-center gap-2'>
            <p className='min-w-0 flex-1 truncate text-[15px] font-semibold leading-5 text-text-strong-950'>
              {displayName}
            </p>
            <Badge.Root
              variant='stroke'
              color='gray'
              size='small'
              className='shrink-0 uppercase tracking-wide'
            >
              {badgeLabel}
            </Badge.Root>
          </div>
          {subtitle ? (
            <p className='mt-0.5 truncate text-[13px] leading-5 text-text-sub-600'>{subtitle}</p>
          ) : null}
        </div>

        {schedule ? (
          <>
            <div className='pt-3 border-t border-stroke-soft-200' />

            <span className='paragraph-xsmall  text-text-sub-600'>ASSIGNED TILL</span>

            <div className='flex flex-col mt-2 gap-2'>
              <div className='flex items-start gap-2.5'>
                <ScheduleIconTile>
                  <RiRefreshLine className='size-4' />
                </ScheduleIconTile>
                <span className='pt-0.5 text-[13px] leading-5 text-text-strong-950'>
                  {schedule.typeLabel}
                </span>
              </div>

              {schedule.date ? (
                <div className='flex items-start gap-2.5'>
                  <ScheduleIconTile>
                    <RiCalendarCheckLine className='size-4' />
                  </ScheduleIconTile>
                  <p className='pt-0.5 text-[13px] leading-5 text-text-strong-950'>
                    <span className='text-text-sub-600'>effective</span>{' '}
                    <span className='font-medium'>{schedule.date.effective}</span>
                    {schedule.date.end ? (
                      <>
                        {' '}
                        <span className='text-text-sub-600'>until</span>{' '}
                        <span className='font-medium'>{schedule.date.end}</span>
                      </>
                    ) : null}
                  </p>
                </div>
              ) : null}

              {schedule.time ? (
                <div className='flex items-center gap-2.5'>
                  <ScheduleIconTile>
                    <RiTimeLine className='size-4' />
                  </ScheduleIconTile>
                  <p className='pt-0.5 text-[13px] leading-5 text-text-strong-950'>
                    {schedule.time.halfDay ? (
                      <span className='text-text-sub-600'>(half day) </span>
                    ) : null}
                    {/* {schedule.time.weekday ? (
                      <>
                        <span className='font-medium'>every {schedule.time.weekday}</span>{' '}
                      </>
                    ) : null} */}
                    {schedule.time.start ? (
                      <>
                        <span className='text-text-sub-600'>From</span>{' '}
                        <span className='font-medium'>{schedule.time.start}</span>
                      </>
                    ) : null}
                    {schedule.time.end ? (
                      <>
                        {' '}
                        <span className='text-text-sub-600'>to</span>{' '}
                        <span className='font-medium'>{schedule.time.end}</span>
                      </>
                    ) : null}
                  </p>
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {onUpdate ? (
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            className='mt-4 w-full'
            onClick={onUpdate}
            disabled={isRemoving}
          >
            Update
          </Button.Root>
        ) : null}

        {onRemove ? (
          <Button.Root
            type='button'
            variant='error'
            mode='stroke'
            size='small'
            className={cn('w-full', onUpdate ? 'mt-2' : 'mt-4')}
            onClick={onRemove}
            disabled={isRemoving}
          >
            {isRemoving ? 'Removing…' : 'Remove'}
          </Button.Root>
        ) : null}

        {pagination && pagination.count > 1 ? (
          <div className='mt-3 flex items-center justify-between border-t border-stroke-soft-200 pt-3'>
            <button
              type='button'
              className='flex size-8 items-center justify-center rounded-lg text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-strong-950 disabled:opacity-40'
              onClick={pagination.onPrev}
              disabled={isRemoving}
              aria-label='Previous co-worker'
            >
              <RiArrowLeftSLine className='size-5' />
            </button>
            <span className='text-[12px] font-medium text-text-sub-600'>
              {pagination.index + 1} of {pagination.count}
            </span>
            <button
              type='button'
              className='flex size-8 items-center justify-center rounded-lg text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-strong-950 disabled:opacity-40'
              onClick={pagination.onNext}
              disabled={isRemoving}
              aria-label='Next co-worker'
            >
              <RiArrowRightSLine className='size-5' />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
