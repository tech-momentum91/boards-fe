import React from 'react';

const Row = ({ className }) => (
  <div className={`animate-pulse rounded-md bg-bg-weak-100 ${className ?? ''}`} />
);

/** Matches {@link ReleaseNoteTimeline} columns: dot | gap | card */
const ReleaseNoteListSkeleton = () => (
  <div className='relative w-full min-w-0 pt-1'>
    <div
      className='pointer-events-none absolute left-4 top-5 bottom-5 z-0 w-px -translate-x-1/2 bg-bg-weak-100'
      aria-hidden
    />
    <ul className='relative z-[1] m-0 list-none p-0'>
      {[1, 2, 3].map((key, index) => (
        <li key={key} className={index < 2 ? 'pb-12 md:pb-16' : ''}>
          <div className='flex flex-row items-start gap-8 md:gap-12 lg:gap-16'>
            <div className='flex shrink-0 items-start gap-2 sm:gap-2.5'>
              <div className='relative z-[1] flex w-8 shrink-0 justify-center pt-1'>
                <div className='mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-bg-weak-100 ring-4 ring-bg-white-0' />
              </div>
              <div className='hidden max-w-[11rem] shrink-0 pt-0.5 sm:block md:max-w-[12rem]'>
                <Row className='ml-auto h-4 w-28' />
              </div>
            </div>
            <div className='min-w-0 flex-1 space-y-3'>
              <Row className='h-4 w-40 sm:hidden' />
              <div className='flex flex-col gap-4 rounded-lg border border-stroke-soft-200 p-4 shadow-regular-md'>
                <div className='flex items-center justify-between gap-4'>
                  <Row className='h-5 w-[55%]' />
                  <Row className='h-6 w-20 shrink-0' />
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Row className='h-6 w-16' />
                  <Row className='h-6 w-24' />
                  <Row className='h-6 w-20' />
                </div>
                <div className='flex flex-col gap-2'>
                  <Row className='h-3 w-full' />
                  <Row className='h-3 w-[92%]' />
                  <Row className='h-3 w-[88%]' />
                  <Row className='mt-2 h-40 w-full max-w-xl' />
                </div>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  </div>
);

export default ReleaseNoteListSkeleton;
