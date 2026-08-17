import React from 'react';
import { RiArrowUpLine } from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import {
  colorForPriority,
  colorForStage,
  colorForStatus,
} from '@/pages/profile/project-master/project-master.constants';

function groupBadgeColor(groupBy, groupValue) {
  if (groupBy === 'stage') return colorForStage(groupValue);
  if (groupBy === 'status') return colorForStatus(groupValue);
  if (groupBy === 'priority') return colorForPriority(groupValue);
  return 'blue';
}

export default function ProjectMasterGroupTable({
  group,
  groupBy,
  showGroupHeader = true,
  children,
}) {
  return (
    <div className='flex flex-col gap-2'>
      {showGroupHeader ? (
        <div className='flex items-center gap-1'>
          <Badge.Root
            variant='light'
            color={groupBadgeColor(groupBy, group)}
            size='small'
            className='uppercase'
          >
            {group}
          </Badge.Root>
          <RiArrowUpLine className='size-4 text-text-soft-400' />
        </div>
      ) : null}

      <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
        <div className='overflow-x-auto'>{children}</div>
      </div>
    </div>
  );
}
