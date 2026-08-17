import React from 'react';

const ClientDetailPageSkeleton = () => {
  return (
    <div className='flex h-full flex-col'>
      {/* Header Skeleton */}
      <div className='flex h-[88px] items-center justify-between border-b border-stroke-soft-200 px-6 py-5'>
        <div className='flex flex-1 items-center gap-4'>
          <div className='h-8 w-8 rounded-lg bg-bg-weak-100 animate-pulse shrink-0' />
          <div className='flex flex-col gap-1.5'>
            <div className='h-6 w-48 bg-bg-weak-100 rounded animate-pulse' />
            <div className='h-5 w-20 bg-bg-weak-100 rounded-full animate-pulse' />
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <div className='h-8 w-32 bg-bg-weak-100 rounded-lg animate-pulse' />
          <div className='h-8 w-32 bg-bg-weak-100 rounded-lg animate-pulse' />
          <div className='h-8 w-8 rounded-lg bg-bg-weak-100 animate-pulse shrink-0' />
        </div>
      </div>

      {/* Metrics Skeleton */}
      <div className='flex items-center gap-5 px-6 py-4 border-b border-stroke-soft-200'>
        {[1, 2, 3, 4, 5, 6].map((item, index) => (
          <React.Fragment key={item}>
            {index > 0 && <div className='h-10 w-px border-l border-stroke-soft-200 shrink-0' />}
            <div className='flex flex-1 items-center gap-3'>
              <div className='h-10 w-10 rounded-full bg-bg-weak-100 animate-pulse shrink-0' />
              <div className='flex flex-col gap-1 flex-1 min-w-0'>
                <div className='h-3 w-24 bg-bg-weak-100 rounded animate-pulse' />
                <div className='h-6 w-16 bg-bg-weak-100 rounded animate-pulse' />
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className='flex items-center gap-6 px-6 py-3.5 border-b border-stroke-soft-200'>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
          <div key={item} className='flex items-center gap-1.5'>
            <div className='h-5 w-5 bg-bg-weak-100 rounded animate-pulse shrink-0' />
            <div className='h-5 w-24 bg-bg-weak-100 rounded animate-pulse' />
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className='flex flex-1 overflow-hidden'>
        {/* Sidebar Skeleton */}
        <div className='h-full w-[240px] bg-bg-weak-100 border-r border-stroke-soft-200 shrink-0'>
          <div className='flex flex-col gap-1 p-4'>
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className={`flex gap-1.5 items-center p-2 rounded-lg ${
                  item === 1 ? 'bg-white shadow-regular-sm' : ''
                }`}
              >
                <div className='h-5 w-5 bg-bg-weak-200 rounded animate-pulse shrink-0' />
                <div className='h-5 flex-1 bg-bg-weak-200 rounded animate-pulse' />
                {item === 1 && (
                  <div className='h-5 w-5 bg-bg-weak-200 rounded-full animate-pulse shrink-0' />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content Area Skeleton */}
        <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0 px-6'>
          <div className='flex flex-col gap-5 py-5'>
            {/* Basic Info Section Skeleton */}
            <div className='flex flex-col gap-5'>
              <div className='flex gap-3 items-start'>
                <div className='flex flex-col gap-2 flex-1'>
                  <div className='h-4 w-20 bg-bg-weak-100 rounded animate-pulse' />
                  <div className='h-5 w-32 bg-bg-weak-100 rounded-full animate-pulse' />
                </div>
                <div className='flex flex-col gap-2 flex-1'>
                  <div className='h-4 w-32 bg-bg-weak-100 rounded animate-pulse' />
                  <div className='h-5 w-48 bg-bg-weak-100 rounded animate-pulse' />
                </div>
              </div>
              <div className='flex gap-3 items-start'>
                <div className='flex flex-col gap-2 flex-1'>
                  <div className='h-4 w-36 bg-bg-weak-100 rounded animate-pulse' />
                  <div className='h-5 w-56 bg-bg-weak-100 rounded animate-pulse' />
                </div>
                <div className='flex flex-col gap-2 flex-1'>
                  <div className='h-4 w-24 bg-bg-weak-100 rounded animate-pulse' />
                  <div className='h-5 w-32 bg-bg-weak-100 rounded animate-pulse' />
                </div>
              </div>
              <div className='flex gap-3 items-start'>
                <div className='flex flex-col gap-2 flex-1'>
                  <div className='h-4 w-40 bg-bg-weak-100 rounded animate-pulse' />
                  <div className='h-5 w-32 bg-bg-weak-100 rounded animate-pulse' />
                </div>
                <div className='flex flex-col gap-2 flex-1'>
                  <div className='h-4 w-20 bg-bg-weak-100 rounded animate-pulse' />
                  <div className='h-5 w-48 bg-bg-weak-100 rounded animate-pulse' />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className='h-px bg-stroke-soft-200' />

            {/* Contacts Section Skeleton */}
            <div className='flex flex-col gap-3 py-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='h-5 w-5 bg-bg-weak-100 rounded animate-pulse' />
                  <div className='h-6 w-20 bg-bg-weak-100 rounded animate-pulse' />
                </div>
                <div className='h-8 w-28 bg-bg-weak-100 rounded-lg animate-pulse' />
              </div>
              <div className='flex gap-3'>
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className='flex flex-1 gap-3 items-center p-3 rounded-xl border border-stroke-soft-200 bg-white'
                  >
                    <div className='h-9 w-9 rounded-full bg-bg-weak-100 animate-pulse shrink-0' />
                    <div className='flex flex-col gap-1 flex-1'>
                      <div className='h-5 w-32 bg-bg-weak-100 rounded animate-pulse' />
                      <div className='h-4 w-48 bg-bg-weak-100 rounded animate-pulse' />
                    </div>
                    <div className='flex gap-2'>
                      <div className='h-6 w-6 rounded bg-bg-weak-100 animate-pulse' />
                      <div className='h-6 w-6 rounded bg-bg-weak-100 animate-pulse' />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className='h-px bg-stroke-soft-200' />

            {/* Address Section Skeleton */}
            <div className='flex flex-col gap-3 py-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='h-5 w-5 bg-bg-weak-100 rounded animate-pulse' />
                  <div className='h-6 w-20 bg-bg-weak-100 rounded animate-pulse' />
                </div>
              </div>
              <div className='flex gap-3'>
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className='flex flex-col gap-1.5 flex-1 p-3 rounded-xl border border-stroke-soft-200'
                  >
                    <div className='h-4 w-32 bg-bg-weak-100 rounded animate-pulse' />
                    <div className='h-5 w-full bg-bg-weak-100 rounded animate-pulse' />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailPageSkeleton;
