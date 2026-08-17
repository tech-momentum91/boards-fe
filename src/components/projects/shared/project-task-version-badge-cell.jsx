import React from 'react';

import * as Badge from '@/components/ui/badge';
import ProjectFloorVersionSyncAction from '@/components/projects/shared/project-floor-version-sync-action';
import * as Tooltip from '@/components/ui/tooltip';
import { formatProjectTaskVersionLabel } from '@/components/projects/tasks/project-task-helpers';

export default function ProjectTaskVersionBadgeCell({
  row,
  onAcknowledgeFloorVersion,
  isAcknowledgingFloorVersion = false,
  acknowledgingTaskId = '',
  useListDisplayVersion = false,
}) {
  const showWarning = row?.show_warning;
  const canAcknowledge = Boolean(row?.can_acknowledge);
  const versionLabel = useListDisplayVersion
    ? row?.list_display_version || row?.display_version || formatProjectTaskVersionLabel(row)
    : row?.display_version || formatProjectTaskVersionLabel(row);

  const warningMessage =
    row?.warning_reason === 'floor_version_updated'
      ? 'The floor layout has been locked at a newer version.'
      : row?.warning_reason === 'area_updated' || row?.warning_reason === 'area_removed'
        ? 'A linked layout area changed. Please review this task.'
        : 'Please review this task.';

  return (
    <div className='flex shrink-0 items-center gap-1.5'>
      {showWarning ? (
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Badge.Root size='small' variant='light' color='red'>
              {versionLabel}
            </Badge.Root>
          </Tooltip.Trigger>
          <Tooltip.Content className='max-w-[240px]'>
            <p>{warningMessage}</p>
          </Tooltip.Content>
        </Tooltip.Root>
      ) : (
        <Badge.Root size='small' variant='light' color='green'>
          {versionLabel}
        </Badge.Root>
      )}
      {typeof onAcknowledgeFloorVersion === 'function' && (canAcknowledge || showWarning) ? (
        <ProjectFloorVersionSyncAction
          showWarning={showWarning}
          canAcknowledge={canAcknowledge}
          floorVersionOptions={row?.floor_version_options}
          warningReason={row?.warning_reason}
          isAcknowledging={isAcknowledgingFloorVersion && acknowledgingTaskId === row.id}
          onAcknowledge={(floorLockedVersion) => onAcknowledgeFloorVersion(row, floorLockedVersion)}
        />
      ) : null}
    </div>
  );
}
