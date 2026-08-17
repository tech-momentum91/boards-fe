/**
 * Schedule Subcomponents
 * Small, reusable pieces that can be customized via render props
 */

import React from 'react';
import { format } from 'date-fns';
import * as Badge from '@/components/ui/badge';
import { tv } from '@/utils/tv';
import { cn } from '@/lib/utils';

const scheduleEventVariants = tv({
  base: 'absolute z-[3] rounded-lg px-2.5 py-2 cursor-pointer transition-all duration-150 hover:shadow-md border',
  variants: {
    state: {
      default: '',
      past: 'opacity-70',
      selected: 'ring-2 ring-offset-2 ring-primary-base',
      dragging: 'opacity-50 cursor-move',
    },
    size: {
      small: 'text-xs',
      medium: 'text-sm',
      large: 'text-base',
    },
  },
  defaultVariants: {
    state: 'default',
    size: 'medium',
  },
});

const scheduleSlotVariants = tv({
  base: 'absolute border-[rgba(226,228,233,0.8)] transition-colors cursor-pointer',
  variants: {
    orientation: {
      vertical: 'border-t',
      horizontal: 'border-r',
    },
    state: {
      default: 'hover:bg-[var(--color-bg-weak-50)]',
      creating: 'select-none',
      disabled: 'cursor-not-allowed',
    },
    past: {
      true: 'bg-[var(--color-bg-weak-25)]',
      false: '',
    },
  },
  defaultVariants: {
    orientation: 'vertical',
    state: 'default',
    past: false,
  },
});

const scheduleTimeLabelVariants = tv({
  base: 'text-sm font-medium leading-5 tracking-tight text-[var(--color-text-sub-500)] text-center',
  variants: {
    orientation: {
      vertical: 'top-0 -translate-y-1/2',
      horizontal: 'left-0 -translate-x-1/2',
    },
    position: {
      top: 'absolute',
      inline: '',
    },
    size: {
      small: 'text-xs',
      medium: 'text-sm',
      large: 'text-base',
    },
  },
  defaultVariants: {
    position: 'top',
    size: 'medium',
  },
});

