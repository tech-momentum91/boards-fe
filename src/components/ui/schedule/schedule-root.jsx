/**
 * Schedule Root Component
 * Main composable schedule component with slot-based architecture
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { tv } from '@/utils/tv';
import { cn } from '@/lib/utils';

const scheduleRootVariants = tv({
  base: 'flex flex-col h-full bg-white',
  variants: {
    layout: {
      'time-grid': '',
      'timeline-grid': '',
    },
  },
  defaultVariants: {
    layout: 'time-grid',
  },
});

const scheduleHeaderVariants = tv({
  base: 'flex min-w-0 items-center justify-between overflow-x-auto px-4 py-3 border-b border-[rgba(226,228,233,0.8)] bg-white',
  variants: {
    sticky: {
      true: 'sticky top-0 z-10',
      false: '',
    },
  },
  defaultVariants: {
    sticky: false,
  },
});

const ScheduleContext = createContext({
  currentTime: new Date(),
  updateInterval: 60000,
  viewDate: new Date(),
  timelineDays: 1,
  startHour: 0,
  endHour: 23,
  showCurrentTime: true,
  enableDragToCreate: true,
  pastBufferMs: 0,
  onSlotMouseUp: undefined,
  onEventClick: undefined,
  onSlotClick: undefined,
  eventTransformer: undefined,
});

export const useScheduleContext = () => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useScheduleContext must be used within Schedule.Root');
  }
  return context;
};

export const ScheduleRoot = React.forwardRef(
  (
    {
      children,
      layout = 'time-grid',
      updateInterval = 60000,
      viewDate = new Date(),
      timelineDays = 1,
      startHour = 0,
      endHour = 23,
      showCurrentTime = true,
      enableDragToCreate = true,
      allowPastEventCreation = false,
      pastBufferMs = 0,
      onSlotMouseUp,
      onEventClick,
      onSlotClick,
      eventTransformer,
      className,
      ...rest
    },
    ref,
  ) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
      let interval;

      const now = new Date();
      const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

      const initialTimeout = setTimeout(() => {
        setCurrentTime(new Date());

        interval = setInterval(() => {
          setCurrentTime(new Date());
        }, updateInterval);
      }, msUntilNextMinute);

      return () => {
        clearTimeout(initialTimeout);
        if (interval) clearInterval(interval);
      };
    }, [updateInterval]);

    const contextValue = useMemo(
      () => ({
        currentTime,
        updateInterval,
        viewDate: new Date(viewDate),
        timelineDays,
        startHour,
        endHour,
        showCurrentTime,
        enableDragToCreate,
        allowPastEventCreation,
        pastBufferMs,
        onSlotMouseUp,
        onEventClick,
        onSlotClick,
        eventTransformer,
      }),
      [
        currentTime,
        updateInterval,
        viewDate,
        timelineDays,
        startHour,
        endHour,
        showCurrentTime,
        enableDragToCreate,
        allowPastEventCreation,
        pastBufferMs,
        onSlotMouseUp,
        onEventClick,
        onSlotClick,
        eventTransformer,
      ],
    );

    return (
      <ScheduleContext.Provider value={contextValue}>
        <div ref={ref} className={cn(scheduleRootVariants({ layout }), className)} {...rest}>
          {children}
        </div>
      </ScheduleContext.Provider>
    );
  },
);

ScheduleRoot.displayName = 'Schedule.Root';

export const ScheduleHeader = React.forwardRef(
  ({ children, sticky = false, className, ...rest }, ref) => {
    return (
      <div ref={ref} className={cn(scheduleHeaderVariants({ sticky }), className)} {...rest}>
        {children}
      </div>
    );
  },
);

ScheduleHeader.displayName = 'Schedule.Header';

export const ScheduleBody = React.forwardRef(({ children, className, ...rest }, ref) => {
  return (
    <div ref={ref} className={cn('flex-1 overflow-hidden', className)} {...rest}>
      {children}
    </div>
  );
});

ScheduleBody.displayName = 'Schedule.Body';

export const ScheduleFooter = React.forwardRef(({ children, className, ...rest }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between px-4 py-3 border-t border-[rgba(226,228,233,0.8)] bg-white',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

ScheduleFooter.displayName = 'Schedule.Footer';
