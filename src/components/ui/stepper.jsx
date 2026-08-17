import React from 'react';
import { cn } from '@/utils/cn';

const Stepper = ({ steps = [], currentStep = 0, className, stepErrors = {} }) => {
  if (!Array.isArray(steps) || steps.length === 0) return null;

  const clampedStep = Math.max(0, Math.min(currentStep, steps.length - 1));
  const progressPercent = steps.length === 1 ? 0 : (clampedStep / (steps.length - 1)) * 100;

  return (
    <div className={cn('relative flex w-full items-start justify-between', className)}>
      {/* Progress bar container - positioned absolutely */}
      <div
        className='pointer-events-none absolute left-0 right-0 top-4 flex items-center px-[calc(50%/(var(--step-count)))]'
        style={{ '--step-count': steps.length }}
      >
        {/* Background track */}
        <div className='relative h-[2px] w-full rounded-full bg-stroke-soft-200'>
          {/* Active progress */}
          <div
            className='absolute left-0 top-0 h-full rounded-full bg-success-base transition-all duration-300'
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      {steps.map((step, index) => {
        const isActive = index === clampedStep;
        const isCompleted = index < clampedStep;
        const stepNumber = step.id ?? index + 1;
        const stepKey = step.key ?? step.id ?? index;
        const hasError = stepErrors[stepKey] || false;

        return (
          <div
            key={step.id ?? step.key ?? index}
            className='relative z-10 flex flex-1 flex-col items-center gap-2'
          >
            {/* Node circle */}
            <div
              className={cn(
                'relative flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all',
                hasError && !isActive
                  ? 'bg-error-base text-bg-white-0'
                  : isActive || isCompleted
                    ? 'bg-success-base text-bg-white-0'
                    : 'bg-bg-soft-200 text-text-sub-500',
              )}
            >
              {hasError && !isActive ? '!' : isCompleted ? '✓' : stepNumber}
            </div>

            {/* Label */}
            <span
              className={cn(
                'text-center text-xs',
                hasError && !isActive
                  ? 'font-medium text-error-base'
                  : isActive
                    ? 'font-medium text-text-main-900'
                    : 'font-normal text-text-sub-500',
              )}
            >
              {step.title}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default Stepper;
