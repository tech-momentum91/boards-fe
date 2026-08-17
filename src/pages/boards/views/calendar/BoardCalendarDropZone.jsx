import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/utils/cn';
import { getBoardCalendarDropId } from './board-calendar-dnd-utils';

export default function BoardCalendarDropZone({
  zone,
  dateKey,
  hour = null,
  className,
  style,
  children,
  onClick,
  onKeyDown,
  role,
  tabIndex,
  'aria-label': ariaLabel,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: getBoardCalendarDropId(zone, dateKey, hour),
    data: { zone, dateKey, hour },
  });

  return (
    <div
      ref={setNodeRef}
      role={role}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      className={cn(
        className,
        isOver && 'bg-primary-base/10 ring-1 ring-inset ring-primary-base/30',
      )}
      style={style}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}
