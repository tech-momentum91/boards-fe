import React from 'react';
import { format, isValid, parseISO } from 'date-fns';

import { cn } from '@/utils/cn';

/**
 * @param {unknown} raw
 * @returns {string}
 */
function formatReleaseNoteTimelineDate(raw) {
  if (raw == null || raw === '') return '—';
  try {
    const d = parseISO(String(raw));
    return isValid(d) ? format(d, 'MMMM d, yyyy') : String(raw);
  } catch {
    return String(raw);
  }
}

/**
 * Linear-style changelog: vertical spine, dot per entry, date beside spine, content on the right.
 *
 * @param {{
 *   notes: Array<{ id?: string, release_date?: string }>,
 *   renderCard: (note: object) => React.ReactNode,
 * }} props
 */
const ReleaseNoteTimeline = ({ notes = [], renderCard }) => {
  if (notes.length === 0) return null;

  return (
    <div className='relative w-full min-w-0 pt-1'>
      {/* Continuous vertical line — aligned to center of the 32px dot column */}
      <div
        className='pointer-events-none absolute left-4 top-5 bottom-5 z-0 w-px -translate-x-1/2 bg-stroke-soft-200'
        aria-hidden
      />

      <ul className='relative z-[1] m-0 list-none p-0' role='list'>
        {notes.map((note, index) => {
          const key = note?.id ?? note?.title ?? String(index);
          const dateLabel = formatReleaseNoteTimelineDate(note?.release_date);
          const isLast = index === notes.length - 1;

          return (
            <li key={key} className={cn('relative', !isLast && 'pb-12 md:pb-16')}>
              {/* Large gap between (timeline + date) and content; timeline + date stay tight */}
              <div className='flex min-w-0 flex-row items-start gap-8 md:gap-12 lg:gap-16'>
                {/* Spine + date grouped */}
                <div className='flex shrink-0 items-start gap-2 sm:gap-2.5'>
                  <div className='relative z-[2] flex w-8 shrink-0 justify-center pt-1'>
                    <span
                      className={cn(
                        'mt-0.5 block h-2.5 w-2.5 shrink-0 rounded-full',
                        'border-2 border-stroke-soft-300 bg-bg-white-0',
                        'ring-4 ring-bg-white-0 ring-offset-0',
                      )}
                      aria-hidden
                    />
                  </div>
                  <time
                    dateTime={note?.release_date ? String(note.release_date) : undefined}
                    className='hidden max-w-[11rem] shrink-0 pt-0.5 text-right text-label-sm leading-snug text-text-sub-600 sm:block md:max-w-[12rem]'
                  >
                    {dateLabel}
                  </time>
                </div>

                {/* Content */}
                <div className='min-w-0 flex-1 space-y-3'>
                  <time
                    dateTime={note?.release_date ? String(note.release_date) : undefined}
                    className='block text-label-sm leading-snug text-text-sub-600 sm:hidden'
                  >
                    {dateLabel}
                  </time>
                  {renderCard(note)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ReleaseNoteTimeline;
