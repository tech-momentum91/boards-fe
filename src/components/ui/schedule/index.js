/**
 * Schedule Component Library
 * Fully reusable, composable schedule components
 *
 * Usage:
 * import * as Schedule from '@/components/ui/schedule';
 *
 * <Schedule.Root>
 *   <Schedule.Header>
 *     <YourCustomToolbar />
 *   </Schedule.Header>
 *   <Schedule.TimeGrid
 *     resources={resources}
 *     events={events}
 *     renderEvent={(event) => <YourEventCard event={event} />}
 *   />
 * </Schedule.Root>
 */

// Root components
export {
  ScheduleRoot as Root,
  ScheduleHeader as Header,
  ScheduleBody as Body,
  ScheduleFooter as Footer,
  useScheduleContext,
} from '@/components/ui/schedule/schedule-root';

// Grid layouts
export { ScheduleTimeGrid as TimeGrid } from '@/components/ui/schedule/schedule-time-grid';
export { ScheduleTimelineGrid as TimelineGrid } from '@/components/ui/schedule/schedule-timeline-grid';

// Subcomponents (for custom rendering)
export {
  ScheduleEvent as Event,
  ScheduleSlot as Slot,
  ScheduleTimeLabel as TimeLabel,
  ScheduleResourceHeader as ResourceHeader,
  ScheduleCurrentTimeBadge as CurrentTimeBadge,
  ScheduleCurrentTimeLine as CurrentTimeLine,
  ScheduleDragPreview as DragPreview,
  ScheduleLoadingState as LoadingState,
  ScheduleErrorState as ErrorState,
  ScheduleEmptyState as EmptyState,
} from '@/components/ui/schedule/schedule-subcomponents';

// Utilities (for custom implementations)
export {
  formatHourLabel,
  formatDate,
  calculateEventPosition,
  calculateCurrentTimePosition,
  isEventPast,
  isSameDay,
  getDurationMinutes,
  snapToInterval,
  generateTimeSlots,
  groupEventsByResource,
  detectOverlaps,
  validateEventBounds,
} from '@/components/ui/schedule/schedule-utils';

// Constants
export { SCHEDULE_DIMENSIONS } from '@/components/ui/schedule/schedule-constants';