const scheduleResourceHeaderVariants = tv({
  base: 'flex flex-col gap-2 items-start p-3 bg-white rounded-lg',
  variants: {
    variant: {
      vertical: 'h-full',
      horizontal: 'hover:bg-[var(--color-bg-weak-50)] transition-colors duration-150',
    },
    sticky: {
      true: 'sticky top-0 z-20',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'vertical',
    sticky: false,
  },
});

const scheduleDragPreviewVariants = tv({
  base: 'absolute rounded-lg pointer-events-none border-2 border-dashed z-[15] flex items-center justify-center overflow-hidden',
  variants: {
    state: {
      creating: 'bg-blue-100 border-blue-400 opacity-70',
      dragging: 'bg-gray-100 border-gray-400 opacity-50',
      resizing: 'bg-yellow-100 border-yellow-400 opacity-70',
    },
  },
  defaultVariants: {
    state: 'creating',
  },
});

export const ScheduleEvent = React.forwardRef(
  ({ event, onClick, renderContent, isPast, className, style, ...rest }, ref) => {
    const handleClick = (e) => {
      e.stopPropagation();
      onClick?.(event);
    };

    if (renderContent) {
      return (
        <div
          ref={ref}
          className={cn('absolute z-3', className)}
          style={style}
          onClick={handleClick}
          {...rest}
        >
          {renderContent(event, isPast)}
        </div>
      );
    }

    // Default event rendering
    return (
      <div
        ref={ref}
        className={cn(
          scheduleEventVariants({ state: isPast ? 'past' : 'default' }),
          'bg-blue-50 border-blue-200 text-blue-900',
          className,
        )}
        style={style}
        onClick={handleClick}
        {...rest}
      >
        <div className='flex flex-col gap-1'>
          <p className='text-xs font-medium uppercase opacity-80 overflow-hidden text-ellipsis whitespace-nowrap'>
            {event.title}
          </p>
        </div>
      </div>
    );
  },
);

ScheduleEvent.displayName = 'Schedule.Event';

export const ScheduleSlot = React.forwardRef(
  (
    {
      onClick,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      className,
      children,
      state,
      past,
      style,
      orientation,
      ...rest
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(scheduleSlotVariants({ state, past, orientation }), className)}
        onClick={onClick}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        style={style}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

ScheduleSlot.displayName = 'Schedule.Slot';

export const ScheduleTimeLabel = ({
  hour,
  renderContent,
  className,
  position,
  orientation,
  ...rest
}) => {
  if (renderContent) {
    return renderContent(hour);
  }

  // Default format from hour number
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const label = `${displayHour} ${period}`;

  return (
    <div className={cn(scheduleTimeLabelVariants({ position, orientation }), className)} {...rest}>
      {label}
    </div>
  );
};

ScheduleTimeLabel.displayName = 'Schedule.TimeLabel';

export const ScheduleResourceHeader = ({
  resource,
  variant,
  renderContent,
  className,
  sticky,
  ...rest
}) => {
  if (renderContent) {
    return (
      <div className={cn(scheduleResourceHeaderVariants({ variant, sticky }), className)} {...rest}>
        {renderContent(resource)}
      </div>
    );
  }

  // Default resource header rendering
  return (
    <div className={cn(scheduleResourceHeaderVariants({ variant, sticky }), className)} {...rest}>
      <div className='flex flex-col gap-1'>
        <p className='text-sm font-medium text-text-main-900 truncate'>
          {resource.name || resource.id}
        </p>
        {resource.description && (
          <p className='text-xs text-(--color-text-sub-500) truncate'>{resource.description}</p>
        )}
      </div>
    </div>
  );
};

ScheduleResourceHeader.displayName = 'Schedule.ResourceHeader';

export const ScheduleCurrentTimeBadge = ({
  position,
  orientation = 'vertical',
  currentTime = new Date(),
  className,
  zIndex = 5,
  ...rest
}) => {
  if (position === null || position === undefined) return null;

  const style =
    orientation === 'vertical'
      ? { top: `${position}px`, zIndex, transform: 'translateY(-50%)' }
      : { left: `${position}px`, zIndex, transform: 'translateX(-50%)' };

  return (
    <div
      className={cn('absolute flex items-center justify-center', className)}
      style={style}
      {...rest}
    >
      <Badge.Root variant='filled' color='green' size='small' className='pointer-events-auto'>
        <span>{format(currentTime, 'HH:mm')}</span>
      </Badge.Root>
    </div>
  );
};

ScheduleCurrentTimeBadge.displayName = 'Schedule.CurrentTimeBadge';

export const ScheduleCurrentTimeLine = ({
  position,
  orientation = 'vertical',
  className,
  zIndex = 4,
  ...rest
}) => {
  if (position === null || position === undefined) return null;

  const style =
    orientation === 'vertical'
      ? { top: `${position}px`, zIndex }
      : { left: `${position}px`, zIndex };

  return (
    <div
      className={cn(
        'absolute pointer-events-none',
        orientation === 'vertical'
          ? 'left-0 right-0 -translate-y-1/2'
          : 'top-0 bottom-0 -translate-x-1/2',
        className,
      )}
      style={style}
      {...rest}
    >
      <div
        className={cn(
          orientation === 'vertical'
            ? 'w-full border-t-2 border-dashed border-primary-base'
            : 'h-full border-r-2 border-dashed border-primary-base',
        )}
      />
    </div>
  );
};

ScheduleCurrentTimeLine.displayName = 'Schedule.CurrentTimeLine';

export const ScheduleDragPreview = ({
  position,
  state = 'creating',
  label = 'New Booking',
  className,
  ...rest
}) => {
  if (!position) return null;

  const toPx = (value) => (typeof value === 'number' ? `${value}px` : value);

  // Maps any combination of coordinates (top/bottom/height or left/right/width)
  // to the style object, making it compatible with both TimeGrid and TimelineGrid.
  const style = {
    top: position.top === undefined ? undefined : toPx(position.top),
    bottom: position.bottom === undefined ? undefined : toPx(position.bottom),
    left: position.left === undefined ? undefined : toPx(position.left),
    right: position.right === undefined ? undefined : toPx(position.right),
    width: position.width === undefined ? undefined : toPx(position.width),
    height: position.height === undefined ? undefined : toPx(position.height),
  };

  return (
    <div className={cn(scheduleDragPreviewVariants({ state }), className)} style={style} {...rest}>
      <span className='text-xs font-semibold text-blue-700 whitespace-nowrap px-1 select-none'>
        {label}
      </span>
    </div>
  );
};

ScheduleDragPreview.displayName = 'Schedule.DragPreview';

export const ScheduleLoadingState = ({ children, className, ...rest }) => {
  if (children) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-center h-full', className)} {...rest}>
      <div className='flex flex-col items-center gap-4 max-w-md text-center'>
        <div className='size-12 border-4 border-primary-base border-t-transparent rounded-full animate-spin' />
        <p className='text-sm font-medium text-text-sub-500'>Loading schedule...</p>
      </div>
    </div>
  );
};

ScheduleLoadingState.displayName = 'Schedule.LoadingState';

export const ScheduleErrorState = ({ error, onRetry, children, className, ...rest }) => {
  if (children) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-center h-full', className)} {...rest}>
      <div className='flex flex-col items-center gap-4 max-w-md text-center'>
        <div className='size-16 rounded-full bg-red-50 flex items-center justify-center'>
          <svg
            className='size-8 text-red-600'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
            />
          </svg>
        </div>
        <div>
          <h3 className='text-base font-semibold text-text-main-900 mb-2'>
            Failed to load schedule
          </h3>
          <p className='text-sm text-text-sub-500'>
            {error || 'An error occurred while loading the schedule.'}
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className='px-4 py-2 bg-primary-base text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors'
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

ScheduleErrorState.displayName = 'Schedule.ErrorState';

export const ScheduleEmptyState = ({
  title,
  description,
  children,
  className,
  action,
  ...rest
}) => {
  if (children) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-center h-full', className)} {...rest}>
      <div className='flex flex-col items-center gap-4 max-w-md text-center'>
        <div className='size-16 rounded-full bg-bg-weak-100 flex items-center justify-center'>
          <svg
            className='size-8 text-text-sub-500'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
            />
          </svg>
        </div>
        <div className='flex flex-col items-center gap-3'>
          <h3 className='text-base font-semibold text-text-main-900 mb-2'>
            {title || 'No resources available'}
          </h3>
          <p className='text-sm text-text-sub-500'>
            {description ||
              'There are no resources configured. Please add resources to get started.'}
          </p>
          {action ? <div className='mt-1'>{action}</div> : null}
        </div>
      </div>
    </div>
  );
};

ScheduleEmptyState.displayName = 'Schedule.EmptyState';
