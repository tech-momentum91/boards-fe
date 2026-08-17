import React from 'react';
import { RiErrorWarningLine } from 'react-icons/ri';

import { getBoqEmptyState } from '@/components/boq/boq-helper';
import { cn } from '@/utils/cn';

const BoqListEmptyState = ({
  context = 'default',
  title,
  description,
  error,
  onRetry,
  embedded = false,
  className,
}) => {
  const state = getBoqEmptyState(context);
  const resolvedTitle = title ?? state.title;
  const resolvedDescription = description ?? state.description;

  if (error) {
    return (
      <div className={cn('w-full', className)}>
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
            <RiErrorWarningLine className='size-6 text-error-base' />
          </div>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to load data</h3>
          <p className='mb-4 text-sm text-error-darker/80'>{error}</p>
          {onRetry ? (
            <button
              type='button'
              onClick={onRetry}
              className='rounded-lg bg-error-base px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error-darker'
            >
              Try Again
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-bg-white-0 text-center',
          embedded ? 'px-4 py-12' : 'rounded-2xl border border-dashed border-stroke-soft-200 p-16',
        )}
      >
        <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{resolvedTitle}</h3>
        <p className='max-w-md text-sm text-text-sub-600'>{resolvedDescription}</p>
      </div>
    </div>
  );
};

export default BoqListEmptyState;
