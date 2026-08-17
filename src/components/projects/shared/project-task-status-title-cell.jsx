import React from 'react';
import ProjectStatusDropdown from '@/components/projects/shared/project-status-dropdown';
import ProjectTaskTitleCell from '@/components/projects/shared/project-task-title-cell';
import { cn } from '@/utils/cn';

/**
 * Task/name cell with a status-colored circle that opens the status dropdown.
 */
export default function ProjectTaskStatusTitleCell({
  title,
  status,
  statusOptions = [],
  statusMetaMap = {},
  onStatusChange,
  onTitleClick,
  titleClassName,
  className,
  disabled = false,
}) {
  return (
    <div className={cn('flex min-w-0 max-w-full items-center gap-2', className)}>
      {typeof onStatusChange === 'function' ? (
        <div
          className='shrink-0'
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <ProjectStatusDropdown
            value={status}
            onValueChange={onStatusChange}
            statusOptions={statusOptions}
            statusMetaMap={statusMetaMap}
            variant='indicator'
            size='xsmall'
            showArrow={false}
            disabled={disabled}
          />
        </div>
      ) : null}
      <div
        className={cn('min-w-0 flex-1 overflow-hidden', onTitleClick && 'cursor-pointer')}
        onClick={onTitleClick}
      >
        <ProjectTaskTitleCell title={title} className={cn('max-w-full', titleClassName)} />
      </div>
    </div>
  );
}
